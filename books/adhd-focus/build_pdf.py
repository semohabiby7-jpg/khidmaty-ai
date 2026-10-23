import os, glob, re
import markdown
from weasyprint import HTML, CSS

BASE = os.path.dirname(os.path.abspath(__file__))
FONTS = "/home/user/workspace/khidmaty-ai-push/tools/fonts"

CSS_TMPL = """
@font-face { font-family: 'Book'; src: url('file://%(f)s/Cairo-Regular.ttf'); font-weight: 400; }
@font-face { font-family: 'Book'; src: url('file://%(f)s/Cairo-Medium.ttf'); font-weight: 500; }
@font-face { font-family: 'Book'; src: url('file://%(f)s/Cairo-Semibold.ttf'); font-weight: 600; }
@font-face { font-family: 'Book'; src: url('file://%(f)s/Cairo-Bold.ttf'); font-weight: 700; }
@page {
  size: 6in 9in;
  margin: 0.70in 0.62in 0.72in 0.62in;
  @bottom-center { content: counter(page); font-family: 'Book'; font-size: 9pt; color: #7d6538; }
}
@page cover { margin: 0; @bottom-center { content: none; } }
@page :first { margin: 0; @bottom-center { content: none; } }
html { font-family: 'Book'; font-size: 12.2pt; font-weight: 500; color: #0a0d11; line-height: 1.92; }
body { margin: 0; }
img.cover { display: block; width: 6in; height: 9in; }
.coverpage { page: cover; margin: 0; padding: 0; height: 9in; overflow: hidden; page-break-after: always; }
.titlepage { page-break-after: always; text-align: center; padding-top: 2in; }
.titlepage .t { font-size: 25pt; font-weight: 700; line-height: 1.4; margin: 0 0 16pt 0; }
.titlepage .s { direction: rtl; unicode-bidi: plaintext; font-size: 13pt; color: #8a7350; margin: 0 0 6pt 0; line-height: 1.7; }
.titlepage .rule { display: inline-block; width: 1.6in; height: 2px; background: #c8a55e; margin: 18pt 0; }
.titlepage .a { font-size: 15pt; letter-spacing: 1px; margin-top: 40pt; }
.toc { page-break-after: always; }
.copyright { page-break-after: always; padding-top: 1.2in; font-size: 10.5pt; color: #3c4655; line-height: 1.8; }
.copyright p { margin-bottom: 9pt; }
.toc-title { font-size: 21pt; font-weight: 700; color: #0f1c2e; margin: 0 0 4pt 0; }
.toc-sub { font-size: 10pt; color: #8a7350; margin: 0 0 18pt 0; }
table.toc { width: 100%%; border-collapse: collapse; font-size: 10.6pt; }
table.toc td { border: none; padding: 4pt 0; border-bottom: 1px dotted #ded4c0; background: none !important; }
table.toc tr.lvl2 td { font-size: 9.6pt; padding: 2.6pt 0; border-bottom: 1px dotted #ece5d6; }
table.toc tr.lvl2 td:first-child { padding-inline-start: 14pt; }
table.toc tr.lvl2 a { font-weight: 400; color: #3c4655; }
table.toc td.pg { text-align: end; width: 12%%; color: #8a7350; font-size: 10pt; }
table.toc a { color: #16202e; text-decoration: none; font-weight: 700; }
table.toc td.pg a::after { content: target-counter(attr(href), page); }
.chap { break-before: page; }
h1 { font-size: 19pt; line-height: 1.45; margin: 0 0 14pt 0; color: #0f1c2e; page-break-before: avoid; }
h2 { font-size: 14.2pt; margin: 19pt 0 8pt 0; color: #0f1c2e; page-break-after: avoid; border-bottom: 1px solid #d8c9a8; padding-bottom: 3pt; }
h3 { font-size: 12.8pt; margin: 14pt 0 6pt 0; color: #5c4a2c; page-break-after: avoid; }
p { margin: 0 0 9pt 0; orphans: 2; widows: 2; }
ul, ol { margin: 0 0 11pt 0; padding-inline-start: 18pt; }
li { margin-bottom: 5pt; }
blockquote { margin: 11pt 0; padding: 10pt 13pt; background: #f7f3ea; border-inline-start: 3px solid #c8a55e; font-size: 11.6pt; line-height: 1.75; }
blockquote p { margin: 0 0 6pt 0; }
table { width: 100%%; border-collapse: collapse; margin: 11pt 0 13pt 0; font-size: 11pt; line-height: 1.7; page-break-inside: avoid; }
th { background: #0f1c2e; color: #fff; font-weight: 700; padding: 6pt 6pt; text-align: start; }
td { border-bottom: 1px solid #ded4c0; padding: 6pt 6pt; vertical-align: top; }
tr:nth-child(even) td { background: #faf8f3; }
hr { border: none; border-top: 1px solid #e3d7bd; margin: 16pt 0; }
img { max-width: 100%%; }
figure.fig { margin: 14pt 0 16pt 0; page-break-inside: avoid; }
figure.fig img { width: 100%%; border: 1px solid #e3d7bd; border-radius: 4pt; }
figure.fig figcaption { font-size: 9.6pt; color: #6b5733; margin-top: 6pt; line-height: 1.65; }
""" % {"f": FONTS}

