#!/usr/bin/env python3
"""حارس — يشوف الصفحة زي الزائر، من غير ما يفتح متصفح.

إيه اللي بيكشفه فعلًا:
  • ملفات الموقع (css/js/صور) اللي الصفحة بتطلبها — كلها بترد 200
  • سكربتات الصفحة نفسها: فيها خطأ صياغة؟ (بنمرّرها على node --check)
  • الجافاسكريبت بيدوّر على عنصر (getElementById) مش موجود في الصفحة = زر ميت
  • onclick بينادي دالة مش معرّفة = زر مش شغال
  • لينكات داخلية ميتة (404)
  • العنوان والوصف والـ og وحالة اللغة والاتجاه (RTL)

مفيش متصفح حقيقي هنا — اللي مش مقيس يتكتب «محتاج تأكيد»، مش «تمام».
"""
from __future__ import annotations

import json
import os
import re
import ssl
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://khidmatyai.com"
UA = "hares/3.0 (+khidmatyai.com)"
PAGES = [
    ("/", "الرئيسية"),
    ("/store.html", "المتجر"),
    ("/store-en.html", "المتجر EN"),
    ("/services.html", "دليل الخدمات"),
    ("/offices.html", "خريطة المكاتب"),
    ("/scan/", "Scan Macaron"),
    ("/calc.html", "حاسبة الرسوم"),
]
MAX_ASSETS = 14
MAX_LINKS = 15


