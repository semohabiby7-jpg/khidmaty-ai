# -*- coding: utf-8 -*-
"""link-articles.py — يربط مقالات الموقع بصفحات الخدمات والتصنيفات (بلوك «اقرأ كمان»)."""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STOP = set("في من على عن إلى الى مع أو او و اللي اللي إزاي ازاي خطوات دليل الخدمة خدمة مصر الحكومية صفحة".split())

ARTICLES = [
    ("مقالات/مخالفات-مرورية", "../maqalat/traffic-violations.html", ["مخالفات", "مرورية", "مخالفة", "لوحات"], "المخالفات المرورية: إزاي تقرأ المخالفة وتطعن فيها صح"),
    ("مقالات/فحص-فني", "../maqalat/car-inspection.html", ["فحص", "فني", "سيارة", "مركبة"], "الفحص الفني للسيارة: إيه اللي بيتفحص فعلًا"),
    ("مقالات/نقل-ملكية", "../maqalat/car-ownership-transfer.html", ["نقل", "ملكية", "سيارة", "توكيل"], "نقل ملكية سيارة: خطوات آمنة"),
    ("مقالات/سجل-تجاري", "../maqalat/renew-commercial-register.html", ["سجل", "تجاري", "شركة", "نشاط"], "تجديد السجل التجاري: قبل الموعد وبعده"),
    ("مقالات/مدد-تأمينية", "../maqalat/insurance-periods-inquiry.html", ["مدد", "تأميني", "تأمينية", "اشتراك", "تأمينات"], "استعلام المدد التأمينية: الرقم ده معناه إيه"),
    ("مقالات/بدل-فاقد-قومي", "../maqalat/lost-national-id.html", ["بدل", "فاقد", "قومي", "بطاقة"], "بدل فاقد بطاقة الرقم القومي: ٥ أخطاء"),
    ("مقالات/شهادة-وفاة", "../maqalat/death-certificate.html", ["وفاة", "متوفى", "معاش"], "شهادة الوفاة المميكنة: الأوراق والاستخدامات"),
    ("مقالات/بطاقة-تأمين-صحي", "../articles/health-insurance-card.html", ["تأمين", "صحي", "بطاقة", "علاج"], "بطاقة التأمين الصحي: الأوراق والخطوات"),
    ("مقالات/تأمين-صحي-مشمول", "../articles/health-insurance-egypt.html", ["تأمين", "صحي", "شمول", "علاج"], "التأمين الصحي: مين المشمول"),
    ("مقالات/استعلام-تأميني", "../articles/insurance-inquiry.html", ["استعلام", "تأميني", "موقف", "رقم"], "الاستعلام عن الموقف التأميني بالرقم القومي"),
    ("مقالات/رخصة-مزاولة", "../articles/profession-license.html", ["رخصة", "مزاولة", "نشاط", "ترخيص"], "رخصة مزاولة النشاط: الشروط والأوراق"),
    ("مقالات/تجديد-قيادة", "../articles/driving-license-renewal.html", ["رخصة", "قيادة", "تجديد"], "تجديد رخصة القيادة: المواعيد والأوراق"),
    ("مقالات/شهادة-ميلاد", "../articles/birth-certificate-guide.html", ["ميلاد", "شهادة", "مولود"], "استخراج شهادة ميلاد مميكنة"),
]

def text_of(path):
    s = open(path, encoding='utf-8').read()
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    title = re.search(r'<title>(.*?)</title>', s, re.S)
    body = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)
    body = re.sub('<[^>]+>', ' ', body)
    return ((title.group(1) if title else '') + ' ' + (h1.group(1) if h1 else '')), body

def pick(head, body, n=3):
    scored = []
    for _, url, kws, label in ARTICLES:
        sc = sum(head.count(k) * 10 + min(body.count(k), 3) for k in kws)
        if sc:
            scored.append((sc, url, label))
    scored.sort(reverse=True)
    return [(u, l) for sc, u, l in scored if sc >= 10][:n]

def block(pairs):
    links = ''.join(f'<a href="{u}" class="rel-card">{l}</a>' for u, l in pairs)
    return (' <div class="section" data-ap="articles">\n  <h2>📝 اقرأ كمان</h2>\n'
            f'  <div class="rel-grid rel-articles">{links}</div>\n </div>\n')

def main():
    touched = 0
    for p in sorted(glob.glob(os.path.join(ROOT, 'services', '*.html'))):
        s = open(p, encoding='utf-8').read()
        if 'data-ap="articles"' in s:
            continue
        head, body = text_of(p)
        pairs = pick(head, body)
        if not pairs:
            continue
        anchor = None
        for marker in ('<div class="books-strip">', '<div class="footer-note"', '<div class="footer"'):
            i = s.find(marker)
            if i > 0:
                anchor = i
                break
        if anchor is None:
            continue
        s = s[:anchor] + block(pairs) + s[anchor:]
        open(p, 'w', encoding='utf-8').write(s)
        touched += 1
    print('صفحات اتضاف لها «اقرأ كمان»:', touched)

if __name__ == '__main__':
    main()
