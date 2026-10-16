#!/usr/bin/env node
/* يبني فهرس المقالات التفاعلية من ملفات services/*.html
 * يوحّد التصنيفات المتفرّقة في الـbreadcrumb إلى ١٦ تصنيف_canonical. */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();

// التصنيفات الكنسية (canonical) + خريطة توحيد أسماء الـbreadcrumb
const categories = [
  { id: 'traffic',   name: 'المرور',                 icon: '🚗' },
  { id: 'civil',    name: 'الأحوال المدنية',        icon: '🪪' },
  { id: 'notary',   name: 'الشهر العقاري والتوثيق',  icon: '📄' },
  { id: 'taxes',    name: 'الضرائب',                icon: '💰' },
  { id: 'utilities',name: 'المرافق',                icon: '🏠' },
  { id: 'insurance',name: 'التأمينات والمعاشات',     icon: '👴' },
  { id: 'travel',   name: 'السفر والهجرة',           icon: '✈️' },
  { id: 'health',   name: 'الصحة',                  icon: '🏥' },
  { id: 'post',     name: 'البريد',                 icon: '📮' },
  { id: 'education',name: 'التعليم',                icon: '🎓' },
  { id: 'courts',   name: 'المحاكم',                icon: '⚖️' },
  { id: 'companies',name: 'الشركات والاستثمار',      icon: '🏢' },
  { id: 'work',     name: 'العمل والقوى العاملة',      icon: '💼' },
  { id: 'social',   name: 'التضامن الاجتماعي',        icon: '🤝' },
  { id: 'security', name: 'الأمن والعدالة',           icon: '🛡️' },
  { id: 'housing',  name: 'الإسكان',                icon: '🏗️' },
  { id: 'ip',       name: 'الملكية الفكرية',          icon: '™️' },
];

const normMap = {
  'المرور':'traffic','مرور':'traffic',
  'مدني':'civil','أحوال مدنية':'civil','الأحوال المدنية':'civil',
  'الشهر العقاري':'notary','شهر عقاري':'notary',
  'الضرائب':'taxes','ضرائب':'taxes',
  'المرافق':'utilities','مرافق':'utilities',
  'تأمينات':'insurance','التأمينات':'insurance','التأمينات الاجتماعية':'insurance','العمل والتأمينات':'insurance',
  'السفر والهجرة':'travel','سفر':'travel','سفر وهجرة':'travel',
  'الصحة':'health',
  'البريد':'post',
  'التعليم':'education',
  'المحاكم':'courts',
  'الشركات':'companies','الشركات والاستثمار':'companies','تجاري':'companies',
  'تضامن اجتماعي':'social','التضامن الاجتماعي':'social',
  'أمن وعدالة':'security','أمن':'security',
  'إسكان':'housing',
  'ملكية فكرية':'ip',
};

// تصحيحات يدوية: الـbreadcrumb بتاع الصفحات دي كان مضلّل/مقطّع
const overrides = {
  'labor-card':'work', 'work-certificate':'work', 'profession-license':'work', 'work-permit-foreigners':'work',
  'disability-card':'social', 'consumer-complaint':'social',
  'alimony-custody':'courts', 'inheritance-declaration':'courts',
  'inheritance-distribution':'notary',
};

function catIdFromRaw(raw) {
  const r = (raw || '').trim();
  if (normMap[r]) return normMap[r];
  for (const c of categories) if (r.includes(c.name)) return c.id;
  return 'other';
}

const articles = [];

