#!/usr/bin/env python3
"""حارس — عين على كتب أمازون (v3).

بيقرأ agents/hares/books.json ويفتح صفحة كل كتاب ويتأكد من:
  • الصفحة رجعت فعلًا (مش حجب ولا كابتشا)؟
  • العنوان اللي رجع هو عنوان الكتاب بتاعنا (مش منتج تاني بنفس الـ ASIN)؟
  • الكتاب متاح ومش «غير متاح»؟
  ويسجّل كل يوم: السعر · التقييم · عدد المراجعات · ترتيب البيع (BSR).
  وفي الآخر يقول: إيه اللي اتغير عن أمس.

قاعدة صارمة: أي شك = «محتاج تأكيد» — ممنوع إنذار كاذب.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import time
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(BASE, "books.json")
HISTORY = os.path.join(BASE, "books-history.json")
HISTORY_KEEP = 60
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
RETRIES = 2
PAUSE = 3
MATCH_WORDS = ["ismail", "mind", "قوة العقل", "عقل"]
CAIRO = timezone(timedelta(hours=2))


def load_config() -> dict:
    if not os.path.exists(CONFIG):
        return {"books": [], "marketplace": "https://www.amazon.com"}
    with open(CONFIG, encoding="utf-8") as f:
        return json.load(f)


def grab(url: str) -> str | None:
    for attempt in range(RETRIES):
        try:
            out = subprocess.run(
                ["curl", "-s", "-L", "--max-time", "25", "-A", UA,
                 "-H", "Accept-Language: en-US,en;q=0.9", url],
                capture_output=True,
                timeout=35,
            )
            body = out.stdout.decode("utf-8", "ignore")
            if out.returncode == 0 and len(body) > 5000:
                return body
        except Exception:  # noqa: BLE001
            pass
        if attempt + 1 < RETRIES:
            time.sleep(PAUSE)
    return None


def _num(s: str | None) -> float | None:
    if not s:
        return None
    try:
        return float(s.replace(",", "").strip())
    except ValueError:
        return None


def parse(html: str) -> dict:
    title = ""
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()

    price = None
    whole = re.search(r'a-price-whole">([0-9.,]+)', html)
    frac = re.search(r'a-price-fraction">([0-9]{2})', html)
    if whole:
        w = whole.group(1).replace(",", "").strip(".")
        try:
            price = float(f"{w}.{frac.group(1)}") if frac else float(w)
        except ValueError:
            price = None

    rating = None
    rm = re.search(r"([0-9.]+)\s+out of 5 stars", html)
    if rm:
        rating = _num(rm.group(1))

    reviews = None
    for pat in (r"([0-9,]+)\s+(?:global )?ratings", r'id="acrCustomerReviewText"[^>]*>([0-9,]+)'):
        m2 = re.search(pat, html)
        if m2:
            v = _num(m2.group(1))
            reviews = int(v) if v is not None else None
            break

    bsr = None
    bsr_cat = None
    bm = re.search(r"#([0-9,]+)\s+in\s+([A-Za-z][A-Za-z &/'-]{2,40})", html)
    if bm:
        bsr = int(_num(bm.group(1)) or 0)
        bsr_cat = bm.group(2).strip()

    blocked = any(k in html.lower() for k in ("api-services-support@amazon.com", "enter the characters you see below", "type the characters you see"))
    unavailable = "currently unavailable" in html.lower()
    return {
        "title": title,
        "price": price,
        "rating": rating,
        "reviews": reviews,
        "bsr": bsr,
        "bsr_category": bsr_cat,
        "blocked": blocked,
        "unavailable": unavailable,
    }


def looks_like_our_book(title: str) -> bool:
    low = title.lower()
    return any(w.lower() in low for w in MATCH_WORDS)


def load_history() -> dict:
    if not os.path.exists(HISTORY):
        return {}
    try:
        with open(HISTORY, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def save_history(hist: dict) -> None:
    cutoff = (datetime.now(CAIRO) - timedelta(days=HISTORY_KEEP)).strftime("%Y-%m-%d")
    for asin in list(hist):
        hist[asin] = {d: v for d, v in hist[asin].items() if d >= cutoff}
    with open(HISTORY, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=2)


def yesterday(hist: dict, asin: str) -> dict | None:
    days = sorted(hist.get(asin, {}))
    return hist[asin][days[-1]] if days else None


def check_books() -> tuple[list[dict], list[str]]:
    cfg = load_config()
    market = cfg.get("marketplace", "https://www.amazon.com").rstrip("/")
    rows: list[dict] = []
    problems: list[str] = []
    care: list[str] = []
    hist = load_history()
    today = datetime.now(CAIRO).strftime("%Y-%m-%d")

    for book in cfg.get("books", []):
        asin = (book.get("asin") or "").strip()
        label = book.get("label", asin or "?")
        expected = book.get("expected_price")

        if not asin:
            rows.append({"label": label, "state": "محتاج تأكيد", "note": "مفيش ASIN متسجل"})
            continue

        url = f"{market}/dp/{asin}"
        row: dict = {"asin": asin, "label": label, "url": url}

        html = grab(url)
        if not html:
            row["state"] = "محتاج تأكيد"
            row["note"] = "الصفحة مرجعتش — شبكة أو حجب"
            rows.append(row)
            continue

        data = parse(html)
        if data["blocked"]:
            row["state"] = "محتاج تأكيد"
            row["note"] = "أمازون حجبت القراءة (كابتشا)"
        elif not data["title"]:
            row["state"] = "محتاج تأكيد"
            row["note"] = "الصفحة مرجعتش عنوان"
        elif not looks_like_our_book(data["title"]):
            row["state"] = "محتاج تأكيد"
            row["note"] = f"الصفحة بتاعة منتج تاني — الـ ASIN غالبًا غلط ({data['title'][:60]})"
        else:
            row["title"] = data["title"]
            row["price"] = data["price"]
            row["rating"] = data["rating"]
            row["reviews"] = data["reviews"]
            row["bsr"] = data["bsr"]
            row["bsr_category"] = data["bsr_category"]
            if data["unavailable"]:
                row["state"] = "غير متاح"
                problems.append(f"📕 {label}: مش متاح للبيع على أمازون دلوقتي")
            else:
                row["state"] = "موجود"
                if data["price"] is not None and expected is not None and abs(data["price"] - float(expected)) > 0.01:
                    row["note"] = f"السعر الظاهر {data['price']:.2f}$ مش {float(expected):.2f}$ — راجع"

            # المقارنة بآخر قراءة
            prev = yesterday(hist, asin)
            if prev:
                if data["price"] is not None and prev.get("price") is not None and abs(data["price"] - prev["price"]) > 0.01:
                    care.append(f"📚 {label}: السعر اتغير {prev['price']:.2f}$ ← {data['price']:.2f}$")
                if data["reviews"] is not None and prev.get("reviews") is not None and data["reviews"] > prev["reviews"]:
                    gained = data["reviews"] - prev["reviews"]
                    care.append(f"📚 {label}: {gained} مراجعة/تقييم جديد (بقى {data['reviews']})")
                if data["rating"] is not None and prev.get("rating") is not None and abs(data["rating"] - prev["rating"]) >= 0.1:
                    care.append(f"📚 {label}: التقييم اتحرك {prev['rating']} ← {data['rating']}")
                if data["bsr"] and prev.get("bsr") and data["bsr"] < prev["bsr"] * 0.7:
                    care.append(f"📚 {label}: ترتيب البيع اتحسن ({prev['bsr']} ← {data['bsr']}) — بيتباع أكتر")
                elif data["bsr"] and prev.get("bsr") and data["bsr"] > prev["bsr"] * 1.5:
                    care.append(f"📚 {label}: ترتيب البيع نزل ({prev['bsr']} ← {data['bsr']})")

            hist.setdefault(asin, {})[today] = {
                "price": data["price"],
                "rating": data["rating"],
                "reviews": data["reviews"],
                "bsr": data["bsr"],
                "state": row["state"],
            }

        rows.append(row)
        time.sleep(PAUSE)  # أدب مع أمازون

    save_history(hist)
    return rows, problems + care


if __name__ == "__main__":
    rows, problems = check_books()
    print(json.dumps({"books": rows, "problems": problems}, ensure_ascii=False, indent=2))
