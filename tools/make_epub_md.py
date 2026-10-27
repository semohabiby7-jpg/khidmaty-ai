#!/usr/bin/env python3
# تحويل سلسلة «قوة العقل» (Markdown) → EPUB لـAmazon KDP (نسخة ثنائية اللغة v2)
# الاستخدام: python3 tools/make_epub_md.py <book_num> <src_dir> <cover> <title> <lang>
# التحسينات: direction تلقائي (rtl للعربي / ltr للإنجليزي) + خطوط مناسبة + المؤلف = محمد إسماعيل + rights ثنائي
import os, sys, re, zipfile, uuid
import html as html_mod
import markdown
from bs4 import BeautifulSoup
from PIL import Image

book_num = sys.argv[1]
SRC_DIR = sys.argv[2]
COVER_SRC = sys.argv[3]
TITLE = sys.argv[4]
LANG = sys.argv[5]

# إعدادات ثنائية اللغة
DIR = "rtl" if LANG == "ar" else "ltr"
AUTHOR = "محمد إسماعيل عبد العزيز" if LANG == "ar" else "Mohamed Ismail Abdelaziz"
PUBLISHER = "خِدْمَتي AI"
TOC_TITLE = "فهرس المحتويات" if LANG == "ar" else "Table of Contents"
COVER_ALT = "غلاف" if LANG == "ar" else "Cover"
SERIES_TAG = "سلسلة قوة العقل · 2026" if LANG == "ar" else "Power of Mind Series · 2026"
RIGHTS = "© 2026 خِدْمَتي AI. جميع الحقوق محفوظة." if LANG == "ar" else "© 2026 Khidmaty AI. All rights reserved."

OUT = f"books/mind-power-{book_num}-{LANG}.epub"
COVER_OUT = f"books/cover-mp{book_num}-{LANG}.jpg"
UID = "urn:uuid:" + str(uuid.uuid4())

