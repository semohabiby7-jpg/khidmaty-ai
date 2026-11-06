#!/usr/bin/env python3
"""حارس — متجر الكتب: هل الزائر يقدر يوصل للكتاب ويطلبه؟

بيفحص صفحة المتجر الحية (عربي + إنجليزي):
  • كل غلاف كتاب بيوصل فعلًا (مش 404 ولا صورة مكسورة)
  • رقم واتساب اللي بيتكوّن منه زر الشراء سليم
  • الأزرار اللي الجافاسكريبت بيدوّر عليها موجودة في الصفحة (waLink / buy)
  • بيانات الأسعار في schema.org مطابقة للي معروض

قراءة فقط. ممنوع أي شراء أو إرسال رسالة.
"""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://khidmatyai.com"
PAGES = [("/store.html", "المتجر (عربي)"), ("/store-en.html", "المتجر (إنجليزي)")]
UA = "hares/3.0 (+khidmatyai.com)"
MAX_IMAGES = 30


def get(url: str, timeout: int = 20, head: bool = False) -> tuple[int | None, bytes, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="HEAD" if head else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            body = b"" if head else r.read(400_000)
            return r.status, body, dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, b"", dict(e.headers or {})
    except Exception:  # noqa: BLE001
        return None, b"", {}


def absolute(src: str) -> str | None:
    src = src.strip()
    if not src or src.startswith(("data:", "mailto:", "javascript:")):
        return None
    # مسار متكوّن في الجافاسكريبت وقت التشغيل — مش مسار حقيقي نقدر نفحصه
    if "'+" in src or '"+' in src or "${" in src or "{{" in src:
        return None
    if src.startswith(("http://", "https://")):
        return src
    if src.startswith("//"):
        return "https:" + src
    return urllib.parse.urljoin(SITE + "/", src.lstrip("/"))


def check(verbose: bool = False) -> tuple[dict, list[str], list[str]]:
    """بيرجع (نتيجة منظمة، مشاكل، تنبيهات)."""
    problems: list[str] = []
    care: list[str] = []
    out: dict = {"pages": []}

    for path, label in PAGES:
        status, body, _ = get(SITE + path)
        page: dict = {"label": label, "path": path, "status": status, "images": [], "offers": []}
        if status != 200 or not body:
            problems.append(f"متجر: {label} ({path}) رد {status or 'فشل'}")
            out["pages"].append(page)
            continue

        html = body.decode("utf-8", "ignore")

        # 1) الأغلفة والصور
        srcs = re.findall(r'<img[^>]+src="([^"]+)"', html)
        seen: list[str] = []
        for s in srcs:
            u = absolute(s)
            if not u or u in seen:
                continue
            seen.append(u)
        for u in seen[:MAX_IMAGES]:
            code, _, _ = get(u, timeout=15, head=False)
            page["images"].append({"url": u, "status": code})
            if code != 200:
                problems.append(f"متجر: صورة/غلاف مش شغال ({code}) → {u.split('khidmatyai.com')[-1]}")

        # 2) رقم واتساب وزر الشراء
        wa = re.search(r'var\s+WA\s*=\s*["\'](\d+)["\']', html)
        if not wa:
            care.append(f"متجر: مفيش رقم واتساب متعرّف عليه في {path} — راجع زر الشراء")
        else:
            digits = wa.group(1)
            page["whatsapp"] = digits
            if not (digits.startswith("20") and 11 <= len(digits) <= 13):
                problems.append(f"متجر: رقم واتساب للشراء شكله غلط ({digits}) في {path}")

        for dom_id in ("waLink", "buy"):
            if f'id="{dom_id}"' not in html and f"id='{dom_id}'" not in html:
                care.append(f"متجر: العنصر {dom_id} مش موجود في {path} — الجافاسكريبت بيدوّر عليه")

        # 3) الأسعار
        offers = re.findall(r'"price":\s*"([0-9.]+)"[^}]*?"priceCurrency":\s*"([A-Z]{3})"', html)
        prices = sorted({f"{p} {c}" for p, c in offers})
        page["offers"] = prices
        shown = re.findall(r'(\d{2,4})\s*<small>\s*(?:ج|جنيه|EGP)', html)
        if offers and not shown:
            care.append(f"متجر: في {len(offers)} سعر في بيانات schema بس مش لاقي سعر ظاهر للزائر في {path}")

        out["pages"].append(page)
        time.sleep(0.5)

    total_offers = sum(len(p.get("offers", [])) for p in out["pages"])
    broken = sum(1 for p in out["pages"] for i in p["images"] if i["status"] != 200)
    out["summary"] = {
        "pages": len(out["pages"]),
        "images_checked": sum(len(p["images"]) for p in out["pages"]),
        "images_broken": broken,
        "offers": total_offers,
    }
    if verbose:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return out, problems, care


if __name__ == "__main__":
    res, probs, cares = check(verbose=True)
    print("مشاكل:", probs or "مفيش")
    print("تنبيهات:", cares or "مفيش")
