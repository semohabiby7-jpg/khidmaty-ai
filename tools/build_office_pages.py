#!/usr/bin/env python3
"""
build_office_pages.py — SEO Explosion + Internal Linking
=========================================================
يولّد:
  1) 679 صفحة هبوط للمكاتب (SEO Local)
  2) 104 صفحة تجميع (محافظة + نوع)
  3) 4 صفحات أنواع overview
  4) يحدّث sitemap.xml بكل الصفحات الجديدة
  5) يعدّل articles.html بإضافة روابط داخلية للمكاتب
"""

import json, glob, os, re, html

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://khidmatyai.com"

# ─── slug helpers ──────────────────────────────────────────
ARABIC_MAP = {
    'أ':'a','إ':'i','آ':'a','ا':'a','ب':'b','ت':'t','ث':'th','ج':'g','ح':'h',
    'خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d',
    'ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m',
    'ن':'n','ه':'h','و':'w','ي':'y','ة':'a','ئ':'a','ؤ':'u','ى':'a',' ':'-',
    'ال':'','َ':'','ُ':'','ِ':'','ً':'','ٌ':'','ٍ':'','ّ':'','ْ':''
}

def slugify(text):
    """Arabic text → URL-safe slug"""
    text = text.strip().lower()
    # Remove "ال" prefix
    text = re.sub(r'^ال', '', text)
    result = []
    for ch in text:
        result.append(ARABIC_MAP.get(ch, ch))
    s = ''.join(result)
    s = re.sub(r'[^a-z0-9\-]', '', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s or 'office'

TYPE_AR = {
    'civil': 'السجل المدني',
    'traffic': 'المرور',
    'notary': 'الشهر العقاري',
    'insurance': 'التأمينات الاجتماعية',
}
TYPE_ICON = {
    'civil': '🪪',
    'traffic': '🚗',
    'notary': '🏛️',
    'insurance': '🛡️',
}
TYPE_EMOJI = {
    'civil': '🪪',
    'traffic': '🚗',
    'notary': '🏛️',
    'insurance': '🛡️',
}

# Article category → office type mapping
CAT_TO_TYPE = {
    'أحوال مدنية': 'civil',
    'مرور': 'traffic',
    'شهر عقاري': 'notary',
    'عقاري': 'notary',
    'تأمينات': 'insurance',
    'تأمين صحي': 'insurance',
    'صحة': 'insurance',
    'جوازات': 'civil',
    'بريد': 'insurance',
    'خدمات عامة': 'civil',
}

# ─── Load all office data ──────────────────────────────────
def load_offices():
    offices = []
    for f in sorted(glob.glob(os.path.join(BASE, 'data/offices/*.json'))):
        with open(f, encoding='utf-8') as fh:
            offices.extend(json.load(fh))
    return offices

# ─── Page Templates ───────────────────────────────────────

SHARED_CSS = """
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px}
.header-logo{display:flex;align-items:center;gap:10px}
.header-logo img{width:36px;height:36px;border-radius:8px}
.header-logo span{color:#fff;font-weight:900;font-size:18px}
.header-logo .ai{color:#e6c258}
.breadcrumb{max-width:800px;margin:0 auto 10px;padding:15px 20px 0;font-size:13px;color:#5a6a8a}
.breadcrumb a{color:#e6c258;text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.breadcrumb span{color:#8ea0c4}
.office-hero{max-width:800px;margin:0 auto;padding:10px 20px 20px;text-align:center}
.office-hero .office-emoji{font-size:42px;margin-bottom:8px}
.office-hero h1{font-size:22px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.3}
.office-hero p{font-size:14px;color:#8ea0c4;margin:0}
.office-info{max-width:800px;margin:0 auto;padding:0 20px 20px}
.info-card{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:20px;margin-bottom:16px}
.info-card h3{font-size:15px;font-weight:800;color:#e6c258;margin:0 0 10px;display:flex;align-items:center;gap:8px}
.info-card p{font-size:14px;color:#c8d4e8;margin:4px 0;line-height:1.6}
.info-row{display:flex;gap:10px;align-items:flex-start;margin:6px 0}
.info-row .label{color:#8ea0c4;font-size:13px;min-width:70px;font-weight:600}
.info-row .value{color:#e8eef8;font-size:14px;flex:1}
.map-embed{max-width:800px;margin:0 auto 20px;padding:0 20px}
.map-embed iframe{width:100%;height:300px;border:0;border-radius:16px;border:2px solid #1e3556;filter:invert(0.92) hue-rotate(180deg)}
.cta-section{max-width:800px;margin:0 auto 30px;padding:0 20px}
.cta-card{background:linear-gradient(135deg,#1a2d5a,#0F1E3D);border:1px solid #e6c258;border-radius:16px;padding:24px;text-align:center}
.cta-card h3{font-size:17px;font-weight:800;color:#fff;margin:0 0 8px}
.cta-card p{font-size:14px;color:#8ea0c4;margin:0 0 14px}
.cta-btn{display:inline-block;background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;border:none;padding:12px 28px;border-radius:30px;font-weight:800;font-size:15px;text-decoration:none;font-family:Cairo,sans-serif;cursor:pointer;transition:all .3s}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(230,194,88,.3)}
.related-section{max-width:800px;margin:0 auto 30px;padding:0 20px}
.related-section h3{font-size:16px;font-weight:800;color:#fff;margin:0 0 12px}
.related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.related-link{background:#162847;border:1px solid #1e3556;border-radius:12px;padding:12px 16px;text-decoration:none;color:#e8eef8;font-size:13px;font-weight:600;transition:all .3s;display:block}
.related-link:hover{border-color:#e6c258;color:#e6c258;transform:translateY(-2px)}
.list-section{max-width:800px;margin:0 auto 30px;padding:0 20px}
.office-list-item{background:#162847;border:1px solid #1e3556;border-radius:12px;padding:16px;margin-bottom:10px;text-decoration:none;color:inherit;display:block;transition:all .3s}
.office-list-item:hover{border-color:#e6c258;transform:translateY(-2px)}
.office-list-item h4{font-size:15px;font-weight:800;color:#fff;margin:0 0 4px}
.office-list-item p{font-size:13px;color:#8ea0c4;margin:0}
.office-list-item .office-meta{font-size:12px;color:#5a6a8a;margin-top:4px}
.footer{text-align:center;padding:30px 20px;color:#5a6a8a;font-size:13px}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
.footer-links{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:10px}
.footer-links a{font-size:13px;color:#8ea0c4}
.footer-links a:hover{color:#e6c258}
.gov-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;max-width:800px;margin:0 auto 30px;padding:0 20px}
.gov-card{background:#162847;border:1px solid #1e3556;border-radius:12px;padding:14px 16px;text-decoration:none;color:#e8eef8;font-size:13px;font-weight:600;transition:all .3s;text-align:center}
.gov-card:hover{border-color:#e6c258;transform:translateY(-2px)}
.gov-card .count{display:block;font-size:11px;color:#8ea0c4;margin-top:4px}
"""

def header_html(title, desc, canonical, keywords, schema_json=None):
    """Generate HTML head + header"""
    schema = ''
    if schema_json:
        schema = f'<script type="application/ld+json">\n{json.dumps(schema_json, ensure_ascii=False, indent=2)}\n</script>'
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="../auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{keywords}">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../src/styles/main.css">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<style>{SHARED_CSS}</style>
<link rel="canonical" href="{canonical}">
{schema}
</head>
<body>

<div class="header">
  <a href="../index.html">← الرئيسية</a>
  <div class="header-logo">
    <img src="../assets/k-logo.webp" alt="خِدْمَتي AI">
    <span>خِدْمَتي <span class="ai">AI</span></span>
  </div>
</div>
"""

FOOTER_HTML = """
<div class="footer">
  <p>خِدْمَتي AI — دليلك الذكي للخدمات الحكومية في مصر</p>
  <div class="footer-links">
    <a href="../index.html">الرئيسية</a>
    <a href="../articles.html">المقالات</a>
    <a href="../offices.html">خريطة المكاتب</a>
    <a href="../store.html">المتجر</a>
    <a href="../contact.html">تواصل معنا</a>
  </div>
</div>
</body>
</html>
"""

# ─── 1) Individual office pages ──────────────────────────

def make_office_slug(office, idx, used_slugs):
    """Generate a unique slug for an office within a gov+type group"""
    name = office['name']
    city = office.get('city', '')
    # Try city slug first
    base = slugify(city) if city else slugify(name.split('-')[-1].strip() if '-' in name else name)
    if not base:
        base = f'office-{idx}'
    slug = base
    n = 2
    while slug in used_slugs:
        slug = f'{base}-{n}'
        n += 1
    used_slugs.add(slug)
    return slug


def gen_office_page(office, idx, gov_slug, type_slug, gov_name, type_name, office_slug):
    """Generate a single office landing page"""
    name = office['name']
    city = office.get('city', '')
    addr = office.get('addr', '')
    hours = office.get('hours', '')
    phone = office.get('phone', '')
    services = office.get('services', '')
    lat = office.get('lat', 0)
    lng = office.get('lng', 0)

    # URL
    url = f"{DOMAIN}/offices/{type_slug}/{gov_slug}/{office_slug}.html"
    file_path = os.path.join(BASE, f'offices/{type_slug}/{gov_slug}/{office_slug}.html')

    # SEO
    title = f"{name} - مواعيد وعنوان {type_name} في {city} | خِدْمَتي AI"
    desc = f"{name} في {city}، {gov_name} — العنوان: {addr[:80]}... المواعيد: {hours[:40]}... خدمات: {services[:60]}..."
    keywords = f"{name}, {type_name} {city}, مكتب {type_name} {gov_name}, {city} {gov_name}, عنوان {type_name}, مواعيد {type_name}, خِدْمَتي AI, خدمات حكومية {city}"

    # Schema.org LocalBusiness
    schema = {
        "@context": "https://schema.org",
        "@type": "GovernmentOffice",
        "name": name,
        "address": {
            "@type": "PostalAddress",
            "addressRegion": gov_name,
            "addressLocality": city,
            "streetAddress": addr
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": lat,
            "longitude": lng
        },
        "openingHours": hours,
        "telephone": phone if phone else None,
        "description": services,
        "url": url
    }

    # Map embed
    map_embed = ""
    if lat and lng:
        map_embed = f"""
<div class="map-embed">
  <iframe src="https://www.openstreetmap.org/export/embed.html?bbox={lng-0.01},{lat-0.008},{lng+0.01},{lat+0.008}&marker={lat},{lng}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>"""

    # Related services
    related_services_html = ""
    service_links = {
        'civil': ['national-id-card.html', 'renew-national-id.html', 'lost-national-id.html',
                   'birth-certificate.html', 'death-certificate.html', 'marriage-divorce-certificate.html',
                   'correct-name-data.html', 'civil.html'],
        'traffic': ['renew-car-license.html', 'car-ownership-transfer.html', 'new-driving-license.html',
                     'renew-driving-license.html', 'traffic-violations.html', 'replace-plates.html',
                     'car-inspection.html', 'traffic.html'],
        'notary': ['power-of-attorney.html', 'rent-contract-registration.html', 'property-sale-registration.html',
                    'mortgage-registration.html', 'ownership-chain-certificate.html', 'notary.html'],
        'insurance': ['pension-extraction.html', 'bank-pension.html', 'health-insurance.html',
                       'health-insurance-card.html', 'insurance-number-inquiry.html', 'social.html'],
    }
    service_names = {
        'national-id-card.html': 'استخراج بطاقة الرقم القومي',
        'renew-national-id.html': 'تجديد بطاقة الرقم القومي',
        'lost-national-id.html': 'بدل فاقد للبطاقة',
        'birth-certificate.html': 'شهادة ميلاد',
        'death-certificate.html': 'شهادة وفاة',
        'marriage-divorce-certificate.html': 'شهادة زواج/طلاق',
        'correct-name-data.html': 'تصحيح بيانات',
        'civil.html': 'كل خدمات الأحوال المدنية',
        'renew-car-license.html': 'تجديد رخصة السيارة',
        'car-ownership-transfer.html': 'نقل ملكية سيارة',
        'new-driving-license.html': 'استخراج رخصة قيادة',
        'renew-driving-license.html': 'تجديد رخصة القيادة',
        'traffic-violations.html': 'المخالفات المرورية',
        'replace-plates.html': 'استبدال لوحات',
        'car-inspection.html': 'فحص سيارة',
        'traffic.html': 'كل خدمات المرور',
        'power-of-attorney.html': 'توكيل رسمي',
        'rent-contract-registration.html': 'تسجيل عقد إيجار',
        'property-sale-registration.html': 'تسجيل بيع عقار',
        'mortgage-registration.html': 'تسجيل رهن عقاري',
        'ownership-chain-certificate.html': 'سلسلة الملكية',
        'notary.html': 'كل خدمات الشهر العقاري',
        'pension-extraction.html': 'استخراج معاش',
        'bank-pension.html': 'صرف المعاش',
        'health-insurance.html': 'التأمين الصحي',
        'health-insurance-card.html': 'كارت التأمين الصحي',
        'insurance-number-inquiry.html': 'استعلام رقم تأميني',
        'social.html': 'التضامن والكرامة',
    }

    links = service_links.get(office['type'], [])
    related_links_html = ""
    for sl in links:
        sn = service_names.get(sl, sl)
        related_links_html += f'<a href="../services/{sl}" class="related-link">{sn}</a>\n'

    if related_links_html:
        related_services_html = f"""
<div class="related-section">
  <h3>📋 خدمات ذات صلة في هذا المكتب</h3>
  <div class="related-grid">
{related_links_html}  </div>
</div>"""

    # Related offices in same gov+type
    # (handled separately in listing pages)

    # CTA
    cta = f"""
<div class="cta-section">
  <div class="cta-card">
    <h3>📚 اعرف خطوات الخدمة بالتفصيل</h3>
    <p>دليل كامل لكل خدمات {type_name} في مصر — الخطوات والمستندات والرسوم</p>
    <a href="../articles.html" class="cta-btn">اقرأ المقالات التعريفية</a>
  </div>
</div>"""

    breadcrumb = f"""
<div class="breadcrumb">
  <a href="../index.html">الرئيسية</a> ›
  <a href="../offices.html">المكاتب</a> ›
  <a href="../offices/{type_slug}.html">{type_name}</a> ›
  <a href="../offices/{type_slug}/{gov_slug}.html">{gov_name}</a> ›
  <span>{city or name}</span>
</div>"""

    phone_html = f"""
<div class="info-row">
  <span class="label">📞 تلفون</span>
  <span class="value">{phone if phone else 'غير متاح'}</span>
</div>""" if phone else '<div class="info-row"><span class="label">📞 تلفون</span><span class="value">غير متاح حاليًا</span></div>'

    page = f"""{header_html(title, desc, url, keywords, schema)}
{breadcrumb}
<div class="office-hero">
  <div class="office-emoji">{TYPE_EMOJI.get(office['type'], '🏛️')}</div>
  <h1>{html.escape(name)}</h1>
  <p>{type_name} — {city}، {gov_name}</p>
</div>
<div class="office-info">
  <div class="info-card">
    <h3>📍 معلومات المكتب</h3>
    <div class="info-row"><span class="label">العنوان</span><span class="value">{html.escape(addr)}</span></div>
    <div class="info-row"><span class="label">المواعيد</span><span class="value">{html.escape(hours)}</span></div>
    {phone_html}
    <div class="info-row"><span class="label">المحافظة</span><span class="value">{html.escape(gov_name)}</span></div>
    <div class="info-row"><span class="label">المدينة</span><span class="value">{html.escape(city)}</span></div>
  </div>
  <div class="info-card">
    <h3>✅ الخدمات المتاحة</h3>
    <p>{html.escape(services)}</p>
  </div>
</div>
{map_embed}
{related_services_html}
{cta}
{FOOTER_HTML}"""

    return file_path, page, url


# ─── 2) Governorate+Type listing pages ────────────────────

def gen_listing_page(gov_name, gov_slug, type_key, type_slug, type_name, offices, office_slugs):
    """Generate a governorate+type listing page"""
    url = f"{DOMAIN}/offices/{type_slug}/{gov_slug}.html"
    file_path = os.path.join(BASE, f'offices/{type_slug}/{gov_slug}.html')

    title = f"مكاتب {type_name} في {gov_name} — {len(offices)} مكتب | خِدْمَتي AI"
    desc = f"كل مكاتب {type_name} في محافظة {gov_name} — {len(offices)} مكتب بالعناوين والمواعيد والخدمات. اعرف أقرب مكتب ليك."
    keywords = f"مكاتب {type_name} {gov_name}, {type_name} {gov_name}, عنوان {type_name} {gov_name}, مواعيد {type_name}, خِدْمَتي AI"

    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": f"مكاتب {type_name} في {gov_name}",
        "description": desc,
        "url": url,
        "inLanguage": "ar-EG",
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(offices),
            "itemListElement": [
                {"@type": "ListItem", "position": i+1, "name": o['name'],
                 "url": f"{DOMAIN}/offices/{type_slug}/{gov_slug}/{office_slugs[i]}.html"}
                for i, o in enumerate(offices)
            ]
        }
    }

    breadcrumb = f"""
<div class="breadcrumb">
  <a href="../index.html">الرئيسية</a> ›
  <a href="../offices.html">المكاتب</a> ›
  <a href="../offices/{type_slug}.html">{type_name}</a> ›
  <span>{gov_name}</span>
</div>"""

    items_html = ""
    for i, o in enumerate(offices):
        city = o.get('city', '')
        o_slug = office_slugs[i]
        items_html += f"""<a href="{o_slug}.html" class="office-list-item">
  <h4>{TYPE_EMOJI.get(type_key, '')} {html.escape(o['name'])}</h4>
  <p>📍 {html.escape(o.get('addr', '')[:60])}...</p>
  <div class="office-meta">⏰ {html.escape(o.get('hours', '')[:50])} | {html.escape(city)}</div>
</a>\n"""

    page = f"""{header_html(title, desc, url, keywords, schema)}
{breadcrumb}
<div class="office-hero">
  <div class="office-emoji">{TYPE_EMOJI.get(type_key, '🏛️')}</div>
  <h1>مكاتب {type_name} في {gov_name}</h1>
  <p>{len(offices)} مكتب — اعرف العنوان والمواعيد والخدمات</p>
</div>
<div class="list-section">
  <h3 style="font-size:16px;font-weight:800;color:#fff;margin:0 0 12px">📋 قائمة المكاتب</h3>
{items_html}</div>
<div class="cta-section">
  <div class="cta-card">
    <h3>🗺️ خريطة كل المكاتب</h3>
    <p>شوف كل مكاتب {type_name} على الخريطة التفاعلية</p>
    <a href="../offices.html" class="cta-btn">افتح الخريطة</a>
  </div>
</div>
{FOOTER_HTML}"""

    return file_path, page, url


