# -*- coding: utf-8 -*-
"""
build_agent_kb.py — بناء قاعدة المعرفة المتحققة للـAgent v3

المصدر الوحيد للحقيقة: sources-log.md (سجل مصادر التحقق — معيار مصدرين+)
المخرجات:
  1) src/data/agent-kb.json  — قاعدة المعرفة القابلة للمراجعة
  2) worker-v3.js            — عامل كلاودفلير الجاهز للنشر (KB مدمج)

منهجية ذرّية: أي ناقص أو تعارض في السجل = السكربت يفشل بصوت عالي وميكتبش حاجة.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / 'sources-log.md'
TEMPLATE = ROOT / 'tools' / 'worker_v3_template.js'
KB_JSON = ROOT / 'src' / 'data' / 'agent-kb.json'
WORKER_OUT = ROOT / 'worker-v3.js'

# ===== أسماء العرض لكل صفحة متحققة (59) — أي صفحة جديدة في السجل لازم تضاف هنا =====
NAMES = {
    'birth-certificate': 'استخراج شهادة ميلاد',
    'death-certificate': 'استخراج شهادة وفاة',
    'marriage-divorce-certificate': 'قسيمة زواج أو طلاق',
    'water-bill-payment': 'سداد فاتورة المياه',
    'gas-bill-payment': 'سداد فاتورة الغاز الطبيعي',
    'water-connection': 'توصيل مياه شرب — عداد جديد',
    'natural-gas-connection': 'توصيل الغاز الطبيعي',
    'electricity': 'توصيل أو سداد كهرباء',
    'correct-name-data': 'تصحيح اسم أو بيانات في القيود',
    'ration-card': 'بطاقة التموين',
    'mortgage-registration': 'قيد رهن عقاري',
    'property-sale-registration': 'قيد عقد بيع عقار',
    'rent-contract-registration': 'توثيق عقد إيجار',
    'ownership-chain-certificate': 'صحيفة الملكية وسلسلة التصرفات',
    'postal-savings-account': 'حساب توفير البريد',
    'national-id-card': 'بطاقة الرقم القومي — استخراج أول مرة',
    'renew-national-id': 'تجديد بطاقة الرقم القومي',
    'lost-national-id': 'بدل فاقد لبطاقة الرقم القومي',
    'child-national-id': 'بطاقة الرقم القومي لسن 15',
    'power-of-attorney': 'التوكيل الرسمي من الشهر العقاري',
    'certify-certificates': 'تصديق الشهادات الدراسية من الخارجية',
    'car-inspection': 'فحص السيارة',
    'car-ownership-transfer': 'نقل ملكية السيارة',
    'renew-car-license': 'تجديد رخصة السيارة',
    'replace-plates': 'استبدال اللوحات المعدنية',
    'traffic-violations': 'المخالفات المرورية',
    'new-driving-license': 'رخصة قيادة جديدة',
    'renew-driving-license': 'تجديد رخصة القيادة',
    'international-license': 'رخصة القيادة الدولية',
    'new-passport': 'استخراج جواز سفر',
    'renew-passport': 'تجديد جواز السفر',
    'lost-passport': 'بدل فاقد لجواز السفر',
    'exit-return-visa': 'تأشيرة خروج وعودة',
    'egyptian-citizenship': 'إثبات الجنسية المصرية',
    'health-insurance': 'التسجيل في التأمين الصحي الشامل',
    'health-insurance-card': 'كارت التأمين الصحي الشامل',
    'insurance-number-inquiry': 'الاستعلام عن الرقم التأميني',
    'insurance-periods-inquiry': 'الاستعلام عن مدد الاشتراك',
    'takafol-karama': 'تكافل وكرامة',
    'update-insured-data': 'تحديث بيانات المؤمن عليه',
    'work-injury-pension': 'معاش إصابة العمل',
    'tax-registration': 'التسجيل الضريبي',
    'tax-return': 'تقديم الإقرار الضريبي',
    'tax-objection': 'الاعتراض على ربط الضريبة',
    'e-invoice': 'الانضمام للفاتورة الإلكترونية',
    'edit-tax-data': 'تعديل بيانات التسجيل الضريبي',
    'file-lawsuit': 'رفع دعوى قضائية',
    'lawsuit-inquiry': 'الاستعلام عن دعوى',
    'court-ruling-copy': 'صورة رسمية من حكم',
    'pension-extraction': 'استخراج معاش',
    'pension-postal-payment': 'صرف معاش بالبريد',
    'bank-pension': 'صرف معاش بالبنك',
    'company-formation': 'تأسيس شركة',
    'renew-commercial-register': 'تجديد السجل التجاري',
    'update-company-data': 'تعديل بيانات شركة',
    'exam-results': 'الاستعلام عن نتيجة',
    'new-student-registration': 'تسجيل طالب جديد',
    'vaccination-certificate': 'شهادة تطعيم دولية',
    'postal-services': 'خدمات بريدية',
}

# ===== التصنيف (زي تصنيفات الموقع) =====
CAT = {
    'civil': ['birth-certificate','death-certificate','marriage-divorce-certificate','correct-name-data',
              'national-id-card','renew-national-id','lost-national-id','child-national-id'],
    'notary': ['mortgage-registration','property-sale-registration','rent-contract-registration',
               'ownership-chain-certificate','power-of-attorney'],
    'taxes': ['tax-registration','tax-return','tax-objection','e-invoice','edit-tax-data'],
    'utilities': ['water-bill-payment','gas-bill-payment','water-connection','natural-gas-connection','electricity'],
    'insurance': ['insurance-number-inquiry','insurance-periods-inquiry','update-insured-data',
                  'work-injury-pension','pension-extraction','pension-postal-payment','bank-pension'],
    'social': ['takafol-karama','ration-card'],
    'health': ['health-insurance','health-insurance-card','vaccination-certificate'],
    'travel': ['new-passport','renew-passport','lost-passport','exit-return-visa','egyptian-citizenship'],
    'traffic': ['car-inspection','car-ownership-transfer','renew-car-license','replace-plates',
                'traffic-violations','new-driving-license','renew-driving-license','international-license'],
    'courts': ['file-lawsuit','lawsuit-inquiry','court-ruling-copy'],
    'companies': ['company-formation','renew-commercial-register','update-company-data'],
    'education': ['exam-results','new-student-registration','certify-certificates'],
    'post': ['postal-savings-account','postal-services'],
}
SLUG2CAT = {s: c for c, slugs in CAT.items() for s in slugs}

# ===== كلمات مفتاحية عامية إضافية (المطابقة العامة عاملة الشغل الأكبر — دي بتضيف التغطية) =====
EXTRA_KW = {
    'national-id-card': ['بطاقة رقم قومي','استخراج بطاقة','أول بطاقة'],
    'renew-national-id': ['تجديد بطاقة','بطاقة منتهية','البطاقة خلصت'],
    'lost-national-id': ['بدل فاقد بطاقة','البطاقة ضاعت','فاتتني البطاقة','البطاقة اتسرقت','بطاقة تالفة'],
    'child-national-id': ['بطاقة سن 15','بطاقة للأطفال','عمره 15 سنة'],
    'new-passport': ['استخراج جواز','جواز سفر جديد','عمل جواز','أطلع جواز'],
    'renew-passport': ['تجديد جواز','الجواز خلص','جوازي منتهي'],
    'lost-passport': ['جواز فاقد','ضاع الجواز','بدل فاقد جواز','بدل تالف جواز'],
    'exit-return-visa': ['تأشيرة خروج','خروج وعودة'],
    'egyptian-citizenship': ['جنسية','تجنيس','إثبات جنسية'],
    'ration-card': ['تموين','دعم','سلع','خبز','بطاقة تموين','صرف تموين','أضيف مولود للتموين'],
    'electricity': ['كهرباء','نور','عداد كهرباء','فاتورة كهرباء'],
    'water-bill-payment': ['مياه','مية','مايه','فاتورة المياه','سداد مياه'],
    'water-connection': ['عداد مياه','توصيل مياه','مياه جديدة'],
    'gas-bill-payment': ['غاز','فاتورة الغاز','بتروتريد'],
    'natural-gas-connection': ['توصيل غاز','غاز طبيعي','غاز مواسير'],
    'pension-extraction': ['معاش','تقاعد','معاش شيخوخة','معاش مبكر','أستخرج معاش','أطلع معاش'],
    'pension-postal-payment': ['صرف معاش','معاش البريد','كارت ميزة','سلفة معاش'],
    'bank-pension': ['تحويل معاش','معاش بنك','معاش بالحساب'],
    'takafol-karama': ['تكافل','كرامة','ضمان اجتماعي','دعم مالي','تضامن'],
    'health-insurance': ['تأمين صحي','صحي شامل','تسجيل التأمين'],
    'health-insurance-card': ['كارت علاج','كارت تأمين صحي','كارت صحي','علاج مجاني'],
    'work-injury-pension': ['إصابة عمل','مرض مهني','تعويض إصابة'],
    'insurance-number-inquiry': ['رقم تأميني','الرقم التأميني'],
    'insurance-periods-inquiry': ['مدد اشتراك','سنوات التأمين','مدد التأمينات'],
    'update-insured-data': ['تحديث بيانات تأمينات','تعديل بيانات مؤمن عليه'],
    'tax-registration': ['تسجيل ضريبي','ضريبة','ضرايب','سجل ضريبي','بطاقة ضريبية'],
    'tax-return': ['إقرار ضريبي','إقرار الضرائب'],
    'tax-objection': ['اعتراض ضريبي','تظلم ضرايب','طعن ضريبي'],
    'e-invoice': ['فاتورة إلكترونية','فاتورة ضريبية'],
    'edit-tax-data': ['تعديل بيانات ضريبية','تغيير نشاط ضرايب'],
    'file-lawsuit': ['رفع دعوى','دعوى قضائية','قضية','أخاصم حد','محكمة'],
    'lawsuit-inquiry': ['استعلام دعوى','موقف قضية','جلسة','رول'],
    'court-ruling-copy': ['صورة حكم','حكم رسمي','استخراج حكم'],
    'company-formation': ['تأسيس شركة','شركة','ذ م م','gafi','استثمار','شخص واحد'],
    'renew-commercial-register': ['تجديد سجل','سجل تجاري','ترخيص تجاري'],
    'update-company-data': ['تعديل بيانات شركة','تعديل سجل','تحديث نشاط شركة'],
    'new-driving-license': ['رخصة سواقة','سواقة','برميت','رخصة تسيكل','موتوسيكل','دراجة نارية'],
    'renew-driving-license': ['تجديد سواقة','تجديد رخصة قيادة'],
    'international-license': ['رخصة دولية','سواقة دولية'],
    'renew-car-license': ['تجديد رخصة سيارة','ترخيص سيارة','تجديد سيارة','رخصة مرور'],
    'car-inspection': ['فحص سيارة','فحص فني'],
    'car-ownership-transfer': ['نقل ملكية','بيع سيارة','نقل قيد سيارة','اشتريت سيارة مستعملة'],
    'traffic-violations': ['مخالفات','مخالفة','غرامة مرور','سداد مخالفات','تصالح مروري'],
    'replace-plates': ['لوحات','لوحة معدنية','بلاتية'],
    'birth-certificate': ['شهادة ميلاد','تسجيل مولود','قيد مولود','مولود جديد','فيشة'],
    'death-certificate': ['شهادة وفاة','وفاة','تصريح دفن'],
    'marriage-divorce-certificate': ['قسيمة زواج','وثيقة زواج','قسيمة طلاق','شهادة زواج','شهادة طلاق','عقد زواج','طلاق'],
    'correct-name-data': ['تصحيح اسم','اسم غلط','تعديل بيانات البطاقة','خطأ في الاسم','تغيير الاسم'],
    'certify-certificates': ['تصديق شهادة','خارجية','اعتماد شهادة','تصديق مستندات'],
    'power-of-attorney': ['توكيل','توكيل رسمي','وكالة'],
    'mortgage-registration': ['رهن عقاري','رهن','قرض عقاري'],
    'property-sale-registration': ['تسجيل عقد بيع','بيع شقة','بيع عقار','تسجيل شقة'],
    'rent-contract-registration': ['إيجار','عقد إيجار','توثيق إيجار'],
    'ownership-chain-certificate': ['صحيفة ملكية','صحيفة تصرفات','سلسلة تصرفات','ملكية عقار'],
    'postal-savings-account': ['توفير بريد','دفتر توفير','حساب توفير'],
    'postal-services': ['شحنة','طرود بريد','بريد سريع','تتبع شحنة','إرسال طرد'],
    'exam-results': ['نتيجة','نتائج','درجات','ثانوية عامة'],
    'new-student-registration': ['تسجيل أولى ابتدائي','تسجيل مدرسة','تسجيل طفل','رياض أطفال','قبول مدرسة','emis'],
    'vaccination-certificate': ['تطعيم','تطعيمات','شهادة تطعيم','سحائي','حمى صفراء','حج'],
}

SLUG_RE = re.compile(r'services/([a-z0-9-]+)(?:\.html)?')

def is_sources_line(l):
    s = l.strip()
    return s.startswith('### المصادر') or s.startswith('المصادر:')

def strip_source_label(l):
    s = l.strip()
    for pre in ('### المصادر:', '### المصادر', 'المصادر:'):
        if s.startswith(pre):
            return s[len(pre):].lstrip(':').strip()
    return s

def clean_sources(items):
    out = []
    for it in items:
        t = it.strip()
        t = re.sub(r'^\d+\)\s*', '', t)
        t = re.sub(r'^\d+\.\s*', '', t)
        t = t.rstrip('-–— ')
        if t and t not in out:
            out.append(t)
    return ' | '.join(out)

def parse():
    lines = LOG.read_text(encoding='utf-8').split('\n')
    entries = {}   # slug -> {verified, sources}
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('## '):
            head_slugs = SLUG_RE.findall(line)
            # ---- تجميع جسم القسم ----
            j = i + 1
            body = []
            while j < len(lines) and not lines[j].startswith('## '):
                body.append(lines[j])
                j += 1
            if head_slugs:
                # قسم صفحة واحدة: المؤكد قبل المصادر، والمصادر قائمة مرقمة
                verified, src_lines, collecting_src = [], [], False
                for l in body:
                    if is_sources_line(l):
                        collecting_src = True
                        rest = strip_source_label(l)
                        if rest: src_lines.append(rest)
                        continue
                    if collecting_src:
                        if l.strip() and l.strip() != '---':
                            src_lines.append(l)
                    else:
                        if l.strip() and l.strip() != '---' and not l.startswith('### '):
                            verified.append(l.strip())
                v = '\n'.join(verified).strip()
                s = clean_sources(src_lines)
                for slug in head_slugs:
                    entries[slug] = {'verified': v, 'sources': s}
            else:
                # قسم متعدد الصفحات: أبناء ### لكل واحد أو أكتر slugs
                k = 0
                while k < len(body):
                    l = body[k]
                    if l.startswith('### '):
                        child_slugs = SLUG_RE.findall(l)
                        if not child_slugs:
                            k += 1
                            continue
                        verified, src_lines, collecting_src = [], [], False
                        k += 1
                        while k < len(body) and not body[k].startswith('### '):
                            cl = body[k]
                            if is_sources_line(cl):
                                collecting_src = True
                                rest = strip_source_label(cl)
                                if rest: src_lines.append(rest)
                                k += 1
                                continue
                            if collecting_src:
                                if cl.strip():
                                    src_lines.append(cl)
                            else:
                                if cl.strip() and cl.strip() != '---':
                                    verified.append(cl.strip())
                            k += 1
                        v = '\n'.join(verified).strip()
                        s = clean_sources(src_lines)
                        for slug in child_slugs:
                            entries[slug] = {'verified': v, 'sources': s}
                    else:
                        k += 1
            i = j
        else:
            i += 1
    return entries

def build():
    parsed = parse()
    log_slugs = set(parsed.keys())
    expected = set(NAMES.keys())

    # ===== فحوصات صارمة قبل أي كتابة =====
    missing_in_names = log_slugs - expected
    extra_in_names = expected - log_slugs
    if missing_in_names:
        sys.exit(f'❌ صفحات في السجل من غير اسم في NAMES: {sorted(missing_in_names)}')
    if extra_in_names:
        sys.exit(f'❌ أسماء من غير صفحات في السجل: {sorted(extra_in_names)}')
    cat_missing = expected - set(SLUG2CAT.keys())
    if cat_missing:
        sys.exit(f'❌ صفحات من غير تصنيف في CAT: {sorted(cat_missing)}')

    kb = []
    for slug in NAMES:  # بترتيب NAMES
        v = parsed[slug]['verified']
        s = parsed[slug]['sources']
        if not v or len(v) < 30:
            sys.exit(f'❌ المحتوى المتحقق ناقص لـ {slug}')
        if not s or len(s) < 20:
            sys.exit(f'❌ المصادر ناقصة لـ {slug}')
        kb.append({
            'slug': slug,
            'name': NAMES[slug],
            'cat': SLUG2CAT[slug],
            'kw': EXTRA_KW.get(slug, []),
            'verified': v,
            'sources': s,
            'url': f'https://khidmatyai.com/services/{slug}.html',
        })

    # ===== كتابة المخرجات =====
    KB_JSON.parent.mkdir(parents=True, exist_ok=True)
    KB_JSON.write_text(json.dumps(kb, ensure_ascii=False, indent=1), encoding='utf-8')

    template = TEMPLATE.read_text(encoding='utf-8')
    if template.count('__KB_JSON__') != 1:
        sys.exit('❌ قالب العامل فيه أكتر من مكان للـKB أو مفيش')
    worker = template.replace('__KB_JSON__', json.dumps(kb, ensure_ascii=False))
    hdr = ('// ✅ مولَّد آليًا بتاريخ 30/9/2026 بواسطة tools/build_agent_kb.py — المصدر: sources-log.md (معيار مصدرين+)\n'
           '// لإعادة البناء: python3 tools/build_agent_kb.py\n')
    WORKER_OUT.write_text(hdr + worker, encoding='utf-8')

    per_cat = {}
    for e in kb:
        per_cat[e['cat']] = per_cat.get(e['cat'], 0) + 1
    print(f'✅ قاعدة المعرفة المتحققة: {len(kb)} خدمة')
    print('   حسب التصنيف: ' + ', '.join(f'{c}={n}' for c, n in sorted(per_cat.items())))
    print(f'✅ كُتب: {KB_JSON.relative_to(ROOT)}')
    print(f'✅ كُتب: {WORKER_OUT.relative_to(ROOT)} ({WORKER_OUT.stat().st_size//1024} KB)')

if __name__ == '__main__':
    build()