AR_CSS = """
@font-face { font-family: 'GreatVibes'; src: url('file://%(f)s/GreatVibes-Regular.ttf'); }
html { direction: rtl; }
h1, h2, h3, p, li, td, th, .toc-title, .toc-sub { text-align: right; }
blockquote { direction: rtl; }
ol { list-style-type: arabic-indic; }
ul { list-style-type: disc; }
a { color: #16202e; text-decoration: none; }
""" % {"f": FONTS}

EN_CSS = """
@font-face { font-family: 'GreatVibes'; src: url('file://%(f)s/GreatVibes-Regular.ttf'); }
html { direction: ltr; }
h1, h2, h3, p, li, td, th { text-align: left; }
a { color: #16202e; text-decoration: none; }
""" % {"f": FONTS}

FIGURES = {
    ("ar", "02"): [("fig5-startcard.png", "الشكل ١ — بطاقة البداية: أول خطوة، أول ٣ دقايق، وخطة فشل", "أداة: بطاقة البداية")],
    ("ar", "03"): [("fig1-map.png", "الشكل ٢ — الجبل والصخور والحصى: من مهمة مالهاش أول، لخطوة تقدر تلمسها", "الطريقة: خريطة الجبل")],
    ("ar", "04"): [("fig2-friction.png", "الشكل ٣ — قاعدة العشرين ثانية: قلّل احتكاك الصح، وزوّد احتكاك الغلط", "أداة الأساس: قاعدة الاحتكاك العشريني"),
                   ("fig9-layers.png", "الشكل ٤ — ثلاث طبقات: فيزيائية ورقمية واجتماعية — وواحدة مش كفاية", "طبقات البيئة الثلاثة")],
    ("ar", "05"): [("fig3-hours.png", "الشكل ٥ — يومك الذهني: حاد ومتوسط وطين، وكل ساعة ليها شغل", "جدول اليوم الذهني")],
    ("ar", "06"): [("fig6-system.png", "الشكل ٦ — نظام بره دماغك: مكان واحد، مراجعة واحدة، ثلاث مهام", "أداة ١: صندوق وارد واحد")],
    ("ar", "07"): [("fig7-boundaries.png", "الشكل ٧ — الحدود: جملة رفض واحدة ونافذتين للردود", "الجزء الأول: الحدود مع الناس"),
                   ("fig8-safety.png", "الشكل ٨ — إمتى تكمل لوحدك وإمتى تحتاج مختص", "الجزء الرابع: الأمان الصحي")],
    ("ar", "08"): [("fig4-weeks.png", "الشكل ٩ — خطة الثلاثين يوم: أسبوع لكل أساس، و١٥ دقيقة في اليوم", "قواعد الفشل")],
    ("en", "02"): [("fig5-startcard.png", "Figure 1 — The start card: first step, first three minutes, failure plan", "The tool: the start card")],
    ("en", "03"): [("fig1-map.png", "Figure 2 — Mountain, rocks, gravel: from a task with no entrance to a step you can touch", "The method: the mountain map")],
    ("en", "04"): [("fig2-friction.png", "Figure 4 — The twenty-second rule: less friction on the good, more on the bad", "The core tool: the twenty-second friction rule"),
                   ("fig9-layers.png", "Figure 3 — Three layers: physical, digital, social — one isn't enough", "The three layers of environment")],
    ("en", "05"): [("fig3-hours.png", "Figure 5 — Your mental day: sharp, medium, mud — each hour has its own work", "The mental day")],
    ("en", "06"): [("fig6-system.png", "Figure 6 — A system outside your head: one place, one review, three tasks", "Tool 1: one inbox")],
    ("en", "07"): [("fig7-boundaries.png", "Figure 7 — Boundaries: one refusal sentence and two reply windows", "Part One: Boundaries with people"),
                   ("fig8-safety.png", "Figure 8 — When to continue alone, when to get help", "Part Four: Health safety")],
    ("en", "08"): [("fig4-weeks.png", "Figure 9 — The thirty-day plan: one foundation per week, fifteen minutes a day", "Failure rules")],
}


