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

console.log('إجمالي المقالات التفاعلية:', articles.length);
console.log('عدد التصنيفات:', catsOut.length);
console.log('بالتوزيع:');
const byCat = {};
articles.forEach(a => byCat[a.cat] = (byCat[a.cat] || 0) + 1);
catsOut.forEach(c => console.log('  ' + c.icon + ' ' + c.name + ': ' + byCat[c.id]));
if (byCat.other) console.log('  ⚠️ غير مصنف: ' + byCat.other);
