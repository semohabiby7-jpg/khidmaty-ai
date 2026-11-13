# -*- coding: utf-8 -*-
"""بناء قاعدة معرفة مدي: دمج 87 خدمة + المستندات + المصادر + الرحلات"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

docs = json.load(open('data/docs-finder.json', encoding='utf-8'))['services']
src = {i['slug']: i for i in json.load(open('data/medy-sources.json', encoding='utf-8'))['items']}
jour = {j['id']: j for j in json.load(open('journeys.json', encoding='utf-8'))['services']}

AR = re.compile(r'[\u064B-\u0652\u0670\u0640]')


def norm(s):
    s = (s or '').strip()
    s = AR.sub('', s)
    s = s.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ى', 'ي').replace('ة', 'ه')
    return s


def words(t):
    t = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', norm(t))
    out = [w for w in t.split() if len(w) > 2 and w not in
           ('خدمه', 'استخراج', 'الحصول', 'علي', 'من', 'في', 'الى', 'على', 'او', 'و')]
    return out



SYN = {
    'inheritance-declaration': ['ورثت شقة', 'ورثت عقار', 'ورثت بيت', 'ميراث', 'الورثة', 'اعلام وراثة', 'حصر ارث'],
    'inheritance-distribution': ['قسمة الميراث', 'تقسيم التركة', 'فرز عقار'],
    'property-sale-registration': ['عقد بيع شقة', 'بعت شقة', 'شهر عقاري'],
    'new-passport': ['باسبور', 'جواز سفر لأول مرة'],
    'lost-national-id': ['البطاقة ضاعت', 'بدل فاقد بطاقة'],
    'car-ownership-transfer': ['نقل ملكية عربية', 'نقل ملكية سيارة', 'اشتريت عربية'],
    'criminal-record': ['فيش وتشبيه', 'صحيفة الحالة الجنائية'],
    'birth-certificate': ['شهادة ميلاد', 'قيد ميلاد', 'ميلاد مميكن'],
    'pension-extraction': ['معاش', 'استخراج معاش'],
}

OV = {}
try:
    ov = json.load(open('data/medy-overrides.json', encoding='utf-8'))
    OV = {i['slug']: i for i in ov.get('items', [])}
except Exception:
    OV = {}

items = []
for d in docs:
    slug = d.get('slug', '')
    s = src.get(slug, {})
    j = jour.get(slug, {})
    title = d.get('title') or s.get('name') or slug
    kw = set(s.get('kw', []))
    kw.update(j.get('intent_examples', []))
    kw.add(title)
    kw.update(words(title))
    kw.update(SYN.get(slug, []))
    o = OV.get(slug, {})
    if o.get('fee'): d = dict(d, fee=o['fee'])
    if o.get('dur'): d = dict(d, dur=o['dur'])
    items.append({
        'slug': slug,
        'title': title,
        'cat': d.get('cat', ''),
        'auth': d.get('auth', '') or j.get('authority', ''),
        'fee': d.get('fee', ''),
        'dur': d.get('dur', '') or j.get('duration', ''),
        'page': d.get('link', '') or j.get('page', ''),
        'kw': sorted({k for k in kw if k}),
        'sources': (o.get('sources') or s.get('sources', [])),
        'docs': [x.get('t', '') for x in d.get('docs', [])],
        'docsN': len(d.get('docs', [])),
        'journey': ({
            'subtitle': j.get('subtitle', ''),
            'steps': j.get('steps', []),
            'requirements': j.get('requirements', []),
            'warning': j.get('warning', ''),
            'online': j.get('online', None),
            'official_url': j.get('official_url', ''),
            'official_label': j.get('official_label', ''),
        } if j else None),
        'search': norm(' '.join([title, d.get('cat', ''), d.get('auth', ''), ' '.join(kw)])) + ' ' + norm(' '.join(words(title))),
    })

kb = {
    'version': '1.0.0',
    'updated': '2026-11-13',
    'note': 'قاعدة معرفة مدي — كل رقم فيها من بيانات الموقع المتحققة. لو الرقم مش موجود، مدي بتقول مش معايا.',
    'count': len(items),
    'items': items,
}
with open('data/medy-kb.json', 'w', encoding='utf-8') as f:
    json.dump(kb, f, ensure_ascii=False, separators=(',', ':'))

sz = os.path.getsize('data/medy-kb.json')
with_src = sum(1 for i in items if i['sources'])
with_j = sum(1 for i in items if i['journey'])
with_fee = sum(1 for i in items if i['fee'])
print(f'services: {len(items)}')
print(f'بمصادر: {with_src} | برحلات: {with_j} | برسوم موثقة: {with_fee}')
print(f'إجمالي مستندات: {sum(i["docsN"] for i in items)}')
print(f'حجم الملف: {sz/1024:.0f} KB')
print('عينات مفقودة المصادر:', [i['slug'] for i in items if not i['sources']][:8])
