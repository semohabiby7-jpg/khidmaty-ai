# -*- coding: utf-8 -*-
"""Build the Arabic cover for 'الكاتب الذكي' guide: overlay shaped Arabic text on the AI artwork."""
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

ART = "/home/user/workspace/khidmaty-ai-push/books/ai-tools-content-writers/_artwork.webp"
OUT = "/home/user/workspace/khidmaty-ai-push/books/ai-tools-content-writers/cover.webp"
FBOLD = "/home/user/workspace/khidmaty-ai-push/tools/fonts/Tajawal-Bold.ttf"
FREG = "/home/user/workspace/khidmaty-ai-push/tools/fonts/Tajawal-Regular.ttf"

def shape(text):
    return get_display(arabic_reshaper.reshape(text))

# load + upscale artwork for crisp print
img = Image.open(ART).convert("RGBA")
W, H = img.size
img = img.resize((W * 3, H * 3), Image.LANCZOS)
W, H = img.size
draw = ImageDraw.Draw(img)

GOLD = (230, 194, 88, 255)
WHITE = (255, 255, 255, 255)
LIGHT = (200, 212, 230, 255)

# auto-fit font: shrink until the widest line fits max_w
def fit_font(path, lines, max_w, start_size, min_size=40, step=4):
    size = start_size
    while size > min_size:
        f = ImageFont.truetype(path, size)
        widest = max(draw.textlength(shape(ln), font=f) for ln in lines)
        if widest <= max_w:
            return f, size
        size -= step
    return ImageFont.truetype(path, min_size), min_size

# ---- content ----
title_lines = ["أهم أدوات", "الذكاء الاصطناعي", "لكُتّاب المحتوى"]
subtitle = "اكتب أسرع  ·  أنشر أوسع  ·  اكسب أكتر"
author = "Mohamed Ismail"
brand = "خِدْمَتي AI"

title_font, ts = fit_font(FBOLD, title_lines, W * 0.84, int(W * 0.092))
sub_font, ss = fit_font(FREG, [subtitle], W * 0.88, int(W * 0.052))
author_font = ImageFont.truetype(FBOLD, int(W * 0.045))
brand_font = ImageFont.truetype(FREG, int(W * 0.032))

line_h = int(ts * 1.18)
top_y = int(H * 0.205)
block_h = line_h * len(title_lines) + int(ss * 1.6)

# subtle navy panel behind title for readability
panel = Image.new("RGBA", (W, block_h + int(H * 0.05)), (10, 18, 40, 120))
img.alpha_composite(panel, (0, top_y - int(H * 0.03)))
draw = ImageDraw.Draw(img)

# title
y = top_y
for ln in title_lines:
    t = shape(ln)
    draw.text((W // 2 + 4, y + 4), t, font=title_font, fill=(0, 0, 0, 150), anchor="mm")
    draw.text((W // 2, y), t, font=title_font, fill=WHITE, anchor="mm")
    y += line_h

# gold divider
dy = y + int(ts * 0.18)
draw.rectangle([W // 2 - int(W * 0.12), dy, W // 2 + int(W * 0.12), dy + 5], fill=GOLD)

# subtitle
sy = dy + int(ss * 0.9)
st = shape(subtitle)
draw.text((W // 2 + 3, sy + 3), st, font=sub_font, fill=(0, 0, 0, 130), anchor="mm")
draw.text((W // 2, sy), st, font=sub_font, fill=GOLD, anchor="mm")

# author + brand bottom
by = int(H * 0.90)
draw.text((W // 2, by), author, font=author_font, fill=GOLD, anchor="mm")
draw.text((W // 2, by + int(W * 0.052)), shape(brand), font=brand_font, fill=LIGHT, anchor="mm")

img.convert("RGB").save(OUT, "WEBP", quality=94)
print("cover saved:", OUT, img.size)
