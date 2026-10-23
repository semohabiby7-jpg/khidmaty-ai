import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1400, 760
NAVY = (15, 28, 46)
NAVY_D = (9, 18, 32)
GOLD = (200, 165, 94)
GOLD_L = (232, 205, 150)
CREAM = (247, 243, 234)
MUTED = (168, 178, 194)
GREEN = (122, 176, 128)
ORANGE = (216, 154, 86)
RED = (206, 106, 96)

FONT = "/home/user/workspace/cairo_vf.ttf"


def f(size, weight=600):
    ft = ImageFont.truetype(FONT, size)
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
    d.rectangle([16, 16, W - 16, H - 16], outline=GOLD, width=2)
    return img


def rtl(d, xy, text, font, fill, anchor="ma"):
    d.text(xy, text, font=font, fill=fill, anchor=anchor, direction="rtl", language="ar")


def box(d, x0, y0, x1, y1, outline=GOLD, fill=None, radius=16, width=2):
    if fill:
        d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)
    else:
        d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=outline, width=width)


def head(d, ar, title, sub=None):
    if ar:
        rtl(d, (W - 60, 52), title, f(44, 750), CREAM)
        if sub:
            rtl(d, (W - 60, 120), sub, f(30, 500), GOLD)
    else:
        d.text((60, 46), title, font=f(42, 700), fill=CREAM)
        if sub:
            d.text((60, 108), sub, font=f(29, 500), fill=GOLD)


def write(img, lang, name):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), lang)
    os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, name))


# ---------- fig 5: the start card ----------
def fig_start_card(lang):
    ar = lang == "ar"
    img = canvas()
    d = ImageDraw.Draw(img)
    head(d, ar,
         "بطاقة البداية: ٣ سطور قبل ما تبدأ" if ar else "The start card: three lines before you begin",
         "الورقة اللي بتخلّي البداية قرار جاهز، مش معركة" if ar else "The sheet that turns starting into a ready decision")

    rows = ([("١", "أول خطوة", "حصاة واحدة بس — مكتوبة بصيغة فعل"),
             ("٢", "أول ٣ دقايق", "هعمل إيه بالتحديد في أول ٣ دقايق؟"),
             ("٣", "خطة الفشل", "لو مش قادر: نسخة أصغر، ٢ دقيقة")] if ar else
            [("1", "First step", "one piece of gravel only — written as a verb"),
             ("2", "First three minutes", "what exactly will I do in the first 3 minutes?"),
             ("3", "Failure plan", "if I can't start: a smaller version, 2 minutes")])

    box(d, 60, 210, W - 60, H - 90, outline=GOLD, fill=(21, 36, 58), width=3)
    y = 250
    for num, label, note in rows:
        cx = W - 130 if ar else 130
        d.ellipse([cx - 26, y + 6, cx + 26, y + 58], outline=GOLD_L, width=3)
        (rtl(d, (cx, y + 14), num, f(34, 750), GOLD_L) if ar
         else d.text((cx, y + 14), num, font=f(32, 750), fill=GOLD_L, anchor="ma"))
        if ar:
            rtl(d, (cx - 60, y + 4), label, f(38, 700), CREAM)
            rtl(d, (cx - 60, y + 54), note, f(27, 500), MUTED)
        else:
            d.text((cx + 60, y + 2), label, font=f(36, 700), fill=CREAM)
            d.text((cx + 60, y + 50), note, font=f(26, 500), fill=MUTED)
        y += 150
        if num != "٣" and num != "3":
            d.line([(120, y - 40), (W - 120, y - 40)], fill=(52, 70, 94), width=2)
    return img


