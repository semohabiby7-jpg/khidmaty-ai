# -*- coding: utf-8 -*-
"""يبني صفحات المقالات من قالب موحّد (نفس تصميم الموقع: كحلي + ذهبي)."""

TEMPLATE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="../auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>__TITLE__ | خِدْمَتي AI</title>
<meta name="description" content="__DESC__">
<meta name="keywords" content="__KW__">
<meta name="author" content="Mohamed Ismail">
<link rel="canonical" href="https://khidmatyai.com/articles/__SLUG__.html">
<meta property="og:type" content="article">
<meta property="og:title" content="__TITLE__">
<meta property="og:description" content="__DESC__">
<meta property="og:url" content="https://khidmatyai.com/articles/__SLUG__.html">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<style>
*{box-sizing:border-box}
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0;line-height:1.9}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}
.header-logo span{color:#fff;font-weight:900;font-size:18px}
.header-logo .ai{color:#e6c258}
.breadcrumb{max-width:860px;margin:0 auto;padding:15px 20px 0;font-size:13px;color:#5a6a8a}
.breadcrumb a{color:#e6c258;text-decoration:none}
.wrap{max-width:860px;margin:0 auto 60px;padding:0 20px}
.hero{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:20px;padding:30px 24px;text-align:center;margin:18px 0 22px}
.hero-emoji{font-size:46px;margin-bottom:6px}
.hero h1{font-size:26px;font-weight:900;color:#fff;margin:0 0 10px;line-height:1.45}
.hero p{font-size:14px;color:#8ea0c4;margin:0 auto;max-width:620px}
.meta{font-size:12px;color:#5a6a8a;text-align:center;margin-top:14px}
.article{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:26px 24px}
.article h2{font-size:20px;font-weight:800;color:#e6c258;margin:30px 0 12px;padding-bottom:8px;border-bottom:1px solid #1e3556}
.article h2:first-child{margin-top:0}
.article p{font-size:15.5px;color:#c9d6ea;margin:0 0 14px}
.article ul,.article ol{margin:0 0 16px;padding-right:22px}
.article li{font-size:15.5px;color:#c9d6ea;margin-bottom:9px}
.article strong{color:#fff}
.article a{color:#e6c258}
.note{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);color:#fbbf24;padding:14px 16px;border-radius:12px;font-size:13.5px;margin:22px 0;line-height:1.8}
.faq{background:rgba(15,30,61,.5);border:1px solid #1e3556;border-radius:12px;padding:16px;margin-bottom:12px}
.faq h3{font-size:15.5px;font-weight:800;color:#fff;margin:0 0 6px}
.faq p{margin:0;font-size:14.5px;color:#9fb0cd}
.rel h2{border:none}
.rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.rel-card{background:rgba(15,30,61,.55);border:1px solid #1e3556;border-radius:12px;padding:13px 15px;text-decoration:none;color:#e8eef8;font-size:14px;font-weight:700;transition:.2s}
.rel-card:hover{border-color:#e6c258;background:rgba(230,194,88,.08)}
.cta{background:linear-gradient(135deg,#1a2d5a,#0F1E3D);border:1px solid #e6c258;border-radius:16px;padding:22px;text-align:center;margin-top:22px}
.cta h3{margin:0 0 6px;font-size:17px;color:#fff}
.cta p{margin:0 0 14px;font-size:13.5px;color:#8ea0c4}
.cta a{display:inline-block;background:#e6c258;color:#0F1E3D;font-weight:900;padding:11px 26px;border-radius:30px;text-decoration:none;font-size:14px}
.footer-note{text-align:center;color:#5a6a8a;font-size:12px;padding:24px 0}
@media(max-width:600px){.hero h1{font-size:21px}.article{padding:20px 16px}}
</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"__TITLE__","description":"__DESC__","inLanguage":"ar","author":{"@type":"Person","name":"Mohamed Ismail"},"publisher":{"@type":"Organization","name":"خِدْمَتي AI","url":"https://khidmatyai.com/"},"mainEntityOfPage":{"@type":"WebPage","@id":"https://khidmatyai.com/articles/__SLUG__.html"},"datePublished":"2026-10-15","dateModified":"2026-10-27"}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"https://khidmatyai.com/index.html"},{"@type":"ListItem","position":2,"name":"دليلك المصري","item":"https://khidmatyai.com/articles.html"},{"@type":"ListItem","position":3,"name":"__H1__","item":"https://khidmatyai.com/articles/__SLUG__.html"}]}
</script>
</head>
<body>
<div class="header"><div class="header-logo"><span>خِدْمَتي <span class="ai">AI</span></span></div><a href="../index.html">← الرئيسية</a></div>
<div class="breadcrumb"><a href="../index.html">الرئيسية</a> › <a href="../articles.html">دليلك المصري</a> › __CRUMB__</div>

<div class="wrap">
 <div class="hero">
  <div class="hero-emoji">__EMOJI__</div>
  <h1>__H1__</h1>
  <p>__LEDE__</p>
  <div class="meta">بقلم Mohamed Ismail · خِدْمَتي AI · تحديث أكتوبر ٢٠٢٦ · قراءة __READ__ دقائق</div>
 </div>

 <div class="article">
__BODY__

  <div class="rel" style="margin-top:26px">
   <h2>🔗 خدمات ودلائل تكمّل الموضوع</h2>
   <div class="rel-grid">
__LINKS__
   </div>
  </div>

  <div class="cta">
   <h3>حالتك مش واضحة؟ اسأل المساعد الذكي</h3>
   <p>اكتب سؤالك بالعامية وهيرد عليك فورًا بخطواتك</p>
   <a href="../index.html#ask">اسأل الآن 💬</a>
  </div>
 </div>

 <div class="footer-note">خِدْمَتي AI — مرجعك في الخدمات الحكومية المصرية · © Mohamed Ismail</div>
</div>
</body>
</html>
"""


def build(slug, title, desc, kw, h1, crumb, emoji, lede, read, body, links):
    rel = "\n".join(
        f'    <a href="{u}" class="rel-card">{n}</a>' for u, n in links
    )
    return (
        TEMPLATE.replace("__TITLE__", title)
        .replace("__DESC__", desc)
        .replace("__KW__", kw)
        .replace("__SLUG__", slug)
        .replace("__H1__", h1)
        .replace("__CRUMB__", crumb)
        .replace("__EMOJI__", emoji)
        .replace("__LEDE__", lede)
        .replace("__READ__", read)
        .replace("__LINKS__", rel)
        .replace("__BODY__", body.strip("\n"))
    )


# ============================== مقال ٢ ==============================
CARD_BODY = """
  <p>بطاقة التأمين الصحي هي أول حاجة بيطلبها منك الشباك قبل أي كشف أو صرف دواء. وأغلب اللي بيتعطّل مش بسبب الورق نفسه، لكن بسبب إنه مش عارف هو تابع لجهة إيه أصلًا، ولا الكارنيه اللي في جيبه ساري ولا منتهي.</p>
  <p>المقال ده بيرتب لك الطريق من الأول: انت تابع لمين، إيه اللي هتحتاجه حسب فئتك، وإيه الفرق بين بدل الفاقد والتالف.</p>

  <h2>١. الأول: انت تابع لجهة إيه؟</h2>
  <p>قبل أي خطوة، لازم تحدد فئتك، لأنها هي اللي بتحدد الجهة والورق:</p>
  <ul>
   <li><strong>عامل بالحكومة أو القطاع العام:</strong> بطاقتك غالبًا بتتنظم من خلال جهة عملك أو إدارة التأمين الصحي التابعة لها.</li>
   <li><strong>صاحب معاش:</strong> الكارنيه مرتبط بملف التأمين الاجتماعي وسجل المعاش.</li>
   <li><strong>طالب:</strong> الكارنيه بيتنظم من المدرسة أو الجامعة.</li>
   <li><strong>عمالة غير منتظمة / صاحب عمل:</strong> المسار بيختلف وبيحتاج مراجعة موقفك التأميني الأول.</li>
   <li><strong>مشترك في التأمين الصحي الشامل:</strong> عندك ملف أسرة في وحدة طب الأسرة، والبيانات بتتحدث من هناك.</li>
  </ul>
  <div class="note">لو انت مش متأكد من تبعيتك، ابدأ بالاستعلام عن موقفك التأميني قبل ما تجمع ورق. جمع ورق على جهة غلط = مشوار ضايع.</div>

  <h2>٢. الأوراق الأساسية (لكل الفئات)</h2>
  <ul>
   <li>بطاقة الرقم القومي سارية + صورة منها.</li>
   <li>صورة شخصية حديثة (خلفية فاتحة) — بتتطلب في أغلب إصدارات الكارنيه.</li>
   <li>الاستمارة أو النموذج المطلوب من المكتب (بتتاخد من الشباك نفسه، مش محتاج تحمّلها).</li>
   <li>إيصال الرسوم — لو فئتك بتدفع رسوم إصدار.</li>
  </ul>
  <p>وزيادة حسب الحالة:</p>
  <ul>
   <li><strong>زوجة/ابن:</strong> وثيقة تثبت التبعية (قيد عائلي أو ما يعادله).</li>
   <li><strong>مولود جديد:</strong> شهادة الميلاد المميكنة.</li>
   <li><strong>معاش:</strong> بيان أو مستند من التأمينات يوضح سريان المعاش.</li>
   <li><strong>طالب:</strong> إثبات قيد من المدرسة أو الجامعة.</li>
  </ul>

  <h2>٣. الخطوات بالترتيب</h2>
  <ol>
   <li><strong>استعلام سريع:</strong> تأكد إن اسمك ورقمك القومي مسجلين صح في السجلات. <a href="../services/insurance-number-inquiry.html">الاستعلام عن الرقم التأميني من هنا</a>.</li>
   <li><strong>حدد أقرب مكتب:</strong> استخدم <a href="../offices.html">دليل المكاتب (٨٨٨ مكتب)</a> عشان تروح مكان قريب منك.</li>
   <li><strong>خد مواعيد العمل:</strong> أغلب المكاتب الحكومية بتبدأ صباحًا، والذهاب بدري بيوفر ساعة انتظار.</li>
   <li><strong>قدّم الطلب:</strong> الاستمارة + الورق + الصور + الرسوم.</li>
   <li><strong>استلم إيصال الاستلام:</strong> خده معاك، هو إثباتك لو تأخرت البطاقة.</li>
   <li><strong>حدّث بياناتك بعد الاستلام:</strong> لو في أي خطأ في الاسم أو تاريخ الميلاد، صححه فورًا قبل ما تحتاج علاج.</li>
  </ol>

  <h2>٤. بدل فاقد ولا بدل تالف؟</h2>
  <p>الفرق مش شكلي بس — بيأثر على الورق اللي هتقدمه:</p>
  <ul>
   <li><strong>بدل فاقد:</strong> لازم محضر أو إقرار فقدان حسب الجهة، وبعض الجهات بتطلب إثبات إنك بلّغت.</li>
   <li><strong>بدل تالف:</strong> بترجّع الكارنيه التالف نفسه مع الطلب، وده بيبسّط الإجراء غالبًا.</li>
   <li><strong>تجديد:</strong> بيتعمل قبل الانتهاء، والتأخير ممكن يخليك تدفع كأنه إصدار جديد.</li>
  </ul>

  <h2>٥. حاجات بتقصّر المشوار</h2>
  <ul>
   <li>صوّر كل الأوراق نسختين قبل ما تنزل.</li>
   <li>اتأكد إن الرقم القومي مش منتهي — بطاقة منتهية بتوقف الإجراء.</li>
   <li>لو هتسجل أسرة، خد شهادات الميلاد كلها معاك مرة واحدة بدل مشوار لكل طفل.</li>
   <li>احتفظ بصورة من إيصال الاستلام على الموبايل.</li>
  </ul>

  <h2>٦. أسئلة شائعة</h2>
  <div class="faq"><h3>هل أقدر أستخرجها أونلاين؟</h3><p>بعض الخدمات المرتبطة بالتأمين الصحي متاحة على بوابة مصر الرقمية، لكن إصدار الكارنيه نفسه غالبًا بيحتاج حضور شخصي للتصوير والتوقيع. راجع صفحة الخدمة قبل ما تعتمد على الأونلاين.</p></div>
  <div class="faq"><h3>الرسوم كام؟</h3><p>بتختلف حسب الفئة ونوع الطلب (إصدار/بدل فاقد/تجديد). استخدم الحاسبة في <a href="../services/health-insurance-card.html">صفحة استخراج البطاقة</a> كتقدير، والرقم النهائي عند الشباك.</p></div>
  <div class="faq"><h3>أنا مسجل في الشامل، محتاج كارنيه ورقي؟</h3><p>كتير من الخدمات بتتم بالرقم القومي، لكن بعض الجهات لسه بتطلب إثبات. اسأل وحدتك — هي المرجع الأدق.</p></div>

  <div class="note">📌 المعلومات استرشادية وللتنظيم، وقد تتغير الإجراءات والرسوم بقرارات الجهات المختصة. المرجع النهائي دائمًا هو المكتب الرسمي.</div>
"""
CARD_LINKS = [
    ("../services/health-insurance-card.html", "استخراج بطاقة تأمين صحي — الدليل الكامل"),
    ("../services/insurance-number-inquiry.html", "الاستعلام عن الرقم التأميني"),
    ("../services/health-insurance.html", "تسجيل الأسرة في التأمين الصحي الشامل"),
    ("../services/update-insured-data.html", "تعديل بيانات مؤمن عليه"),
    ("../offices.html", "دليل ٨٨٨ مكتب حكومي"),
]

# ============================== مقال ٣ ==============================
LICENSE_BODY = """
  <p>«رخصة مزاولة النشاط» هي الورقة اللي بتخلي مشروعك موجود قانونيًا: من غيرها المحل شغال، لكن على الورق هو مش شغال — وده بيوقف الحساب البنكي، السجل التجاري، والمناقصات، وبيعرّضك لغرامة أو قرار إغلاق.</p>
  <p>في الدليل ده هنفصل الفرق بين «مزاولة النشاط» و«مزاولة المهنة» (كتير بيلخبطوا بينهم)، وبعدين الأوراق والخطوات بالترتيب.</p>

  <h2>١. الأول: انت محتاج رخصة نشاط ولا رخصة مزاولة مهنة؟</h2>
  <p>ده أهم سؤال، والغلط فيه بيكلف شهور:</p>
  <ul>
   <li><strong>رخصة مزاولة النشاط:</strong> بتخص <em>المكان</em> والنشاط التجاري أو الصناعي أو الخدمي — محل، ورشة، مطعم، مصنع، مكتب. بتصدر من الحي أو المركز التكنولوجي أو الجهاز التابع للمنطقة، وبتحتاج معاينة.</li>
   <li><strong>رخصة مزاولة المهنة:</strong> بتخص <em>الشخص</em> صاحب المهنة — طبيب، مهندس، محامي، صيدلي. بتيجي من النقابة (قيد + كارنيه)، وترخيص المهن الطبية له مسار مستقل. <a href="../services/profession-license.html">تفاصيلها في الدليل المخصص هنا</a>.</li>
  </ul>
  <p>أغلب المشاريع الصغيرة محتاجة <strong>الاتنين</strong> لو صاحبها بيمارس مهنة منظمة بنقابة + مكان تجاري.</p>

  <h2>٢. الشروط الأساسية قبل ما تبدأ</h2>
  <ul>
   <li><strong>مطابقة المكان للاشتراطات:</strong> نوع النشاط لازم يكون مسموح في العقار والمنطقة (سكني/تجاري/صناعي)، والمساحة تسمح بالنشاط.</li>
   <li><strong>وجود سند قانوني للمكان:</strong> عقد إيجار موثّق أو ملكية.</li>
   <li><strong>الموقف الضريبي والتأميني:</strong> بطاقة ضريبية وسجل تجاري قبل أو بالتوازي مع الترخيص حسب الحالة.</li>
   <li><strong>الحماية المدنية:</strong> وسائل إطفاء وإنذار ومخارج طوارئ تتناسب مع النشاط — دي أشهر نقطة بتفشل فيها المعاينة.</li>
   <li><strong>موافقات نوعية:</strong> الصحة للمطاعم، البيئة للمصانع والورش، التموين للأنشطة الغذائية، وغيرها حسب النشاط.</li>
  </ul>

  <h2>٣. المستندات المعتادة</h2>
  <ul>
   <li>صورة بطاقة الرقم القومي للمالك (مع الأصل للاطّلاع).</li>
   <li>عقد إيجار/تمليك المكان موثّق أو مثبت التاريخ.</li>
   <li>السجل التجاري والبطاقة الضريبية (للشركات: عقد التأسيس وأوراق الكيان).</li>
   <li>رسم هندسي/كروكي معتمد للمكان يوضح الأبعاد والمداخل والمخارج.</li>
   <li>شهادة أو تقرير الحماية المدنية عن وسائل الإطفاء.</li>
   <li>موافقات الجهات النوعية (صحة/بيئة/تموين) لو النشاط بيطلبها.</li>
   <li>إيصال سداد رسوم المعاينة.</li>
  </ul>
  <div class="note">قائمة الورق بتختلف من حي لحي ومن نشاط لنشاط. اسأل مكتبك عن «قائمة مستندات النشاط» قبل ما تجمع — بتوفر عليك رجوع كتير.</div>

  <h2>٤. الخطوات عمليًا</h2>
  <ol>
   <li><strong>تأكد من اشتراطات النشاط في المنطقة</strong> قبل توقيع الإيجار — أرخص خطوة وأهمها.</li>
   <li><strong>استخرج/حدّث السجل التجاري والبطاقة الضريبية.</strong> <a href="../services/renew-commercial-register.html">دليل تحديث السجل التجاري هنا</a>.</li>
   <li><strong>روح المركز التكنولوجي التابع للمنطقة</strong> وقدّم طلب الترخيص بالورق.</li>
   <li><strong>سدّد رسوم المعاينة</strong> وخد إيصال.</li>
   <li><strong>استنى لجنة المعاينة</strong> (هندسي + إشراف + إطفاء حسب النشاط).</li>
   <li><strong>صلّح الملاحظات فورًا</strong> لو اللجنة طلعت حاجات ناقصة، واطلب إعادة معاينة.</li>
   <li><strong>سدّد الرسوم النهائية واستلم الرخصة</strong> وعلّقها في مكان ظاهر.</li>
  </ol>

  <h2>٥. أسباب تأخير شائعة (ومعالجتها)</h2>
  <ul>
   <li><strong>وسائل إطفاء ناقصة أو منتهية:</strong> راجعها قبل المعاينة بيوم.</li>
   <li><strong>كروكي غير معتمد:</strong> لازم مهندس نقابي معتمد.</li>
   <li><strong>نشاط غير مسموح في العقار:</strong> الحل تغيير المكان أو النشاط، مش «تدبّرها».</li>
   <li><strong>عقد إيجار غير موثّق:</strong> وثّقه من الشهر العقاري من البداية.</li>
   <li><strong>اسم النشاط مش مطابق للسجل:</strong> لازم يتطابق حرفيًا.</li>
  </ul>

  <h2>٦. أسئلة شائعة</h2>
  <div class="faq"><h3>هل أقدر أبدأ النشاط قبل الرخصة؟</h3><p>قانونًا لأ. التشغيل قبل الترخيص بيعرّضك لغرامة وإغلاق إداري، وممكن يوقف إجراءاتك نفسها.</p></div>
  <div class="faq"><h3>الرخصة ليها مدة صلاحية؟</h3><p>أيوه، وبتتجدد. تاريخ الانتهاء مدوّن على الرخصة نفسها — حطّه في تقويمك قبلها بشهر.</p></div>
  <div class="faq"><h3>شركة مش محل، محتاجة نفس الترخيص؟</h3><p>الكيان التجاري بيبدأ بالسجل التجاري، وبيحتاج ترخيص للمقر أو النشاط حسب نوعه. <a href="../services/company-formation.html">دليل تأسيس الشركات هنا</a>.</p></div>

  <div class="note">📌 ده دليل تنظيمي عام، وليس استشارة قانونية. تفاصيل كل حالة بتحددها الجهة المرخصة المختصة.</div>
"""
LICENSE_LINKS = [
    ("../services/renew-commercial-register.html", "تحديث السجل التجاري"),
    ("../services/company-formation.html", "تأسيس شركة — الدليل الكامل"),
    ("../services/profession-license.html", "رخصة مزاولة المهنة (نقابة)"),
    ("../offices.html", "دليل المراكز التكنولوجية والمكاتب"),
]

# ============================== مقال ٤ ==============================
INQUIRY_BODY = """
  <p>«أنا مؤمن عليّا ولا لأ؟» — السؤال ده بيتكرر قبل المعاش، قبل التعيين، قبل تحويل مبلغ، وقبل أي مطالبة. والحلو إن الاستعلام بقى أسهل من الأول، وأغلب المشكلة إن الناس بتدور في المكان الغلط.</p>
  <p>هنا هنفصل أنواع الاستعلام، واللي محتاجه معاك، وإزاي تقرأ النتيجة صح.</p>

  <h2>١. انت عايز تستعلم عن إيه بالظبط؟</h2>
  <p>كلمة «تأمينات» بتتقال على أكتر من خدمة، والفرق بينهم مهم:</p>
  <ul>
   <li><strong>الرقم التأميني:</strong> رقمك الثابت في سجلات التأمين الاجتماعي، وأساس أي استعلام بعد كده.</li>
   <li><strong>المدة التأمينية / تاريخ الاشتراك:</strong> الفترات اللي اتسددت فيها اشتراكات، ودول اللي بيحسبوا المعاش.</li>
   <li><strong>الموقف التأميني الحالي:</strong> مؤمن عليك من جهة عمل ولا موقوف ولا غير مسجل.</li>
   <li><strong>التأمين الصحي:</strong> ده نظام منفصل نسبيًا عن التأمين الاجتماعي، وليه استعلامه الخاص.</li>
  </ul>
  <p>لو مش عارف تبدأ منين: ابدأ بالرقم التأميني، وبعدين المدة التأمينية.</p>

  <h2>٢. اللي محتاجه معاك</h2>
  <ul>
   <li><strong>الرقم القومي</strong> — هو المفتاح، ومفيش استعلام بالاسم.</li>
   <li>رقم موبايل مسجل باسمك لو الخدمة بتطلب تحقق OTP.</li>
   <li>تاريخ الميلاد ومحل الإقامة للسجلات القديمة اللي لسه بتتحقق يدويًا.</li>
   <li>اسم جهة العمل وسنة بداية الاشتراك — بيسرّعوا البحث في المكاتب.</li>
  </ul>

  <h2>٣. الطرق المتاحة للاستعلام</h2>
  <ol>
   <li><strong>أونلاين:</strong> خدمات الاستعلام الرقمية للهيئة القومية للتأمين الاجتماعي بتتيح لك معرفة الرقم التأميني وبعض البيانات الأساسية. <a href="../services/insurance-number-inquiry.html">الخطوات كاملة هنا</a>.</li>
   <li><strong>بوابة مصر الرقمية:</strong> بتربط أكتر من خدمة حكومية برقمك القومي، ومفيدة لو بياناتك محدّثة.</li>
   <li><strong>المكتب/الفرع:</strong> الطريقة الأدق في الحالات المعقدة (اشتراكات قديمة، فترات غير مسجلة، اسم مختلف). <a href="../offices.html">أقرب مكتب من دليلنا</a>.</li>
   <li><strong>جهة العمل:</strong> لو انت موظف، إدارة الموارد البشرية عندها كشف الاشتراكات الشهري — أسرع من أي مكان.</li>
  </ol>

  <h2>٤. إزاي تقرأ النتيجة صح</h2>
  <ul>
   <li><strong>الرقم التأميني بيظهر فورًا</strong> غالبًا، لكن المدد ممكن تحتاج وقت للتحديث لو الاشتراك اتسدد حديثًا.</li>
   <li><strong>«غير مسجل» مش دايمًا معناه إنك مش مؤمن:</strong> ممكن يكون في اختلاف في كتابة الاسم أو الرقم.</li>
   <li><strong>الفترة الناقصة:</strong> بتظهر لو جهة العمل ما سددتش، أو سددت متأخر. دي مرتبطة بالمطالبة، مش بالاستعلام.</li>
   <li><strong>خد نسخة/سكرين شوت</strong> بالتاريخ — بيفيدك في أي إجراء لاحق.</li>
  </ul>

  <h2>٥. لو لقيت مشكلة، تعمل إيه؟</h2>
  <ol>
   <li><strong>سجّل الفرق بدقة:</strong> (الفترة / اسم جهة العمل / المبلغ) — الشكوى العامة مش بتتحل.</li>
   <li><strong>ابدأ بجهة العمل</strong> لو المشكلة في فترة شغلك الحالية.</li>
   <li><strong>قدّم طلب تصحيح</strong> للمكتب المختص بالمستندات الدالة (كشف اشتراكات، عقد عمل، مفردات مرتب).</li>
   <li><strong>تابع برقم الطلب</strong> — واحتفظ بكل إيصال.</li>
  </ol>
  <div class="note">⚠️ المدد التأمينية بتأثر مباشرة على قيمة المعاش. أي فرق تلاقيه دلوقتي أرخص بكتير من اكتشافه وقت المعاش.</div>

  <h2>٦. أسئلة شائعة</h2>
  <div class="faq"><h3>هل الاستعلام عليه رسوم؟</h3><p>خدمات الاستعلام الرقمية الأساسية مجانية. الرسوم بتظهر في إصدارات ورقية أو بيانات موثقة، وبتختلف حسب الطلب.</p></div>
  <div class="faq"><h3>أنا مش موظف، عندي اشتراك؟</h3><p>العمالة غير المنتظمة وأصحاب الأعمال ليهم مسارات اشتراك مختلفة. راجع موقفك من المكتب — الأونلاين مش دايمًا بيعرضه.</p></div>
  <div class="faq"><h3>هل الاستعلام ده بيعرفني موقفي من التأمين الصحي؟</h3><p>لأ، التأمين الصحي منظومة منفصلة. <a href="health-insurance-egypt.html">دليل التأمين الصحي هنا</a>.</p></div>

  <div class="note">📌 المعلومات استرشادية، وقد تتغير واجهات الخدمة وخطواتها. المرجع النهائي هو الهيئة القومية للتأمين الاجتماعي.</div>
"""
INQUIRY_LINKS = [
    ("../services/insurance-number-inquiry.html", "الاستعلام عن الرقم التأميني"),
    ("../services/insurance-periods-inquiry.html", "الاستعلام عن المدد التأمينية"),
    ("../services/bank-pension.html", "استخراج معاش من البنك"),
    ("articles/health-insurance-egypt.html", "التأمين الصحي في مصر"),
    ("../offices.html", "دليل ٨٨٨ مكتب حكومي"),
]


PAGES = [
    dict(
        slug="health-insurance-card",
        title="استخراج بطاقة التأمين الصحي: الأوراق والخطوات",
        h1="استخراج بطاقة التأمين الصحي: الأوراق والخطوات",
        crumb="بطاقة التأمين الصحي",
        desc="خطوات استخراج بطاقة التأمين الصحي في مصر: تحديد جهتك، الأوراق المطلوبة لكل فئة، الفرق بين بدل الفاقد والتالف، وأسباب تأخير الإصدار.",
        kw="بطاقة التأمين الصحي, استخراج كارنيه التأمين, بدل فاقد تأمين صحي, أوراق التأمين الصحي, خِدْمَتي AI",
        emoji="🪪",
        lede="من تحديد جهتك الصح لحد استلام الكارنيه — الأوراق المطلوبة لكل فئة، والفرق بين بدل الفاقد والتالف.",
        read="٦",
        body=CARD_BODY,
        links=CARD_LINKS,
    ),
    dict(
        slug="profession-license",
        title="رخصة مزاولة النشاط: الشروط والأوراق والخطوات",
        h1="رخصة مزاولة النشاط: الشروط والأوراق والخطوات",
        crumb="رخصة مزاولة النشاط",
        desc="دليل عملي لاستخراج رخصة مزاولة النشاط في مصر: الفرق بينها وبين رخصة مزاولة المهنة، الشروط، المستندات، خطوات المعاينة، وأسباب التأخير الشائعة.",
        kw="رخصة مزاولة النشاط, ترخيص محل, اشتراطات الحماية المدنية, المركز التكنولوجي, خِدْمَتي AI",
        emoji="🏪",
        lede="الفرق بين ترخيص المكان وترخيص المهنة، والشروط والمستندات وخطوات المعاينة — مرتبة بالترتيب اللي بيوفر وقت.",
        read="٧",
        body=LICENSE_BODY,
        links=LICENSE_LINKS,
    ),
    dict(
        slug="insurance-inquiry",
        title="الاستعلام عن الموقف التأميني بالرقم القومي",
        h1="الاستعلام عن الموقف التأميني بالرقم القومي",
        crumb="الاستعلام التأميني",
        desc="إزاي تستعلم عن رقمك ومددك التأمينية وموقفك الحالي: اللي محتاجه معاك، الطرق المتاحة أونلاين وفي المكتب، وإزاي تقرأ النتيجة وتصحح أي فرق.",
        kw="الاستعلام عن الرقم التأميني, المدة التأمينية, الموقف التأميني, التأمينات الاجتماعية, خِدْمَتي AI",
        emoji="🔎",
        lede="أنواع الاستعلام التأميني، واللي محتاجه معاك، وإزاي تقرأ النتيجة صح وتصحح أي فترة ناقصة.",
        read="٦",
        body=INQUIRY_BODY,
        links=INQUIRY_LINKS,
    ),
]

if __name__ == "__main__":
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    for p in PAGES:
        html = build(
            p["slug"], p["title"], p["desc"], p["kw"], p["h1"],
            p["crumb"], p["emoji"], p["lede"], p["read"], p["body"], p["links"],
        )
        out = os.path.join(base, p["slug"] + ".html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", out, len(html))
