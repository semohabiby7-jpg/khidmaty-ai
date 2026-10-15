#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""بناء PDF لكتاب 'اصنع مستقبلك الذكي' من ملفات Markdown."""
import os
import re
import html
from weasyprint import HTML

BASE = os.path.dirname(os.path.abspath(__file__))

# ترتيب الملفات
FILES = [
    ("content-ar.md", None),
    ("chapter-2.md", "الفصل الثاني"),
    ("chapter-3.md", "الفصل الثالث"),
    ("chapter-4.md", "الفصل الرابع"),
    ("chapter-5.md", "الفصل الخامس"),
    ("chapter-6.md", "الفصل السادس"),
    ("chapter-7-and-conclusion.md", "الفصل السابع والخاتمة"),
]

# خريطة صور بداية كل فصل/مقدمة
IMAGE_MAP = {
    "المقدمة": "intro.jpg",
    "الفصل الأول": "ch1.jpg",
    "الفصل الثاني": "ch2.jpg",
    "الفصل الثالث": "ch3.jpg",
    "الفصل الرابع": "ch4.jpg",
    "الفصل الخامس": "ch5.jpg",
    "الفصل السادس": "ch6.jpg",
    "الفصل السابع": "ch7.jpg",
}

def md_to_body(md):
    """تحويل محتوى Markdown إلى HTML بسيط (عناوين، قوائم، جداول، صور، كود)."""
    lines = md.split("\n")
    out = []
    in_ul = False
    in_ol = False
    in_table = False
    in_code = False
    for raw in lines:
        line = raw.rstrip()
        # كود مسوّر ```
        if line.strip().startswith("```"):
            if in_code:
                out.append("</code></pre>")
                in_code = False
            else:
                if in_ul: out.append("</ul>"); in_ul = False
                if in_ol: out.append("</ol>"); in_ol = False
                if in_table: out.append("</table>"); in_table = False
                out.append('<pre class="code"><code>')
                in_code = True
            continue
        if in_code:
            out.append(html.escape(raw))
            continue
        # خط أفقي
        if re.match(r'^---+\s*$', line):
            if in_ul: out.append("</ul>"); in_ul = False
            if in_ol: out.append("</ol>"); in_ol = False
            if in_table:
                out.append("</table>"); in_table = False
            out.append('<hr class="sep"/>')
            continue
        # صورة ![alt](url)
        m_img = re.match(r'^!\[(.*?)\]\((.*?)\)\s*$', line)
        if m_img:
            if in_ul: out.append("</ul>"); in_ul = False
            if in_ol: out.append("</ol>"); in_ol = False
            if in_table: out.append("</table>"); in_table = False
            alt = html.escape(m_img.group(1))
            src = m_img.group(2)
            out.append(f'<figure class="illust"><img src="{src}" alt="{alt}"/><figcaption>{alt}</figcaption></figure>')
            continue
        # عنوان
        m = re.match(r'^(#{1,3})\s+(.*)', line)
        if m:
            if in_ul: out.append("</ul>"); in_ul = False
            if in_ol: out.append("</ol>"); in_ol = False
            if in_table: out.append("</table>"); in_table = False
            lvl = len(m.group(1))
            txt = inline(m.group(2))
            out.append(f'<h{lvl}>{txt}</h{lvl}>')
            # إدراج صورة توضيحية بعد عنوان الفصل/المقدمة
            if lvl == 1:
                raw_title = m.group(2)
                for kw, img in IMAGE_MAP.items():
                    if kw in raw_title:
                        img_path = "file://" + os.path.join(BASE, "images", img)
                        out.append(f'<figure class="chap-img"><img src="{img_path}"/></figure>')
                        break
            continue
        # جدول
        if line.startswith("|") and "|" in line[1:]:
            cells = [c.strip() for c in line.strip("|").split("|")]
            if all(re.match(r'^:?-+:?$', c) for c in cells):
                continue
            if not in_table:
                out.append('<table>'); in_table = True
            row = "".join(f'<td>{inline(c)}</td>' for c in cells)
            out.append(f'<tr>{row}</tr>')
            continue
        else:
            if in_table:
                out.append("</table>"); in_table = False
        # قائمة نقطية
        if re.match(r'^[-*]\s+', line):
            if not in_ul:
                if in_ol: out.append("</ol>"); in_ol = False
                out.append("<ul>"); in_ul = True
            txt = inline(re.sub(r'^[-*]\s+', '', line))
            out.append(f'<li>{txt}</li>')
            continue
        # قائمة رقمية
        if re.match(r'^\d+\.\s+', line):
            if not in_ol:
                if in_ul: out.append("</ul>"); in_ul = False
                out.append("<ol>"); in_ol = True
            txt = inline(re.sub(r'^\d+\.\s+', '', line))
            out.append(f'<li>{txt}</li>')
            continue
        # فقرة أو سطر فارغ
        if in_ul: out.append("</ul>"); in_ul = False
        if in_ol: out.append("</ol>"); in_ol = False
        if line.strip() == "":
            continue
        out.append(f'<p>{inline(line)}</p>')
    if in_ul: out.append("</ul>")
    if in_ol: out.append("</ol>")
    if in_table: out.append("</table>")
    if in_code: out.append("</code></pre>")
    return "\n".join(out)

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*(.+?)\*', r'<em>\1</em>', t)
    return t

