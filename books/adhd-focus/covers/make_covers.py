import math, random, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1600, 2560
NAVY_TOP = (11, 27, 49)
NAVY_BOT = (5, 13, 24)
GOLD = (214, 174, 96)
GOLD_SOFT = (198, 158, 84)
WHITE = (245, 243, 238)

AR_FONT = "/home/user/workspace/cairo_vf.ttf"
EN_FONT = "/home/user/workspace/fonts/Cairo.ttf"
SIG_FONT = "/home/user/workspace/fonts/GreatVibes-Regular.ttf"


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
        t = (y / (H - 1)) ** 0.85
        c = tuple(int(NAVY_TOP[i] + (NAVY_BOT[i] - NAVY_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.10, H * 0.14, W * 0.90, H * 0.58], fill=(90, 66, 26))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    px_g, px_i = glow.load(), img.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            r, g, b = px_g[x, y]
            if r or g or b:
                ir, ig, ib = px_i[x, y]
                nr, ng, nb = min(255, ir + r // 3), min(255, ig + g // 3), min(255, ib + b // 3)
                for dy in range(2):
                    for dx in range(2):
                        if x + dx < W and y + dy < H:
                            px_i[x + dx, y + dy] = (nr, ng, nb)
    return img


def draw_mountain(img, base_y=2180, peak_y=1560):
    """A stylised mountain silhouette with a dotted ascent path."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = W // 2
    left, right = 150, W - 150
    pts = []
    rnd = random.Random(4)
    # ascending left ridge
    steps = 26
    for i in range(steps + 1):
        t = i / steps
        x = left + (cx - 40 - left) * t
        y = base_y - (base_y - peak_y) * (t ** 1.35)
        jitter = rnd.uniform(-10, 10)
        pts.append((x + jitter, y + jitter * 0.6))
    # descending right ridge
    for i in range(steps + 1):
        t = i / steps
        x = cx + 40 + (right - cx - 40) * t
        y = peak_y + (base_y - peak_y) * (t ** 1.5)
        jitter = rnd.uniform(-10, 10)
        pts.append((x + jitter, y + jitter * 0.6))
    poly = [(left, base_y)] + pts + [(right, base_y)]
    d.polygon(poly, fill=(9, 20, 35, 240))
    # gold ridge line
    d.line(pts, fill=GOLD + (205,), width=4)
    # grid inside the mountain (faint)
    for gy in range(int(peak_y) + 40, int(base_y), 46):
        span = None
        for i in range(len(pts) - 1):
            x1, y1 = pts[i]
            x2, y2 = pts[i + 1]
            if (y1 - gy) * (y2 - gy) <= 0 and y1 != y2:
                xx = x1 + (x2 - x1) * (gy - y1) / (y2 - y1)
                span = [xx, xx] if span is None else [min(span[0], xx), max(span[1], xx)]
        if span and span[1] - span[0] > 40:
            d.line([(span[0], gy), (span[1], gy)], fill=GOLD + (26,), width=1)
    # gravel dots at the base
    for _ in range(420):
        x = rnd.uniform(left - 20, right + 20)
        y = rnd.uniform(base_y - 120, base_y + 40)
        r = rnd.uniform(2, 5.5)
        d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD + (int(rnd.uniform(40, 150)),))
    # the dotted ascent (one step highlighted)
    for i in range(0, len(pts) // 2, 3):
        x, y = pts[i]
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=WHITE + (150,))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def frame(img):
    d = ImageDraw.Draw(img)
    m = 58
    d.rectangle([m, m, W - m, H - m], outline=GOLD + (110,), width=3)
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


def tracked_text(d, xy, text, f, fill, tracking=0):
    widths = [d.textlength(ch, font=f) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x, y = xy
    x -= total / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w + tracking
    return total


def signature(img, y):
    d = ImageDraw.Draw(img)
    f_sig = ImageFont.truetype(SIG_FONT, 132)
    f_by = font(EN_FONT, 38)
    text = "m.ismail"
    w_sig = d.textlength(text, font=f_sig)
    w_by = d.textlength("by", font=f_by)
    gap = 26
    total = w_by + gap + w_sig
    x0 = (W - total) / 2
    d.text((x0, y + 46), "by", font=f_by, fill=GOLD_SOFT)
    d.text((x0 + w_by + gap, y), text, font=f_sig, fill=WHITE)
    return img


def arabic_cover():
    img = base_canvas()
    img = draw_mountain(img)
    img = frame(img)
    d = ImageDraw.Draw(img)

    f_label = font(AR_FONT, 42, 600)
    f_title = font(AR_FONT, 165, 800)
    f_sub = font(AR_FONT, 58, 500)
    f_auth = font(AR_FONT, 48, 600)

    d.text((W // 2, 285), "سلسلة قوة العقل", font=f_label, fill=GOLD_SOFT, anchor="ma", direction="rtl")
    rule(d, 390)

    d.text((W // 2, 376), "نظام التركيز", font=f_title, fill=WHITE, anchor="ma", direction="rtl")
    rule(d, 700)

    sub_lines = ["إزاي تبدأ — وتكمّل",
                 "لما دماغك مش عايز تسكت"]
    y = 770
    for line in sub_lines:
        d.text((W // 2, y), line, font=f_sub, fill=GOLD, anchor="ma", direction="rtl")
        y += 130

    f_note = font(AR_FONT, 38, 600)
    d.text((W // 2, 1012), "دليل عملي لتشتّت الانتباه وفرط الحركة (ADHD)",
           font=f_note, fill=GOLD_SOFT, anchor="ma", direction="rtl")

    img = signature(img, 2300)
    out = img.convert("RGB")
    out.save("cover-adhd-focus-ar-v2.jpg", quality=95, dpi=(300, 300))
    return out


def english_cover():
    img = base_canvas()
    img = draw_mountain(img)
    img = frame(img)
    d = ImageDraw.Draw(img)

    f_label = font(EN_FONT, 40)
    f_title = font(EN_FONT, 150)
    f_sub = font(EN_FONT, 54)
    f_auth = font(EN_FONT, 44)

    tracked_text(d, (W // 2, 285), "THE MIND POWER SERIES", f_label, GOLD_SOFT, tracking=8)
    rule(d, 385)

    d.text((W // 2, 480), "THE ADHD", font=f_title, fill=WHITE, anchor="ma")
    d.text((W // 2, 680), "FOCUS", font=f_title, fill=WHITE, anchor="ma")
    d.text((W // 2, 880), "SYSTEM", font=f_title, fill=WHITE, anchor="ma")

    rule(d, 1140)

    sub_lines = ["How to start — and keep going —",
                 "when your brain won't settle"]
    y = 1220
    for line in sub_lines:
        d.text((W // 2, y), line, font=f_sub, fill=GOLD, anchor="ma")
        y += 96

    img = signature(img, 2300)
    out = img.convert("RGB")
    out.save("cover-adhd-focus-en-v2.jpg", quality=95, dpi=(300, 300))
    return out


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    arabic_cover()
    english_cover()
    print("done")
