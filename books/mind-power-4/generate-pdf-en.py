#!/usr/bin/env python3
"""Generate PDF for Mind Power Book 4 — English."""
import markdown
from weasyprint import HTML
import os

BOOK_DIR = "/home/user/workspace/khidmaty-ai-push/books/mind-power-4"
EN_DIR = os.path.join(BOOK_DIR, "en")
OUTPUT_PDF = os.path.join(BOOK_DIR, "Mind-Power-4-EN.pdf")

# Chapter files in order
chapters = [
    ("00-introduction.md", "Introduction"),
    ("01-i-was-driven.md", "Chapter One"),
    ("02-i-felt.md", "Chapter Two"),
    ("03-i-stopped.md", "Chapter Three"),
    ("04-i-unpacked.md", "Chapter Four"),
    ("05-i-decided.md", "Chapter Five"),
    ("06-i-drove.md", "Chapter Six"),
    ("07-the-stories.md", "Chapter Seven"),
    ("08-the-end.md", "Chapter Eight"),
]

# Build HTML content
html_parts = []

for filename, label in chapters:
    filepath = os.path.join(EN_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    
    # Convert markdown to HTML
    md = markdown.markdown(text, extensions=["extra", "nl2br"])
    html_parts.append(md)

# Combine all chapters
body_html = "\n\n".join(html_parts)

# Full HTML with English-friendly CSS (LTR)
full_html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<style>
@page {{
    size: A4;
    margin: 2.5cm 2cm;
    @bottom-center {{
        content: counter(page);
        font-family: "Georgia", "Times New Roman", serif;
        font-size: 11pt;
        color: #666;
    }}
}}

@page :first {{
    @bottom-center {{ content: none; }}
}}

body {{
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 14pt;
    line-height: 1.9;
    color: #1a1a1a;
    text-align: justify;
    direction: ltr;
}}

h1 {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 22pt;
    color: #8B6914;
    text-align: center;
    margin-top: 2cm;
    margin-bottom: 1cm;
    border-bottom: 2px solid #F4CD66;
    padding-bottom: 15px;
    page-break-before: always;
}}

h1:first-of-type {{
    page-break-before: avoid;
}}

h2 {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 17pt;
    color: #8B6914;
    margin-top: 1.5cm;
    margin-bottom: 0.5cm;
}}

h3 {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 14pt;
    color: #555;
    margin-top: 1cm;
    margin-bottom: 0.3cm;
}}

p {{
    margin-bottom: 0.8em;
    text-align: justify;
}}

strong {{
    color: #8B6914;
    font-weight: bold;
}}

hr {{
    border: none;
    text-align: center;
    margin: 1.5cm 0;
}}

hr::before {{
    content: "◆ ◆ ◆";
    color: #F4CD66;
    font-size: 12pt;
    letter-spacing: 8px;
}}

blockquote {{
    border-left: 4px solid #F4CD66;
    padding-left: 20px;
    margin: 1cm 0;
    color: #555;
    font-style: italic;
}}

ol, ul {{
    margin-left: 2em;
    margin-bottom: 1em;
}}

li {{
    margin-bottom: 0.5em;
}}

/* Cover page */
.cover-page {{
    page-break-after: always;
    text-align: center;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}}

.cover-page .series {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 28pt;
    color: #F4CD66;
    margin-bottom: 10px;
    letter-spacing: 2px;
}}

.cover-page .number {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 48pt;
    color: #F4CD66;
    margin: 15px 0 5px 0;
}}

.cover-page .part-label {{
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 14pt;
    color: #F4CD66;
    opacity: 0.7;
    margin-bottom: 40px;
}}

.cover-page .main-title {{
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 36pt;
    color: #F4CD66;
    margin: 20px 0;
}}

.cover-page .subtitle {{
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 16pt;
    color: #F4CD66;
    opacity: 0.7;
    margin-bottom: 50px;
}}

.cover-page .author {{
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 18pt;
    color: #F4CD66;
    opacity: 0.85;
    margin-top: 30px;
}}

.cover-page .ornament {{
    color: #F4CD66;
    font-size: 12pt;
    letter-spacing: 6px;
    margin: 10px 0;
}}
</style>
</head>
<body>

<div class="cover-page">
    <div class="series">MIND POWER</div>
    <div class="ornament">◆ ◆ ◆</div>
    <div class="number">4</div>
    <div class="part-label">Part Four</div>
    <div class="main-title">Who's Driving?</div>
    <div class="subtitle">Managing Emotions and Decisions</div>
    <div class="ornament">◆ ◆ ◆</div>
    <div class="author">M. Ismail</div>
</div>

{body_html}

</body>
</html>"""

# Write HTML file for reference
html_path = os.path.join(BOOK_DIR, "Mind-Power-4-EN.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

# Generate PDF
print("Generating PDF...")
HTML(string=full_html, base_url=BOOK_DIR).write_pdf(OUTPUT_PDF)
print(f"Done! PDF saved to: {OUTPUT_PDF}")
print(f"Size: {os.path.getsize(OUTPUT_PDF) / 1024:.1f} KB")