# ─── 3) Type overview pages ──────────────────────────────

def gen_type_page(type_key, type_slug, type_name, gov_data):
    """Generate a type overview page listing all governorates"""
    url = f"{DOMAIN}/offices/{type_slug}.html"
    file_path = os.path.join(BASE, f'offices/{type_slug}.html')

    total = sum(len(v) for v in gov_data.values())
    title = f"مكاتب {type_name} في مصر — {total} مكتب | خِدْمَتي AI"
    desc = f"كل مكاتب {type_name} في مصر — {total} مكتب في {len(gov_data)} محافظة. اعرف أقرب مكتب {type_name} ليك بالعنوان والمواعيد."
    keywords = f"مكاتب {type_name} مصر, {type_name} مصر, عنوان {type_name}, مواعيد {type_name}, خِدْمَتي AI"

    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": f"مكاتب {type_name} في مصر",
        "description": desc,
        "url": url,
        "inLanguage": "ar-EG",
    }

    breadcrumb = f"""
<div class="breadcrumb">
  <a href="../index.html">الرئيسية</a> ›
  <a href="../offices.html">المكاتب</a> ›
  <span>{type_name}</span>
</div>"""

    cards_html = ""
    for gov_name in sorted(gov_data.keys()):
        gov_slug = slugify(gov_name)
        count = len(gov_data[gov_name])
        cards_html += f'<a href="{type_slug}/{gov_slug}.html" class="gov-card">{html.escape(gov_name)}<span class="count">{count} مكتب</span></a>\n'

    page = f"""{header_html(title, desc, url, keywords, schema)}
{breadcrumb}
<div class="office-hero">
  <div class="office-emoji">{TYPE_EMOJI.get(type_key, '🏛️')}</div>
  <h1>مكاتب {type_name} في مصر</h1>
  <p>{total} مكتب في {len(gov_data)} محافظة — اختر محافظتك</p>
</div>
<div class="related-section">
  <h3>🗺️ اختر محافظتك</h3>
  <div class="gov-grid">
{cards_html}  </div>
</div>
<div class="cta-section">
  <div class="cta-card">
    <h3>📚 مقالات عن {type_name}</h3>
    <p>دليلك الكامل لخدمات {type_name} — الخطوات والمستندات والرسوم</p>
    <a href="../articles.html" class="cta-btn">اقرأ المقالات</a>
  </div>
</div>
{FOOTER_HTML}"""

    return file_path, page, url