def main():
    cover_img = os.path.join(BASE, "cover-final.webp")
    cover_url = "file://" + cover_img if os.path.exists(cover_img) else None

    body_parts = []
    # صفحة الغلاف
    if cover_url:
        body_parts.append(f'<section class="cover"><img src="{cover_url}"/></section>')
    else:
        body_parts.append('<section class="cover-text"><h1>اصنع مستقبلك الذكي</h1><p class="author">M. Ismail</p></section>')

    # فهرس
    toc = ['<section class="toc"><h1>الفهرس</h1><ul>']
    toc.append('<li>المقدمة: المستقبل بيُصنع دلوقتي</li>')
    toc.extend([
        '<li>الفصل الأول: الذكاء الاصطناعي — سلاحك مش عدوك</li>',
        '<li>الفصل الثاني: أدوات الـAI المجانية</li>',
        '<li>الفصل الثالث: وظّف الـAI في شغلك</li>',
        '<li>الفصل الرابع: القرار الذكي بالـAI</li>',
        '<li>الفصل الخامس: اصنع محتوى بـAI</li>',
        '<li>الفصل السادس: مستقبل الشغل في عصر الـAI</li>',
        '<li>الفصل السابع: خطة مستقبلك الذكي</li>',
        '<li>الخاتمة: المستقبل ليك</li>',
    ])
    toc.append('</ul></section>')
    body_parts.append("\n".join(toc))

    # المحتوى
    for fname, _ in FILES:
        path = os.path.join(BASE, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            md = f.read()
        body_parts.append(f'<section class="chapter">{md_to_body(md)}</section>')

    body_html = "\n".join(body_parts)

    full = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>اصنع مستقبلك الذكي — M. Ismail</title>
<style>
@page {{
  size: A4;
  margin: 2cm 2cm 2cm 2cm;
  @bottom-center {{ content: counter(page); font-family: 'Noto Naskh Arabic'; font-size: 10pt; color: #888; }}
}}
@page :first {{ margin: 0; @bottom-center {{ content: none; }} }}
* {{ box-sizing: border-box; }}
body {{
  font-family: 'Noto Naskh Arabic', 'Noto Sans Arabic', serif;
  font-size: 12pt;
  line-height: 1.9;
  color: #1a1a2e;
  direction: rtl;
}}
.cover {{
  page: cover;
  page-break-after: always;
  text-align: center;
  margin: -2cm;
}}
.cover img {{
  width: 100%;
  height: 100vh;
  object-fit: cover;
  display: block;
}}
.cover-text {{
  page-break-after: always;
  text-align: center;
  padding-top: 30%;
}}
.cover-text h1 {{ font-size: 36pt; color: #0d1b3e; margin-bottom: 0.4em; }}
.cover-text .author {{ font-size: 18pt; color: #c9a227; font-weight: bold; }}
.toc {{ page-break-after: always; }}
.toc h1 {{
  font-family: 'Noto Kufi Arabic';
  font-size: 22pt;
  color: #0d1b3e;
  text-align: center;
  border-bottom: 3px solid #c9a227;
  padding-bottom: 10px;
  margin-bottom: 20px;
}}
.toc ul {{ list-style: none; padding: 0; font-size: 13pt; }}
.toc li {{ padding: 6px 0; border-bottom: 1px dashed #ddd; }}
.chapter {{ }}
h1 {{
  font-family: 'Noto Kufi Arabic';
  font-size: 24pt;
  color: #0d1b3e;
  text-align: center;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  page-break-after: avoid;
}}
h2 {{
  font-family: 'Noto Kufi Arabic';
  font-size: 17pt;
  color: #1a4b8c;
  margin-top: 1em;
  margin-bottom: 0.4em;
  page-break-after: avoid;
  border-right: 5px solid #c9a227;
  padding-right: 10px;
}}
h3 {{
  font-size: 14pt;
  color: #2a3f6e;
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  page-break-after: avoid;
}}
p {{ margin: 0 0 0.7em 0; text-align: justify; }}
strong {{ color: #0d1b3e; }}
ul, ol {{ margin: 0.5em 0 0.9em 0; padding-right: 1.5em; }}
li {{ margin-bottom: 0.35em; }}
hr.sep {{
  border: none;
  border-top: 2px solid #e6c34d;
  margin: 1.2em 0;
  width: 40%;
  margin-right: 30%;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  font-size: 11pt;
}}
td {{
  border: 1px solid #c9d4e6;
  padding: 6px 8px;
  text-align: right;
}}
tr:nth-child(even) td {{ background: #f4f7fc; }}
figure.illust {{
  text-align: center;
  margin: 1.3em 0;
  page-break-inside: avoid;
}}
figure.illust img {{
  max-width: 72%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 6px 22px rgba(13,27,62,0.28);
}}
figure.illust figcaption {{
  font-size: 10pt;
  color: #7a8499;
  margin-top: 0.4em;
  font-style: italic;
}}
figure.chap-img {{
  text-align: center;
  margin: 0.2em 0 1.4em 0;
  page-break-inside: avoid;
}}
figure.chap-img img {{
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 26px rgba(13,27,62,0.35);
  border: 1px solid #1a4b8c;
}}
pre.code {{
  direction: ltr;
  text-align: left;
  background: #f4f7fc;
  border: 1px solid #c9d4e6;
  border-right: 4px solid #1a4b8c;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'DejaVu Sans Mono', monospace;
  font-size: 10pt;
  white-space: pre;
  page-break-inside: avoid;
  color: #1a1a2e;
}}
pre.code code {{ font-family: inherit; }}
</style>
</head>
<body>
{body_html}
</body>
</html>"""

    out_html = os.path.join(BASE, "book-print.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(full)

    out_pdf = os.path.join(BASE, "اصنع-مستقبلك-الذكي.pdf")
    HTML(string=full, base_url=BASE).write_pdf(out_pdf)
    print("PDF:", out_pdf)
    print("Size:", os.path.getsize(out_pdf), "bytes")

if __name__ == "__main__":
    main()
