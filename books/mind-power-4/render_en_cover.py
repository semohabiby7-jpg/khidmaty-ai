# -*- coding: utf-8 -*-
"""render_en_cover.py — يولّد غلاف إنجليزي لـ Mind Power 4 بنفس استايل السلسلة (PIL).
نفس تصميم cover.html: figure خام مفتّح + تدريج داكن + نص ذهبي #F4CD66.
"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

BASE = "/home/user/workspace/khidmaty-ai-push/books/mind-power-4"
W, H = 683, 1024
GOLD = (244, 205, 102)
DARK = (15, 10, 4)

# 1) الـfigure الخام (بلا نص) — نفتّحه عشان يبان زي cover.html
fig = Image.open(f"{BASE}/cover-base.webp").convert("RGB").resize((W, H))
fig = ImageEnhance.Brightness(fig).enhance(2.6)
fig = ImageEnhance.Contrast(fig).enhance(1.12)
fig = ImageEnhance.Color(fig).enhance(1.4)

canvas = Image.new("RGB", (W, H), DARK)
canvas.paste(fig, (0, 0))

# 2) تدريج داكن فوق وتحت لقراءة النص
alpha = Image.new("L", (1, H))
for y in range(H):
    t = y / (H - 1)
    if t < 0.20:
        a = int(170 * (1 - t / 0.20))
    elif t > 0.84:
        a = int(190 * ((t - 0.84) / 0.16))
    else:
        a = 0
    alpha.putpixel((0, y), a)
alpha = alpha.resize((W, H))
canvas = Image.composite(Image.new("RGB", (W, H), DARK), canvas, alpha)

# 3) النص
draw = ImageDraw.Draw(canvas)
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SIG = "/usr/share/fonts/truetype/freefont/FreeSerifBoldItalic.ttf"

def fnt(path, size):
    return ImageFont.truetype(path, size)

def center(s, y, f, fill=GOLD):
    b = draw.textbbox((0, 0), s, font=f)
    x = (W - (b[2] - b[0])) // 2 - b[0]
    draw.text((x + 2, y + 2), s, font=f, fill=DARK)      # ظل خفيف
    draw.text((x, y), s, font=f, fill=fill)

# أعلى: MIND POWER + زخرفة + 4 + PART FOUR
center("MIND POWER", 58, fnt(SERIF, 42))
draw.line([(W // 2 - 90, 124), (W // 2 + 90, 124)], fill=GOLD, width=2)
draw.ellipse([W // 2 - 6, 118, W // 2 + 6, 130], fill=GOLD)  # نقطة زخرفية
center("4", 136, fnt(SERIF, 96))
center("PART FOUR", 245, fnt(SERIF, 18))

# أسفل-وسط: WHO'S DRIVING؟
center("WHO'S DRIVING?", 820, fnt(SANS, 54))

# القاع: زخرفة + M. Ismail
draw.line([(W // 2 - 70, 952), (W // 2 + 70, 952)], fill=GOLD, width=1)
center("M. Ismail", 966, fnt(SIG, 38))

out = f"{BASE}/cover-en.webp"
canvas.save(out, "WEBP", quality=92)
print("✅ saved", out, canvas.size)