def get(url: str, timeout: int = 20) -> tuple[int | None, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            return r.status, r.read(500_000).decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:  # noqa: BLE001
        return None, ""


def abs_url(base: str, ref: str) -> str | None:
    ref = ref.strip()
    if not ref or ref.startswith(("data:", "mailto:", "tel:", "javascript:", "#")):
        return None
    if ref.startswith(("http://", "https://")):
        return ref
    if ref.startswith("//"):
        return "https:" + ref
    return urllib.parse.urljoin(base, ref)


def js_syntax_ok(code: str) -> tuple[bool, str]:
    """node --check على السكربت. لو node مش موجود، بنقول مش مقيس."""
    if not code.strip():
        return True, ""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
        path = f.name
    try:
        r = subprocess.run(["node", "--check", path], capture_output=True, timeout=25)
        if r.returncode == 0:
            return True, ""
        err = r.stderr.decode("utf-8", "ignore")
        m = re.search(r"(SyntaxError:?[^\n]*|Unexpected[^\n]*)", err)
        return False, (m.group(1)[:120] if m else "خطأ صياغة (الرسالة مش واضحة)")
    except FileNotFoundError:
        return True, "unmeasured"
    except Exception:  # noqa: BLE001
        return True, "unmeasured"
    finally:
        os.unlink(path)


def audit_page(path: str, label: str) -> tuple[dict, list[str], list[str]]:
    url = SITE + path
    status, html = get(url)
    problems: list[str] = []
    care: list[str] = []
    row: dict = {"label": label, "path": path, "status": status}
    if status != 200 or not html:
        problems.append(f"صفحة: {label} ({path}) رد {status or 'فشل'}")
        return row, problems, care

    # 1) الملفات اللي الصفحة بتطلبها
    assets: list[str] = []
    for m in re.findall(r'<script[^>]+src="([^"]+)"', html) + re.findall(r'<link[^>]+href="([^"]+)"', html):
        u = abs_url(url, m)
        if u and u.startswith(SITE) and u not in assets and not u.endswith(".html"):
            assets.append(u)
    broken_assets = []
    for a in assets[:MAX_ASSETS]:
        code, _ = get(a, timeout=15)
        if code is None and a.endswith(".css"):
            code_a, _ = get(a, timeout=25)
            code = code_a
        if code != 200:
            broken_assets.append(f"{code} {a.split('khidmatyai.com')[-1]}")
    row["assets"] = len(assets[:MAX_ASSETS])
    row["assets_broken"] = broken_assets
    for b in broken_assets:
        problems.append(f"ملف الموقع مش شغال في {label}: {b}")

    # 2) سكربتات الصفحة: جوّاها وفي ملفات خارجية
    tags = re.findall(r"<script([^>]*)>(.*?)</script>", html, re.S)
    inline: list[str] = []
    external_js: list[str] = []
    for attrs, code in tags:
        low = attrs.lower()
        if "ld+json" in low or "application/json" in low:
            continue
        m_src = re.search(r'src="([^"]+)"', attrs)
        if m_src:
            u = abs_url(url, m_src.group(1))
            if u and u.startswith(SITE):
                _, body = get(u, timeout=20)
                if body:
                    external_js.append(body)
            continue
        if code.strip():
            inline.append(code)

    syntax_errors = []
    unmeasured = False
    for code in inline:
        ok, err = js_syntax_ok(code)
        if err == "unmeasured":
            unmeasured = True
        elif not ok:
            syntax_errors.append(err)
    row["js_errors"] = syntax_errors
    row["external_scripts"] = len(external_js)
    for e in syntax_errors:
        problems.append(f"خطأ جافاسكريبت في {label}: {e}")
    if unmeasured:
        care.append(f"{label}: فحص صياغة الجافاسكريبت محتاج تأكيد (node مش متاح)")

    # 3) الأزرار: عناصر بيدوّر عليها سكربت الصفحة نفسه، ودوال بينادي عليها onclick
    all_js = "\n".join(inline + external_js)
    # العناصر بنقراها من سكربت الصفحة بس — الملف المشترك site-wide بيدوّر على عناصر
    # موجودة في صفحات تانية، فاتهامه = إنذار كاذب.
    inline_js = "\n".join(inline)
    ids_used = {
        i
        for i in re.findall(r"getElementById\(\s*['\"]([\w-]+)['\"]", inline_js)
        if i and not i.endswith("-")
    }
    ids_present = set(re.findall(r'id="([\w-]+)"', html)) | set(re.findall(r"id='([\w-]+)'", html))
    missing_ids = sorted(ids_used - ids_present)
    row["missing_ids"] = missing_ids
    for i in missing_ids:
        care.append(f"{label}: سكربت الصفحة بيدوّر على #{i} ومش موجود — محتاج تأكيد (ممكن يكون متحمي بشرط)")

    called = set(re.findall(r'on(?:click|change|submit)="\s*([A-Za-z_$][\w$]*)\s*\(', html))
    defined = set(re.findall(r"function\s+([A-Za-z_$][\w$]*)\s*\(", all_js)) | set(
        re.findall(r"(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\()", all_js)
    ) | set(re.findall(r"window\.([A-Za-z_$][\w$]*)\s*=", all_js))
    missing_fns = sorted(called - defined)
    row["missing_functions"] = missing_fns
    for f in missing_fns:
        problems.append(f"زر ميت في {label}: بينادي {f}() وهي مش معرّفة")

    # 4) لينكات داخلية ميتة
    links = []
    for href in re.findall(r'href="([^"]+)"', html):
        if "'+" in href or '"+' in href or "${" in href:
            continue
        u = abs_url(url, href)
        if u and u.startswith(SITE) and u not in links:
            links.append(u)
    dead = []
    for u in links[:MAX_LINKS]:
        code, _ = get(u, timeout=15)
        if code != 200:
            dead.append(f"{code} {u.split('khidmatyai.com')[-1] or '/'}")
    row["dead_internal_links"] = dead
    for d in dead:
        problems.append(f"لينك داخلي ميت في {label}: {d}")

    # 5) الأساسيات
    title = re.search(r"<title>(.*?)</title>", html, re.S)
    t = re.sub(r"\s+", " ", title.group(1)).strip() if title else ""
    row["title"] = t
    if not (8 <= len(t) <= 75):
        care.append(f"{label}: العنوان طوله {len(t)} حرف — راجع الـ SEO")
    if not re.search(r'<meta[^>]+name="description"', html):
        care.append(f"{label}: مفيش وصف meta description")
    if not re.search(r'<meta[^>]+property="og:(title|image)"', html):
        care.append(f"{label}: مفيش بطاقة مشاركة og")
    has_lang = bool(re.search(r"<html[^>]+lang=", html))
    row["lang"] = "ar" if re.search(r'<html[^>]+lang="ar', html) else ("?" if has_lang else None)
    if not has_lang:
        problems.append(f"{label}: علامة <html> من غير lang — بيأثر على القارئ الصوتي والسيو")
    if row["lang"] == "ar" and not re.search(r'<html[^>]+dir="rtl"', html) and "body{" not in html:
        care.append(f"{label}: صفحة عربي من غير dir=\"rtl\" على <html>")

    return row, problems, care


def check() -> tuple[dict, list[str], list[str]]:
    rows, problems, care = [], [], []
    for path, label in PAGES:
        row, p, c = audit_page(path, label)
        rows.append(row)
        problems += p
        care += c
    summary = {
        "pages": len(rows),
        "dead_buttons": sum(len(r.get("missing_ids", [])) + len(r.get("missing_functions", [])) for r in rows),
        "js_errors": sum(len(r.get("js_errors", [])) for r in rows),
        "dead_links": sum(len(r.get("dead_internal_links", [])) for r in rows),
        "broken_assets": sum(len(r.get("assets_broken", [])) for r in rows),
    }
    return {"pages": rows, "summary": summary}, problems, care


if __name__ == "__main__":
    res, probs, cares = check()
    print(json.dumps(res, ensure_ascii=False, indent=2))
    print("مشاكل:", probs or "مفيش")
    print("تنبيهات:", cares or "مفيش")
