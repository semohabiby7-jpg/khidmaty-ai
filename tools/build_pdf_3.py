import os
import re
from PIL import Image, ImageDraw
from weasyprint import HTML
from pypdf import PdfReader

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
WS = os.path.dirname(REPO)
BOOK = os.path.join(REPO, "books", "mind-power-3")
FONTS = os.path.join(WS, "fonts")
OUT = os.path.join(BOOK, "Mind-Power-3-AR.pdf")
COVER_WEBP = os.path.join(BOOK, "cover.webp")
COVER_PAD = "/tmp/mind-power-3-ar-cover-padded.jpg"

im = Image.open(COVER_WEBP).convert("RGB")
IW, IH = im.size
TH = int(IW / 0.625)

def row_color(y):
    px = [im.getpixel((x, y)) for x in range(0, IW, max(1, IW // 24))]
    return tuple(sum(c[i] for c in px) // len(px) for i in range(3))

TOP_C = row_color(0)
BOT_C = row_color(IH - 1)
canvas = Image.new("RGB", (IW, TH))
PAD_T = (TH - IH) // 2
canvas.paste(im, (0, PAD_T))
d = ImageDraw.Draw(canvas)
d.rectangle([0, 0, IW, PAD_T], fill=TOP_C)
d.rectangle([0, TH - (TH - IH - PAD_T), IW, TH], fill=BOT_C)
canvas.save(COVER_PAD, "JPEG", quality=92)

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def rich(t):
    s = esc(t.strip())
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    return s

CSS = """
@font-face { font-family: Amiri; src: url('file://%(fonts)s/Amiri-Regular.ttf'); }
@font-face { font-family: AmiriB; src: url('file://%(fonts)s/Amiri-Bold.ttf'); }
@font-face { font-family: Cairo; src: url('file://%(fonts)s/Cairo.ttf'); }
@page { size: 5in 8in; margin: 0.68in 0.65in 0.78in 0.65in;
  @bottom-center { content: counter(page); font-family: Amiri; font-size: 9.5pt; color: #666666; } }
@page cover { margin: 0; @bottom-center { content: none; } }
html { direction: rtl; }
body { font-family: Amiri; font-size: 11.5pt; line-height: 1.55; color: #1a1a1a; text-align: right; }
h1 { font-family: Cairo; font-size: 16.5pt; color: #14213D; page-break-before: always; margin: 0 0 13pt 0; line-height: 1.45; }
h2 { font-family: Cairo; font-size: 12.5pt; color: #14213D; margin: 13pt 0 6pt 0; page-break-after: avoid; line-height: 1.45; }
h3 { font-family: Cairo; font-size: 11pt; color: #1a1a1a; margin: 10pt 0 4pt 0; page-break-after: avoid; line-height: 1.45; }
p { margin: 0 0 6pt 0; }
p.num { margin: 0 0 4.5pt 1em; }
p.li { margin: 0 0 3pt 1.2em; }
p.li2 { margin: 0 0 3pt 2.4em; }
p.sig { text-align: center; margin: 10pt 0; }
.sep { text-align: center; color: #777777; margin: 10pt 0; letter-spacing: 6pt; }
strong { font-family: AmiriB; font-weight: bold; }
table { width: 100%%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
th { background: #14213D; color: #fff; padding: 6pt 8pt; text-align: right; font-family: Cairo; }
td { border: 1px solid #ddd; padding: 5pt 8pt; text-align: right; }
.coverpage { page: cover; }
.coverpage img { width: 5in; height: 8in; object-fit: cover; display: block; }
.titlepage { text-align: center; padding-top: 1.1in; page-break-after: always; }
.tt { font-family: Cairo; font-size: 28pt; color: #14213D; line-height: 1.3; }
.te { font-family: Cairo; font-size: 13pt; color: #14213D; margin-top: 4pt; letter-spacing: 2pt; }
.tsub { font-size: 11.5pt; color: #1a1a1a; margin-top: 16pt; line-height: 1.6; }
.tauth { font-family: Cairo; font-size: 12.5pt; color: #1a1a1a; margin-top: 52pt; }
.tauth2 { font-family: Cairo; font-size: 11pt; color: #333333; margin-top: 2pt; letter-spacing: 1pt; }
.copyright { page-break-after: always; margin-top: 3.5in; font-size: 9.5pt; line-height: 1.6; }
.copyright p { margin: 0 0 3pt 0; }
.tocpage { page-break-after: always; }
.toch { font-family: Cairo; font-size: 16.5pt; color: #14213D; margin: 0 0 14pt 0; }
.tocline { display: block; text-decoration: none; color: #1a1a1a; margin: 8pt 0; font-size: 11.5pt; }
.tocline::after { content: leader(". ") target-counter(attr(href), page); }
""" % {"fonts": FONTS}

chapters = []
words = 0

def emit_h1(title, cid):
    chapters.append('<h1 id="%s">%s</h1>' % (cid, rich(title)))

def emit_line(ln):
    s = ln.rstrip()
    if not s.strip():
        return
    if s.startswith("### "):
        chapters.append("<h3>%s</h3>" % rich(s[4:]))
    elif s.startswith("## "):
        chapters.append("<h2>%s</h2>" % rich(s[3:]))
    elif s.startswith("# "):
        cid = "ch%d" % len(chs)
        t = re.sub(r"\*\*", "", s[2:].strip())
        chapters.append('<h1 id="%s">%s</h1>' % (cid, rich(s[2:])))
        chs.append((cid, t))
    elif s.strip() == "---":
        chapters.append('<div class="sep">•••</div>')
    elif re.match(r"^\s*- ", ln):
        indent = len(ln) - len(ln.lstrip())
        cls = "li2" if indent >= 2 else "li"
        mark = "– " if indent >= 2 else "• "
        chapters.append('<p class="%s">%s%s</p>' % (cls, mark, rich(ln.strip()[2:])))
    elif re.match(r"^\d+\. ", s.strip()):
        chapters.append('<p class="num">%s</p>' % rich(s.strip()))
    elif s.startswith("—") and len(s.strip()) < 45:
        chapters.append('<p class="sig">%s</p>' % rich(s.strip()))
    else:
        chapters.append("<p>%s</p>" % rich(s))

FILES = ["00-مقدمة.md", "01-حدّدت.md", "02-وصلت.md", "03-قَيِّمه-وصدّقته.md", "04-استفدت.md", "05-قُدت.md", "06-أفدت.md", "07-القصص.md", "08-النهاية.md"]
chs = []

for fn in FILES:
    path = os.path.join(BOOK, fn)
    txt = open(path, encoding="utf-8").read()
    words += len(txt.split())
    lines = txt.split("\n")
    if fn.startswith("00-"):
        idx = None
        for i, l in enumerate(lines):
            if l.strip().startswith("## "):
                idx = i
                break
        if idx is not None:
            lines = lines[idx:]
            emit_h1("المقدمة", "ch0")
            chs.append(("ch0", "المقدمة"))
            lines = lines[1:]
    for ln in lines:
        emit_line(ln)

toc_lines = "".join('<a class="tocline" href="#%s">%s</a>' % (cid, esc(t)) for cid, t in chs)

html = """<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>%s</style></head><body>
<div class="coverpage"><img src="file://%s"></div>
<div class="titlepage"><div class="tt">أنا هستفيد إيه باللي وصلت ليه؟</div><div class="te">WHAT DO I GAIN FROM WHERE I ARRIVED?</div>
<div class="tsub">قوة العقل ٣ — من الوصول إلى القيمة، ومن القيمة إلى الإفادة</div>
<div class="tauth">MOHAMED ISMAIL</div><div class="tauth2">MIND POWER AUTHOR</div></div>
<div class="copyright">
<p>أنا هستفيد إيه باللي وصلت ليه؟ — قوة العقل ٣</p>
<p>الطبعة الأولى — 2026</p>
<p>© 2026 خِدْمَتي AI — جميع الحقوق محفوظة</p>
<p>يحظر إعادة نشر أي جزء من هذا الكتاب أو اقتباسه بأي وسيلة دون إذن كتابي مسبق من المؤلف.</p>
<p>khidmatyai.com</p>
</div>
<div class="tocpage"><div class="toch">المحتويات</div>%s</div>
%s
</body></html>""" % (CSS, COVER_PAD, toc_lines, "".join(chapters))

HTML(string=html).write_pdf(OUT)
r = PdfReader(OUT)
print("WORDS", words)
print("PAGES", len(r.pages))
print("KB", os.path.getsize(OUT) // 1024)
