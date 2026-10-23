import os, glob, re
import markdown
from weasyprint import HTML, CSS

BASE = os.path.dirname(os.path.abspath(__file__))
FONTS = "/home/user/workspace/khidmaty-ai-push/tools/fonts"

CSS_TMPL = """
@font-face { font-family: 'Tajawal'; src: url('file://%(f)s/Tajawal-Regular.ttf'); font-weight: 400; }
@font-face { font-family: 'Tajawal'; src: url('file://%(f)s/Tajawal-Bold.ttf'); font-weight: 700; }
@page {
  size: 6in 9in;
  margin: 0.78in 0.7in 0.8in 0.7in;
  @bottom-center { content: counter(page); font-family: 'Tajawal'; font-size: 9pt; color: #8a7350; }
}
@page cover { margin: 0; }
@page :first { margin: 0; }
html { font-family: 'Tajawal'; font-size: 11.4pt; color: #16202e; line-height: 1.78; }
body { margin: 0; }
.cover { page: cover; width: 6in; height: 9in; background-size: cover; background-position: center; page-break-after: always; }
.titlepage { page-break-after: always; text-align: center; padding-top: 2in; }
.titlepage .t { font-size: 25pt; font-weight: 700; line-height: 1.4; margin: 0 0 16pt 0; }
.titlepage .s { font-size: 13pt; color: #8a7350; margin: 0 0 6pt 0; line-height: 1.7; }
.titlepage .rule { width: 1.6in; height: 2px; background: #c8a55e; margin: 18pt auto; }
.titlepage .a { font-size: 15pt; letter-spacing: 1px; margin-top: 40pt; }
.toc { page-break-after: always; }
.copyright { page-break-after: always; padding-top: 1.2in; font-size: 10.5pt; color: #3c4655; line-height: 1.8; }
.copyright p { margin-bottom: 9pt; }
.toc-title { font-size: 21pt; font-weight: 700; color: #0f1c2e; margin: 0 0 4pt 0; }
.toc-sub { font-size: 10pt; color: #8a7350; margin: 0 0 18pt 0; }
table.toc { width: 100%%; border-collapse: collapse; font-size: 10.6pt; page-break-inside: auto; }
table.toc td { border: none; padding: 4.5pt 0; border-bottom: 1px dotted #ded4c0; background: none !important; }
table.toc td.pg { text-align: end; width: 12%%; color: #8a7350; font-size: 10pt; }
table.toc a { color: #16202e; text-decoration: none; font-weight: 700; }
table.toc td.pg a::after { content: target-counter(attr(href), page); }
.chap { break-before: page; }
section.chap h1:not(:first-of-type) { break-before: page; }
h1 { font-size: 19pt; line-height: 1.45; margin: 0 0 14pt 0; color: #0f1c2e; page-break-before: avoid; }
h2 { font-size: 13.5pt; margin: 18pt 0 7pt 0; color: #0f1c2e; page-break-after: avoid; border-bottom: 1px solid #e3d7bd; padding-bottom: 3pt; }
h3 { font-size: 11.8pt; margin: 13pt 0 5pt 0; color: #6b5636; page-break-after: avoid; }
p { margin: 0 0 8pt 0; orphans: 2; widows: 2; }
ul, ol { margin: 0 0 10pt 0; padding-inline-start: 16pt; }
li { margin-bottom: 4pt; }
blockquote { margin: 10pt 0; padding: 9pt 12pt; background: #f7f3ea; border-inline-start: 3px solid #c8a55e; font-size: 10.5pt; line-height: 1.7; }
blockquote p { margin: 0 0 6pt 0; }
table { width: 100%%; border-collapse: collapse; margin: 10pt 0 12pt 0; font-size: 9.6pt; line-height: 1.6; page-break-inside: avoid; }
th { background: #0f1c2e; color: #fff; font-weight: 700; padding: 6pt 6pt; text-align: start; }
td { border-bottom: 1px solid #ded4c0; padding: 6pt 6pt; vertical-align: top; }
tr:nth-child(even) td { background: #faf8f3; }
hr { border: none; border-top: 1px solid #e3d7bd; margin: 16pt 0; }
img { max-width: 100%%; }
figure.fig { margin: 14pt 0 16pt 0; page-break-inside: avoid; }
figure.fig img { width: 100%%; border: 1px solid #e3d7bd; border-radius: 4pt; }
figure.fig figcaption { font-size: 9pt; color: #8a7350; margin-top: 5pt; line-height: 1.6; }
""" % {"f": FONTS}

AR_CSS = """
html { direction: rtl; }
h1, h2, h3, p, li, td, th, .toc-title, .toc-sub { text-align: right; }
blockquote { direction: rtl; }
"""

