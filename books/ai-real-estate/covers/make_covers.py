import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1600, 2560
NAVY_TOP = (11, 27, 49)
NAVY_BOT = (5, 13, 24)
GOLD = (214, 174, 96)
GOLD_SOFT = (198, 158, 84)
WHITE = (245, 243, 238)

AR_FONT = "/home/user/workspace/cairo_vf.ttf"
EN_FONT = "/home/user/workspace/fonts/Cairo.ttf"


def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def base_canvas():
    img = Image.new("RGB", (W, H), NAVY_BOT)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        t = t ** 0.85
        c = tuple(int(NAVY_TOP[i] + (NAVY_BOT[i] - NAVY_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # warm glow behind title
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.10, H * 0.16, W * 0.90, H * 0.62], fill=(90, 66, 26))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), 0.0)
    img = Image.composite(img, img, Image.new("L", (W, H), 0)) if False else img
    # screen-ish add
    px_g = glow.load()
    px_i = img.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            r, g, b = px_g[x, y]
            if r or g or b:
                ir, ig, ib = px_i[x, y]
                nr = min(255, ir + r // 3)
                ng = min(255, ig + g // 3)
                nb = min(255, ib + b // 3)
                for dy in range(2):
                    for dx in range(2):
                        if x + dx < W and y + dy < H:
                            px_i[x + dx, y + dy] = (nr, ng, nb)
    return img


def draw_network(img, seed=7, top=1560, bottom=2280):
    rnd = random.Random(seed)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    nodes = []
    for _ in range(46):
        x = rnd.uniform(90, W - 90)
        y = rnd.uniform(top, bottom)
        nodes.append((x, y, rnd.uniform(0.35, 1.0)))
    for i, (x1, y1, s1) in enumerate(nodes):
        for j in range(i + 1, len(nodes)):
            x2, y2, s2 = nodes[j]
            dist = math.hypot(x1 - x2, y1 - y2)
            if dist < 300:
                a = int(70 * (1 - dist / 300) * (0.5 + 0.5 * min(s1, s2)))
                d.line([(x1, y1), (x2, y2)], fill=GOLD + (a,), width=2)
    for x, y, s in nodes:
        r = 3 + 6 * s
        d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD + (int(150 * s) + 60,))
    glow = layer.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(glow) if img.mode == "RGBA" else img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"))
    img2 = Image.alpha_composite(img.convert("RGBA"), layer)
    return img2.convert("RGB")


def draw_skyline(img):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(21)
    base_y = H
    x = -20
    while x < W + 40:
        w = rnd.randint(60, 150)
        h = rnd.randint(150, 420)
        top = base_y - h
        d.rectangle([x, top, x + w, base_y], fill=(8, 18, 32, 235))
        d.line([(x, top), (x + w, top)], fill=GOLD + (90,), width=3)
        # windows
        for wy in range(top + 26, base_y - 20, 46):
            for wx in range(x + 18, x + w - 18, 40):
                if rnd.random() < 0.30:
                    d.rectangle([wx, wy, wx + 9, wy + 14], fill=GOLD + (110,))
        x += w + rnd.randint(14, 40)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def tracked_text(d, xy, text, f, fill, tracking=0, anchor_center=True):
    widths = [d.textlength(ch, font=f) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x, y = xy
    if anchor_center:
        x -= total / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w + tracking
    return total


def signature(img, y, sig_color=WHITE):
    d = ImageDraw.Draw(img)
    f_sig = ImageFont.truetype("/home/user/workspace/fonts/GreatVibes-Regular.ttf", 132)
    f_by = font(EN_FONT, 38)
    text = "m.ismail"
    w_sig = d.textlength(text, font=f_sig)
    w_by = d.textlength("by", font=f_by)
    gap = 26
    total = w_by + gap + w_sig
    x0 = (W - total) / 2
    d.text((x0, y + 46), "by", font=f_by, fill=GOLD_SOFT)
    d.text((x0 + w_by + gap, y), text, font=f_sig, fill=sig_color)
    return img


def frame(img):
    d = ImageDraw.Draw(img)
    m = 58
    d.rectangle([m, m, W - m, H - m], outline=GOLD + (110,), width=3)
    # corner ticks
    t = 90
    for (cx, cy, sx, sy) in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([(cx, cy), (cx + sx * t, cy)], fill=GOLD, width=6)
        d.line([(cx, cy), (cx, cy + sy * t)], fill=GOLD, width=6)
    return img


def rule(d, y, width=420):
    cx = W // 2
    d.line([(cx - width // 2, y), (cx - 40, y)], fill=GOLD, width=3)
    d.line([(cx + 40, y), (cx + width // 2, y)], fill=GOLD, width=3)
    d.ellipse([cx - 9, y - 9, cx + 9, y + 9], outline=GOLD, width=3)


def arabic_cover():
    img = base_canvas()
    img = draw_network(img, seed=11)
    img = draw_skyline(img)
    img = frame(img)
    d = ImageDraw.Draw(img)

    f_label = font(AR_FONT, 44, 600)
    f_title = font(AR_FONT, 152, 800)
    f_sub = font(AR_FONT, 60, 500)
    f_auth = font(AR_FONT, 54, 600)

    d.text((W // 2, 300), "سلسلة أعمال عملية", font=f_label, fill=GOLD_SOFT, anchor="ma", direction="rtl")
    rule(d, 400)

    d.text((W // 2, 520), "الذكاء الاصطناعي", font=f_title, fill=WHITE, anchor="ma", direction="rtl")
    d.text((W // 2, 760), "لوسطاء العقارات", font=f_title, fill=WHITE, anchor="ma", direction="rtl")

    rule(d, 1060)

    sub_lines = ["توفير ١٥ ساعة أسبوعياً", "من غير ما تخسر صفقة واحدة"]
    y = 1140
    for line in sub_lines:
        d.text((W // 2, y), line, font=f_sub, fill=GOLD, anchor="ma", direction="rtl")
        y += 104

    img = signature(img, 2215)
    out = img.convert("RGB")
    out.save("cover-ai-real-estate-ar.jpg", quality=95, dpi=(300, 300))
    return out


def english_cover():
    img = base_canvas()
    img = draw_network(img, seed=5)
    img = draw_skyline(img)
    img = frame(img)
    d = ImageDraw.Draw(img)

    f_label = font(EN_FONT, 40)
    f_title = font(EN_FONT, 175)
    f_sub = font(EN_FONT, 56)
    f_auth = font(EN_FONT, 46)

    tracked_text(d, (W // 2, 300), "PRACTICAL BUSINESS SERIES", f_label, GOLD_SOFT, tracking=8)
    rule(d, 400)

    d.text((W // 2, 510), "AI FOR", font=f_title, fill=WHITE, anchor="ma")
    d.text((W // 2, 745), "REAL ESTATE", font=f_title, fill=WHITE, anchor="ma")
    d.text((W // 2, 980), "AGENTS", font=f_title, fill=WHITE, anchor="ma")

    rule(d, 1270)

    sub_lines = ["Win back 15 hours a week —", "without losing a single deal."]
    y = 1350
    for line in sub_lines:
        d.text((W // 2, y), line, font=f_sub, fill=GOLD, anchor="ma")
        y += 100

    img = signature(img, 2225)
    out = img.convert("RGB")
    out.save("cover-ai-real-estate-en.jpg", quality=95, dpi=(300, 300))
    return out


if __name__ == "__main__":
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    arabic_cover()
    english_cover()
    print("done")
