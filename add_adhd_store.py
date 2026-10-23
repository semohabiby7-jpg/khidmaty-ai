#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""إضافة كتاب «نظام التركيز / The ADHD Focus System» لمتجر خِدْمَتي — تعديلات store.html."""
import os

STORE = "/home/user/workspace/khidmaty-ai-push/store.html"
with open(STORE, encoding="utf-8") as f:
    html = f.read()


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"✗ [{label}] موجود {n} مرة (متوقع 1)")
    return text.replace(old, new, 1)


# 1) JSON-LD — منتجان جديدان
old = ('    {"@type":"Product","name":"اصنع مستقبلك الذكي — النسخة العربية PDF",'
       '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
       '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}}\n  ]')
new = ('    {"@type":"Product","name":"اصنع مستقبلك الذكي — النسخة العربية PDF",'
       '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
       '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}},\n'
       '    {"@type":"Product","name":"نظام التركيز — إزاي تبدأ وتكمّل PDF",'
       '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
       '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}},\n'
       '    {"@type":"Product","name":"The ADHD Focus System — English Edition PDF",'
       '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
       '"offers":{"@type":"Offer","price":"100","priceCurrency":"EGP","availability":"https://schema.org/InStock"}}\n  ]')
html = replace_once(html, old, new, "JSON-LD")

# 2) كارتا الكتاب بعد كارتَي الكتاب العقاري
old = ('      <button class="buy-btn" onclick="orderProduct(\'aire_en\')">اطلب النسخة بـ100ج</button>\n'
       '    </div>\n')
cards = (
    '      <button class="buy-btn" onclick="orderProduct(\'aire_en\')">اطلب النسخة بـ100ج</button>\n'
    '    </div>\n'
    '    <div class="part-divider"><span>إصدار جديد · سلسلة قوة العقل</span></div>\n'
    '    <div class="product-card" id="card-adhd">\n'
    '      <div class="cover-wrap"><img class="cover-img" src="books/adhd-focus/cover-ar.webp" alt="غلاف كتاب نظام التركيز"></div>\n'
    '      <h2>نظام التركيز</h2>\n'
    '      <span class="lang-tag">العربية</span>\n'
    '      <p class="desc">إنت مش كسول وإنت مش فاشل — دماغك بس بيشتغل بنظام مكافآت تاني. دليل عملي في ٨ فصول و٥ ملاحق: بطاقة البداية، خريطة الجبل، قاعدة العشرين ثانية، ثلاث طبقات للبيئة، اليوم الذهني، نظام بره دماغك، الحدود، وخطة ٣٠ يوم. ٩ رسومات + ملاحق للطباعة.</p>\n'
    '      <div class="price">75 <small>جنيه</small></div>\n'
    '      <button class="buy-btn" onclick="orderProduct(\'adhd\')">اطلب نسختك بـ75ج</button>\n'
    '    </div>\n'
    '    <div class="product-card" id="card-adhd-en">\n'
    '      <div class="cover-wrap"><img class="cover-img" src="books/adhd-focus/cover-en.webp" alt="The ADHD Focus System cover"></div>\n'
    '      <h2>The ADHD Focus System</h2>\n'
    '      <span class="lang-tag">English</span>\n'
    '      <p class="desc">You\'re not lazy and you\'re not broken — your brain just runs on a different reward system. A practical guide in 8 chapters and 5 appendices: the start card, the mountain map, the twenty-second rule, three environment layers, your mental day, a system outside your head, boundaries, and a 30-day plan. 9 diagrams + printable appendices.</p>\n'
    '      <div class="price">100 <small>جنيه</small></div>\n'
    '      <button class="buy-btn" onclick="orderProduct(\'adhd_en\')">اطلب النسخة بـ100ج</button>\n'
    '    </div>\n')
html = replace_once(html, old, cards, "cards")

# 3) منتجات الواتساب
old = ("aire_en:{name:'كتاب «AI for Real Estate Agents» — 100 جنيه',msg:'السلام عليكم 👋\\nعايز أشتري:\\n📕 كتاب «AI for Real Estate Agents» — English Edition\\n💰 السعر: 100 جنيه\\n\\n✉️ إيميل الجيميل اللي هتفتح بيه الكتاب:\\n\\n💰 طرق الدفع:\\n- إنستاباي: 01553720957\\n- فودافون كاش: 01016243478'},\n")
new = old + (
    "adhd:{name:'كتاب «نظام التركيز» — 75 جنيه',msg:'السلام عليكم 👋\\nعايز أشتري:\\n📕 كتاب «نظام التركيز» — النسخة العربية\\n💰 السعر: 75 جنيه\\n\\n✉️ إيميل الجيميل اللي هتفتح بيه الكتاب:\\n\\n💰 طرق الدفع:\\n- إنستاباي: 01553720957\\n- فودافون كاش: 01016243478'},\n"
    "adhd_en:{name:'كتاب «The ADHD Focus System» — 100 جنيه',msg:'السلام عليكم 👋\\nعايز أشتري:\\n📕 كتاب «The ADHD Focus System» — English Edition\\n💰 السعر: 100 جنيه\\n\\n✉️ إيميل الجيميل اللي هتفتح بيه الكتاب:\\n\\n💰 طرق الدفع:\\n- إنستاباي: 01553720957\\n- فودافون كاش: 01016243478'},\n")
html = replace_once(html, old, new, "products")

# 4) تحديد الكارت
old = "  document.getElementById('card-aire-en').classList.toggle('selected',k==='aire_en');\n"
new = old + ("  document.getElementById('card-adhd').classList.toggle('selected',k==='adhd');\n"
             "  document.getElementById('card-adhd-en').classList.toggle('selected',k==='adhd_en');\n")
html = replace_once(html, old, new, "selectProduct")

with open(STORE, "w", encoding="utf-8") as f:
    f.write(html)
print("✓ store.html updated")
