import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1400, 760
NAVY = (15, 28, 46)
NAVY_D = (9, 18, 32)
GOLD = (200, 165, 94)
GOLD_L = (232, 205, 150)
CREAM = (247, 243, 234)
MUTED = (168, 178, 194)

AR = "/home/user/workspace/cairo_vf.ttf"
EN = "/home/user/workspace/cairo_vf.ttf"


def f(size, weight=600):
    ft = ImageFont.truetype(AR, size)
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
    d.rectangle([16, 16, W - 16, H - 16], outline=GOLD + (), width=2)
    return img


def rtl(d, xy, text, font, fill, anchor="ma"):
    d.text(xy, text, font=font, fill=fill, anchor=anchor, direction="rtl", language="ar")


def box(d, x0, y0, x1, y1, outline=GOLD, fill=None, radius=14, width=2):
    if fill:
        d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)
    else:
        d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=outline, width=width)


# ---------- fig 1: mountain map ----------
def fig_map(lang):
    img = canvas()
    d = ImageDraw.Draw(img)
    ar = lang == "ar"
    title = "خريطة الجبل: من كتلة واحدة لخطوة تقدر تلمسها" if ar else "The mountain map: from one mass to a step you can touch"
    sub = "مشروع ← مراحل ← خطوات (١٠–١٥ دقيقة)" if ar else "project → stages → steps (10–15 min)"
    rtl(d, (W - 60, 60), title, f(46, 750), CREAM) if ar else d.text((60, 54), title, font=f(44, 700), fill=CREAM)
    rtl(d, (W - 60, 132), sub, f(34, 500), GOLD) if ar else d.text((60, 118), sub, font=f(32, 500), fill=GOLD)

    cols = [
        ("الجبل", "المهمة الكبيرة", ["أجهّز ملف المشروع"], 1) if ar else
        ("MOUNTAIN", "the big task", ["Prepare the project file"], 1),
        ("الصخور", "المراحل", ["أجمع الأرقام", "أكتب الوصف", "أراجع وأبعت"], 3) if ar else
        ("ROCKS", "the stages", ["Gather numbers", "Write description", "Review and send"], 3),
        ("الحصى", "الخطوات ١٠–١٥ د", ["أفتح الفولدر", "أستخرج الفاتورة", "أحط الأرقام في جدول", "أراجع مع الكشف"], 4) if ar else
        ("GRAVEL", "steps, 10–15 min", ["Open the folder", "Pull the invoice", "Put numbers in a table", "Check against statement"], 4),
    ]
    x = 60
    cw = (W - 120 - 2 * 34) / 3
    for label, meaning, items, n in cols:
        box(d, x, 220, x + cw, H - 70, outline=GOLD, fill=(22, 38, 60), width=2)
        if ar:
            rtl(d, (x + cw - 26, 240), label, f(40, 750), GOLD_L)
            rtl(d, (x + cw - 26, 292), meaning, f(27, 500), MUTED)
        else:
            d.text((x + 26, 238), label, font=f(36, 750), fill=GOLD_L)
            d.text((x + 26, 288), meaning, font=f(26, 500), fill=MUTED)
        y = 356
        for it in items:
            if ar:
                rtl(d, (x + cw - 30, y), "• " + it, f(28, 550), CREAM)
            else:
                d.text((x + 30, y), "• " + it, font=f(27, 550), fill=CREAM)
            y += 62
        x += cw + 34
    # arrow-ish connector dots
    for i in range(2):
        cx = 60 + cw + i * (cw + 34) - 17
        for k in range(3):
            d.ellipse([cx - 4, 470 + k * 18 - 4, cx + 4, 470 + k * 18 + 4], fill=GOLD)
    return img


# ---------- fig 2: 20-second friction ----------
def fig_friction(lang):
    img = canvas()
    d = ImageDraw.Draw(img)
    ar = lang == "ar"
    title = "قاعدة الـ٢٠ ثانية: الفرق مش إرادة، الفرق مسافة" if ar else "The 20-second rule: it isn't willpower, it's distance"
    rtl(d, (W - 60, 60), title, f(46, 750), CREAM) if ar else d.text((60, 54), title, font=f(44, 700), fill=CREAM)

    rows = [
        ("الحاجة الصح", "صفر – ٥ ثواني", 0.10, GOLD_L) if ar else ("The right thing", "0–5 seconds", 0.10, GOLD_L),
        ("الحاجة المشتتة", "أكتر من ٢٠ ثانية", 0.85, (214, 122, 96)) if ar else ("The distraction", "more than 20 seconds", 0.85, (214, 122, 96)),
    ]
    y = 230
    for label, value, frac, color in rows:
        if ar:
            rtl(d, (W - 60, y), label, f(34, 700), CREAM)
            rtl(d, (W - 60, y + 46), value, f(27, 500), MUTED)
        else:
            d.text((60, y), label, font=f(32, 700), fill=CREAM)
            d.text((60, y + 44), value, font=f(26, 500), fill=MUTED)
        bx0, bx1 = 60, W - 60
        d.rounded_rectangle([bx0, y + 110, bx1, y + 150], radius=20, outline=(60, 78, 100), width=2)
        fill_w = int((bx1 - bx0 - 8) * frac)
        # RTL fills from right
        if ar:
            d.rounded_rectangle([bx1 - 4 - fill_w, y + 114, bx1 - 4, y + 146], radius=18, fill=color)
        else:
            d.rounded_rectangle([bx0 + 4, y + 114, bx0 + 4 + fill_w, y + 146], radius=18, fill=color)
        y += 230

    note = "قلّل احتكاك الصح ٢٠ ثانية، وزوّد احتكاك الغلط ٢٠ ثانية." if ar else "Make the good 20 seconds easier, the bad 20 seconds harder."
    rtl(d, (W - 60, H - 120), note, f(31, 600), GOLD) if ar else d.text((60, H - 118), note, font=f(30, 600), fill=GOLD)
    return img


