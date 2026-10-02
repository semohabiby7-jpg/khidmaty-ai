import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

SITE_URL = "https://khidmatyai.com"
ARTICLES_URL = "https://khidmatyai.com/articles.html"
WORKER_URL = "https://khidmaty-agent.semohabiby7.workers.dev/requests"
STATUS_FILE = "status/watchdog-status.json"
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
REALERT_HOURS = 6


def now_cairo():
    try:
        return datetime.now(ZoneInfo("Africa/Cairo"))
    except Exception:
        from datetime import timedelta, timezone
        return datetime.now(timezone(timedelta(hours=3)))


def fmt_time(dt):
    days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
    months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    return f"{days[dt.weekday()]} {dt.day} {months[dt.month - 1]} — {dt.hour:02d}:{dt.minute:02d} بتوقيت القاهرة"


def check(name, key, url, expect_ok_json=False):
    started = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "khidmaty-watchdog/1.0"})
        with urllib.request.urlopen(req, timeout=20) as response:
            code = response.status
            body = response.read(500).decode("utf-8", "ignore")
        if code != 200:
            return {"name": name, "key": key, "up": False, "detail": f"HTTP {code}"}
        if expect_ok_json:
            data = json.loads(body)
            if not data.get("ok"):
                return {"name": name, "key": key, "up": False, "detail": "استجابة غير سليمة من العقل"}
        return {"name": name, "key": key, "up": True, "detail": f"HTTP 200 ({(time.monotonic() - started):.2f}s)"}
    except urllib.error.HTTPError as e:
        return {"name": name, "key": key, "up": False, "detail": f"HTTP {e.code}"}
    except Exception as e:
        return {"name": name, "key": key, "up": False, "detail": type(e).__name__}


def check_telegram():
    if not TOKEN:
        return None
    try:
        req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/getMe")
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8", "ignore"))
        if data.get("ok"):
            return {"name": "بوت التليجرام", "key": "telegram_bot", "up": True, "detail": "getMe سليم"}
        return {"name": "بوت التليجرام", "key": "telegram_bot", "up": False, "detail": "getMe فاشل"}
    except Exception as e:
        return {"name": "بوت التليجرام", "key": "telegram_bot", "up": False, "detail": type(e).__name__}


def send_alert(text):
    if not TOKEN or not CHAT_ID:
        print(f"NO_TELEGRAM_SECRETS | تنبيه هيصلك من جيت هوب على إيميلك بدل التليجرام | {text.replace(chr(10), ' / ')}")
        return False
    try:
        payload = json.dumps({"chat_id": CHAT_ID, "text": text}).encode("utf-8")
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{TOKEN}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8", "ignore"))
        if data.get("ok"):
            return True
        print("telegram rejected:", json.dumps(data, ensure_ascii=False))
        return False
    except Exception as e:
        print("telegram send failed:", type(e).__name__)
        return False


def build_message(status, results, changed, prev_status):
    stamp = fmt_time(now_cairo())
    icons = [f"{'✅' if r['up'] else '❌'} {r['name']}: {r['detail']}" for r in results]
    lines = "\n".join(icons)
    if status == "down":
        header = "🔴 خِدْمَتي AI واقعة بالكامل — الموقع والعقل مش راضيين يردوا"
    elif status == "partial":
        header = "🟠 تحذير جزئي في خِدْمَتي AI — فيه جزء واقع"
    else:
        header = "🟢 خِدْمَتي AI رجعت طبيعي — كل الأنظمة شغالة" if changed and prev_status else "✅ خِدْمَتي AI تمام"
    return f"{header}\n{lines}\n{stamp}"


def git_commit_push(message):
    if os.environ.get("CI") != "true":
        print("local run — git skipped")
        return
    subprocess.run(["git", "config", "user.name", "khidmaty-watchdog"], check=True)
    subprocess.run(["git", "config", "user.email", "watchdog@khidmatyai.com"], check=True)
    subprocess.run(["git", "add", STATUS_FILE], check=True)
    subprocess.run(["git", "commit", "-m", message], check=True)
    subprocess.run(["git", "push", "origin", "HEAD:main"], check=True)


def main():
    results = [
        check("الموقع الرئيسي", "site", SITE_URL),
        check("صفحة المقالات", "articles", ARTICLES_URL),
        check("عقل البوت", "worker", WORKER_URL, expect_ok_json=True),
    ]
    telegram_result = check_telegram()
    if telegram_result:
        results.append(telegram_result)
    ups = sum(1 for r in results if r["up"])
    status = "ok" if ups == len(results) else ("down" if ups == 0 else "partial")

    prev = {}
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                prev = json.load(f)
        except Exception:
            prev = {}
    prev_status = prev.get("status")
    changed = prev_status != status

    now = now_cairo()
    now_iso = now.isoformat()
    record = {
        "status": status,
        "since": now_iso if changed or not prev else prev.get("since"),
        "checked_at": now_iso,
        "components": {r["key"]: ("up" if r["up"] else "down") for r in results},
        "last_alert": prev.get("last_alert"),
    }

    alerted = False
    should_alert = False
    if status != "ok":
        last_alert = prev.get("last_alert")
        stale = True
        if last_alert:
            try:
                alerted_at = datetime.fromisoformat(last_alert)
                stale = (now - alerted_at).total_seconds() > REALERT_HOURS * 3600
            except Exception:
                stale = True
        should_alert = changed or stale
    elif changed and prev_status:
        should_alert = True

    if should_alert:
        if send_alert(build_message(status, results, changed, prev_status)):
            record["last_alert"] = now_iso
            alerted = True
        elif not TOKEN or not CHAT_ID:
            record["last_alert"] = now_iso
            alerted = True

    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
        f.write("\n")

    prev_day = ""
    if prev.get("checked_at"):
        try:
            prev_day = datetime.fromisoformat(prev["checked_at"]).strftime("%Y-%m-%d")
        except Exception:
            prev_day = ""
    day_changed = prev_day != now.strftime("%Y-%m-%d")

    if changed and prev_status:
        git_commit_push(f"watchdog: {prev_status} -> {status}")
    elif not prev:
        git_commit_push(f"watchdog: init {status}")
    elif alerted or day_changed:
        git_commit_push(f"watchdog heartbeat: {status} {now.strftime('%Y-%m-%d')}")

    print(f"status={status} changed={changed} alerted={alerted} day_changed={day_changed}")
    for r in results:
        print(f"{'UP' if r['up'] else 'DOWN'} {r['key']} {r['detail']}")
    if status != "ok":
        sys.exit(1)


if __name__ == "__main__":
    main()