# 1) غلاف KDP 1600x2560 (نسبة 1:1.6 = الحد الأدنى المثالي)
print(f"① غلاف الكتاب {book_num} ({LANG})...")
c = Image.open(COVER_SRC).convert("RGB")
canvas = Image.new("RGB", (1600, 2560), "white")
w0,h0 = c.size
new_h = int(1600*h0/w0)
if new_h > 2560: new_h=2560; new_w=int(2560*w0/h0)
else: new_w=1600
c2 = c.resize((new_w, new_h), Image.LANCZOS)
canvas.paste(c2, ((1600-new_w)//2,(2560-new_h)//2))
canvas.save(COVER_OUT,"JPEG",dpi=(300,300),quality=92)
print(f"   غلاف {canvas.size} 300dpi")

# 2) قراءة ملفات Markdown بالترتيب
print("② تحليل فصول Markdown...")
md_files = sorted(f for f in os.listdir(SRC_DIR) if f.endswith(".md"))
print(f"   {len(md_files)} ملف: {md_files[:3]}...")
chapters = []
for md in md_files:
    path = os.path.join(SRC_DIR, md)
    text = open(path, encoding="utf-8").read()
    html_body = markdown.markdown(text, extensions=["tables","fenced_code","attr_list"])
    soup = BeautifulSoup(html_body, "lxml")
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)
    else:
        title = os.path.splitext(md)[0].replace("-"," ")
    chapters.append((title, html_body))
print(f"   {len(chapters)} فصل")

# 3) CSS ثنائي اللغة
if LANG == "ar":
    CSS = """@charset "utf-8";
html{direction:rtl;}
body{font-family:'Amiri','Traditional Arabic','Arial',serif;line-height:1.9;margin:5% 8%;text-align:justify;color:#1a1a1a;}
h1{font-size:1.6em;color:#7b2d26;border-bottom:2px solid #7b2d26;padding-bottom:.3em;margin:1.5em 0 .8em;page-break-before:always;}
h2{font-size:1.25em;color:#a04030;margin:1.2em 0 .5em;}
h3{font-size:1.08em;color:#b8553a;margin:1em 0 .4em;}
p{margin:.6em 0;text-align:justify;}
blockquote{border-right:4px solid #a04030;margin:1em 0;padding:.5em 1em;background:#fbf4f4;color:#333;font-style:italic;}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.9em;}
th,td{border:1px solid #ccc;padding:.4em .6em;text-align:right;}
th{background:#7b2d26;color:#fff;}
code{background:#f0f0f0;padding:.1em .3em;direction:ltr;}
ul,ol{padding-right:1.5em;}
li{margin:.3em 0;}
strong{color:#5a1f1a;}
"""
else:
    CSS = """@charset "utf-8";
html{direction:ltr;}
body{font-family:'Georgia','Times New Roman',serif;line-height:1.7;margin:5% 8%;text-align:justify;color:#1a1a1a;}
h1{font-size:1.6em;color:#7b2d26;border-bottom:2px solid #7b2d26;padding-bottom:.3em;margin:1.5em 0 .8em;page-break-before:always;}
h2{font-size:1.25em;color:#a04030;margin:1.2em 0 .5em;}
h3{font-size:1.08em;color:#b8553a;margin:1em 0 .4em;}
p{margin:.6em 0;text-align:justify;}
blockquote{border-left:4px solid #a04030;margin:1em 0;padding:.5em 1em;background:#fbf4f4;color:#333;font-style:italic;}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.9em;}
th,td{border:1px solid #ccc;padding:.4em .6em;text-align:left;}
th{background:#7b2d26;color:#fff;}
code{background:#f0f0f0;padding:.1em .3em;direction:ltr;}
ul,ol{padding-left:1.5em;}
li{margin:.3em 0;}
strong{color:#5a1f1a;}
"""

def xhtml(title, inner, nav=False):
    epub_ns = ' xmlns:epub="http://www.idpf.org/2007/ops"' if nav else ''
    return (f'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml" lang="{LANG}" dir="{DIR}"{epub_ns}>\n'
            f'<head><meta charset="utf-8"/><title>{html_mod.escape(title)}</title>\n'
            f'<link rel="stylesheet" type="text/css" href="style.css"/></head>\n'
            f'<body>\n{inner}\n</body></html>')

title_page = xhtml(TITLE,
    f'<h1 style="border:none;text-align:center;font-size:2.2em;color:#7b2d26;page-break-before:avoid;">{html_mod.escape(TITLE)}</h1>'
    f'<p style="text-align:center;font-size:1.3em;color:#666;margin-top:2em;">{html_mod.escape(AUTHOR)}</p>'
    f'<p style="text-align:center;color:#999;margin-top:6em;">{SERIES_TAG}</p>')

toc_items = "\n".join(f'<li><a href="ch{i:02d}.xhtml">{html_mod.escape(t)}</a></li>' for i,(t,_) in enumerate(chapters))
toc_page = xhtml(TOC_TITLE, f"<h1>{TOC_TITLE}</h1><ul>{toc_items}</ul>")
nav_page = xhtml(TOC_TITLE, f'<nav epub:type="toc" id="toc"><h1>{TOC_TITLE}</h1><ol>{toc_items}</ol></nav>', nav=True)

chapter_files = [(f"ch{i:02d}.xhtml", xhtml(t, inner)) for i,(t,inner) in enumerate(chapters)]

# content.opf (EPUB 3)
man = ['<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
       '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>',
       '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
       '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>',
       '<item id="css" href="style.css" media-type="text/css"/>',
       '<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>']
for fn,_ in chapter_files:
    man.append(f'<item id="{fn[:-6]}" href="{fn}" media-type="application/xhtml+xml"/>')
spine = ['<itemref idref="title" linear="yes"/>','<itemref idref="nav" linear="yes"/>','<itemref idref="toc" linear="yes"/>']
for fn,_ in chapter_files:
    spine.append(f'<itemref idref="{fn[:-6]}" linear="yes"/>')
opf = ('<?xml version="1.0" encoding="utf-8"?>\n'
f'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" lang="{LANG}">\n'
'<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
f'<dc:identifier id="bookid">{UID}</dc:identifier>\n'
f'<dc:title>{html_mod.escape(TITLE)}</dc:title>\n'
f'<dc:creator id="aut">{html_mod.escape(AUTHOR)}</dc:creator>\n'
f'<dc:language>{LANG}</dc:language>\n'
f'<dc:publisher>{html_mod.escape(PUBLISHER)}</dc:publisher>\n'
f'<dc:rights>{html_mod.escape(RIGHTS)}</dc:rights>\n'
'<meta property="dcterms:modified">2026-10-19T00:00:00Z</meta>\n'
'</metadata>\n'
'<manifest>\n    ' + "\n    ".join(man) + '\n</manifest>\n'
'<spine>\n    ' + "\n    ".join(spine) + '\n</spine>\n</package>')

ncx_np = "\n    ".join(
    f'<navPoint id="np{i}" playOrder="{i}"><navLabel><text>{html_mod.escape(t)}</text></navLabel><content src="ch{i:02d}.xhtml"/></navPoint>'
    for i,(t,_) in enumerate(chapters))
ncx = ('<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'
f'<head><meta name="dtb:uid" content="{UID}"/><meta name="dtb:depth" content="1"/>'
'<meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>\n'
f'<docTitle><text>{html_mod.escape(TITLE)}</text></docTitle>\n<navMap>\n    {ncx_np}\n</navMap>\n</ncx>')
container = ('<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" '
'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
'<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
cover_xhtml = xhtml(COVER_ALT, f'<div style="text-align:center;"><img src="cover.jpg" alt="{COVER_ALT}" style="max-width:100%;"/></div>')

# 4) كتابة EPUB
print("③ كتابة EPUB...")
os.makedirs("books", exist_ok=True)
def wzip(z,name,data,store=False):
    if isinstance(data,str): data=data.encode("utf-8")
    zi=zipfile.ZipInfo(name)
    zi.compress_type=zipfile.ZIP_STORED if store else zipfile.ZIP_DEFLATED
    z.writestr(zi,data)
with zipfile.ZipFile(OUT,"w") as z:
    wzip(z,"mimetype","application/epub+zip",store=True)
    wzip(z,"META-INF/container.xml",container)
    wzip(z,"OEBPS/style.css",CSS)
    wzip(z,"OEBPS/cover.jpg",open(COVER_OUT,"rb").read())
    wzip(z,"OEBPS/cover.xhtml",cover_xhtml)
    wzip(z,"OEBPS/title.xhtml",title_page)
    wzip(z,"OEBPS/nav.xhtml",nav_page)
    wzip(z,"OEBPS/toc.xhtml",toc_page)
    for fn,content in chapter_files:
        wzip(z,f"OEBPS/{fn}",content)
    wzip(z,"OEBPS/content.opf",opf)
    wzip(z,"OEBPS/toc.ncx",ncx)
size=os.path.getsize(OUT)
print(f"✅ {OUT} | {size//1024} KB | {len(chapters)} فصل + غلاف 1600x2560 | المؤلف: {AUTHOR}")
