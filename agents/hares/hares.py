#!/usr/bin/env python3
"""حارس v3 — مش مراقب أسعار، ده اللي بيخاف على البيت.

الاستخدام:
    python3 agents/hares/hares.py

بيفحص:
  • الصفحات المهمة (حالة + سرعة)
  • شهادة SSL (فاضل كام يوم)
  • لينكات sitemap (عشان مفيش صفحة ميتة)
  • عمر المحتوى على الموقع (آخر تحديث)
  • المتجر: الأغلفة والقدرة على الطلب (store_check)
  • الصفحة زي الزائر: أزرار ميتة، أخطاء جافاسكريبت، ملفات ناقصة (page_audit)
  • الأمان: هيدرز وتوكنز مكشوفة (security_check)
  • كتب أمازون: سعر/تقييم/مراجعات/ترتيب + الفرق عن أمس (books)
  • نسخة احتياطية يومية متحقق منها (backup)
  • المقارنة بأمس (تدهور السرعة / أعطال جديدة)

قراءة فقط. بيكتب بس في agents/hares/reports/ و agents/hares/backups/.
"""
from __future__ import annotations

import json
import os
import re
import socket
import ssl
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
REPORTS = os.path.join(BASE, "reports")
ROOT = os.path.abspath(os.path.join(BASE, "..", ".."))
SITE = "https://khidmatyai.com"
HOST = "khidmatyai.com"

PAGES = [
    ("/", "الرئيسية"),
    ("/services.html", "دليل الخدمات"),
    ("/offices.html", "خريطة المكاتب"),
    ("/store.html", "المتجر"),
    ("/scan/", "Scan Macaron"),
    ("/calc.html", "حاسبة الرسوم"),
    ("/robots.txt", "robots"),
    ("/sitemap.xml", "sitemap"),
]

CONTENT_DIRS = ["maqalat", "articles"]
SLOW_MS = 2500
SPEED_DEGRADE = 2.0  # الضعف = تحذير
CERT_WARN_DAYS = 21
SITEMAP_SAMPLE = 12
CAIRO = timezone(timedelta(hours=2))


def fetch(path: str, timeout: int = 20) -> dict:
    url = SITE + path
    started = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "hares/2.0 (+khidmatyai.com)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            body = r.read(200_000)
            return {"path": path, "status": r.status, "ms": int((time.time() - started) * 1000), "body": body}
    except urllib.error.HTTPError as e:
        return {"path": path, "status": e.code, "ms": int((time.time() - started) * 1000), "body": b""}
    except Exception as e:  # noqa: BLE001
        return {"path": path, "status": None, "ms": int((time.time() - started) * 1000), "body": b"", "error": f"{type(e).__name__}: {e}"}


def cert_days() -> int | None:
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((HOST, 443), timeout=15) as sock:
            with ctx.wrap_socket(sock, server_hostname=HOST) as ssock:
                cert = ssock.getpeercert()
        expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        return (expires - datetime.now(timezone.utc)).days
    except Exception:  # noqa: BLE001
        return None


def sitemap_urls(count: int) -> list[str]:
    r = fetch("/sitemap.xml")
    if not r.get("body"):
        return []
    urls = re.findall(rb"<loc>\s*(.*?)\s*</loc>", r["body"], re.S)
    out = []
    for u in urls[:count]:
        s = u.decode("utf-8", "ignore").strip()
        if s.startswith("http"):
            out.append(s)
    return out


def check_url(url: str) -> dict:
    started = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "hares/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
            return {"url": url, "status": r.status, "ms": int((time.time() - started) * 1000)}
    except urllib.error.HTTPError as e:
        return {"url": url, "status": e.code, "ms": int((time.time() - started) * 1000)}
    except Exception as e:  # noqa: BLE001
        return {"url": url, "status": None, "ms": int((time.time() - started) * 1000), "error": f"{type(e).__name__}"}


def content_age_days() -> tuple[int | None, str | None]:
    """أحدث ملف محتوى في مجلدات المقالات — بكام يوم."""
    newest = None
    newest_name = None
    for d in CONTENT_DIRS:
        p = os.path.join(ROOT, d)
        if not os.path.isdir(p):
            continue
        for name in os.listdir(p):
            if not name.endswith((".html", ".md")):
                continue
            m = os.path.getmtime(os.path.join(p, name))
            if newest is None or m > newest:
                newest, newest_name = m, f"{d}/{name}"
    if newest is None:
        return None, None
    return int((time.time() - newest) / 86400), newest_name


