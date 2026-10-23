"""Rebuild all 9 ADHD-Focus figures with a proper RTL text engine.

Fixes: text centred instead of right-aligned (overflow past card borders),
no wrapping, low-contrast grey text.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1500, 820
PAD = 54  # safe area inside the gold frame

NAVY = (13, 26, 44)
NAVY_D = (7, 15, 28)
CARD = (22, 38, 60)
CARD2 = (27, 45, 69)
GOLD = (198, 163, 92)
GOLD_L = (236, 208, 150)
CREAM = (250, 247, 240)
SOFT = (214, 223, 235)  # was a faint grey -> much more readable
GREEN = (128, 186, 134)
ORANGE = (226, 165, 92)
RED = (222, 120, 108)
LINE = (62, 82, 108)

FONT_PATH = "/home/user/workspace/cairo_vf.ttf"


BOOST = 1.14  # larger type: figures are shown ~4.8in wide in the PDF


def F(size, weight=600):
    size = int(round(size * BOOST))
    ft = ImageFont.truetype(FONT_PATH, size)
    try:
        ft.set_variation_by_axes([weight])
    except Exception:
        pass
    return ft


def canvas():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(NAVY[i] + (NAVY_D[i] - NAVY[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    d.rectangle([14, 14, W - 14, H - 14], outline=GOLD, width=2)
    d.rectangle([24, 24, W - 24, H - 24], outline=(96, 80, 50), width=1)
    return img


def tw(d, text, font, direction="rtl"):
    return d.textlength(text, font=font, direction=direction)


def wrap(d, text, font, maxw, direction="rtl"):
    words = text.split(" ")
    lines, cur = [], ""
    for wd in words:
        trial = (cur + " " + wd).strip()
        if not cur or tw(d, trial, font, direction) <= maxw:
            cur = trial
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


CHECKS = []  # (label, bbox) collected for the geometry self-test


def block(d, x, y, text, font, fill, maxw, ar=True, lh=None, align=None):
    """Draw wrapped text. For Arabic x is the RIGHT edge; for English the left."""
    lines = wrap(d, text, font, maxw, "rtl" if ar else "ltr")
    lh = lh or int(font.size * 1.5)
    for i, ln in enumerate(lines):
        yy = y + i * lh
        if ar:
            d.text((x, yy), ln, font=font, fill=fill, anchor="ra",
                   direction="rtl", language="ar")
            bb = d.textbbox((x, yy), ln, font=font, anchor="ra",
                            direction="rtl", language="ar")
        else:
            d.text((x, yy), ln, font=font, fill=fill, anchor="la")
            bb = d.textbbox((x, yy), ln, font=font, anchor="la")
        CHECKS.append((ln[:28], bb))
    return y + len(lines) * lh


def head(d, ar, title, sub):
    xr = W - PAD - 18
    if ar:
        block(d, xr, 52, title, F(44, 780), CREAM, W - 2 * (PAD + 40), True, 62)
        block(d, xr, 122, sub, F(27, 500), GOLD_L, W - 2 * (PAD + 40), True, 42)
    else:
        block(d, PAD + 18, 52, title, F(42, 780), CREAM, W - 2 * (PAD + 40), False, 58)
        block(d, PAD + 18, 120, sub, F(26, 500), GOLD_L, W - 2 * (PAD + 40), False, 40)


def box(d, x0, y0, x1, y1, fill=CARD, outline=GOLD, radius=18, width=2):
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                        outline=outline, width=width)


def save(img, lang, name):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), lang)
    os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, name), optimize=True)


# ---------------------------------------------------------------- 1 mountain
def fig_map(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "خريطة الجبل: من كتلة واحدة لخطوة تقدر تلمسها" if ar else "The mountain map: from one mass to a step",
         "مشروع ← مراحل ← خطوات (١٠–١٥ دقيقة)" if ar else "project → stages → steps (10–15 min)")
    cols = ([("الجبل", "المهمة الكبيرة", ["أجهّز ملف المشروع كله"]),
             ("الصخور", "المراحل", ["أجمع الأرقام", "أكتب الوصف", "أراجع وأبعت"]),
             ("الحصى", "خطوات ١٠–١٥ دقيقة", ["أفتح الفولدر", "أستخرج الفاتورة", "أحط الأرقام في جدول", "أراجع مع الكشف"])]
            if ar else
            [("MOUNTAIN", "the big task", ["Prepare the whole project file"]),
             ("ROCKS", "the stages", ["Gather the numbers", "Write the description", "Review and send"]),
             ("GRAVEL", "steps, 10–15 min", ["Open the folder", "Pull the invoice", "Put numbers in a table", "Check the statement"])])
    gap, top, bot = 34, 216, H - 74
    cw = (W - 2 * PAD - gap * 2) / 3
    x = PAD
    for label, meaning, items in cols:
        box(d, x, top, x + cw, bot, CARD)
        inner = cw - 56
        if ar:
            block(d, x + cw - 28, top + 26, label, F(36, 780), GOLD_L, inner, True, 48)
            block(d, x + cw - 28, top + 78, meaning, F(23, 500), SOFT, inner, True, 36)
            y = top + 140
            for it in items:
                y = block(d, x + cw - 40, y, "•  " + it, F(25, 600), CREAM, inner - 12, True, 40) + 8
        else:
            block(d, x + 28, top + 26, label, F(32, 780), GOLD_L, inner, False, 44)
            block(d, x + 28, top + 78, meaning, F(22, 500), SOFT, inner, False, 34)
            y = top + 140
            for it in items:
                y = block(d, x + 38, y, "•  " + it, F(23, 600), CREAM, inner - 12, False, 38) + 8
        x += cw + gap
    return img


# ---------------------------------------------------------------- 2 friction
def fig_friction(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "قاعدة ال٢٠ ثانية: الفرق مش إرادة، الفرق مسافة" if ar else "The 20-second rule: it isn't willpower, it's distance",
         "قلّل احتكاك الصح، وزوّد احتكاك الغلط" if ar else "Make the good easier, the bad harder")
    rows = ([("الحاجة الصح", "صفر – ٥ ثواني", 0.12, GOLD_L),
             ("الحاجة المشتتة", "أكتر من ٢٠ ثانية", 0.88, (214, 122, 96))] if ar else
            [("The right thing", "0–5 seconds", 0.12, GOLD_L),
             ("The distraction", "more than 20 seconds", 0.88, (214, 122, 96))])
    y = 236
    for label, value, frac, color in rows:
        if ar:
            d.text((W - PAD - 6, y), label, font=F(32, 700), fill=CREAM, anchor="ra", direction="rtl", language="ar")
            d.text((PAD + 6, y + 4), value, font=F(26, 600), fill=SOFT, anchor="la")
        else:
            d.text((PAD + 6, y), label, font=F(30, 700), fill=CREAM, anchor="la")
            d.text((W - PAD - 6, y + 4), value, font=F(25, 600), fill=SOFT, anchor="ra")
        bx0, bx1 = PAD, W - PAD
        d.rounded_rectangle([bx0, y + 74, bx1, y + 128], radius=27, outline=LINE, width=2)
        fw = int((bx1 - bx0 - 10) * frac)
        if ar:
            d.rounded_rectangle([bx1 - 5 - fw, y + 79, bx1 - 5, y + 123], radius=22, fill=color)
        else:
            d.rounded_rectangle([bx0 + 5, y + 79, bx0 + 5 + fw, y + 123], radius=22, fill=color)
        y += 244
    block(d, W - PAD - 6 if ar else PAD + 6, H - 118,
          "قلّل احتكاك الصح ٢٠ ثانية، وزوّد احتكاك الغلط ٢٠ ثانية." if ar
          else "Make the good 20 seconds easier, the bad 20 seconds harder.",
          F(28, 650), GOLD_L, W - 2 * PAD, ar, 42)
    return img


# ---------------------------------------------------------------- 3 hours
def fig_hours(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "يومك مش ساعات متساوية" if ar else "Your day isn't equal hours",
         "حاد · متوسط · طين — وكل ساعة ليها شغلها" if ar else "sharp · medium · mud — each has its own work")
    zones = ([("حاد", "كتابة · تحليل · قرار", 0.44, GOLD_L),
              ("متوسط", "إيميلات · متابعة · ترتيب", 0.33, GOLD),
              ("طين", "ملفات · مسح · ترتيب مكاني", 0.23, (132, 146, 166))] if ar else
             [("SHARP", "writing · analysis · decisions", 0.44, GOLD_L),
              ("MEDIUM", "email · follow-up · admin", 0.33, GOLD),
              ("MUD", "files · clearing · tidying", 0.23, (132, 146, 166))])
    avail = W - 2 * PAD
    base_y = 470
    x = PAD
    for label, use, frac, color in zones:
        w = int(avail * frac) - 8
        d.rounded_rectangle([x, base_y - 140, x + w, base_y], radius=14, fill=color)
        if ar:
            block(d, x + w - 20, base_y - 126, label, F(32, 780), NAVY, w - 40, True, 42)
            block(d, x + w - 20, base_y - 80, use, F(21, 600), NAVY, w - 40, True, 32)
        else:
            block(d, x + 20, base_y - 126, label, F(28, 780), NAVY, w - 40, False, 40)
            block(d, x + 20, base_y - 80, use, F(20, 600), NAVY, w - 40, False, 30)
        x += w + 8
    pts = []
    for i in range(0, avail, 5):
        yy = base_y - 210 - int(95 * math.sin(i / avail * math.pi))
        pts.append((PAD + i, yy))
    d.line(pts, fill=CREAM, width=4)
    block(d, W - PAD - 6 if ar else PAD + 6, H - 112,
          "احجز نافذتك الحادة للمهمة الأصعب، وسيب الطين للشغل الميكانيكي." if ar
          else "Book your sharp window for the hardest task; leave the mud for mechanical work.",
          F(27, 650), GOLD_L, W - 2 * PAD, ar, 40)
    return img


# ---------------------------------------------------------------- 4 weeks
def fig_weeks(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "أربعة أسابيع، هدف واحد لكل أسبوع" if ar else "Four weeks, one goal each",
         "١٥ دقيقة في اليوم · ومتسيبهاش يومين ورا بعض" if ar else "15 minutes a day · never miss two days in a row")
    weeks = ([("أسبوع ١", "البداية", "٢ دقيقة + خريطة الجبل"),
              ("أسبوع ٢", "البيئة", "صناديق + إشارة مكان"),
              ("أسبوع ٣", "الطاقة", "نافذة الذروة + نوم ثابت"),
              ("أسبوع ٤", "النظام", "صندوق واحد + حدود")] if ar else
             [("Week 1", "Starting", "2 minutes + mountain map"),
              ("Week 2", "Environment", "boxes + a place signal"),
              ("Week 3", "Energy", "peak window + fixed sleep"),
              ("Week 4", "System", "one inbox + boundaries")])
    gap, top, bot = 22, 222, 566
    cw = (W - 2 * PAD - gap * 3) / 4
    x = PAD
    for badge, name, task in weeks:
        box(d, x, top, x + cw, bot, CARD)
        inner = cw - 44
        if ar:
            block(d, x + cw - 22, top + 24, badge, F(24, 650), GOLD, inner, True, 38)
            block(d, x + cw - 22, top + 74, name, F(34, 780), CREAM, inner, True, 46)
            block(d, x + cw - 22, top + 156, task, F(22, 600), GOLD_L, inner, True, 36)
        else:
            block(d, x + 22, top + 24, badge, F(22, 650), GOLD, inner, False, 36)
            block(d, x + 22, top + 74, name, F(30, 780), CREAM, inner, False, 44)
            block(d, x + 22, top + 156, task, F(21, 600), GOLD_L, inner, False, 34)
        x += cw + gap
    block(d, W - PAD - 6 if ar else PAD + 6, H - 130,
          "١٠ دقايق في اليوم · ومتفوّتش يومين ورا بعض" if ar
          else "10 minutes a day · never miss two days in a row",
          F(28, 700), GOLD_L, W - 2 * PAD, ar, 42)
    return img


# ---------------------------------------------------------------- 5 start card
def fig_start_card(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "بطاقة البداية: ٣ سطور قبل ما تبدأ" if ar else "The start card: three lines before you begin",
         "الورقة اللي بتخلّي البداية قرار جاهز، مش معركة" if ar else "The sheet that turns starting into a ready decision")
    rows = ([("١", "أول خطوة", "حصاة واحدة بس — مكتوبة بصيغة فعل"),
             ("٢", "أول ٣ دقايق", "هعمل إيه بالتحديد في أول ٣ دقايق؟"),
             ("٣", "خطة الفشل", "لو مش قادر: نسخة أصغر، دقيقتين بس")] if ar else
            [("1", "First step", "one piece of gravel only — written as a verb"),
             ("2", "First three minutes", "what exactly will I do in the first 3 minutes?"),
             ("3", "Failure plan", "if I can't start: a smaller version, 2 minutes")])
    top, bot = 218, H - 66
    box(d, PAD, top, W - PAD, bot, CARD, width=3)
    rowh = (bot - top - 40) // 3
    y = top + 24
    for i, (num, label, note) in enumerate(rows):
        if ar:
            cx = W - PAD - 62
            cy = y + rowh // 2 - 4
            d.ellipse([cx - 27, cy - 27, cx + 27, cy + 27], outline=GOLD_L, width=3)
            d.text((cx, cy - 16), num, font=F(32, 780), fill=GOLD_L, anchor="ma",
                   direction="rtl", language="ar")
            tx = W - PAD - 112
            block(d, tx, cy - 40, label, F(33, 780), CREAM, tx - PAD - 40, True, 44)
            block(d, tx, cy + 6, note, F(24, 550), SOFT, tx - PAD - 40, True, 36)
        else:
            cx = PAD + 62
            cy = y + rowh // 2 - 4
            d.ellipse([cx - 27, cy - 27, cx + 27, cy + 27], outline=GOLD_L, width=3)
            d.text((cx, cy - 16), num, font=F(30, 780), fill=GOLD_L, anchor="ma")
            tx = PAD + 112
            block(d, tx, cy - 38, label, F(30, 780), CREAM, W - PAD - tx - 30, False, 42)
            block(d, tx, cy + 8, note, F(23, 550), SOFT, W - PAD - tx - 30, False, 34)
        y += rowh
        if i < 2:
            d.line([(PAD + 44, y - 2), (W - PAD - 44, y - 2)], fill=LINE, width=2)
    return img


# ---------------------------------------------------------------- 6 system
def fig_system(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "النظام: مكان واحد، مراجعة واحدة، ٣ مهام" if ar else "The system: one place, one review, three tasks",
         "الشيل بيخرج من دماغك على ٣ خطوات" if ar else "the load leaves your head in three steps")
    cols = ([("١", "صندوق وارد واحد", ["كل حاجة جديدة", "تتكتب في مكان واحد", "مفتوح في ثانية"]),
             ("٢", "مراجعة ١٠ دقايق", ["كل يوم نفس الوقت", "بيفضل؟ يتشال؟", "بيتحوّل لتقويم؟"]),
             ("٣", "قائمة الثلاثة", ["واحدة مهمة", "واحدة سريعة", "واحدة احتياطية"])] if ar else
            [("1", "One inbox", ["everything new", "goes to one place", "open in a second"]),
             ("2", "10-minute review", ["same time daily", "keep it? drop it?", "move it to calendar?"]),
             ("3", "The list of three", ["one important", "one quick", "one backup"])])
    gap, top, bot = 40, 226, H - 112
    cw = (W - 2 * PAD - gap * 2) / 3
    x = PAD
    for num, label, items in cols:
        box(d, x, top, x + cw, bot, CARD)
        ccx = x + cw / 2
        d.ellipse([ccx - 30, top + 22, ccx + 30, top + 82], outline=GOLD_L, width=3)
        d.text((ccx, top + 32), num, font=F(30, 780), fill=GOLD_L, anchor="ma",
               direction="rtl", language="ar")
        inner = cw - 56
        if ar:
            block(d, x + cw - 28, top + 104, label, F(29, 780), GOLD_L, inner, True, 42)
            y = top + 176
            for it in items:
                y = block(d, x + cw - 38, y, "•  " + it, F(23, 600), CREAM, inner - 14, True, 38) + 6
        else:
            d.text((ccx, top + 104), label, font=F(26, 780), fill=GOLD_L, anchor="ma")
            y = top + 172
            for it in items:
                y = block(d, x + 38, y, "•  " + it, F(22, 600), CREAM, inner - 14, False, 36) + 6
        x += cw + gap
    block(d, W - PAD - 6 if ar else PAD + 6, H - 84,
          "دماغك مش مخزن — حطّ الشيل بره وخلّيه يشتغل" if ar
          else "Your brain isn't a warehouse — move the load out",
          F(27, 650), GOLD_L, W - 2 * PAD, ar, 40)
    return img


# ---------------------------------------------------------------- 7 boundaries
def fig_boundaries(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "الحدود: جملة واحدة، ومن غير محاضرة" if ar else "Boundaries: one sentence, no lecture",
         "الرفض القصير بيعمل أكتر من الشرح الطويل" if ar else "a short refusal does more than a long explanation")
    # right block: refusal sentences
    rx1, rx0 = W - PAD, W - PAD - 720
    if ar:
        block(d, rx1 - 6, 214, "٣ جمل رفض جاهزة", F(28, 720), GOLD_L, 700, True, 40)
        lines = ["مش هقدر دلوقتي، هرجعلك الساعة ٤.",
                 "أنا في نص حاجة، هرجعلك لما أخلص.",
                 "مينفعش النهاردة، ينفع بكرة الصبح؟"]
    else:
        block(d, rx0 + 6, 214, "Three refusal sentences", F(26, 720), GOLD_L, 700, False, 38)
        lines = ["Not right now — I'll get back to you at 4.",
                 "I'm mid-something, I'll come back to you.",
                 "Today won't work, tomorrow morning?"]
    y = 266
    for s in lines:
        box(d, rx0, y, rx1, y + 84, CARD2, LINE, radius=20)
        if ar:
            block(d, rx1 - 26, y + 24, s, F(23, 600), CREAM, rx1 - rx0 - 52, True, 34)
        else:
            block(d, rx0 + 26, y + 24, s, F(21, 600), CREAM, rx1 - rx0 - 52, False, 32)
        y += 104
    # left block: windows
    lx0, lx1 = PAD, PAD + 660
    if ar:
        block(d, lx1 - 6, 214, "ونافذتين للردود", F(28, 720), GOLD_L, 640, True, 40)
    else:
        block(d, lx0 + 6, 214, "And two reply windows", F(26, 720), GOLD_L, 640, False, 38)
    box(d, lx0, 266, lx1, 462, CARD)
    box(d, lx0, 486, lx1, 600, CARD2, LINE, radius=20)
    if ar:
        block(d, lx1 - 26, 288, "الردود: ١ و ٨ بس", F(26, 720), CREAM, lx1 - lx0 - 52, True, 38)
        block(d, lx1 - 26, 340, "المستعجل: مكالمة مش رسالة", F(22, 550), SOFT, lx1 - lx0 - 52, True, 34)
        block(d, lx1 - 26, 386, "أول ٢٠ دقيقة: ملكك", F(22, 550), SOFT, lx1 - lx0 - 52, True, 34)
        block(d, lx1 - 26, 512, "«ممكن دقيقة؟» بتكلّف ١٠–٢٠ دقيقة رجوع", F(21, 600), GOLD_L, lx1 - lx0 - 52, True, 32)
    else:
        block(d, lx0 + 26, 288, "Replies at 1 and 8 only", F(24, 720), CREAM, lx1 - lx0 - 52, False, 36)
        block(d, lx0 + 26, 340, "Urgent: a call, not a message", F(21, 550), SOFT, lx1 - lx0 - 52, False, 32)
        block(d, lx0 + 26, 386, "First 20 minutes: yours", F(21, 550), SOFT, lx1 - lx0 - 52, False, 32)
        block(d, lx0 + 26, 512, '"Got a minute?" costs 10–20 minutes', F(20, 600), GOLD_L, lx1 - lx0 - 52, False, 30)
    return img


# ---------------------------------------------------------------- 8 safety
def fig_safety(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "إمتى تكمل لوحدك، وإمتى تحتاج مختص" if ar else "When to continue alone, when to get help",
         "الكتاب ده أنظمة وعادات — مش تشخيص ولا علاج" if ar else "this book is systems and habits — not diagnosis or treatment")
    rows = ([("الأنظمة والعادات", "الشغل اليومي: بداية، تفكيك، بيئة، طاقة، حدود", GREEN),
             ("أعراض مستمرة", "تركيز أو نوم أو مزاج بيأثر على حياتك — ابدأ بتقييم طبي", ORANGE),
             ("أزمة أو خطر", "أي أفكار لإيذاء نفسك — كلّم حد فوراً أو روح أقرب مستشفى", RED)] if ar else
            [("Systems and habits", "daily work: starting, breaking down, environment, energy", GREEN),
             ("Persistent symptoms", "focus, sleep, or mood affecting your life — start with a medical assessment", ORANGE),
             ("Crisis or risk", "any thoughts of self-harm — tell someone now or go to the nearest hospital", RED)])
    y = 226
    for label, note, color in rows:
        box(d, PAD, y, W - PAD, y + 148, CARD, color, width=3)
        d.rectangle([PAD, y + 10, PAD + 12, y + 138], fill=color)
        if ar:
            block(d, W - PAD - 34, y + 22, label, F(31, 780), color, W - 2 * PAD - 80, True, 42)
            block(d, W - PAD - 34, y + 76, note, F(23, 550), CREAM, W - 2 * PAD - 80, True, 36)
        else:
            block(d, PAD + 40, y + 22, label, F(28, 780), color, W - 2 * PAD - 80, False, 40)
            block(d, PAD + 40, y + 76, note, F(22, 550), CREAM, W - 2 * PAD - 80, False, 34)
        y += 172
    block(d, W - PAD - 6 if ar else PAD + 6, H - 92,
          "ولو الدوا موصوف لك: متوقفوش ومتبدّلوش من نفسك." if ar
          else "And if medication is prescribed: don't stop or switch it yourself.",
          F(24, 650), GOLD_L, W - 2 * PAD, ar, 36)
    return img


# ---------------------------------------------------------------- 9 layers
def fig_layers(ar):
    img = canvas(); d = ImageDraw.Draw(img)
    head(d, ar,
         "٣ طبقات: واحدة مش كفاية" if ar else "Three layers: one isn't enough",
         "لو ظبطت واحدة وسبت الباقي، الباقي هيكسر اللي عملته" if ar else "fix one and leave the rest, and the rest breaks it")
    cols = ([("الفيزيائية", "المكتب · الغرفة · البيت", ["سطح فاضي", "سطر واحد", "إشارة مكان"]),
             ("الرقمية", "الموبايل · اللابتوب", ["شاشة أولى فاضية", "إشعارات مقفولة", "تاب واحد"]),
             ("الاجتماعية", "الناس اللي حواليك", ["إعلان مسبق", "سؤال واحد", "٥ دقايق وأنا معاك"])] if ar else
            [("Physical", "desk · room · home", ["a clear surface", "one line", "a place signal"]),
             ("Digital", "phone · laptop", ["an empty first screen", "notifications off", "one tab"]),
             ("Social", "the people around you", ["announce first", "one question", '"five minutes and I\'m with you"'])])
    gap, top, bot = 40, 226, H - 96
    cw = (W - 2 * PAD - gap * 2) / 3
    x = PAD
    for label, where, items in cols:
        box(d, x, top, x + cw, bot, CARD)
        ccx = x + cw / 2
        inner = cw - 56
        if ar:
            d.text((ccx, top + 26), label, font=F(32, 780), fill=GOLD_L, anchor="ma",
                   direction="rtl", language="ar")
            d.text((ccx, top + 82), where, font=F(22, 550), fill=SOFT, anchor="ma",
                   direction="rtl", language="ar")
            y = top + 148
            for it in items:
                y = block(d, x + cw - 30, y, "•  " + it, F(24, 600), CREAM, inner, True, 38) + 8
        else:
            d.text((ccx, top + 26), label, font=F(28, 780), fill=GOLD_L, anchor="ma")
            d.text((ccx, top + 82), where, font=F(21, 550), fill=SOFT, anchor="ma")
            y = top + 148
            for it in items:
                y = block(d, x + 30, y, "•  " + it, F(22, 600), CREAM, inner, False, 36) + 8
        x += cw + gap
    return img


if __name__ == "__main__":
    bad = 0
    for lang in ("ar", "en"):
        ar = lang == "ar"
        figs = [("fig1-map.png", fig_map(ar)), ("fig2-friction.png", fig_friction(ar)),
                ("fig3-hours.png", fig_hours(ar)), ("fig4-weeks.png", fig_weeks(ar)),
                ("fig5-startcard.png", fig_start_card(ar)), ("fig6-system.png", fig_system(ar)),
                ("fig7-boundaries.png", fig_boundaries(ar)), ("fig8-safety.png", fig_safety(ar)),
                ("fig9-layers.png", fig9 := fig_layers(ar))]
        for name, im in figs:
            save(im, lang, name)
            for label, (x0, y0, x1, y1) in CHECKS:
                if x0 < 30 or x1 > W - 30 or y0 < 26 or y1 > H - 26:
                    bad += 1
                    print(f"OVERFLOW {lang}/{name}: {label!r} bbox={x0,y0,x1,y1}")
        CHECKS.clear()
    print("done, overflow lines:", bad)

