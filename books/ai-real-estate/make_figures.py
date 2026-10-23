import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 900
BG = (250, 248, 243)
INK = (15, 28, 46)
GOLD = (200, 165, 94)
GOLD_D = (138, 115, 80)
MUTED = (108, 118, 132)
WHITE = (255, 255, 255)
SOFT = (238, 231, 216)

FONT = "/home/user/workspace/cairo_vf.ttf"


def f(size, weight=700):
    ft = ImageFont.truetype(FONT, size)
    try:
        ft.set_variation_by_axes([weight])
    except Exception:
        pass
    return ft


def canvas():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=GOLD)
    return img, d


def txt(d, xy, s, size, fill=INK, weight=700, anchor="ma", rtl=False):
    d.text(xy, s, font=f(size, weight), fill=fill, anchor=anchor,
           direction="rtl" if rtl else "ltr")


def rrect(d, box, r=24, fill=WHITE, outline=SOFT, width=3):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def fig_baskets(lang):
    img, d = canvas()
    ar = lang == "ar"
    title = "افصل شغلك لتلات سلال" if ar else "Split your work into three baskets"
    txt(d, (W // 2, 60), title, 60, INK, 800, rtl=ar)

    cols = [
        ("١" if ar else "1",
         "تعامل مع عميل" if ar else "Client time",
         "مكالمة · معاينة · تفاوض" if ar else "Call · viewing · negotiation",
         "تاخد يومك" if ar else "This is your day"),
        ("٢" if ar else "2",
         "إنتاج" if ar else "Production",
         "إعلان · وصف · بريد" if ar else "Ad · description · email",
         "مسودة + مراجعة" if ar else "Draft + review"),
        ("٣" if ar else "3",
         "نقل وتنظيم" if ar else "Copy & organise",
         "نسخ · تجميع · تحويل" if ar else "Copy · gather · convert",
         "تختفي" if ar else "It disappears"),
    ]
    x0, gap, w = 110, 40, 440
    for i, (num, name, ex, verdict) in enumerate(cols):
        x = x0 + i * (w + gap)
        rrect(d, [x, 220, x + w, 780])
        cx = x + w // 2
        d.ellipse([cx - 62, 260, cx + 62, 384], outline=GOLD, width=5)
        txt(d, (cx, 322), num, 66, GOLD_D, 800, rtl=ar)
        txt(d, (cx, 440), name, 46, INK, 800, rtl=ar)
        txt(d, (cx, 520), ex, 33, MUTED, 500, rtl=ar)
        d.line([cx - 110, 585, cx + 110, 585], fill=SOFT, width=3)
        txt(d, (cx, 640), verdict, 40, GOLD_D, 700, rtl=ar)
    return img


def fig_price(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 55), "«غالي» مش اعتراض واحد" if ar else '"Expensive" is not one objection',
        58, INK, 800, rtl=ar)

    rrect(d, [W // 2 - 250, 160, W // 2 + 250, 280], fill=INK, outline=INK)
    txt(d, (W // 2, 220), "«المقابل المالي كتير»" if ar else '"The price is too high"',
        38, WHITE, 800, rtl=ar)

    boxes = [
        ("غالي على السوق" if ar else "Expensive vs market",
         "اسأل عن سعر المتر" if ar else "Compare price per sq ft"),
        ("غالي على الميزانية" if ar else "Expensive vs budget",
         "اعرض خطة دفع" if ar else "Offer a payment plan"),
        ("غالي على القيمة" if ar else "Expensive vs value",
         "اسأل عن أولوياته" if ar else "Ask about priorities"),
    ]
    w, gap = 440, 40
    x0 = (W - (3 * w + 2 * gap)) // 2
    for i, (t, s) in enumerate(boxes):
        x = x0 + i * (w + gap)
        cx = x + w // 2
        d.line([(W // 2, 280), (W // 2, 360)], fill=GOLD, width=4)
        d.line([(W // 2, 360), (cx, 360)], fill=GOLD, width=4)
        d.line([(cx, 360), (cx, 420)], fill=GOLD, width=4)
        d.polygon([(cx - 12, 412), (cx + 12, 412), (cx, 436)], fill=GOLD)
        rrect(d, [x, 450, x + w, 760])
        txt(d, (cx, 530), t, 42, INK, 800, rtl=ar)
        txt(d, (cx, 630), s, 34, GOLD_D, 600, rtl=ar)
    return img


def fig_routes(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 55), "البعد بيتقاس بالدقايق مش بالكيلومتر" if ar else "Distance is measured in minutes, not kilometres",
        54, INK, 800, rtl=ar)

    rows = [
        ("الشغل", "Work", 45),
        ("المدرسة", "School", 20),
        ("الأهل", "Family", 35),
        ("أقرب مول", "Nearest mall", 15),
    ]
    x_label = 1330 if ar else 110
    bar_left = 420
    unit = 15.0
    y = 220
    d.line([(bar_left + 45 * unit, 190), (bar_left + 45 * unit, 800)], fill=SOFT, width=3,)
    txt(d, (bar_left + 45 * unit, 165), "45", 28, MUTED, 500, rtl=ar)
    for a, b, mins in rows:
        label = a if ar else b
        anchor = "ra" if ar else "la"
        txt(d, (x_label, y + 18), label, 40, INK, 700, anchor=anchor, rtl=ar)
        width = mins * unit
        col = GOLD if mins < 30 else INK
        if ar:
            box = [bar_left + (45 - mins) * unit, y, bar_left + 45 * unit, y + 62]
        else:
            box = [bar_left, y, bar_left + width, y + 62]
        d.rounded_rectangle(box, radius=12, fill=col)
        txt(d, ((box[0] + box[2]) // 2, y + 31), f"{mins}", 32, WHITE, 700, rtl=False)
        y += 140

    txt(d, (W // 2, 830), "إجمالي اليوم: ١١٥ دقيقة" if ar else "Total per day: 115 minutes",
        38, GOLD_D, 700, rtl=ar)
    return img


def fig_cadence(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 60), "إيقاع المتابعة: ٢ – ٧ – ٢١" if ar else "Follow-up cadence: 2 – 7 – 21",
        58, INK, 800, rtl=ar)

    points = [
        ("٠", "0", "بعد الزيارة" if ar else "After viewing", "تثبيت التجربة" if ar else "Anchor the experience"),
        ("٢", "2", "اليوم التاني" if ar else "Day two", "معلومة جديدة" if ar else "New information"),
        ("٧", "7", "اليوم السابع" if ar else "Day seven", "سؤال قرار" if ar else "A decision question"),
        ("٢١", "21", "اليوم ٢١" if ar else "Day 21", "إعادة إحياء" if ar else "Revive"),
    ]
    y_line = 430
    x_start, x_end = 200, 1400
    d.line([x_start, y_line, x_end, y_line], fill=GOLD, width=6)
    step = (x_end - x_start) / (len(points) - 1)
    for i, (num_ar, num_en, when, what) in enumerate(points):
        x = x_start + i * step
        d.ellipse([x - 46, y_line - 46, x + 46, y_line + 46], fill=INK)
        txt(d, (x, y_line), num_ar if ar else num_en, 46, WHITE, 800, rtl=False)
        txt(d, (x, 320), when, 38, INK, 700, rtl=ar)
        txt(d, (x, 520), what, 33, GOLD_D, 600, rtl=ar)
    return img


def fig_photos(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 55), "ترتيب الصور السبعة" if ar else "The order of seven photos",
        58, INK, 800, rtl=ar)

    items_ar = ["الواجهة", "الصالة", "تفصيلة", "غرفة النوم", "الحمام", "الفيو", "المبنى"]
    items_en = ["Facade", "Living", "Detail", "Bedroom", "Bath", "View", "Building"]
    items = items_ar if ar else items_en
    w, h, gap = 330, 240, 32
    for i, name in enumerate(items):
        row, col = divmod(i, 4)
        x = 130 + col * (w + gap)
        y = 210 + row * (h + gap)
        rrect(d, [x, y, x + w, y + h])
        d.rectangle([x + 24, y + 24, x + 84, y + 84], fill=GOLD)
        txt(d, (x + 54, y + 54), str(i + 1), 34, WHITE, 800, rtl=False)
        txt(d, (x + w // 2, y + 150), name, 40, INK, 700, rtl=ar)
    txt(d, (W // 2, 810), "الأولى هي اللي توقّف السكرول" if ar else "The first one stops the scroll",
        38, GOLD_D, 700, rtl=ar)
    return img


def fig_prompt(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 55), "الأمر اللي بيشتغل: ٥ أجزاء" if ar else "A prompt that works: five parts",
        56, INK, 800, rtl=ar)

    parts_ar = [("الدور", "مين الأداة"), ("السياق", "بياناتك"), ("القيود", "الطول والممنوع"),
                ("الصيغة", "شكل الناتج"), ("المعيار", "إيه الكويس")]
    parts_en = [("Role", "who it is"), ("Context", "your data"), ("Constraints", "length & bans"),
                ("Format", "output shape"), ("Standard", "what counts as good")]
    parts = parts_ar if ar else parts_en

    w, gap = 268, 34
    x0 = (W - (5 * w + 4 * gap)) // 2
    for i, (name, note) in enumerate(parts):
        x = x0 + i * (w + gap)
        top = 200 + (i % 2) * 22
        rrect(d, [x, top, x + w, top + 400])
        d.ellipse([x + w // 2 - 44, top + 34, x + w // 2 + 44, top + 122], outline=GOLD, width=4)
        txt(d, (x + w // 2, top + 78), str(i + 1), 44, GOLD_D, 800, rtl=False)
        txt(d, (x + w // 2, top + 200), name, 42, INK, 800, rtl=ar)
        txt(d, (x + w // 2, top + 280), note, 30, MUTED, 500, rtl=ar)

    txt(d, (W // 2, 780), "= ناتج بيشتغل من أول مرة" if ar else "= output that works first time",
        44, GOLD_D, 800, rtl=ar)
    d.line([(W // 2 - 260, 730), (W // 2 + 260, 730)], fill=SOFT, width=3)
    return img


def fig_gate(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 60), "الأداة تكتب · إنت تتحقق · إنت تتحاسب" if ar
        else "The tool writes · you verify · you are accountable", 52, INK, 800, rtl=ar)

    steps = [(("١", "1"), ("الأداة بتكتب", "The tool writes"), ("مسودة في دقايق", "a draft in minutes")),
             (("٢", "2"), ("إنت بتراجع", "You verify"), ("أرقام · وعود · بيانات", "numbers · promises · data")),
             (("٣", "3"), ("إنت اللي بتبعت", "You send"), ("إنت اللي بتتحاسب", "you carry it"))]
    w, gap = 400, 90
    x0 = (W - (3 * w + 2 * gap)) // 2
    for i, (num, t, s) in enumerate(steps):
        x = x0 + i * (w + gap)
        cx = x + w // 2
        rrect(d, [x, 240, x + w, 640])
        d.ellipse([cx - 66, 280, cx + 66, 412], fill=INK)
        txt(d, (cx, 346), num[0] if ar else num[1], 56, WHITE, 800, rtl=False)
        txt(d, (cx, 470), t[0] if ar else t[1], 42, INK, 800, rtl=ar)
        txt(d, (cx, 550), s[0] if ar else s[1], 30, MUTED, 500, rtl=ar)
        if i < 2:
            ax = x + w + gap // 2
            d.line([(ax - 24, 440), (ax + 24, 440)], fill=GOLD, width=5)
            d.polygon([(ax + 14, 428), (ax + 14, 452), (ax + 38, 440)], fill=GOLD)

    txt(d, (W // 2, 730), "ممنوع تعبر من غير مراجعة: وعود · أرقام مش موثقة · بيانات عملاء" if ar
        else "Never pass without review: promises · unverified numbers · client data",
        34, GOLD_D, 700, rtl=ar)
    return img


def fig_weeks(lang):
    img, d = canvas()
    ar = lang == "ar"
    txt(d, (W // 2, 60), "أربعة أسابيع · هدف واحد كل أسبوع" if ar else "Four weeks · one goal each",
        56, INK, 800, rtl=ar)

    weeks = [
        ("١" if ar else "1", "الكسب السريع" if ar else "Quick win",
         "وصف وحدة + رد" if ar else "Description + reply"),
        ("٢" if ar else "2", "التثبيت" if ar else "Lock it in",
         "متابعة + جدول" if ar else "Follow-up + sheet"),
        ("٣" if ar else "3", "الإعلان" if ar else "The ad",
         "٣ زوايا + صور" if ar else "3 angles + photos"),
        ("٤" if ar else "4", "الحماية" if ar else "Protection",
         "مراجعة قبل الإرسال" if ar else "Pre-send review"),
    ]
    w, gap = 330, 40
    x0 = (W - (4 * w + 3 * gap)) // 2
    base = 640
    for i, (num, name, note) in enumerate(weeks):
        x = x0 + i * (w + gap)
        cx = x + w // 2
        h = 300 + i * 55
        d.rounded_rectangle([x, base - h, x + w, base], radius=18,
                            fill=INK if i % 2 == 0 else WHITE,
                            outline=INK if i % 2 else SOFT, width=3)
        col = WHITE if i % 2 == 0 else INK
        txt(d, (cx, base - h + 46), num, 52, GOLD if i % 2 == 0 else GOLD_D, 800, rtl=False)
        txt(d, (cx, base - h + 140), name, 38, col, 800, rtl=ar)
        txt(d, (cx, base - h + 210), note, 28, (200, 205, 215) if i % 2 == 0 else MUTED, 500, rtl=ar)

    d.line([(x0 - 30, base + 30), (x0 + 4 * w + 3 * gap + 30, base + 30)], fill=GOLD, width=5)
    txt(d, (W // 2, 745), "قاعدة اليومين: لو فوّت يوم، متفوّتش يومين" if ar
        else "Two-day rule: miss a day, never miss two", 36, GOLD_D, 700, rtl=ar)
    return img


def pad_h(result):
    """Fit generated square-ish art into 1600x900 canvas keeping aspect."""
    w, h = result.size
    canvas_ratio = W / H
    ratio = w / h
    if ratio > canvas_ratio:
        new_w = W
        new_h = int(H * (h / w) * (w / h) * (W / w) * (h / W) * (W / w)) if False else int(w and W * h / w)
        resized = result.resize((W, max(1, int(W * h / w))), Image.LANCZOS)
    else:
        resized = result.resize((max(1, int(H * w / h)), H), Image.LANCZOS)
    bg = Image.new("RGB", (W, H), BG)
    bg.paste(resized, ((W - resized.width) // 2, (H - resized.height) // 2))
    return bg


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for lang in ["ar", "en"]:
        out = os.path.join(here, "figures", lang)
        os.makedirs(out, exist_ok=True)
        figs = {
            "fig1-baskets.png": fig_baskets(lang),
            "fig2-price.png": fig_price(lang),
            "fig3-routes.png": fig_routes(lang),
            "fig4-cadence.png": fig_cadence(lang),
            "fig5-photos.png": fig_photos(lang),
            "fig6-prompt.png": fig_prompt(lang),
            "fig7-gate.png": fig_gate(lang),
            "fig8-weeks.png": fig_weeks(lang),
        }
        for name, im in figs.items():
            im.save(os.path.join(out, name), dpi=(220, 220))
        print("ok", lang)


if __name__ == "__main__":
    main()
