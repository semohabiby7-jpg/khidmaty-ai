#!/usr/bin/env python3
"""
توليد غلاف كتاب «تسيب إيه؟» — الجزء الخامس من سلسلة قوة العقل
النص العربي صحيح ١٠٠٪ باستخدام direction=rtl + خط Noto Kufi
"""
import urllib.request
from PIL import Image, ImageDraw, ImageFont

# ─── تحميل صورة الخلفية ───
bg_url = "https://oss-macaron-ai.macaron.im/image/text_to_image/6ad88237bda7fed6638ee91c.webp"
bg_path = "/tmp/cover_bg.webp"
urllib.request.urlretrieve(bg_url, bg_path)

img = Image.open(bg_path).convert("RGBA")
img = img.resize((1080, 1920), Image.LANCZOS)
draw = ImageDraw.Draw(img)

# ─── الخطوط ───
amiri_reg   = "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf"
amiri_bold  = "/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Bold.ttf"
eng_bold    = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

font_series_label = ImageFont.truetype(amiri_reg,   34)
font_series       = ImageFont.truetype(amiri_bold,  85)
font_title        = ImageFont.truetype(amiri_bold, 135)
font_part         = ImageFont.truetype(amiri_reg,   48)
font_author       = ImageFont.truetype(eng_bold,    56)

# ─── ألوان ───
gold  = (212, 168, 67, 255)
cream = (245, 240, 225, 255)
white = (255, 255, 255, 255)
shadow = (0, 0, 0, 210)

# ─── دوال الكتابة ───
def draw_arabic(draw, text, font, fill, pos, anchor="mm"):
    x, y = pos
    for dx, dy in [(4,4),(-4,4),(4,-4),(-4,-4),(4,0),(-4,0),(0,4),(0,-4)]:
        draw.text((x+dx, y+dy), text, font=font, fill=shadow, anchor=anchor, direction="rtl")
    draw.text(pos, text, font=font, fill=fill, anchor=anchor, direction="rtl")

def draw_english(draw, text, font, fill, pos, anchor="mm"):
    x, y = pos
    for dx, dy in [(3,3),(-3,3),(3,-3),(-3,-3)]:
        draw.text((x+dx, y+dy), text, font=font, fill=shadow, anchor=anchor)
    draw.text(pos, text, font=font, fill=fill, anchor=anchor)

# ─── اسم السلسلة (أعلى) ───
draw_arabic(draw, "سلسلة",       font_series_label, gold,  (540, 175), "mm")
draw_arabic(draw, "قوة العقل",    font_series,      gold,  (540, 260), "mm")

# ─── اسم الكتاب (وسط) ───
draw_arabic(draw, "تسيب إيه؟",    font_title,        cream, (540, 930), "mm")
draw_arabic(draw, "الجزء الخامس", font_part,          gold,  (540, 1060), "mm")

# ─── اسم المؤلف (أسفل) ───
draw_english(draw, "M. Ismail",   font_author,       white, (540, 1760), "mm")

# ─── حفظ ───
output_path = "/home/user/workspace/khidmaty-ai-push/books/mind-power-5/cover.png"
img.convert("RGB").save(output_path, "PNG", quality=95)
print(f"تم حفظ الغلاف: {output_path}")
print(f"المقاس: {img.size}")