def previous_report(day: str) -> dict | None:
    prev = datetime.strptime(day, "%Y-%m-%d") - timedelta(days=1)
    path = os.path.join(REPORTS, f"{prev.strftime('%Y-%m-%d')}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return None


def main() -> int:
    os.makedirs(REPORTS, exist_ok=True)
    now = datetime.now(CAIRO)
    day = now.strftime("%Y-%m-%d")

    results = []
    for path, label in PAGES:
        r = fetch(path)
        r.pop("body", None)
        r["label"] = label
        results.append(r)

    problems: list[str] = []
    slow: list[str] = []
    for r in results:
        if r.get("error"):
            problems.append(f"{r['label']} ({r['path']}): فشل الاتصال — {r['error']}")
        elif r["status"] != 200:
            problems.append(f"{r['label']} ({r['path']}): رد {r['status']}")
        if r.get("ms", 0) > SLOW_MS:
            slow.append(f"{r['label']}: {r['ms']}ms")

    # لينكات ميتة من الـ sitemap
    dead: list[str] = []
    urls = sitemap_urls(SITEMAP_SAMPLE)
    for u in urls:
        res = check_url(u)
        if res.get("status") != 200:
            dead.append(f"{u} → {res.get('status') or res.get('error')}")

    # الشهادة
    days = cert_days()
    care: list[str] = []
    if days is not None and days <= CERT_WARN_DAYS:
        problems.append(f"شهادة SSL فاضلها {days} يوم — تتجدد قبل ما تخلص")

    # المحتوى
    age, newest_file = content_age_days()
    if age is not None and age >= 14:
        care.append(f"آخر مقال اتضاف من {age} يوم ({newest_file}) — الوقت مناسب لمقال جديد")

    # كتب أمازون
    book_rows: list[dict] = []
    try:
        import sys

        sys.path.insert(0, BASE)
        from books import check_books  # noqa: PLC0415

        book_rows, book_problems = check_books()
        problems.extend(book_problems)
    except Exception as e:  # noqa: BLE001
        book_rows = [{"state": "محتاج تأكيد", "note": f"فحص الكتب فشل ({type(e).__name__})"}]

    # المتجر: الأغلفة والطلب
    store: dict = {}
    try:
        from store_check import check as check_store  # noqa: PLC0415

        store, sp, sc = check_store()
        problems.extend(sp)
        care.extend(sc)
    except Exception as e:  # noqa: BLE001
        care.append(f"فحص المتجر محتاج تأكيد — الكود نفسه وقع ({type(e).__name__})")

    # الصفحة زي الزائر
    audit: dict = {}
    try:
        from page_audit import check as check_pages  # noqa: PLC0415

        audit, ap, ac = check_pages()
        problems.extend(ap)
        care.extend(ac)
    except Exception as e:  # noqa: BLE001
        care.append(f"فحص الأزرار محتاج تأكيد — الكود نفسه وقع ({type(e).__name__})")

    # الأمان
    security: dict = {}
    try:
        from security_check import check as check_security  # noqa: PLC0415

        security, secp, secc = check_security()
        problems.extend(secp)
        care.extend(secc)
    except Exception as e:  # noqa: BLE001
        care.append(f"فحص الأمان محتاج تأكيد — الكود نفسه وقع ({type(e).__name__})")

    # نسخة احتياطية
    backup_row: dict = {}
    try:
        from backup import run as run_backup  # noqa: PLC0415

        backup_row, bp, bc = run_backup()
        problems.extend(bp)
        care.extend(bc)
    except Exception as e:  # noqa: BLE001
        problems.append(f"نسخة احتياطية: الكود وقع ({type(e).__name__})")

    # المقارنة بأمس
    prev = previous_report(day)
    trend = None
    if prev:
        prev_ms = {p["path"]: p.get("ms", 0) for p in prev.get("results", [])}
        for r in results:
            old = prev_ms.get(r["path"])
            if old and r.get("ms", 0) > old * SPEED_DEGRADE and r["ms"] > 800:
                problems.append(f"{r['label']}: السرعة اتضاعفت ({old}ms ← {r['ms']}ms)")
        new_problems = [p for p in problems if p not in prev.get("problems", [])]
        trend = {"prev_problems": len(prev.get("problems", [])), "new": len(new_problems)}

    report = {
        "date": day,
        "checked_at": now.strftime("%Y-%m-%d %H:%M"),
        "site": SITE,
        "pages_checked": len(results),
        "problems": problems,
        "slow": slow,
        "dead_links": dead,
        "cert_days_left": days,
        "content_age_days": age,
        "newest_content": newest_file,
        "care": care,
        "books": book_rows,
        "store": store,
        "audit": audit,
        "security": security,
        "backup": backup_row,
        "trend": trend,
        "results": results,
    }

    with open(os.path.join(REPORTS, f"{day}.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    lines = [f"# 🛡️ تقرير حارس — {day}", "", f"فحص {len(results)} صفحة · {SITEMAP_SAMPLE} لينك من الـ sitemap · متجر · أزرار · أمان · نسخة احتياطية"]
    if days is not None:
        lines.append(f"شهادة SSL: فاضل {days} يوم")
    if age is not None:
        lines.append(f"آخر إضافة محتوى: من {age} يوم")

    if problems:
        lines += ["", "## 🔴 مشاكل"]
        lines += [f"- {p}" for p in problems]
    else:
        lines += ["", "## ✅ مفيش مشاكل", "- كل الصفحات واللينكات ردّت 200."]

    if dead:
        lines += ["", "## 🔗 لينكات ميتة"] + [f"- {d}" for d in dead]
    if slow:
        lines += ["", "## 🟡 بطء"] + [f"- {s}" for s in slow]
    if care:
        lines += ["", "## 💛 خوف يستحق"] + [f"- {c}" for c in care]

    if book_rows:
        lines += ["", "## 📚 كتب أمازون"]
        for b in book_rows:
            state = b.get("state", "—")
            bits = [state]
            if isinstance(b.get("price"), (int, float)):
                bits.append(f"{b['price']:.2f}$")
            if b.get("rating") is not None:
                bits.append(f"★{b['rating']}")
            if b.get("reviews") is not None:
                bits.append(f"{b['reviews']} تقييم")
            if b.get("bsr"):
                bits.append(f"BSR {b['bsr']}")
            note = f" — {b['note']}" if b.get("note") else ""
            lines.append(f"- {b.get('label', b.get('asin', '?'))}: {' · '.join(bits)}{note}")

    if store.get("summary"):
        s = store["summary"]
        lines += [
            "",
            "## 🛒 المتجر",
            f"- صفحات: {s['pages']} · صور متفحصة: {s['images_checked']} · أغلفة مكسورة: {s['images_broken']}",
            f"- أسعار مسجلة في البيانات: {s['offers']}",
        ]

    if audit.get("summary"):
        a = audit["summary"]
        lines += [
            "",
            "## 🖱️ الصفحة زي الزائر",
            f"- أزرار ميتة: {a['dead_buttons']} · أخطاء جافاسكريبت: {a['js_errors']}",
            f"- لينكات داخلية ميتة: {a['dead_links']} · ملفات ناقصة: {a['broken_assets']}",
        ]

    if security:
        lines += [
            "",
            "## 🔐 الأمان",
            f"- TLS: {security.get('tls') or 'محتاج تأكيد'} · هيدرز حماية موجودة: {len(security.get('headers_present', []))}/4",
            f"- ملفات حساسة مكشوفة: {len(security.get('exposed', []))}",
        ]

    if backup_row:
        if backup_row.get("ok"):
            lines.append(f"- 💾 نسخة احتياطية: {backup_row['mb']} ميجا · {backup_row['files']} ملف · {backup_row['seconds']} ثانية")
        else:
            lines.append("- 💾 نسخة احتياطية: فشلت — محتاجة تدخل")

    lines += ["", "## التفاصيل", "", "| الصفحة | الحالة | الزمن |", "|---|---|---|"]
    for r in results:
        status = r.get("status") if r.get("status") is not None else "فشل"
        lines.append(f"| {r['label']} | {status} | {r['ms']}ms |")

    with open(os.path.join(REPORTS, f"{day}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines))
    return 0 if not problems else 1


if __name__ == "__main__":
    raise SystemExit(main())