for (const f of files) {
  const slug = f.replace(/\.html$/, '');
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  // العنوان من <title> (الجزء قبل |)
  let title = slug;
  const tm = html.match(/<title>([\s\S]*?)<\/title>/);
  if (tm) title = tm[1].split('|')[0].trim();
  // التصنيف من breadcrumb (آخر عنصر بعد ›)
  let cat = 'other';
  const bc = html.match(/<div class="breadcrumb">([\s\S]*?)<\/div>/);
  if (bc) {
    const last = bc[1].split('›').pop().replace(/<[^>]*>/g, '').trim();
    cat = catIdFromRaw(last);
  }
  if (cat === 'other') {
    const km = html.match(/<meta name="keywords" content="([^"]*)"/);
    cat = catIdFromRaw((km ? km[1] : '') + ' ' + title);
  }
  if (overrides[slug]) cat = overrides[slug];
  // الإيموجي من <div class="hero-emoji">XX</div>
  let icon = '';
  const em = html.match(/<div class="hero-emoji">([^<]+)<\/div>/);
  if (em) icon = em[1].trim();
  if (!icon) { const c = categories.find(c => c.id === cat); icon = c ? c.icon : '📋'; }

  // وصف مختصر من meta description (نظّف ونحته لحد ~120 حرف للكارت)
  let desc = '';
  const dm = html.match(/<meta name="description" content="([^"]*)"/);
  if (dm) desc = dm[1].replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (desc.length > 120) desc = desc.slice(0, 117).trim() + '…';

  articles.push({ slug, title, cat, icon, desc });
}

// رتّب التصنيفات حسب ترتيب الكنسي واشتغل اللي ليها مقالات بس
const usedCats = [...new Set(articles.map(a => a.cat))];
const catsOut = categories.filter(c => usedCats.includes(c.id));
const catOrder = {};
categories.forEach((c, i) => catOrder[c.id] = i);
articles.sort((a, b) => (catOrder[a.cat] ?? 99) - (catOrder[b.cat] ?? 99) || a.title.localeCompare(b.title, 'ar'));

const out = `/* مُولّد تلقائيًا من tools/gen-articles-index.cjs — لا تعدّل يدويًا */
const interactiveCategories = ${JSON.stringify(catsOut, null, 2)};
const interactiveArticles = ${JSON.stringify(articles, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'interactive-articles.js'), out, 'utf8');

// ── توليد articles.html ثابت (static) من البيانات ──
function toArabicNum(n){return String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d]);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

const byCatList = {};
articles.forEach(a => (byCatList[a.cat] = byCatList[a.cat] || []).push(a));

const sectionsHtml = catsOut.map(cat => {
  const arts = byCatList[cat.id] || [];
  if (!arts.length) return '';
  const cards = arts.map(a => {
    const q = esc((a.title + ' ' + a.desc + ' ' + cat.name).toLowerCase());
    return `    <a href="services/${esc(a.slug)}.html" class="article-card" data-q="${q}">
      <div class="article-icon">${esc(a.icon)}</div>
      <span class="article-cat">${esc(cat.name)}</span>
      <h3 class="article-title">${esc(a.title)}</h3>
      <p class="article-excerpt">${esc(a.desc)}</p>
      <span class="article-readtime">افتح الدليل التفاعلي ←</span>
    </a>`;
  }).join('\n');
  return `  <section class="cat-section" data-cat="${esc(cat.id)}">
    <h2 class="cat-title"><span class="cat-emoji">${esc(cat.icon)}</span> ${esc(cat.name)} <span class="cat-count">${toArabicNum(arts.length)} دليل</span></h2>
    <div class="articles-grid">
