#!/usr/bin/env python3
# تحويل «الدليل البصري لأدوات الذكاء الاصطناعي 2026» → EPUB لـAmazon KDP
import os, re, zipfile, uuid
import html as html_mod
from bs4 import BeautifulSoup, NavigableString, Tag
from PIL import Image

SRC = "book-ai-tools-light.html"
COVER_SRC = "img-cover.jpg"
COVER_OUT = "cover-ai-tools-kdp.jpg"
OUT = "books/ai-tools-2026.epub"
TITLE = "الدليل البصري لأدوات الذكاء الاصطناعي 2026"
AUTHOR = "محمد إسماعيل عبد العزيز"
PUBLISHER = "خِدْمَتي AI"
LANG = "ar"
UID = "urn:uuid:" + str(uuid.uuid4())

# 1) غلاف KDP: 1600x2560, 300dpi
print("① تجهيز الغلاف 1600x2560...")
c = Image.open(COVER_SRC).convert("RGB")
canvas = Image.new("RGB", (1600, 2560), "white")
w0, h0 = c.size
new_h = int(1600 * h0 / w0)
if new_h > 2560:
    new_h = 2560; new_w = int(2560 * w0 / h0)
else:
    new_w = 1600
c2 = c.resize((new_w, new_h), Image.LANCZOS)
canvas.paste(c2, ((1600-new_w)//2, (2560-new_h)//2))
canvas.save(COVER_OUT, "JPEG", dpi=(300,300), quality=92)
print(f"   الغلاف جاهز: {canvas.size} 300dpi")

# 2) تحليل الكتاب وتقسيمه لفصول (قسمة على h1)
print("② تحليل الكتاب وتقسيمه لفصول...")
raw = open(SRC, encoding="utf-8").read()
soup = BeautifulSoup(raw, "lxml")
body_html = str(soup.body)
# قسمة عند بداية كل <h1 (lookahead)
parts = re.split(r'(?=<h1\b)', body_html, flags=re.IGNORECASE)
# parts[0] = ما قبل أول h1 (مقدم/فهرس) ; parts[1:] = كل فصل يبدأ بـh1
chapters = []
for p in parts[1:]:
    frag = BeautifulSoup(p, "lxml")
    h1 = frag.find("h1")
    if not h1:
        continue
    title = re.sub(r'\s+', ' ', h1.get_text(strip=True).replace('\u200f',''))
    # محتوى الفصل = كل شيء بعد h1
    content = "".join(str(x) for x in h1.find_all_next() if x.parent is not None)
    # أبسط: نأخذ كل العناصر جوا fragment بعد h1
    inner_parts = []
    seen_h1 = False
    for el in frag.body.children if frag.body else []:
        if el is h1:
            seen_h1 = True
            continue
        if seen_h1:
            inner_parts.append(str(el))
    inner = "".join(inner_parts)
    chapters.append((title, inner))
print(f"   {len(chapters)} فصل")

# 3) CSS + قوالب XHTML
CSS = """@charset "utf-8";
html{direction:rtl;}
body{font-family:'Amiri','Traditional Arabic','Arial',sans-serif;line-height:1.9;margin:5% 8%;text-align:right;color:#1a1a1a;}
h1{font-size:1.6em;color:#0b3d6b;border-bottom:2px solid #0b3d6b;padding-bottom:.3em;margin:1.5em 0 .8em;page-break-before:always;}
h2{font-size:1.25em;color:#0b5394;margin:1.2em 0 .5em;}
h3{font-size:1.08em;color:#1a6fb0;margin:1em 0 .4em;}
p{margin:.6em 0;text-align:justify;}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.9em;}
th,td{border:1px solid #ccc;padding:.4em .6em;text-align:right;}
th{background:#0b3d6b;color:#fff;}
img{max-width:100%;height:auto;display:block;margin:1em auto;}
blockquote{border-right:4px solid #0b5394;margin:1em 0;padding:.5em 1em;background:#f4f8fb;color:#333;}
code{background:#f0f0f0;padding:.1em .3em;border-radius:3px;direction:ltr;}
"""

def xhtml(title, inner, nav=False):
    epub_ns = ' xmlns:epub="http://www.idpf.org/2007/ops"' if nav else ''
    return (f'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml" lang="{LANG}" dir="rtl"{epub_ns}>\n'
            f'<head><meta charset="utf-8"/><title>{html_mod.escape(title)}</title>\n'
            f'<link rel="stylesheet" type="text/css" href="style.css"/></head>\n'
            f'<body>\n{inner}\n</body></html>')

title_page = xhtml(TITLE,
    f'<h1 style="border:none;text-align:center;font-size:2.2em;color:#0b3d6b;page-break-before:avoid;">{html_mod.escape(TITLE)}</h1>'
    f'<p style="text-align:center;font-size:1.3em;color:#666;margin-top:2em;">{html_mod.escape(AUTHOR)}</p>'
    f'<p style="text-align:center;color:#999;margin-top:6em;">طبع/نشر إلكتروني 2026</p>')

toc_items = "\n".join(f'<li><a href="ch{i:02d}.xhtml">{html_mod.escape(t)}</a></li>' for i,(t,_) in enumerate(chapters))
toc_page = xhtml("فهرس المحتويات", f"<h1>فهرس المحتويات</h1><ul>{toc_items}</ul>")
nav_page = xhtml("فهرس المحتويات", f'<nav epub:type="toc" id="toc"><h1>فهرس المحتويات</h1><ol>{toc_items}</ol></nav>', nav=True)

chapter_files = []
for i,(t,inner) in enumerate(chapters):
    chapter_files.append((f"ch{i:02d}.xhtml", xhtml(t, inner)))

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
opf = (f'<?xml version="1.0" encoding="utf-8"?>\n'
f'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" lang="{LANG}">\n'
f'<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
f'<dc:identifier id="bookid">{UID}</dc:identifier>\n'
f'<dc:title>{html_mod.escape(TITLE)}</dc:title>\n'
f'<dc:creator id="aut">{html_mod.escape(AUTHOR)}</dc:creator>\n'
f'<dc:language>{LANG}</dc:language>\n'
f'<dc:publisher>خِدْمَتي AI</dc:publisher>\n'
f'<dc:rights>© 2026 خِدْمَتي AI. جميع الحقوق محفوظة.</dc:rights>\n'
f'<meta property="dcterms:modified">2026-10-19T00:00:00Z</meta>\n'
f'</metadata>\n'
f'<manifest>\n    ' + "\n    ".join(man) + '\n</manifest>\n'
f'<spine>\n    ' + "\n    ".join(spine) + '\n</spine>\n</package>')

ncx_np = "\n    ".join(
    f'<navPoint id="np{i}" playOrder="{i}"><navLabel><text>{html_mod.escape(t)}</text></navLabel><content src="ch{i:02d}.xhtml"/></navPoint>'
    for i,(t,_) in enumerate(chapters)
)
ncx = (f'<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'
f'<head><meta name="dtb:uid" content="{UID}"/><meta name="dtb:depth" content="1"/>'
f'<meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>\n'
f'<docTitle><text>{html_mod.escape(TITLE)}</text></docTitle>\n<navMap>\n    {ncx_np}\n</navMap>\n</ncx>')

container = ('<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" '
'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
'<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')

cover_xhtml = xhtml("غلاف", '<div style="text-align:center;"><img src="cover.jpg" alt="غلاف" style="max-width:100%;"/></div>')

# 4) كتابة EPUB (ZIP)
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
    wzip(z,"OEBPS/toc.xhtml",toc_page)
    for fn,content in chapter_files:
        wzip(z,f"OEBPS/{fn}",content)
    wzip(z,"OEBPS/content.opf",opf)
    wzip(z,"OEBPS/toc.ncx",ncx)

size=os.path.getsize(OUT)
print(f"✅ {OUT} | {size//1024} KB | {len(chapters)} فصل + غلاف 1600x2560")