EN_CSS = """
html { direction: ltr; }
h1, h2, h3, p, li, td, th { text-align: left; }
"""


def build(lang):
    folder = os.path.join(BASE, lang)
    files = sorted(glob.glob(os.path.join(folder, "*.md")))
    if not files:
        raise SystemExit(f"no markdown in {folder}")

    figures = {
        ("ar", "01"): ('<h3>تمارين الفصل', "figures/ar/fig1-baskets.png",
                       "الشكل ١ — السلال التلاتة: السلة ١ تاخد يومك، السلة ٢ مسودة تراجعها، السلة ٣ تختفي"),
        ("ar", "03"): ('<strong>القاعدة الذهبية:</strong>', "figures/ar/fig2-price.png",
                       "الشكل ٢ — «غالي» تلات أنواع، وكل نوع ليه رد مختلف — والخصم بيرد على نوع واحد بس"),
        ("ar", "04"): ('<strong>حاجة مهمة:</strong>', "figures/ar/fig3-routes.png",
                       "الشكل ٣ — أربع مسارات بتحدد إحساس العميل بالبعد، والدقايق هي اللي بتحسم النقاش"),
        ("ar", "05"): ('<strong>قاعدة الأسبوع:</strong>', "figures/ar/fig4-cadence.png",
                       "الشكل ٤ — إيقاع ٢–٧–٢١: بيرفع الردود ويقلل الإحساس بالإلحاح"),
        ("ar", "06"): ('<strong>قاعدة الصورة الأولى:</strong>', "figures/ar/fig5-photos.png",
                       "الشكل ٥ — ترتيب الصور السبعة: الأولى بتوقّف السكرول، والباقي بيبني الرغبة"),
        ("en", "01"): ('<h3>Chapter exercise', "figures/en/fig1-baskets.png",
                       "Figure 1 — The three baskets: basket 1 is your day, basket 2 is a draft you review, basket 3 disappears"),
        ("en", "03"): ('<strong>The golden rule:</strong>', "figures/en/fig2-price.png",
                       "Figure 2 — “Expensive” comes in three types, each with its own reply. A discount answers only one of them"),
        ("en", "04"): ('<strong>One caution:</strong>', "figures/en/fig3-routes.png",
                       "Figure 3 — Four routes decide how far a place feels. Minutes settle the argument"),
        ("en", "05"): ('<strong>The weekly rule:</strong>', "figures/en/fig4-cadence.png",
                       "Figure 4 — The 2–7–21 cadence: more replies, less pressure"),
        ("en", "06"): ('<strong>The first-photo rule:</strong>', "figures/en/fig5-photos.png",
                       "Figure 5 — The order of seven photos: the first one stops the scroll, the rest build desire"),
        ("ar", "02"): ('<h2>المهمة الأولى', "figures/ar/fig6-prompt.png",
                       "الشكل ٦ — الأمر اللي بيشتغل من أول مرة: خمسة أجزاء، ولو جزء ناقص الناتج ناقص"),
        ("en", "02"): ('<h2>Task one', "figures/en/fig6-prompt.png",
                       "Figure 6 — A prompt that works first time: five parts. Miss one and the output is missing something"),
        ("ar", "07"): ('<h3>التحقق في ٣ أسئلة</h3>', "figures/ar/fig7-gate.png",
                       "الشكل ٧ — الأداة تكتب، إنت تتحقق، وإنت اللي بتتحاسب — ومفيش عبور من غير مراجعة"),
        ("en", "07"): ('<h3>The three-question check</h3>', "figures/en/fig7-gate.png",
                       "Figure 7 — The tool writes, you verify, you are accountable. Nothing passes without review"),
        ("ar", "08"): ('<h3>قاعدة اليومين</h3>', "figures/ar/fig8-weeks.png",
                       "الشكل ٨ — أربعة أسابيع، هدف واحد لكل أسبوع، ورقم واحد تقيسه"),
        ("en", "08"): ('<h3>The two-day rule</h3>', "figures/en/fig8-weeks.png",
                       "Figure 8 — Four weeks, one goal each, one number to measure"),
    }

    md = markdown.Markdown(extensions=["tables", "extra", "sane_lists"])
    parts, entries = [], []
    for i, f in enumerate(files, start=1):
        with open(f, encoding="utf-8") as fh:
            text = fh.read()
        html = md.convert(text)
        md.reset()
        key = (lang, os.path.basename(f)[:2])
        if key in figures:
            needle, img, cap = figures[key]
            fig_html = (f'<figure class="fig"><img src="{img}">'
                        f'<figcaption>{cap}</figcaption></figure>\n')
            if needle in html:
                html = html.replace(needle, fig_html + needle, 1)
            else:
                print("WARN anchor missing:", os.path.basename(f))
        heads = list(re.finditer(r"<h1[^>]*>(.*?)</h1>", html, re.S))
        if heads:
            rebuilt, cursor = [], 0
            for k, mm in enumerate(heads):
                sid = f"s{i}" if k == 0 else f"s{i}_{k + 1}"
                ttl = re.sub(r"<[^>]+>", "", mm.group(1)).strip()
                rebuilt.append(html[cursor:mm.start()])
                rebuilt.append(f'<h1 id="{sid}">{mm.group(1)}</h1>')
                entries.append((sid, ttl))
                cursor = mm.end()
            rebuilt.append(html[cursor:])
            html = "".join(rebuilt)
        else:
            entries.append((f"s{i}", os.path.basename(f)))
        parts.append(f'<section class="chap">{html}</section>')

    rows = "\n".join(
        f'<tr><td><a href="#{sid}">{t}</a></td><td class="pg"><a href="#{sid}"></a></td></tr>'
        for sid, t in entries
    )

    if lang == "ar":
        title = "الذكاء الاصطناعي لوسطاء العقارات"
        sub = "توفير ١٥ ساعة أسبوعياً — من غير ما تخسر صفقة واحدة"
        cover = "covers/cover-ai-real-estate-ar-final.jpg"
        toc_title, toc_sub = "المحتويات", "تسعة فصول وملاحق عملية"
        front = (
            "<div class='copyright'><p><strong>الذكاء الاصطناعي لوسطاء العقارات</strong></p>"
            "<p>© ٢٠٢٦ محمد إسماعيل عبد العزيز. جميع الحقوق محفوظة.</p>"
            "<p>لا يجوز نسخ أو توزيع أي جزء من هذا الكتاب بأي وسيلة دون إذن كتابي من المؤلف، "
            "فيما عدا اقتباسات قصيرة مع ذكر المصدر.</p>"
            "<p>هذا الكتاب دليل عملي في استخدام أدوات الذكاء الاصطناعي في العمل العقاري. "
            "وهو ليس استشارة قانونية أو مالية أو ضريبية، ولا يغني عن مراجعة مختص قبل أي التزام تعاقدي.</p>"
            "<p>الأوامر والنماذج الواردة هنا مسودات تحتاج مراجعتك قبل الإرسال لأي عميل.</p>"
            "<p>الطبعة الأولى — ٢٠٢٦</p></div>"
        )
        css = CSS_TMPL + AR_CSS
        lang_attr = "ar"
    else:
        title = "AI for Real Estate Agents"
        sub = "Win back 15 hours a week — without losing a single deal."
        cover = "covers/cover-ai-real-estate-en-final.jpg"
        toc_title, toc_sub = "Contents", "Nine chapters plus practical appendices"
        front = (
            "<div class='copyright'><p><strong>AI for Real Estate Agents</strong></p>"
            "<p>© 2026 Mohamed Ismail Abdelaziz. All rights reserved.</p>"
            "<p>No part of this book may be reproduced or distributed in any form without "
            "written permission from the author, except short quotations with attribution.</p>"
            "<p>This book is a practical guide to using AI tools in real estate work. It is not "
            "legal, financial, or tax advice, and it does not replace a qualified professional "
            "before any contractual commitment.</p>"
            "<p>Every prompt and template here is a draft that requires your review before it "
            "reaches a client.</p>"
            "<p>First edition — 2026</p></div>"
        )
        css = CSS_TMPL + EN_CSS
        lang_attr = "en"

    html = f"""<!DOCTYPE html>
<html lang="{lang_attr}">
<head><meta charset="utf-8"><title>{title}</title></head>
<body>
<div class="cover" style="background-image:url('{cover}')"></div>
<div class="titlepage">
  <div class="t">{title}</div>
  <div class="rule"></div>
  <div class="s">{sub}</div>
  <div class="rule"></div>
  <div class="a">by m.ismail</div>
</div>
{front}
<div class="toc">
  <div class="toc-title">{toc_title}</div>
  <div class="toc-sub">{toc_sub}</div>
  <table class="toc">
  {rows}
  </table>
</div>
{''.join(parts)}
</body></html>"""

    out = os.path.join(BASE, f"AI-for-Real-Estate-Agents-{lang.upper()}.pdf")
    HTML(string=html, base_url=BASE).write_pdf(out, stylesheets=[CSS(string=css)])
    return out


if __name__ == "__main__":
    for lang in ["ar", "en"]:
        p = build(lang)
        print(p, os.path.getsize(p) // 1024, "KB")
