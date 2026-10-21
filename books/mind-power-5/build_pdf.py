#!/usr/bin/env python3
"""
توليد PDF لكتاب «تسيب إيه؟» — الجزء الخامس من سلسلة قوة العقل
يحوّل كل ملفات markdown لـ PDF مع الغلاف في الصفحة الأولى
"""
import markdown
from weasyprint import HTML
from PIL import Image
import os
import base64

book_dir = "/home/user/workspace/khidmaty-ai-push/books/mind-power-5"
cover_webp = os.path.join(book_dir, "cover-final.webp")
cover_png = os.path.join(book_dir, "cover-final.png")

# ─── تحويل الغلاف لـ PNG (weasyprint بيدعم PNG أحسن) ───
img = Image.open(cover_webp)
img.convert("RGB").save(cover_png, "PNG")
print(f"تم تحويل الغلاف لـ PNG: {cover_png}")

# تحويل الغلاف لـ base64
with open(cover_png, "rb") as f:
    cover_b64 = base64.b64encode(f.read()).decode()

# ─── ترتيب الفصول ───
chapters = [
    "00-المقدمة.md",
    "01-شفت-النص.md",
    "02-سيّبت.md",
    "03-نسيت.md",
    "04-تحملت.md",
    "05-بدأت.md",
    "06-كمّلت.md",
    "07-القصص.md",
    "08-النهاية.md",
]

# ─── تحويل markdown لـ HTML ───
html_content = ""
for ch in chapters:
    path = os.path.join(book_dir, ch)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        html_content += markdown.markdown(text, extensions=['extra', 'sane_lists']) + "\n"
    else:
        print(f"تحذير: مفقود {ch}")

# ─── CSS ───
css = """
@font-face {
    font-family: 'Amiri';
    src: url('file:///usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf');
    font-weight: normal;
}
@font-face {
    font-family: 'Amiri';
    src: url('file:///usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Bold.ttf');
    font-weight: bold;
}
@font-face {
    font-family: 'NotoKufi';
    src: url('file:///usr/share/fonts/truetype/noto/NotoKufiArabic-Regular.ttf');
    font-weight: normal;
}
@font-face {
    font-family: 'NotoKufi';
    src: url('file:///usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf');
    font-weight: bold;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Amiri', serif;
    font-size: 13pt;
    line-height: 1.9;
    color: #1a1a1a;
    direction: rtl;
    text-align: right;
}
h1 {
    font-family: 'NotoKufi', sans-serif;
    font-size: 22pt;
    color: #1a1a2e;
    text-align: center;
    margin-top: 40px;
    margin-bottom: 30px;
    page-break-before: always;
}
h1:first-of-type { page-break-before: avoid; }
h2 {
    font-family: 'NotoKufi', sans-serif;
    font-size: 17pt;
    color: #16213e;
    margin-top: 25px;
    margin-bottom: 15px;
}
h3 {
    font-family: 'NotoKufi', sans-serif;
    font-size: 14pt;
    color: #0f3460;
    margin-top: 18px;
    margin-bottom: 10px;
}
p {
    margin-bottom: 10px;
    text-align: justify;
}
strong { color: #0f3460; }
blockquote {
    border-right: 4px solid #d4a843;
    padding: 10px 15px 10px 0;
    margin: 15px 0;
    color: #444;
    background: #f9f6ef;
}
.cover-page {
    page-break-after: always;
    text-align: center;
    width: 100%;
    height: 100vh;
}
.cover-page img {
    width: 100%;
    max-height: 100vh;
    object-fit: contain;
}
hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 20px 0;
}
"""

# ─── HTML كامل ───
full_html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>{css}</style>
</head>
<body>
<div class="cover-page">
    <img src="data:image/png;base64,{cover_b64}" alt="غلاف">
</div>
{html_content}
</body>
</html>"""

# ─── حفظ HTML ───
html_path = os.path.join(book_dir, "book.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

# ─── تحويل لـ PDF ───
pdf_path = os.path.join(book_dir, "تسيب-إيه.pdf")
HTML(string=full_html, base_url=book_dir).write_pdf(pdf_path)
print(f"تم حفظ PDF: {pdf_path}")
print(f"الحجم: {os.path.getsize(pdf_path) / 1024:.0f} KB")
