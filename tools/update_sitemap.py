#!/usr/bin/env python3
"""
update_sitemap.py — أتمتة تحديث sitemap.xml
==========================================
يمسح كل صفحات .html في الريبو → يولّد sitemap.xml جديد تلقائيًا.

القواعد:
  - index.html  → https://khidmatyai.com/        (priority 0.6)
  - الصفحات الرئيسية (about, articles, ...)      → priority 0.6
  - services/*.html                            → priority 0.8
  - offices/**/*.html                          → priority 0.8
  - dashboard.html مستثناة (صفحة داخلية)
  - lastmod = تاريخ اليوم
  - changefreq = monthly

الاستخدام:
  python3 tools/update_sitemap.py
  python3 tools/update_sitemap.py --dry-run    # يطبع الملخص بدون كتابة
"""

import os
import sys
from datetime import date

# === الإعدادات ===
BASE_URL = "https://khidmatyai.com"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP_PATH = os.path.join(REPO_ROOT, "sitemap.xml")
TODAY = date.today().isoformat()

# صفحات مستثناة من الفهرسة (داخلية / غير عامة)
EXCLUDED = {"dashboard.html"}

# مجلدات مستثناة (محتوى داخلي مش صفحات موقع)
EXCLUDED_DIRS = {"books"}

# الصفحات الرئيسية — priority 0.6
MAIN_PAGES = {
    "index.html", "about.html", "articles.html", "calc.html",
    "contact.html", "faq.html", "journeys.html", "offices.html",
    "privacy.html", "services.html", "social.html", "store.html",
    "terms.html",
}


def collect_html_files():
    """يمسح الريبو ويجمع كل ملفات .html (ما عدا المستثناة و .git)."""
    pages = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # تخطّي .git والمجلدات المستثناة
        dirs[:] = [d for d in dirs if d != ".git" and d not in EXCLUDED_DIRS]
        for f in files:
            if not f.endswith(".html"):
                continue
            if f in EXCLUDED:
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, REPO_ROOT).replace(os.sep, "/")
            pages.append(rel)
    pages.sort()
    return pages


def url_entry(loc, priority):
    """يبني عنصر <url> واحد."""
    return (
        "  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>"
    )


def build_url_list(pages):
    """يحوّل المسارات لـ URLs كاملة + يحدد الأولوية."""
    entries = []
    for rel in pages:
        if rel == "index.html":
            entries.append(url_entry(f"{BASE_URL}/", "0.6"))
        elif rel in MAIN_PAGES:
            entries.append(url_entry(f"{BASE_URL}/{rel}", "0.6"))
        elif rel.startswith("services/"):
            entries.append(url_entry(f"{BASE_URL}/{rel}", "0.8"))
        elif rel.startswith("offices/"):
            entries.append(url_entry(f"{BASE_URL}/{rel}", "0.8"))
        else:
            # أي صفحة جديدة تظهر تلقائيًا بـ 0.6
            entries.append(url_entry(f"{BASE_URL}/{rel}", "0.6"))
    return entries


def main():
    dry = "--dry-run" in sys.argv
    pages = collect_html_files()
    entries = build_url_list(pages)

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )

    # إحصائيات
    main_n = sum(1 for p in pages if p in MAIN_PAGES or p == "index.html")
    svc_n = sum(1 for p in pages if p.startswith("services/"))
    off_n = sum(1 for p in pages if p.startswith("offices/"))
    other_n = len(pages) - main_n - svc_n - off_n

    if dry:
        print("=== DRY RUN ===")
    print(f"تاريخ lastmod: {TODAY}")
    print(f"إجمالي URLs: {len(pages)}")
    print(f"  • صفحات رئيسية: {main_n}")
    print(f"  • خدمات: {svc_n}")
    print(f"  • مكاتب: {off_n}")
    if other_n:
        print(f"  • أخرى: {other_n}")
    print(f"مستثناة: {len(EXCLUDED)} ({', '.join(EXCLUDED)})")

    if dry:
        print("\n(--dry-run — مفيش كتابة)")
        return

    with open(SITEMAP_PATH, "w", encoding="utf-8") as fh:
        fh.write(xml)
    print(f"\n✅ تم تحديث sitemap.xml ({len(pages)} URL)")


if __name__ == "__main__":
    main()