# ---------- fig 6: inbox -> review -> three ----------
def fig_system(lang):
    ar = lang == "ar"
    img = canvas()
    d = ImageDraw.Draw(img)
    head(d, ar,
         "النظام: مكان واحد، مراجعة واحدة، ٣ مهام" if ar else "The system: one place, one review, three tasks",
         "الشيل بيخرج من دماغك على ٣ خطوات" if ar else "The load leaves your head in three steps")

    cw, gap = 340, 56
    total = cw * 3 + gap * 2
    x = (W - total) // 2
    cols = ([("١", "صندوق وارد واحد", ["كل حاجة جديدة", "تتكتب في مكان واحد", "مفتوح في ثانية"]),
             ("٢", "مراجعة ١٠ دقايق", ["كل يوم نفس الوقت", "بيفضل؟ يتشال؟", "بيتحوّل لتقويم؟"]),
             ("٣", "قائمة الثلاثة", ["واحدة مهمة", "واحدة سريعة", "واحدة احتياطية"])] if ar else
            [("1", "One inbox", ["everything new", "goes to one place", "open in a second"]),
             ("2", "10-minute review", ["same time daily", "keep it? drop it?", "move it to calendar?"]),
             ("3", "The list of three", ["one important", "one quick", "one backup"])])

    for num, label, items in cols:
        box(d, x, 230, x + cw, H - 110, outline=GOLD, fill=(21, 36, 58), width=2)
        cx = x + cw // 2
        d.ellipse([cx - 28, 254, cx + 28, 310], outline=GOLD_L, width=3)
        (rtl(d, (cx, 264), num, f(32, 750), GOLD_L) if ar
         else d.text((cx, 264), num, font=f(30, 750), fill=GOLD_L, anchor="ma"))
        if ar:
            rtl(d, (cx, 330), label, f(34, 700), GOLD_L)
        else:
            d.text((cx, 326), label, font=f(33, 700), fill=GOLD_L, anchor="ma")
        y = 400
        for it in items:
            if ar:
                rtl(d, (x + cw - 28, y), "• " + it, f(27, 550), CREAM)
            else:
                d.text((x + 28, y), "• " + it, font=f(26, 550), fill=CREAM)
            y += 58
        x += cw + gap

    note = "دماغك مش مخزن — حُطّ الشيل بره وخلّيه يشتغل" if ar else "Your brain isn't a warehouse — move the load out"
    (rtl(d, (W - 60, H - 92), note, f(30, 600), GOLD) if ar
     else d.text((60, H - 90), note, font=f(29, 600), fill=GOLD))
    return img


# ---------- fig 7: boundaries ----------
def fig_boundaries(lang):
    ar = lang == "ar"
    img = canvas()
    d = ImageDraw.Draw(img)
    head(d, ar,
         "الحدود: جملة واحدة، ومن غير محاضرة" if ar else "Boundaries: one sentence, no lecture",
         "الرفض القصير بيعمل أكتر من الشرح الطويل" if ar else "A short refusal does more than a long explanation")

    # right: refusal sentences
    if ar:
        rtl(d, (W - 70, 210), "٣ جمل رفض جاهزة", f(34, 700), GOLD_L)
        y = 268
        for s in ["مش هقدر دلوقتي، هرجعلك الساعة ٤.",
                  "أنا في نص حاجة، هرجعلك لما أخلص.",
                  "مينفعش النهاردة، ينفع بكرة الصبح؟"]:
            box(d, W - 700, y, W - 70, y + 86, outline=(70, 88, 112), fill=(24, 40, 62), radius=22)
            rtl(d, (W - 100, y + 24), s, f(27, 550), CREAM)
            y += 108
    else:
        d.text((W - 690, 200), "Three refusal sentences", font=f(33, 700), fill=GOLD_L)
        y = 258
        for s in ["Not right now — I'll get back to you at 4.",
                  "I'm mid-something, I'll come back to you.",
                  "Today won't work, tomorrow morning?"]:
            box(d, W - 700, y, W - 70, y + 86, outline=(70, 88, 112), fill=(24, 40, 62), radius=22)
            d.text((W - 670, y + 26), s, font=f(25, 550), fill=CREAM)
            y += 108

    # left: windows
    if ar:
        rtl(d, (650, 210), "ونافذتين للردود", f(34, 700), GOLD_L)
        box(d, 70, 268, 650, 470, outline=GOLD, fill=(21, 36, 58))
        rtl(d, (620, 298), "الردود: ١ و ٨ بس", f(30, 650), CREAM)
        rtl(d, (620, 352), "المستعجل: مكالمة مش رسالة", f(27, 550), MUTED)
        rtl(d, (620, 404), "أول ٢٠ دقيقة: ملكك", f(27, 550), MUTED)
        box(d, 70, 500, 650, 620, outline=(70, 88, 112), fill=(24, 40, 62))
        rtl(d, (620, 528), "«ممكن دقيقة؟» بتكلّف ١٠–٢٠ دقيقة رجوع", f(25, 550), GOLD_L)
    else:
        d.text((70, 200), "And two reply windows", font=f(33, 700), fill=GOLD_L)
        box(d, 70, 258, 650, 460, outline=GOLD, fill=(21, 36, 58))
        d.text((100, 288), "Replies at 1 and 8 only", font=f(28, 650), fill=CREAM)
        d.text((100, 342), "Urgent: a call, not a message", font=f(25, 550), fill=MUTED)
        d.text((100, 394), "First 20 minutes: yours", font=f(25, 550), fill=MUTED)
        box(d, 70, 490, 650, 610, outline=(70, 88, 112), fill=(24, 40, 62))
        d.text((100, 520), "\"Got a minute?\" costs 10–20 minutes", font=f(24, 550), fill=GOLD_L)
    return img


