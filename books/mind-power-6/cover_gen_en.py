#!/usr/bin/env python3
"""Cover for "The Box Is Not Closed" — Book Six, English.

Design mirror of cover_gen.py (the Arabic cover): same background image, same
gradient shade, same scrim, same gold palette, same vertical positions,
same badge geometry and signature. Only the language changes.
Run with: uv run --with pillow==10.4.0 python cover_gen_en.py
"""
import os
import urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageFilter

BG_URL = "https://oss-macaron-ai.macaron.im/image/text_to_image/6adcf59518f706efb9709e5d.webp"
BOOK = "/home/user/workspace/khidmaty-ai-push/books/mind-power-6"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

W, H = 683, 1024          # store size
K = 3                     # drawing scale
CW, CH = W * K, H * K

# ─── background ───
bg_path = "/tmp/mp6_cover_bg.webp"
if not os.path.exists(bg_path):
    urllib.request.urlretrieve(BG_URL, bg_path)
img = Image.open(bg_path).convert("RGB")

target = W / H
w, h = img.size
if w / h > target:
    nw = int(h * target)
    img = img.crop(((w - nw) // 2, 0, (w + nw) // 2, h))
else:
    nh = int(w / target)
    img = img.crop((0, (h - nh) // 2, w, (h + nh) // 2))
img = img.resize((CW, CH), Image.LANCZOS)

# ─── vertical gradient shade ───
shade = Image.new("L", (1, CH), 0)
px = shade.load()
for y in range(CH):
    t = y / CH
    if t < 0.42:
        v = int(215 * (1 - t / 0.42) ** 1.25)
    elif t > 0.60:
        v = int(225 * ((t - 0.60) / 0.40) ** 1.1)
    else:
        v = 0
    px[0, y] = v
shade = shade.resize((CW, CH))
dark = Image.new("RGB", (CW, CH), (6, 12, 24))
img = Image.composite(dark, img, shade.point(lambda v: v))

# extra scrim behind the title block
scrim = Image.new("L", (CW, CH), 0)
sd = ImageDraw.Draw(scrim)
sd.rounded_rectangle([55 * K, 225 * K, (W - 55) * K, 500 * K], radius=50 * K, fill=165)
scrim = scrim.filter(ImageFilter.GaussianBlur(34 * K))
img = Image.composite(Image.new("RGB", (CW, CH), (6, 12, 24)), img, scrim)

draw = ImageDraw.Draw(img, "RGBA")

gold = (212, 168, 67)
gold_soft = (244, 205, 102)
cream = (245, 240, 225)
white = (255, 255, 255)
MAX_W = (W - 130)  # px available for a single line


def fit(text, path, max_px, start_px):
    """Largest font size (in K-px) that keeps `text` within max_px."""
    size = start_px
    while size > 12:
        f = ImageFont.truetype(path, size * K)
        if draw.textlength(text, font=f) / K <= max_px:
            return f, size
        size -= 1
    return ImageFont.truetype(path, size * K), size


f_series_label = ImageFont.truetype(FONT_REG, 30 * K)
f_series, _ = fit("MIND POWER", FONT_BOLD, MAX_W, 88)
f_title, _ = fit("The Box", FONT_BOLD, MAX_W, 104)
f_title2, _ = fit("Is Not Closed", FONT_BOLD, MAX_W, 92)
f_part = ImageFont.truetype(FONT_BOLD, 30 * K)
f_tag, _ = fit("Re-engineering Beliefs and Opportunities", FONT_REG, 545, 31)
f_author = ImageFont.truetype(FONT_REG, 40 * K)


def line(text, font, fill, y, anchor="mm", shadow=True):
    pos = (CW // 2, y * K)
    if shadow:
        for dx, dyy in [(-3, 3), (3, 3), (3, -3), (-3, -3), (0, 5), (0, -5)]:
            draw.text((pos[0] + dx * K, pos[1] + dyy * K), text, font=font,
                      fill=(0, 0, 0, 200), anchor=anchor)
    draw.text(pos, text, font=font, fill=fill + (255,), anchor=anchor)


def rule(y, half=72):
    draw.line([((W // 2 - half) * K, y * K), ((W // 2 + half) * K, y * K)],
              fill=gold + (255,), width=2 * K)


# ─── top of the cover ───
line("SERIES", f_series_label, gold, 78)
line("MIND POWER", f_series, gold, 138)
rule(196, half=86)

# ─── title ───
line("The Box", f_title, cream, 300)
line("Is Not Closed", f_title2, cream, 400)

# part badge — same geometry as the Arabic cover
badge_y = 468
bw, bh = 300, 56
box = [(CW // 2 - bw * K // 2, (badge_y - bh // 2) * K),
       (CW // 2 + bw * K // 2, (badge_y + bh // 2) * K)]
draw.rounded_rectangle(box, radius=bh * K // 2, fill=(7, 13, 26, 235),
                       outline=gold + (255,), width=2 * K)
line("PART SIX", f_part, gold_soft, badge_y, shadow=False)

# ─── bottom of the cover ───
line("Re-engineering Beliefs and Opportunities", f_tag, (230, 224, 208), 868, shadow=False)
draw.line([((W // 2 - 60) * K, 906 * K), ((W // 2 + 60) * K, 906 * K)],
          fill=(212, 168, 67, 140), width=1 * K)

for dx, dy in [(-2, 2), (2, 2)]:
    draw.text((CW // 2 + dx * K, 948 * K + dy * K), "M. Ismail", font=f_author,
              fill=(0, 0, 0, 160), anchor="mm")
draw.text((CW // 2, 948 * K), "M. Ismail", font=f_author, fill=white + (255,), anchor="mm")

# ─── save ───
img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
hi_res = f"{BOOK}/cover-en-hires.png"
img.save(hi_res, "PNG")
img.resize((1600, 2400), Image.LANCZOS).save(f"{BOOK}/cover-en-1600.png", "PNG")

kdp_ratio = 1600 / 2560
cw2 = int(CH * kdp_ratio)
if cw2 <= CW:
    left = (CW - cw2) // 2
    img.crop((left, 0, left + cw2, CH)).resize((1600, 2560), Image.LANCZOS).save(
        f"{BOOK}/cover-en-KDP.png", "PNG")
img.resize((W, H), Image.LANCZOS).save(f"{BOOK}/cover-en.webp", "WEBP", quality=92)
print("done", hi_res)