# ─── 4) Main ──────────────────────────────────────────────

def main():
    offices = load_offices()
    print(f"📊 Total offices loaded: {len(offices)}")

    # Group by gov+type
    by_gov_type = {}
    for o in offices:
        gov = o['gov']
        typ = o['type']
        by_gov_type.setdefault(gov, {}).setdefault(typ, []).append(o)

    all_urls = []

    # Generate type overview pages
    for typ, type_name in TYPE_AR.items():
        gov_data = {}
        for gov, types in by_gov_type.items():
            if typ in types:
                gov_data[gov] = types[typ]
        if not gov_data:
            continue
        type_slug = slugify(TYPE_AR[typ].split()[0] if ' ' in TYPE_AR[typ] else TYPE_AR[typ])
        # Use simple slugs
        type_slug_map = {'civil': 'civil', 'traffic': 'traffic', 'notary': 'notary', 'insurance': 'insurance'}
        type_slug = type_slug_map.get(typ, typ)

        fp, content, url = gen_type_page(typ, type_slug, type_name, gov_data)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
        all_urls.append(url)
        print(f"  ✅ Type page: {url}")

    # Generate listing pages + individual office pages
    for gov_name, types in by_gov_type.items():
        gov_slug = slugify(gov_name)
        for typ, type_name in TYPE_AR.items():
            if typ not in types:
                continue
            type_slug_map = {'civil': 'civil', 'traffic': 'traffic', 'notary': 'notary', 'insurance': 'insurance'}
            type_slug = type_slug_map.get(typ, typ)

            offices_in_group = types[typ]

            # Compute unique slugs for each office in this group
            used_slugs = set()
            office_slugs = []
            for idx, o in enumerate(offices_in_group):
                office_slugs.append(make_office_slug(o, idx, used_slugs))

            # Listing page
            fp, content, url = gen_listing_page(gov_name, gov_slug, typ, type_slug, type_name, offices_in_group, office_slugs)
            os.makedirs(os.path.dirname(fp), exist_ok=True)
            with open(fp, 'w', encoding='utf-8') as f:
                f.write(content)
            all_urls.append(url)

            # Individual office pages
            for idx, o in enumerate(offices_in_group):
                fp, content, url = gen_office_page(o, idx, gov_slug, type_slug, gov_name, type_name, office_slugs[idx])
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(content)
                all_urls.append(url)

        print(f"  ✅ {gov_name}: {sum(len(types[t]) for t in types if t in TYPE_AR)} offices")

    print(f"\n📦 Total pages generated: {len(all_urls)}")

    # ─── 5) Update sitemap.xml ──────────────────────────────
    sitemap_path = os.path.join(BASE, 'sitemap.xml')
    # Read existing sitemap for non-office URLs
    existing_urls = []
    with open(sitemap_path, encoding='utf-8') as f:
        existing_content = f.read()
    existing_urls = re.findall(r'<loc>(.*?)</loc>', existing_content)
    non_office_urls = [u for u in existing_urls if '/offices/' not in u]

    all_urls_final = list(dict.fromkeys(non_office_urls + sorted(set(all_urls))))  # deduplicate preserving order

    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for url in all_urls_final:
            priority = '0.8' if '/offices/' in url and url.count('/') <= 6 else '0.6'
            if '/offices/' in url and url.count('/') > 6:
                priority = '0.7'
            f.write(f'  <url>\n    <loc>{url}</loc>\n    <lastmod>2026-10-11</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{priority}</priority>\n  </url>\n')
        f.write('</urlset>\n')

    print(f"🗺️  Sitemap updated: {len(all_urls_final)} URLs")

    # ─── 6) Internal linking in articles.html ──────────────
    update_articles_internal_links(offices, by_gov_type)

    print("\n✅ Done! SEO Explosion + Internal Linking complete.")