# ---------- fig 8: safety ladder ----------
def fig_safety(lang):
    ar = lang == "ar"
    img = canvas()
    d = ImageDraw.Draw(img)
    head(d, ar,
         "إمتى تكمل لوحدك، وإمتى تحتاج مختص" if ar else "When to continue alone, when to get help",
         "الكتاب ده أنظمة وعادات — مش تشخيص ولا علاج" if ar else "This book is systems and habits — not diagnosis or treatment")

    rows = ([("الأنظمة والعادات", "الشغل اليومي: بداية، تفكيك، بيئة، طاقة، حدود", GREEN),
             ("أعراض مستمرة", "تركيز أو نوم أو مزاج بيأثر على حياتك — ابدأ بتقييم طبي", ORANGE),
             ("أزمة أو خطر", "أي أفكار لإيذاء نفسك — طوارئ: كلّم حد فوراً أو روح أقرب مستشفى", RED)] if ar else
            [("Systems and habits", "daily work: starting, breaking down, environment, energy", GREEN),
             ("Persistent symptoms", "focus, sleep, or mood affecting your life — begin with a medical assessment", ORANGE),
             ("Crisis or risk", "any thoughts of self-harm — emergency: tell someone now or go to hospital", RED)])

    y = 220
    for label, note, color in rows:
        box(d, 70, y, W - 70, y + 150, outline=color, fill=(21, 36, 58), width=3)
        d.rectangle([70, y + 8, 84, y + 142], fill=color)
        if ar:
            rtl(d, (W - 110, y + 22), label, f(36, 750), color)
            rtl(d, (W - 110, y + 78), note, f(27, 550), CREAM)
        else:
            d.text((110, y + 20), label, font=f(34, 750), fill=color)
            d.text((110, y + 76), note, font=f(26, 550), fill=CREAM)
        y += 176

    note = "ولو الدوا موصوف لك: متوقفوش ومتبدّلوش من نفسك." if ar else "And if medication is prescribed: don't stop or switch it yourself."
    (rtl(d, (W - 70, H - 78), note, f(27, 600), GOLD) if ar
     else d.text((70, H - 76), note, font=f(26, 600), fill=GOLD))
    return img


# ---------- fig 9: three layers ----------
def fig_layers(lang):
    ar = lang == "ar"
    img = canvas()
    d = ImageDraw.Draw(img)
    head(d, ar,
         "٣ طبقات: واحدة مش كفاية" if ar else "Three layers: one isn't enough",
         "لو ظبطت واحدة وسبت الباقي، الباقي هيكسر اللي عملته" if ar else "Fix one and leave the rest, and the rest breaks it")

    cols = ([("الفيزيائية", "المكتب · الغرفة · البيت", ["سطح فاضي", "سطر واحد", "إشارة مكان"]),
             ("الرقمية", "الموبايل · اللابتوب · الشاشة", ["شاشة أولى فاضية", "إشعارات مقفولة", "تاب واحد"]),
             ("الاجتماعية", "الناس اللي حواليك", ["إعلان مسبق", "سؤال واحد", "«٥ دقايق وأنا معاك»"])] if ar else
            [("Physical", "desk · room · home", ["clear surface", "one line", "a place signal"]),
             ("Digital", "phone · laptop · screen", ["empty first screen", "notifications off", "one tab"]),
             ("Social", "the people around you", ["announce first", "one question", "\"five minutes and I'm with you\""])])

    cw, gap = 380, 40
    total = cw * 3 + gap * 2
    x = (W - total) // 2
    for label, where, items in cols:
        box(d, x, 220, x + cw, H - 120, outline=GOLD, fill=(21, 36, 58), width=2)
        cx = x + cw // 2
        if ar:
            rtl(d, (cx, 246), label, f(36, 750), GOLD_L)
            rtl(d, (cx, 302), where, f(25, 500), MUTED)
        else:
            d.text((cx, 244), label, font=f(34, 750), fill=GOLD_L, anchor="ma")
            d.text((cx, 296), where, font=f(24, 500), fill=MUTED, anchor="ma")
        y = 370
        for it in items:
            if ar:
                rtl(d, (x + cw - 30, y), "• " + it, f(27, 550), CREAM)
            else:
                d.text((x + 30, y), "• " + it, font=f(25, 550), fill=CREAM)
            y += 56
        x += cw + gap
    return img


if __name__ == "__main__":
    for lang in ("ar", "en"):
        write(fig_start_card(lang), lang, "fig5-startcard.png")
        write(fig_system(lang), lang, "fig6-system.png")
        write(fig_boundaries(lang), lang, "fig7-boundaries.png")
        write(fig_safety(lang), lang, "fig8-safety.png")
        write(fig_layers(lang), lang, "fig9-layers.png")
    print("figures 5-9 done")
