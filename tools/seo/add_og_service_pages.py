#!/usr/bin/env python3
"""إضافة وسوم المشاركة (Open Graph + Twitter) لصفحات الخدمات.

بيقرا title و description من كل صفحة، ويحط وسوم المشاركة بعد سطر الـcanonical.
آمن للتشغيل أكتر من مرة: لو الوسوم موجودة بيتخطاها.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICES = ROOT / "services"
BASE = "https://khidmatyai.com"
IMAGE = f"{BASE}/assets/brand-logo.jpeg"
SITE_NAME = "خِدْمَتي AI"
MARKER = 'property="og:title"'


def pick(pattern: str, html: str) -> str:
    m = re.search(pattern, html, re.S)
    return m.group(1).strip() if m else ""


def build_block(title: str, desc: str, url: str) -> str:
    title = title.replace('"', "&quot;")
    desc = desc.replace('"', "&quot;")
    return "\n".join(
        [
            f'<meta property="og:title" content="{title}">',
            f'<meta property="og:description" content="{desc}">',
            '<meta property="og:type" content="article">',
            f'<meta property="og:url" content="{url}">',
            f'<meta property="og:image" content="{IMAGE}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            f'<meta property="og:site_name" content="{SITE_NAME}">',
            '<meta property="og:locale" content="ar_EG">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{title}">',
            f'<meta name="twitter:description" content="{desc}">',
            f'<meta name="twitter:image" content="{IMAGE}">',
        ]
    )


def main() -> int:
    pages = sorted(SERVICES.glob("*.html"))
    done = skipped = failed = 0

    for page in pages:
        html = page.read_text(encoding="utf-8")
        if MARKER in html:
            skipped += 1
            continue

        title = pick(r"<title>(.*?)</title>", html)
        desc = pick(r'<meta\s+name="description"\s+content="([^"]*)"', html)
        url = pick(r'<link\s+rel="canonical"\s+href="([^"]*)"', html)
        if not (title and desc and url):
            print(f"SKIP (ناقص عنوان/وصف/canonical): {page.name}")
            failed += 1
            continue

        canonical_tag = re.search(r'<link\s+rel="canonical"[^>]*>', html)
        block = build_block(title, desc, url)
        html = html[: canonical_tag.end()] + "\n" + block + html[canonical_tag.end() :]
        page.write_text(html, encoding="utf-8")
        done += 1

    print(f"اتعدّل: {done} · موجود بالفعل: {skipped} · فشل: {failed} · الإجمالي: {len(pages)}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