def update_articles_internal_links(offices, by_gov_type):
    """Add internal links from articles to office pages"""
    articles_path = os.path.join(BASE, 'articles.html')
    with open(articles_path, encoding='utf-8') as f:
        content = f.read()

    # Build a mapping of article categories to office URLs
    type_slug_map = {'civil': 'civil', 'traffic': 'traffic', 'notary': 'notary', 'insurance': 'insurance'}

    # Build CTA injection code
    cta_code = """
// === Internal Linking: مقالات → مكاتب ===
function getRelatedOfficesHTML(cat) {
  var catToType = {
    'أحوال مدنية': 'civil', 'مرور': 'traffic', 'شهر عقاري': 'notary', 'عقاري': 'notary',
    'تأمينات': 'insurance', 'تأمين صحي': 'insurance', 'صحة': 'insurance',
    'جوازات': 'civil', 'بريد': 'insurance', 'خدمات عامة': 'civil'
  };
  var typ = catToType[cat];
  if (!typ) return '';
  var typeNames = {civil:'السجل المدني',traffic:'المرور',notary:'الشهر العقاري',insurance:'التأمينات الاجتماعية'};
  var typeEmojis = {civil:'🪪',traffic:'🚗',notary:'🏛️',insurance:'🛡️'};
  var tn = typeNames[typ] || typ;
  var te = typeEmojis[typ] || '🏛️';
  return '<div style="margin:20px 0;padding:18px;background:linear-gradient(135deg,#1a2d5a,#0F1E3D);border:1px solid #e6c258;border-radius:16px;text-align:center">'+
    '<h3 style="font-size:17px;font-weight:800;color:#fff;margin:0 0 8px">'+te+' اعرف أقرب مكتب '+tn+' ليك</h3>'+
    '<p style="font-size:14px;color:#8ea0c4;margin:0 0 14px">اختر محافظتك وشوف العنوان والمواعيد والخدمات</p>'+
    '<a href="offices/'+typ+'.html" style="display:inline-block;background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;padding:12px 28px;border-radius:30px;font-weight:800;font-size:15px;text-decoration:none">📍 تصفح مكاتب '+tn+'</a>'+
    ' &nbsp; <a href="offices.html" style="display:inline-block;background:#1a2d5a;color:#e6c258;border:1px solid #e6c258;padding:12px 28px;border-radius:30px;font-weight:700;font-size:15px;text-decoration:none">🗺️ الخريطة التفاعلية</a>'+
    '</div>';
}
// === End Internal Linking ===
"""

    # Find the openArticle function and inject CTA
    # The CTA should be appended after article content when displayed
    if 'getRelatedOfficesHTML' not in content:
        # Inject the helper function before the openArticle function
        content = content.replace(
            'function openArticle(',
            cta_code + '\nfunction openArticle('
        )

    # Modify openArticle to append CTA
    # Find where content is displayed and add CTA
    if 'getRelatedOfficesHTML(a.cat)' not in content:
        # Find the line that sets innerHTML with article content
        # Look for pattern like: el.innerHTML = ... a.content ...
        content = content.replace(
            "a.content`",
            "a.content + getRelatedOfficesHTML(a.cat)`"
        )
        # Also try the other pattern
        content = content.replace(
            "a.content)",
            "a.content + getRelatedOfficesHTML(a.cat))"
        )

    with open(articles_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"🔗 Articles updated with internal links to offices")


if __name__ == '__main__':
    main()
