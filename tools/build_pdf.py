import os
import re
from PIL import Image
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, NextPageTemplate
from reportlab.platypus.tableofcontents import TableOfContents

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
WS = os.path.dirname(REPO)
BOOK = os.path.join(REPO, "books", "mind-power")
FONTS = os.path.join(WS, "fonts")
OUT = os.path.join(BOOK, "Mind-Power-AR.pdf")
COVER_WEBP = os.path.join(BOOK, "cover.webp")
COVER_JPG = "/tmp/mind-power-cover.jpg"
PAGE_W = 5 * inch
PAGE_H = 8 * inch

pdfmetrics.registerFont(TTFont("Amiri", os.path.join(FONTS, "Amiri-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Amiri-Bold", os.path.join(FONTS, "Amiri-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Cairo", os.path.join(FONTS, "Cairo.ttf")))
registerFontFamily("Amiri", normal="Amiri", bold="Amiri-Bold", italic="Amiri", boldItalic="Amiri-Bold")
registerFontFamily("Cairo", normal="Cairo", bold="Cairo", italic="Cairo", boldItalic="Cairo")

img = Image.open(COVER_WEBP).convert("RGB")
img.save(COVER_JPG, "JPEG", quality=92)
IW, IH = img.size
DRAW_H = PAGE_W * IH / IW
Y0 = (PAGE_H - DRAW_H) / 2

def band(y):
    xs = list(range(0, IW, max(1, IW // 24)))
    px = [img.getpixel((x, y)) for x in xs]
    return tuple(sum(c[i] for c in px) // len(px) for i in range(3))

TOP_C = band(0)
BOT_C = band(IH - 1)

reshaper = arabic_reshaper.ArabicReshaper()

def shape(t):
    return get_display(reshaper.reshape(t))

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def rich(t):
    parts = re.split(r"(\*\*.+?\*\*)", t.strip())
    out = []
    for p in parts:
        if p.startswith("**") and p.endswith("**") and len(p) > 4:
            out.append("<b>" + esc(shape(p[2:-2])) + "</b>")
        else:
            if p:
                out.append(esc(shape(p)))
    return "".join(reversed(out))

NAVY = colors.HexColor("#14213D")
INK = colors.HexColor("#1a1a1a")
st_h1 = ParagraphStyle("H1", fontName="Cairo", fontSize=16.5, leading=25, alignment=TA_RIGHT, textColor=NAVY, spaceAfter=14, wordWrap="RTL")
st_h2 = ParagraphStyle("H2", fontName="Cairo", fontSize=12.5, leading=18, alignment=TA_RIGHT, textColor=NAVY, spaceBefore=12, spaceAfter=6, wordWrap="RTL")
st_h3 = ParagraphStyle("H3", fontName="Cairo", fontSize=11, leading=16, alignment=TA_RIGHT, textColor=INK, spaceBefore=10, spaceAfter=4, wordWrap="RTL")
st_body = ParagraphStyle("Body", fontName="Amiri", fontSize=11.5, leading=17.6, alignment=TA_RIGHT, textColor=INK, spaceAfter=7, wordWrap="RTL")
st_bullet = ParagraphStyle("Bullet", parent=st_body, leftIndent=16, spaceAfter=4)
st_bullet2 = ParagraphStyle("Bullet2", parent=st_body, leftIndent=32, spaceAfter=4)
st_num = ParagraphStyle("Num", parent=st_body, leftIndent=16, spaceAfter=5)
st_center = ParagraphStyle("Center", parent=st_body, alignment=TA_CENTER)
st_sep = ParagraphStyle("Sep", parent=st_center, spaceBefore=10, spaceAfter=10, textColor=colors.HexColor("#777777"))
st_title = ParagraphStyle("Title", fontName="Cairo", fontSize=30, leading=42, alignment=TA_CENTER, textColor=NAVY)
st_title_e = ParagraphStyle("TitleE", fontName="Cairo", fontSize=13, leading=18, alignment=TA_CENTER, textColor=NAVY, spaceBefore=4)
st_sub = ParagraphStyle("Sub", fontName="Amiri", fontSize=11.5, leading=18, alignment=TA_CENTER, textColor=INK, spaceBefore=16)
st_auth = ParagraphStyle("Auth", fontName="Cairo", fontSize=12.5, leading=18, alignment=TA_CENTER, textColor=INK, spaceBefore=26)
st_copy = ParagraphStyle("Copy", parent=st_body, fontSize=9.5, leading=14, spaceAfter=4)
st_toc_h = ParagraphStyle("TocH", fontName="Cairo", fontSize=16.5, leading=24, alignment=TA_RIGHT, textColor=NAVY, spaceAfter=14)
st_toc = ParagraphStyle("TOC0", fontName="Amiri", fontSize=11.5, leading=22, alignment=TA_RIGHT, textColor=INK, wordWrap="RTL")

def on_cover(c, doc):
    c.saveState()
    c.setFillColorRGB(TOP_C[0] / 255, TOP_C[1] / 255, TOP_C[2] / 255)
    c.rect(0, Y0 + DRAW_H, PAGE_W, PAGE_H - (Y0 + DRAW_H), stroke=0, fill=1)
    c.setFillColorRGB(BOT_C[0] / 255, BOT_C[1] / 255, BOT_C[2] / 255)
    c.rect(0, 0, PAGE_W, Y0, stroke=0, fill=1)
    c.drawImage(COVER_JPG, 0, Y0, width=PAGE_W, height=DRAW_H)
    c.restoreState()

def on_main(c, doc):
    c.setFont("Amiri", 9)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawCentredString(PAGE_W / 2, 0.42 * inch, str(doc.page))

class BookDoc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph) and fl.style.name == "H1":
            self.notify("TOCEntry", (0, fl.getPlainText(), self.page))

story = []
story.append(NextPageTemplate("Cover"))
story.append(Spacer(1, 1))
story.append(NextPageTemplate("Main"))
story.append(PageBreak())

story.append(Spacer(1, 1.0 * inch))
story.append(Paragraph(shape("قوة العقل"), st_title))
story.append(Paragraph(shape("POWER OF MIND"), st_title_e))
story.append(Paragraph(shape("كيف تتحكم في أفكارك، بإعادة برمجة عقلك، وتبني عاداتك لتقودك لحياة أقوى"), st_sub))
story.append(Spacer(1, 1.6 * inch))
story.append(Paragraph(shape("M. ISMAIL"), st_auth))
story.append(Paragraph(shape("MIND POWER AUTHOR"), st_title_e))

story.append(PageBreak())
story.append(Spacer(1, 4.3 * inch))
story.append(Paragraph(rich("قوة العقل — كيف تتحكم في أفكارك، بإعادة برمجة عقلك، وتبني عاداتك لتقودك لحياة أقوى"), st_copy))
story.append(Spacer(1, 0.12 * inch))
story.append(Paragraph(rich("الطبعة الأولى — 2026"), st_copy))
story.append(Paragraph(rich("© 2026 محمد إسماعيل عبد العزيز — جميع الحقوق محفوظة"), st_copy))
story.append(Paragraph(rich("يحظر إعادة نشر أي جزء من هذا الكتاب أو اقتباسه بأي وسيلة دون إذن كتابي مسبق من المؤلف، باستثناء الاقتباسات القصيرة في المراجعات"), st_copy))
story.append(Paragraph(rich("khidmatyai.com"), st_copy))

story.append(PageBreak())
story.append(Paragraph(shape("المحتويات"), st_toc_h))
toc = TableOfContents()
toc.levelStyles = [st_toc]
toc.dotsMinLevel = 0
story.append(toc)

FILES = ["00-intro.md", "01-عقلك-مش-إنت.md", "02-استرد-دماغك.md", "03-الكلام-اللي-بتقوله-لنفسك.md", "04-دماغك-بيصدق-اللي-بيتكرر.md", "05-قاعدة-الدقيقة-الواحدة.md", "06-مين-اللي-بيشحن-مين.md", "07-قصص-واقعية.md", "08-النهاية.md"]
words = 0

def emit(ln):
    s = ln.rstrip()
    if not s.strip():
        return
    if s.startswith("### "):
        story.append(Paragraph(rich(s[4:]), st_h3))
    elif s.startswith("## "):
        story.append(Paragraph(rich(s[3:]), st_h2))
    elif s.startswith("# "):
        story.append(PageBreak())
        story.append(Paragraph(rich(s[2:]), st_h1))
    elif s.strip() == "---":
        story.append(Paragraph(shape("• • •"), st_sep))
    elif re.match(r"^\s*- ", ln):
        indent = len(ln) - len(ln.lstrip())
        st = st_bullet2 if indent >= 2 else st_bullet
        mark = "– " if indent >= 2 else "• "
        story.append(Paragraph(mark + rich(ln.strip()[2:]), st))
    elif re.match(r"^\d+\. ", s.strip()):
        story.append(Paragraph(rich(s.strip()), st_num))
    elif s.startswith("—") and len(s.strip()) < 45:
        story.append(Paragraph(rich(s.strip()), st_center))
    else:
        story.append(Paragraph(rich(s), st_body))

for fn in FILES:
    path = os.path.join(BOOK, fn)
    txt = open(path, encoding="utf-8").read()
    words += len(txt.split())
    lines = txt.split("\n")
    if fn.startswith("00-"):
        lines = lines[lines.index("## مقدمة"):]
        story.append(Paragraph(shape("المقدمة"), st_h1))
        lines = lines[1:]
    for ln in lines:
        emit(ln)

doc = BookDoc(OUT, pagesize=(PAGE_W, PAGE_H),
              title="قوة العقل — POWER OF MIND",
              author="محمد إسماعيل عبد العزيز",
              subject="كيف تتحكم في أفكارك، بإعادة برمجة عقلك، وتبني عاداتك لتقودك لحياة أقوى",
              creator="M. ISMAIL — MIND POWER AUTHOR")
cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="CF")
main_frame = Frame(0.65 * inch, 0.72 * inch, PAGE_W - 1.3 * inch, PAGE_H - 1.35 * inch, id="MF")
doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[cover_frame], onPage=on_cover),
    PageTemplate(id="Main", frames=[main_frame], onPage=on_main),
])
doc.multiBuild(story)

from pypdf import PdfReader
r = PdfReader(OUT)
print("WORDS", words)
print("PAGES", len(r.pages))
print("KB", os.path.getsize(OUT) // 1024)
