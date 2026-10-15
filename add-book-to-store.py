#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""إضافة كتاب «اصنع مستقبلك الذكي» لمتجر خِدْمَتي — تعديلات store.html."""
import os

STORE = "/home/user/workspace/khidmaty-ai-push/store.html"
with open(STORE, encoding="utf-8") as f:
    html = f.read()

def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"✗ [{label}] موجود {n} مرة (متوقع 1)")
    return text.replace(old, new, 1), True

ok = []
# 1) JSON-LD: إضافة منتج SEO بعد aitools
old1 = ('{"@type":"Product","name":"أهم أدوات الذكاء الاصطناعي في كتابة المحتوى PDF",'
        '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
        '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}}\n  ]')
new1 = ('{"@type":"Product","name":"أهم أدوات الذكاء الاصطناعي في كتابة المحتوى PDF",'
        '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
        '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}},\n'
        '    {"@type":"Product","name":"اصنع مستقبلك الذكي — النسخة العربية PDF",'
        '"author":{"@type":"Person","name":"MOHAMED ISMAIL ABDELAZIZ"},'
        '"offers":{"@type":"Offer","price":"75","priceCurrency":"EGP","availability":"https://schema.org/InStock"}}\n  ]')
html, ok1 = replace_once(html, old1, new1, "JSON-LD"); ok.append(ok1)

# 2) كارت الكتاب بعد كارت aitools
old2 = ("      <button class=\"buy-btn\" onclick=\"orderProduct('aitools')\">اطلب نسختك بـ75ج</button>\n"
        "    </div>\n</div>\n\n<div class=\"bundle-box\">")
card = (
    "      <button class=\"buy-btn\" onclick=\"orderProduct('aitools')\">اطلب نسختك بـ75ج</button>\n"
    "    </div>\n"
    "    <div class=\"part-divider\"><span>إصدار جديد · كتاب مستقل</span></div>\n"
    "    <div class=\"product-card\" id=\"card-smartfuture\">\n"
    "      <div class=\"cover-wrap\"><img class=\"cover-img\" src=\"books/smart-future/cover-final.webp\" alt=\"غلاف كتاب اصنع مستقبلك الذكي\"></div>\n"
    "      <h2>اصنع مستقبلك الذكي</h2>\n"
    "      <span class=\"lang-tag\">العربية</span>\n"
    "      <p class=\"desc\">الذكاء الاصطناعي مش هياخد شغلك — هياخد شغل اللي مش بيستخدمه. دليل عملي في 7 فصول: إزاي تفهم الـAI، أدوات مجانية، توظيفه في شغلك، القرار الذكي، صناعة المحتوى، مستقبل الشغل، وخطة 5 سنين لمستقبلك. مع 8 رسومات توضيحية.</p>\n"
    "      <div class=\"price\">75 <small>جنيه</small></div>\n"
    "      <button class=\"buy-btn\" onclick=\"orderProduct('smartfuture')\">اطلب نسختك بـ75ج</button>\n"
    "    </div>\n"
    "</div>\n\n<div class=\"bundle-box\">")
html, ok2 = replace_once(html, old2, card, "book-card"); ok.append(ok2)

# 3) منتج smartfuture في كائن products قبل bundle1
sf_prod = (r"smartfuture:{name:'كتاب «اصنع مستقبلك الذكي» — 75 جنيه',msg:'السلام عليكم 👋\n"
           r"عايز أشتري:\n📕 كتاب «اصنع مستقبلك الذكي» — النسخة العربية\n💰 السعر: 75 جنيه\n\n"
           r"✉️ إيميل الجيميل اللي هتفتح بيه الكتاب:\n\n💰 طرق الدفع:\n"
           r"- إنستاباي: 01553720957\n- فودافون كاش: 01016243478'},")
old3 = "bundle1:{name:'باقة الجزء الأول (عربي + إنجليزي) — 129 جنيه'"
new3 = sf_prod + "\n" + old3
html, ok3 = replace_once(html, old3, new3, "products"); ok.append(ok3)

# 4) selectProduct: إضافة card-smartfuture
old4 = "  document.getElementById('card-aitools').classList.toggle('selected',k==='aitools');"
new4 = (old4 + "\n  document.getElementById('card-smartfuture').classList.toggle('selected',k==='smartfuture');")
html, ok4 = replace_once(html, old4, new4, "selectProduct"); ok.append(ok4)

# 5) previews: إضافة card-smartfuture
old5 = ("'card-aitools':{dir:'books/ai-tools-content-writers/preview',text:'شوف معاينة مجانية من دليل أدوات الذكاء الاصطناعي على متجر خِدْمَتي'}\n"
        "};")
new5 = ("'card-aitools':{dir:'books/ai-tools-content-writers/preview',text:'شوف معاينة مجانية من دليل أدوات الذكاء الاصطناعي على متجر خِدْمَتي'},\n"
        "'card-smartfuture':{dir:'books/smart-future/preview',text:'شوف معاينة مجانية من كتاب «اصنع مستقبلك الذكي» على متجر خِدْمَتي'}\n"
        "};")
html, ok5 = replace_once(html, old5, new5, "previews"); ok.append(ok5)

with open(STORE, "w", encoding="utf-8") as f:
    f.write(html)
print("تمت التعديلات الـ5 بنجاح:", all(ok))