${cards}
    </div>
  </section>`;
}).join('\n');

const htmlDoc = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>دليلك المصري — ١٠٠ دليل تفاعلي | خِدْمَتي AI</title>
<meta name="description" content="١٠٠ دليل تفاعلي للخدمات الحكومية في مصر — كل دليل فيه حاسبة رسوم وتبويب خطوات ومصادر رسمية: المرور، الأحوال المدنية، الضرائب، التأمينات، الشهر العقاري، السفر وأكثر.">
<meta name="keywords" content="خدمات حكومية, مصر, دليل تفاعلي, حاسبة رسوم, مرور, أحوال مدنية, ضرائب, تأمينات, خِدْمَتي, khidmaty">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="src/styles/main.css">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:18px}
.header-logo{display:flex;align-items:center;gap:10px}
.header-logo img{width:36px;height:36px;border-radius:8px}
.header-logo span{color:#fff;font-weight:900;font-size:18px}
.header-logo .ai{color:#e6c258}
.articles-hero{text-align:center;padding:50px 20px 26px}
.articles-hero h1{font-size:28px;font-weight:900;color:#fff;margin:0 0 10px}
.articles-hero p{font-size:15px;color:#8ea0c4;margin:0 auto 18px;max-width:640px;line-height:1.6}
.search-box{max-width:520px;margin:0 auto;position:relative}
.search-box input{width:100%;background:#162847;border:1px solid #1e3556;color:#fff;padding:14px 18px;border-radius:30px;font-size:15px;font-family:Cairo,sans-serif;outline:none;transition:.2s}
.search-box input:focus{border-color:#e6c258;box-shadow:0 0 0 3px rgba(230,194,88,.12)}
.search-count{display:block;text-align:center;font-size:13px;color:#5a6a8a;margin-top:10px;min-height:18px}
.articles-wrap{max-width:1100px;margin:0 auto 60px;padding:0 20px}
.cat-section{margin-bottom:34px}
.cat-title{font-size:20px;font-weight:900;color:#fff;margin:0 0 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1e3556;padding-bottom:12px}
.cat-emoji{font-size:26px}
.cat-count{font-size:13px;color:#e6c258;font-weight:700;background:rgba(230,194,88,.1);padding:4px 12px;border-radius:20px;margin-right:auto}
.articles-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}
.article-card{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:10px;text-decoration:none;color:inherit;transition:all .3s ease}
.article-card:hover{transform:translateY(-4px);border-color:#e6c258;box-shadow:0 12px 30px rgba(230,194,88,.15)}
.article-icon{font-size:30px}
.article-cat{color:#e6c258;font-size:12px;font-weight:700;background:rgba(230,194,88,.1);padding:4px 12px;border-radius:20px;display:inline-block;width:fit-content}
.article-title{font-size:17px;font-weight:800;color:#fff;margin:0;line-height:1.4}
.article-excerpt{font-size:13.5px;color:#8ea0c4;margin:0;line-height:1.5;flex:1}
.article-readtime{font-size:13px;color:#e6c258;font-weight:700;margin-top:4px}
.cat-section.hidden,.article-card.hidden{display:none}
.footer{text-align:center;padding:30px 20px;color:#5a6a8a;font-size:13px}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
@media(max-width:600px){.articles-grid{grid-template-columns:1fr}}
</style>
<link rel="canonical" href="https://khidmatyai.com/articles.html">
<meta property="og:title" content="دليلك المصري — ١٠٠ دليل تفاعلي | خِدْمَتي AI">
<meta property="og:description" content="١٠٠ دليل تفاعلي للخدمات الحكومية في مصر — حاسبة رسوم وتبويب خطوات ومصادر رسمية لكل خدمة.">
<meta property="og:url" content="https://khidmatyai.com/articles.html">
<meta property="og:type" content="website">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:image" content="https://khidmatyai.com/assets/og-banner.png">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="دليلك المصري — ١٠٠ دليل تفاعلي | خِدْمَتي AI">
<meta name="twitter:description" content="١٠٠ دليل تفاعلي للخدمات الحكومية في مصر — حاسبة رسوم وتبويب خطوات ومصادر رسمية لكل خدمة.">
<meta name="twitter:image" content="https://khidmatyai.com/assets/og-banner.png">
</head>
<body>

<div class="header">
  <a href="index.html">← الرجوع للرئيسية</a> | <a href="services.html">التصنيفات</a>
  <div class="header-logo">
    <img src="assets/k-logo.webp" alt="خِدْمَتي AI">
    <span>خِدْمَتي <span class="ai">AI</span></span>
  </div>
</div>

<div class="articles-hero">
  <h1>📖 دليلك المصري</h1>
  <p>١٠٠ دليل تفاعلي لكل الخدمات الحكومية — كل دليل فيه <strong style="color:#e6c258">حاسبة رسوم</strong> و<strong style="color:#e6c258">تبويب خطوات</strong> و<strong style="color:#e6c258">مصادر رسمية</strong></p>
  <div class="search-box">
    <input type="search" id="articlesSearch" placeholder="🔍 اكتب اسم الخدمة أو الكلمة المفتاحية..." aria-label="بحث في الأدلة" autocomplete="off">
    <span class="search-count" id="searchCount"></span>
  </div>
</div>

<div class="articles-wrap" id="articlesWrap">
${sectionsHtml}
</div>

<noscript><div style="text-align:center;padding:30px;color:#8ea0c4">لتفعيل البحث فعّل JavaScript، أو تصفّح <a href="services.html" style="color:#e6c258">كل الخدمات بالتصنيفات</a></div></noscript>

<div dir="rtl" style="display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;padding:26px 16px 6px;max-width:900px;margin:0 auto;font-family:Cairo,sans-serif">
  <span style="font-size:13px;color:#8ea0c4;font-weight:700">تابعنا 👇</span>
  <a href="https://t.me/khdmatyai" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#162847;border:1px solid #229ED9;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;text-decoration:none">✈️ تيلجرام</a>
  <a href="https://youtube.com/@khidmatyai" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#162847;border:1px solid #ff0000;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;text-decoration:none">▶️ يوتيوب</a>
  <a href="https://whatsapp.com/channel/0029VbDZ5aV0LKZ80aqwqD29" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#162847;border:1px solid #25D366;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;text-decoration:none">📲 واتساب</a>
  <a href="https://t.me/+ZYqNnOv8dy5kODU0" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#162847;border:1px solid #229ED9;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;text-decoration:none">👥 الجروب</a>
</div>
<div class="footer">
  <p>© 2026 خِدْمَتي AI | <a href="index.html">العودة للرئيسية</a> | <a href="services.html">الخدمات</a> | <a href="calc.html">حاسبة الرسوم</a> | <a href="faq.html">الأسئلة الشائعة</a></p>
</div>

<script>
// فلتر بحث تقدّمي (progressive enhancement) — الكروت ثابتة تظهر بدون JS
(function(){
  var input=document.getElementById('articlesSearch');
  var countEl=document.getElementById('searchCount');
  var wrap=document.getElementById('articlesWrap');
  var sections=Array.prototype.slice.call(wrap.querySelectorAll('.cat-section'));
  var allCards=Array.prototype.slice.call(wrap.querySelectorAll('.article-card'));
  function norm(s){return (s||'').trim().toLowerCase();}
  function filter(q){
    q=norm(q); var shown=0;
    sections.forEach(function(sec){
      var cards=Array.prototype.slice.call(sec.querySelectorAll('.article-card'));
      var vis=0;
      cards.forEach(function(c){
        var match=!q||norm(c.getAttribute('data-q')).indexOf(q)!==-1;
        c.classList.toggle('hidden',!match);
        if(match)vis++;
      });
      sec.classList.toggle('hidden',vis===0);
      shown+=vis;
    });
    if(countEl){
      if(!q)countEl.textContent='';
      else countEl.textContent=shown>0?('ظهر '+shown+' دليل'):('مفيش نتائج لـ "'+q+'"');
    }
  }
  input.addEventListener('input',function(){filter(input.value);});
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, '..', 'articles.html'), htmlDoc, 'utf8');

console.log('إجمالي المقالات التفاعلية:', articles.length);
console.log('عدد التصنيفات:', catsOut.length);
console.log('بالتوزيع:');
const byCat = {};
articles.forEach(a => byCat[a.cat] = (byCat[a.cat] || 0) + 1);
catsOut.forEach(c => console.log('  ' + c.icon + ' ' + c.name + ': ' + byCat[c.id]));
if (byCat.other) console.log('  ⚠️ غير مصنف: ' + byCat.other);