# ---------- fig 3: three kinds of hours ----------
def fig_hours(lang):
    img = canvas()
    d = ImageDraw.Draw(img)
    ar = lang == "ar"
    title = "يومك مش ساعات متساوية" if ar else "Your day isn't equal hours"
    rtl(d, (W - 60, 56), title, f(46, 750), CREAM) if ar else d.text((60, 50), title, font=f(44, 700), fill=CREAM)

    # zones
    zones = [
        ("حاد", "كتابة · تحليل · قرار", 0.55, GOLD_L) if ar else ("Sharp", "writing · analysis · decisions", 0.55, GOLD_L),
        ("متوسط", "إيميلات · متابعة · ترتيب", 0.30, GOLD) if ar else ("Medium", "email · follow-up · admin", 0.30, GOLD),
        ("طين", "ملفات · مسح · ترتيب مكاني", 0.15, (120, 132, 150)) if ar else ("Mud", "files · clearing · tidying", 0.15, (120, 132, 150)),
    ]
    x = 60
    avail = W - 120
    base_y = 470
    for label, use, frac, color in zones:
        w = int(avail * frac) - 10
        d.rounded_rectangle([x, base_y - 150, x + w, base_y], radius=12, fill=color)
        if ar:
            rtl(d, (x + w - 18, base_y - 140), label, f(36, 750), NAVY)
            rtl(d, (x + w - 18, base_y - 80), use, f(25, 550), NAVY)
        else:
            d.text((x + 18, base_y - 138), label, font=f(34, 750), fill=NAVY)
            d.text((x + 18, base_y - 78), use, font=f(24, 550), fill=NAVY)
        x += w + 10

    # wave line
    import math
    pts = []
    for i in range(0, avail, 6):
        yy = base_y - 60 - int(120 * math.sin(i / avail * math.pi * 1.0)) * 0.9
        pts.append((60 + i, max(200, yy)))
    d.line(pts, fill=CREAM, width=4)

    note = "احجز نافذتك الحادة للمهمة الأصعب، وسيب الطين للشغل الميكانيكي." if ar else "Book your sharp window for the hardest task; leave the mud for mechanical work."
    rtl(d, (W - 60, H - 110), note, f(30, 600), GOLD) if ar else d.text((60, H - 108), note, font=f(29, 600), fill=GOLD)
    return img


# ---------- fig 4: thirty days ----------
def fig_weeks(lang):
    img = canvas()
    d = ImageDraw.Draw(img)
    ar = lang == "ar"
    title = "أربعة أسابيع، هدف واحد لكل أسبوع" if ar else "Four weeks, one goal each"
    rtl(d, (W - 60, 56), title, f(46, 750), CREAM) if ar else d.text((60, 50), title, font=f(44, 700), fill=CREAM)

    weeks = [
        ("أسبوع ١", "البداية", "٢ دقيقة + خريطة الجبل") if ar else ("Week 1", "Starting", "2 minutes + mountain map"),
        ("أسبوع ٢", "البيئة", "صناديق + إشارة مكان") if ar else ("Week 2", "Environment", "boxes + place signal"),
        ("أسبوع ٣", "الطاقة", "نافذة الذروة + نوم ثابت") if ar else ("Week 3", "Energy", "peak window + fixed sleep"),
        ("أسبوع ٤", "النظام", "صندوق واحد + حدود") if ar else ("Week 4", "System", "one inbox + boundaries"),
    ]
    n = len(weeks)
    gap = 24
    cw = (W - 120 - gap * (n - 1)) / n
    x = 60
    for badge, name, tasks in weeks:
        box(d, x, 200, x + cw, 560, outline=GOLD, fill=(22, 38, 60))
        if ar:
            rtl(d, (x + cw - 24, 224), badge, f(30, 600), GOLD)
            rtl(d, (x + cw - 24, 278), name, f(40, 780), CREAM)
            rtl(d, (x + cw - 24, 360), tasks, f(25, 550), GOLD_L)
        else:
            d.text((x + 24, 222), badge, font=f(28, 600), fill=GOLD)
            d.text((x + 24, 274), name, font=f(38, 780), fill=CREAM)
            d.text((x + 24, 356), tasks, font=f(24, 550), fill=GOLD_L)
        x += cw + gap

    note = "١٠ دقايق في اليوم · ومتفوّتش يومين ورا بعض" if ar else "10 minutes a day · never miss two days in a row"
    rtl(d, (W - 60, H - 120), note, f(32, 650), GOLD) if ar else d.text((60, H - 118), note, font=f(31, 650), fill=GOLD)
    return img


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for lang in ("ar", "en"):
        out = os.path.join(here, lang)
        os.makedirs(out, exist_ok=True)
        fig_map(lang).save(os.path.join(out, "fig1-map.png"))
        fig_friction(lang).save(os.path.join(out, "fig2-friction.png"))
        fig_hours(lang).save(os.path.join(out, "fig3-hours.png"))
        fig_weeks(lang).save(os.path.join(out, "fig4-weeks.png"))
    print("figures done")