def build(lang):
    folder = os.path.join(BASE, lang)
    files = sorted(glob.glob(os.path.join(folder, "*.md")))
    if not files:
        raise SystemExit(f"no markdown in {folder}")

    md = markdown.Markdown(extensions=["tables", "extra", "sane_lists"])
    parts, entries = [], []
    for i, path in enumerate(files, start=1):
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        html = md.convert(text)
        md.reset()
        key = (lang, os.path.basename(path)[:2])
        if key in FIGURES:
            for fn, cap, anchor in FIGURES[key]:
                fig_html = (f'<figure class="fig"><img src="{lang}/{fn}">'
                            f'<figcaption>{cap}</figcaption></figure>\n')
                m = re.search(r"<h2[^>]*>[^<]*" + re.escape(anchor) + r"[\s\S]*?</h2>", html)
                if m:
                    html = html[:m.end()] + fig_html + html[m.end():]
                else:
                    print("WARN anchor missing:", lang, os.path.basename(path), anchor)

        for tag in ("h1", "h2"):
            def repl(m, tag=tag, i=i):
                nonlocal entries
                sid = f"s{i}-{tag}-{len(entries)}"
                ttl = re.sub(r"<[^>]+>", "", m.group(1)).strip()
                entries.append((sid, ttl, 1 if tag == "h1" else 2))
                return f'<{tag} id="{sid}">{m.group(1)}</{tag}>'
            html = re.sub(rf"<{tag}[^>]*>(.*?)</{tag}>", repl, html, flags=re.S)

        parts.append(f'<section class="chap">{html}</section>')

    rows = []
    for sid, ttl, lvl in entries:
        cls = "lvl2" if lvl == 2 else "lvl1"
        rows.append(f'<tr class="{cls}"><td><a href="#{sid}">{ttl}</a></td>'
                    f'<td class="pg"><a href="#{sid}"></a></td></tr>')
    rows = "\n".join(rows)

    if lang == "ar":
        title = "نِظام التركيز"
        sub = "إزاي تبدأ وتكمّل<br>لما دماغك مش عايز تسكت"
        cover = "covers/cover-adhd-focus-ar-v2-6x9.jpg"
        toc_title, toc_sub = "المحتويات", "ثمانية فصول وملاحق عملية"
        front = (
            "<div class='copyright'><p><strong>نِظام التركيز — إزاي تبدأ وتكمّل لما دماغك مش عايز تسكت</strong></p>"
            "<p>© ٢٠٢٦ محمد إسماعيل عبد العزيز. جميع الحقوق محفوظة.</p>"
            "<p>لا يجوز نسخ أو توزيع أي جزء من هذا الكتاب بأي وسيلة دون إذن كتابي من المؤلف، "
            "فيما عدا اقتباسات قصيرة مع ذكر المصدر.</p>"
            "<p><strong>تنبيه مهم:</strong> هذا الكتاب دليل عملي في العادات والأنظمة والتنظيم الذاتي. "
            "وهو ليس أداة تشخيص، ولا نصيحة طبية أو نفسية، ولا بديلاً عن استشارة طبيب أو أخصائي مؤهل. "
            "أي قرار دوائي أو تشخيصي يجب أن يكون من مختص.</p>"
            "<p>الأدوات والنماذج الواردة هنا مقترحات تحتاج تعديلها على ظروفك.</p>"
            "<p>الطبعة الأولى — ٢٠٢٦</p></div>"
        )
        css = CSS_TMPL + AR_CSS
        lang_attr = "ar"
    else:
        title = "The ADHD Focus System"
        sub = "How to start — and keep going — when your brain won't settle"
        cover = "covers/cover-adhd-focus-en-v2-6x9.jpg"
        toc_title, toc_sub = "Contents", "Eight chapters plus practical appendices"
        front = (
            "<div class='copyright'><p><strong>The ADHD Focus System</strong></p>"
            "<p>© 2026 Mohamed Ismail Abdelaziz. All rights reserved.</p>"
            "<p>No part of this book may be reproduced or distributed in any form without "
            "written permission from the author, except short quotations with attribution.</p>"
            "<p><strong>Important note:</strong> this book is a practical guide to habits, systems, "
            "and self-organisation. It is not a diagnostic tool, not medical or psychological advice, "
            "and not a substitute for consulting a qualified doctor or specialist. Any diagnostic or "
            "medication decision belongs with a professional.</p>"
            "<p>The tools and templates here are proposals that need adapting to your own situation.</p>"
            "<p>First edition — 2026</p></div>"
        )
        css = CSS_TMPL + EN_CSS
        lang_attr = "en"

    html = f"""<!DOCTYPE html>
<html lang="{lang_attr}">
<head><meta charset="utf-8"><title>{title}</title></head>
<body>
<div class="coverpage"><img class="cover" src="{cover}" alt="cover"></div>
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

    out = os.path.join(BASE, f"The-ADHD-Focus-System-{lang.upper()}.pdf")
    HTML(string=html, base_url=BASE).write_pdf(out, stylesheets=[CSS(string=css)])
    return out


if __name__ == "__main__":
    for lang in ["ar", "en"]:
        p = build(lang)
        print(p, os.path.getsize(p) // 1024, "KB")
