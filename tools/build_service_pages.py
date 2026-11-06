#!/usr/bin/env python3
"""بناء صفحات خدمات جديدة على نفس قالب renew-commercial-register.html"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'services', 'renew-commercial-register.html')
OUT = os.path.join(ROOT, 'services')

src = open(SRC, encoding='utf-8').read()
head = src[:src.index('<body>')]
tail = src[src.index('<div class="books-strip">'):]


def page(slug, spec):
    h = head
    old_title = re.search(r'<title>(.*?)</title>', src, re.S).group(1)
    old_desc = re.search(r'<meta name="description" content="([^"]*)">', src).group(1)
    h = h.replace(old_title, spec['title']).replace(old_desc, spec['desc'])
    h = h.replace('renew-commercial-register.html', slug + '.html')
    h = re.sub(r'<title>.*?</title>', '<title>%s</title>' % spec['title'], h, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="%s">' % spec['desc'], h)
    h = re.sub(r'<meta name="keywords" content="[^"]*">',
               '<meta name="keywords" content="%s">' % spec['keys'], h)

    stats = ''.join(
        '<div class="stat-card"><div class="stat-emoji">%s</div><div class="stat-value">%s</div>'
        '<div class="stat-label">%s</div></div>' % (s[0], s[1], s[2]) for s in spec['stats'])

    opts = ''.join(
        '<label class="calc-opt"><input type="radio" name="calctype" value="%s"%s>'
        '<span class="calc-opt-body"><span class="calc-opt-label">%s</span>'
        '<span class="calc-opt-desc">%s</span></span></label>' % (
            o[1], ' checked' if i == 0 else '', o[0], o[2])
        for i, o in enumerate(spec['calc']))

    fees = ''.join(
        '<div class="fee-row"><div class="fee-type"><span class="fee-icon">%s</span><div>'
        '<div class="fee-name">%s</div><div class="fee-note">%s</div></div></div>'
        '<div class="fee-price">%s</div><div class="fee-speed">%s</div></div>' % f
        for f in spec['fees'])

    tabs_btn = ''.join(
        '<button class="tab-btn%s" onclick="switchTab(%d)">%s</button>' % (
            ' active' if i == 0 else '', i, t[0]) for i, t in enumerate(spec['steps']))
    tabs_pane = ''.join(
        '<div class="tab-pane%s"><ol class="steps-list">%s</ol></div>' % (
            ' active' if i == 0 else '',
            ''.join('<li><div class="step-num">%d</div><div class="step-body">'
                    '<div class="step-title">%s</div><div class="step-desc">%s</div></div></li>' % (
                        n + 1, st[0], st[1]) for n, st in enumerate(t)))
        for i, t in enumerate(spec['steps']))

    docs = ''.join(
        '<label class="check-item"><input type="checkbox" class="doc-check">'
        '<span class="check-box"></span><span class="check-text">%s</span></label>' % d
        for d in spec['docs'])

    conds = ''.join('<li>%s</li>' % c for c in spec['conds'])

    where = ''.join(
        '<div class="where-card"><div class="where-icon">%s</div><div>'
        '<div class="where-name">%s</div><div class="where-desc">%s</div></div></div>' % w
        for w in spec['where'])

    faq = ''.join(
        '<div class="faq-item"><button class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')">'
        '<span>%s</span><span class="faq-arrow">▾</span></button>'
        '<div class="faq-a"><p>%s</p></div></div>' % (q, a) for q, a in spec['faq'])

    sources = ''.join(
        '<a href="%s" target="_blank" rel="noopener" class="src-badge">%s</a>' % s for s in spec['sources'])

    related = ''.join(
        '<a href="%s" class="rel-card">%s</a>' % r for r in spec['related'])

    body = '''<body>
<div class="header"><div class="header-logo"><span>خِدْمَتي <span class="ai">AI</span></span></div><nav class="hd-nav" aria-label="التنقل الرئيسي"><a href="../index.html">الرئيسية</a><a href="../services.html" class="on">الخدمات</a><a href="../offices.html">المكاتب</a><a href="../store.html">المتجر</a></nav></div>
<div class="breadcrumb"><a href="../index.html">الرئيسية</a> › <a href="../services.html">الخدمات</a> › %(crumb)s</div>
<div class="wrap">
 <div class="hero">
  <div class="hero-emoji">%(emoji)s</div>
  <h1>%(h1)s</h1>
  <p>%(hero)s</p>
  <div class="hero-tags">%(tags)s</div>
  <div class="stats-row">%(stats)s</div>
 </div>

 <div class="section">
  <h2>🧮 احسب الرسوم</h2>
  <div class="calc-box">
   <div class="calc-sub">%(calcsub)s</div>
   %(opts)s
   <div class="calc-result"><div class="amt" id="calcAmt">%(first)s</div><div class="lbl">جنيه مصري — الرسوم الإجمالية</div></div>
  </div>
 </div>

 <div class="section">
  <h2>💰 الرسوم</h2>
  %(fees)s
  <div class="verify-note">⚠️ %(feesnote)s</div>
 </div>

 <div class="section">
  <h2>📋 الخطوات</h2>
  <div class="tabs">%(tabs_btn)s</div>
  %(tabs_pane)s
 </div>

 <div class="section">
  <h2>📄 الأوراق المطلوبة</h2>
  %(docs)s
  <div class="docs-note">دوّر على ✅ كل ورقة قبل ما تروح — أو اطبع اللستة</div>
  <a data-docs-link="1" href="../docs-checker.html" style="display:inline-block;margin:6px 0 0;padding:9px 16px;border-radius:20px;border:1px solid #e6c258;color:#e6c258;text-decoration:none;font-size:13px;font-weight:700">🔍 افحص أوراقك قبل ما تروح ←</a>
  <button class="print-btn" onclick="window.print()">🖨️ اطبع لستة الأوراق</button>
 </div>

 <div class="section">
  <h2>✅ شروط وملاحظات</h2>
  <ul class="cond-list">%(conds)s</ul>
 </div>

 <div class="section">
  <h2>📍 تطلبه منين؟</h2>
  <div class="where-grid">%(where)s</div>
 </div>

 <div class="section">
  <h2>❓ أسئلة شائعة</h2>
  %(faq)s
 </div>

 <div class="section">
  <h2>🏛️ المصادر الرسمية</h2>
  <div class="src-row">%(sources)s</div>
  <div class="share-row">
   <button class="share-btn share-wa" onclick="shareWa()">💬</button>
   <button class="share-btn share-fb" onclick="shareFb()">📘</button>
   <button class="share-btn share-cp" onclick="shareCp()">🔗</button>
  </div>
 </div>

 <div class="section">
  <h2>🔗 خدمات تهمّك</h2>
  <div class="rel-grid">%(related)s</div>
 </div>

 <div class="ask-cta">
  <h3>لزق فيك حاجة؟ اسأل المساعد الذكي</h3>
  <p>جايز تسأل عن حالتك بالظبط — المساعد بيرد عليك فورًا</p>
  <a href="../index.html#ask" class="ask-btn">اسأل الآن 💬</a>
 </div>

 <div class="ask-cta" style="border-color:#1e3556">
  <h3>اعرف الرسوم قبل ما تروح</h3>
  <p>حاسبة الرسوم بتحسب الرسم الرسمي والتجديد والبدل الفاقد في ثواني</p>
  <a href="../calc.html" class="ask-btn" onclick="if(window.gtag)gtag('event','calc_cta_click',{source_page:location.pathname})">احسب الرسوم 🧮</a>
 </div>
</div>
''' % dict(spec, stats=stats, opts=opts, fees=fees, tabs_btn=tabs_btn,
             tabs_pane=tabs_pane, docs=docs, conds=conds, where=where,
             faq=faq, sources=sources, related=related, first=spec['calc'][0][1])

    html = h + body + tail
    open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(html)
    print('built', slug, len(html))


PAGES = {
    'criminal-record-smart-transport': dict(
        title='فيش جنائي للنقل الذكي | الرسوم والأوراق | خِدْمَتي AI',
        desc='كل حاجة عن الفيش الجنائي للنقل الذكي في مصر: الرسوم (28ج ورقية، 32ج عاجلة، 47ج مميكنة، 89ج أونلاين)، الأوراق، والخطوات.',
        keys='فيش جنائي, النقل الذكي, صحيفة الحالة الجنائية, فيش مميكن, وزارة الداخلية',
        crumb='المرور والنقل',
        emoji='📋',
        h1='فيش جنائي للنقل الذكي',
        hero='صحيفة الحالة الجنائية المطلوبة لسائقي النقل الذكي — اعرف الفئات الأربع للرسوم، الأوراق، وخطوات الاستخراج قبل ما تروح القسم.',
        tags='<span class="tag tag-online">🌐 أونلاين متاح</span><span class="tag tag-gov-fee">🏛️ رسم حكومي</span>',
        stats=[('💰', 'من 28 جنيه', 'الرسوم'), ('⏱️', 'يوم إلى 3 أيام', 'المدة'), ('📄', '3 أوراق', 'الأوراق')],
        calcsub='اختار الفئة اللي محتاجها',
        calc=[('28ج — ورقية', '28', 'الفئة العادية الورقية'),
              ('32ج — عاجلة', '32', 'استلام أسرع'),
              ('47ج — مميكنة', '47', 'المطلوبة للنقل الذكي — مطبوعة من القاعدة'),
              ('89ج — أونلاين', '89', 'من منصة مصر الرقمية بدون حضور')],
        fees=[('📄', 'فيش ورقية', 'الفئة العادية من القسم', '28 جنيه', 'يوم إلى 3 أيام'),
              ('⚡', 'فيش عاجلة', 'استلام أسرع', '32 جنيه', 'نفس اليوم'),
              ('💻', 'فيش مميكنة', 'المطلوبة للنقل الذكي — بيانات من القاعدة', '47 جنيه', 'حسب القسم'),
              ('🌐', 'فيش أونلاين', 'من منصة مصر الرقمية', '89 جنيه', 'حسب الطلب')],
        feesnote='الرسوم ثابتة على مستوى الجمهورية، وأي مبلغ إضافي غير رسمي. الفيش المميكن هو اللي بيتطلب لسواقين النقل الذكي في أغلب الوحدات — راجع الوحدة بتاعتك قبل ما تدفع.',
        steps=[('🏛️ من القسم', [('جهّز الأوراق', 'بطاقة الرقم القومي سارية + عدد الصور الشخصية اللي بيطلبها القسم.'),
                                  ('روح القسم التابع له', 'قسم الشرطة اللي بيتبع له محل إقامتك — القسم بس اللي بيستخرج الفيش.'),
                                  ('قدّم الطلب وادفع', 'املأ النموذج واختار الفئة (ورقية / عاجلة / مميكنة) واسدد الرسم.'),
                                  ('استلم الفيش', 'الورقية بتاخد يوم إلى 3 أيام، والعاجلة نفس اليوم.'),
                                  ('راجع الاسم والبيانات', 'أي خطأ في الاسم أو الرقم القومي بيرجّعك تاني — راجع قبل ما تسيب الشباك.')]),
                 ('🌐 أونلاين', [('ادخل منصة مصر الرقمية', 'سجّل بحسابك الوطني واختار خدمة صحيفة الحالة الجنائية.'),
                                 ('اسدد 89 جنيه', 'الرسم الأعلى مقابل إنك مش بتروح القسم.'),
                                 ('استلم بالبريد', 'الفيش بيوصل على عنوانك المسجل.')])],
        docs=['بطاقة الرقم القومي سارية', 'صور شخصية حديثة', 'نموذج الطلب من القسم'],
        conds=['الفيش بيتطلب لسواقين النقل الذكي ضمن أوراق التجديد',
               'لازم يكون من القسم التابع له محل الإقامة',
               'بياناتك لازم تكون محدّثة في السجل المدني قبل الطلب',
               'أي مبلغ إضافي فوق الرسم الرسمي غير قانوني'],
        where=[('🏛️', 'أقسام الشرطة', 'استخراج الفيش بكل فئاته'),
               ('💻', 'منصة مصر الرقمية', 'الفيش الأونلاين 89 جنيه'),
               ('🚦', 'وحدات المرور', 'بتطلبه ضمن أوراق النقل الذكي'),
               ('📞', 'وزارة الداخلية', 'الاستفسار عن الحالة والفئة')],
        faq=[('كم رسوم الفيش الجنائي للنقل الذكي؟', 'الفئات أربعة: 28ج ورقية، 32ج عاجلة، 47ج مميكنة، و89ج أونلاين من منصة مصر الرقمية. الفيش المميكن (47ج) هو اللي بيتطلب في أغلب وحدات النقل الذكي.'),
             ('الفيش المميكن إيه الفرق بينه وبين العادي؟', 'المميكن بيتم استخراجه من قاعدة البيانات ومطبوع إلكترونيًا، فبياناته أوضح وصعب تزويره — عشان كده النقل الذكي بيطلبه.'),
             ('أقدر أستخرجه أونلاين؟', 'أيوة من منصة مصر الرقمية برسم 89 جنيه، وبيوصل بالبريد على عنوانك المسجل.'),
             ('الفيش بياخد وقت قد إيه؟', 'الورقية يوم إلى 3 أيام عمل، والعاجلة نفس اليوم حسب القسم.')],
        sources=[('https://www.moi.gov.eg/', '🏛️ وزارة الداخلية'),
                 ('https://www.digital.gov.eg/', '💻 منصة مصر الرقمية'),
                 ('https://traffic.moi.gov.eg/', '🚦 بوابة مرور مصر')],
        related=[('renew-car-license.html', 'تجديد رخصة السيارة'),
                 ('new-driving-license.html', 'استخراج رخصة قيادة'),
                 ('renew-driving-license.html', 'تجديد رخصة القيادة'),
                 ('criminal-record.html', 'الفيش الجنائي (الدليل الكامل)'),
                 ('international-license.html', 'الرخصة الدولية')],
    ),

    'lost-driving-license': dict(
        title='بدل فاقد رخصة قيادة | الرسوم والأوراق | خِدْمَتي AI',
        desc='بدل فاقد رخصة قيادة في مصر: الرسوم حسب مدة الرخصة (1250ج لسنتين، 1500ج لـ3 سنوات، 1750ج لـ5 سنوات) + الرسم الأساسي، والأوراق والخطوات.',
        keys='بدل فاقد رخصة قيادة, رخصة قيادة, فقدان رخصة, وحدة المرور, وزارة الداخلية',
        crumb='المرور والنقل',
        emoji='🪪',
        h1='بدل فاقد رخصة القيادة',
        hero='لو رخصتك ضاعت أو اتلفت — الرسوم بتتحدد بمدة الرخصة. اعرف الرقم والخطوات والأوراق قبل ما تروح الوحدة.',
        tags='<span class="tag tag-gov-fee">🏛️ رسم حكومي</span><span class="tag tag-online">🚦 من الوحدة</span>',
        stats=[('💰', 'من 1250 جنيه', 'الرسوم'), ('⏱️', 'نفس اليوم', 'المدة'), ('📄', '4 أوراق', 'الأوراق')],
        calcsub='اختار مدة الرخصة الأصلية',
        calc=[('1250ج — سنتان', '1250', 'رخصة مدتها سنتان'),
              ('1500ج — 3 سنوات', '1500', 'رخصة مدتها 3 سنوات'),
              ('1750ج — 5 سنوات', '1750', 'رخصة مدتها 5 سنوات')],
        fees=[('📅', 'سنتان', 'بدل فاقد لرخصة مدتها سنتان', '1250 جنيه', 'نفس اليوم'),
              ('📅', '3 سنوات', 'بدل فاقد لرخصة 3 سنوات', '1500 جنيه', 'نفس اليوم'),
              ('📅', '5 سنوات', 'بدل فاقد لرخصة 5 سنوات', '1750 جنيه', 'نفس اليوم'),
              ('📄', 'رسم إصدار الرخصة', 'بيتضاف على الرسوم', '250 جنيه', 'مع الإصدار')],
        feesnote='الرسوم المذكورة لبدل الفاقد حسب مدة الرخصة، وفوقها رسم إصدار الرخصة (250ج). الرقم النهائي هو اللي الوحدة بتطلبه يوم التنفيذ.',
        steps=[('🏛️ من الوحدة', [('اعمل بلاغ فقدان', 'بلاغ في القسم أو إثبات الفقدان — بعض الوحدات بتطلبه.'),
                                  ('جهّز الأوراق', 'البطاقة سارية + الصور + إثبات الفقدان.'),
                                  ('قدّم في وحدة المرور', 'وحدة المرور اللي رخصتك مسجلة عليها.'),
                                  ('اسدد الرسوم', 'حسب مدة الرخصة + رسم الإصدار.'),
                                  ('استلم الرخصة الجديدة', 'بتتصدر في نفس اليوم في أغلب الوحدات.')])],
        docs=['بطاقة الرقم القومي سارية', 'صور شخصية', 'إثبات بلاغ الفقدان', 'صورة أو رقم الرخصة القديمة لو متاحة'],
        conds=['رخصة القيادة لازم تكون سارية أو حديثة الانتهاء',
               'الرسوم بتتحدد بمدة الرخصة مش بسعر موحد',
               'لو الرخصة منتهية من فترة طويلة بتتحوّل لطلب تجديد مش بدل فاقد',
               'الفحص الطبي مطلوب في بعض الحالات'],
        where=[('🚦', 'وحدات المرور', 'تقديم الطلب واستلام الرخصة'),
               ('🏛️', 'أقسام الشرطة', 'بلاغ الفقدان'),
               ('💻', 'بوابة مرور مصر', 'حجز موعد والاستعلام'),
               ('🏥', 'اللجان الطبية', 'لو مطلوب فحص')],
        faq=[('كم رسوم بدل فاقد رخصة القيادة؟', 'حسب مدة الرخصة: 1250ج لسنتين، 1500ج لـ3 سنوات، 1750ج لـ5 سنوات، وفوقهم رسم إصدار الرخصة 250ج.'),
             ('محتاج بلاغ فقدان؟', 'في أغلب الوحدات أيوة — بلاغ في القسم أو إثبات الفقدان، والناس بتعمله عشان تتحمى من سوء الاستخدام.'),
             ('بتاخد وقت قد إيه؟', 'لو الأوراق كاملة، الرخصة بتتصدر في نفس اليوم في أغلب الوحدات.'),
             ('الرخصة المنتهية تعمل إيه؟', 'لو منتهية لفترة طويلة الطلب بيتحوّل لتجديد وبتتحتاج فحص طبي وبعض الأوراق الإضافية.')],
        sources=[('https://www.moi.gov.eg/', '🏛️ وزارة الداخلية'),
                 ('https://traffic.moi.gov.eg/', '🚦 بوابة مرور مصر')],
        related=[('renew-driving-license.html', 'تجديد رخصة القيادة'),
                 ('new-driving-license.html', 'استخراج رخصة قيادة'),
                 ('lost-car-license.html', 'بدل فاقد رخصة المركبة'),
                 ('international-license.html', 'الرخصة الدولية'),
                 ('replace-plates.html', 'بدل فاقد لوحات المركبة')],
    ),

    'lost-car-license': dict(
        title='بدل فاقد رخصة مركبة | الرسوم والأوراق | خِدْمَتي AI',
        desc='بدل فاقد رخصة المركبة في مصر: رسم الرخصة المؤمنة 150ج للملاكي والنقل و100ج لباقي المركبات (قرار 889/2024)، والأوراق والخطوات.',
        keys='بدل فاقد رخصة مركبة, رخصة سيارة, فقدان رخصة, وحدة المرور, الرخصة المؤمنة',
        crumb='المرور والنقل',
        emoji='🚗',
        h1='بدل فاقد رخصة المركبة',
        hero='رخصة العربية ضاعت أو اتلفت؟ رسم الرخصة المؤمنة 150ج للملاكي والنقل و100ج لباقي المركبات — اعرف الأوراق والخطوات.',
        tags='<span class="tag tag-gov-fee">🏛️ رسم حكومي</span><span class="tag tag-online">🚦 من الوحدة</span>',
        stats=[('💰', 'من 100 جنيه', 'الرسوم'), ('⏱️', 'نفس اليوم', 'المدة'), ('📄', '4 أوراق', 'الأوراق')],
        calcsub='اختار نوع المركبة',
        calc=[('150ج — ملاكي ونقل', '150', 'رسم الرخصة المؤمنة للملاكي والنقل'),
              ('100ج — باقي المركبات', '100', 'دراجات وميكروباص وباقي الفئات')],
        fees=[('🚗', 'ملاكي ونقل', 'رسم الرخصة المؤمنة', '150 جنيه', 'نفس اليوم'),
              ('🛵', 'باقي المركبات', 'دراجات وميكروباص وغيرها', '100 جنيه', 'نفس اليوم'),
              ('📄', 'ملصق إلكتروني', 'بيتصدر مع الرخصة', 'حسب الفئة', 'مع الإصدار')],
        feesnote='الرسوم على رسم الرخصة المؤمنة (قرار 889 لسنة 2024). أي مخالفات مرورية على المركبة لازم تتسدد الأول قبل إصدار البدل.',
        steps=[('🏛️ من الوحدة', [('اعمل بلاغ فقدان أو تلف', 'بلاغ في القسم، أو إثبات التلف لو الرخصة اتلفت.'),
                                  ('جهّز الأوراق', 'البطاقة + رخصة المركبة أو صورة منها + إثبات التأمين.'),
                                  ('روح وحدة المرور', 'الوحدة اللي المركبة مسجلة عليها.'),
                                  ('اسدد الرسوم والمخالفات', 'رسم الرخصة المؤمنة + أي مخالفات مستحقة.'),
                                  ('استلم الرخصة الجديدة', 'بتتصدر في نفس اليوم في أغلب الحالات.')])],
        docs=['بطاقة الرقم القومي سارية', 'إثبات ملكية المركبة أو صورة الرخصة القديمة', 'وثيقة التأمين الإجباري', 'إثبات بلاغ الفقدان'],
        conds=['المخالفات المستحقة لازم تتسدد قبل إصدار البدل',
               'رخصة المركبة مرتبطة بالتأمين الإجباري والملصق الإلكتروني',
               'الفحص الفني مطلوب لو الرخصة منتهية',
               'لو اللوحات ضاعت كمان، ليها إجراء بدل فاقد لوحات منفصل'],
        where=[('🚦', 'وحدات المرور', 'إصدار البدل'),
               ('🏛️', 'أقسام الشرطة', 'بلاغ الفقدان'),
               ('💻', 'بوابة مرور مصر', 'الاستعلام عن المخالفات وحجز موعد'),
               ('🛡️', 'شركات التأمين', 'وثيقة التأمين الإجباري')],
        faq=[('كم رسوم بدل فاقد رخصة المركبة؟', 'رسم الرخصة المؤمنة 150ج للملاكي والنقل و100ج لباقي المركبات (قرار 889 لسنة 2024)، وفوقه أي مخالفات مستحقة.'),
             ('لازم أسدد المخالفات الأول؟', 'أيوة — البدل مش بيتصدر ومعاك مخالفات مستحقة على المركبة.'),
             ('اللوحات ضاعت مع الرخصة؟', 'اللوحات ليها إجراء منفصل لبدل فاقد اللوحات، وبيتم مع نفس الزيارة في الغالب.'),
             ('بتاخد وقت قد إيه؟', 'نفس اليوم لو الأوراق كاملة ومفيش مخالفات معلّقة.')],
        sources=[('https://www.moi.gov.eg/', '🏛️ وزارة الداخلية'),
                 ('https://traffic.moi.gov.eg/', '🚦 بوابة مرور مصر')],
        related=[('replace-plates.html', 'بدل فاقد لوحات المركبة'),
                 ('renew-car-license.html', 'تجديد رخصة السيارة'),
                 ('car-ownership-transfer.html', 'نقل ملكية سيارة'),
                 ('lost-driving-license.html', 'بدل فاقد رخصة القيادة'),
                 ('car-inspection.html', 'الفحص الفني للمركبة')],
    ),
}

for slug, spec in PAGES.items():
    page(slug, spec)
