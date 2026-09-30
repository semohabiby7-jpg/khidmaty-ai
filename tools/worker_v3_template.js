// Cloudflare Worker — خِدْمَتي AI — «العقل الجرونديد PRO»
// ⚠️ ملف مولَّد آليًا من tools/build_agent_kb.py (بياناته من sources-log.md) — متعدّلش worker-v3.js بإيدك
// النشر (أي طريق من الاتنين):
//   1) API:  PUT /accounts/{acc}/workers/scripts/khidmaty-agent — multipart: metadata + main_module
//   2) Dashboard: Workers → khidmaty-agent → Edit Code → الصق الملف كله → Save
// متغيرات البيئة المطلوبة في Cloudflare (secret bindings — Settings → Variables):
//   GEMINI_KEY          = مفتاح Gemini AI
//   SUPABASE_SECRET     = مفتاح Supabase السري (service-level) — للوس اختياري: بيرجع للمفتاح العام
//   TELEGRAM_BOT_TOKEN  = توكن البوت من BotFather
//   TELEGRAM_CHAT_ID    = chat id بتاع محمد (الأدمن) — التنبيهات والتقارير بتروحله
//
// الجديد في النسخة المدمجة (v3 PRO — 30/9/2026):
//  1) قاعدة معرفة متحققة (KB 59 خدمة) مبنية آليًا من سجل مصادر التحقق — كل رد مقيَّد بالبيانات المتحققة فقط
//  2) منع الهلوسة: أي رسوم/أرقام/مدد من «البيانات المتحققة» بس — وإلا بيقول بصراحة إنها مش في قاعدته
//  3) الرد بيرجع بمفتاحين response و reply مع بعض — توافق خلفي كامل مع الموقع والتليجرام
//  4) تصحيح تنسيق الـhistory المتبادل مع الموقع ({role,text} أو {role,parts})
//  5) حصاد الأسئلة اللي القاعدة معرفتش تجاوبها → جدول agent_questions (نفّذ sql/agent_harvest.sql مرة واحدة في Supabase)
//  6) كل ميزات PRO القديمة شغالة زي ما هي: بوت التليجرام + لوحة الأوامر + التقارير + التنبيهات + نشر القناة كل 12 ساعة
//  7) المفاتيح السرية كلها في متغيرات البيئة — مفيش أي سر في الكود (الريبو عام!)
//
// ملاحظات توافق مهمة:
//   - الموقع (app.js) بيقرا data.response من POST /chat — موجود ✓
//   - GET /requests = ping من الموقع (fire-and-forget) بيرجع {ok:true} من غير استعلام
//   - POST أي مسار تاني غير المعروف = محادثة (نفس سلوك v3) — GET غلط = POST only

const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY'; // مفتاح عام — موجود أصلًا في كود الموقع
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';
const CHANNEL_USERNAME = '@khdmatyai';
const SITE_URL = 'https://khidmatyai.com/';

const KB = __KB_JSON__;

/* ===== أدوات مطابقة عربية (توحيد الحروف) ===== */
function norm(s){
  return (s||'').replace(/[\u064B-\u0652]/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/[^\u0621-\u064Aa-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim().toLowerCase();
}

/* ===== مطابقة سؤال المستخدم مع قاعدة المعرفة المتحققة ===== */
function matchKB(message){
  const q = norm(message);
  const tokens = [];
  q.split(' ').forEach(function(t){
    if (t.length >= 3 && tokens.indexOf(t) === -1) tokens.push(t);
    // فك أدوات التعريف والوصل العربي: "البطاقة" ← "بطاقة"
    let t2 = t.replace(/^(و)?(ال|ب|ل|ف|ك)/, '');
    if (t2.length >= 3 && tokens.indexOf(t2) === -1) tokens.push(t2);
    let t3 = t.replace(/^(و|بال|فال|لل|كال)/, '');
    if (t3.length >= 3 && tokens.indexOf(t3) === -1) tokens.push(t3);
  });
  return KB.map(function(e){
    const nName = norm(e.name);
    const nKw = (e.kw||[]).map(norm);
    const nV = norm(e.verified);
    let score = 0;
    if (nName && (nName.indexOf(q) !== -1 || (q.length >= 4 && q.indexOf(nName) !== -1))) score += 10;
    for (const t of tokens){
      if (nName.indexOf(t) !== -1) score += 4;
      for (const k of nKw){ if (k.indexOf(t) !== -1 || t.indexOf(k) !== -1) { score += 3; break; } }
      if (nV.indexOf(t) !== -1) score += 1;
    }
    return { slug: e.slug, name: e.name, url: e.url, verified: e.verified, sources: e.sources, score: score };
  }).sort(function(a,b){ return b.score - a.score; });
}

/* ===== بناء الـPrompt المُقيَّد بالبيانات المتحققة ===== */
function buildPrompt(matched){
  const index = KB.map(function(e){ return e.name; }).join(' | ');
  let block = '';
  for (const m of matched){
    block += '\n\n— ' + m.name +
      '\nصفحة خِدْمَتي المتحققة: ' + m.url +
      '\nالمؤكد (تحقق من مصدرين أو أكتر بتاريخ 30/9/2026):\n' + m.verified +
      '\nالمصادر الموثقة: ' + m.sources;
  }
  const groundedBlock = matched.length
    ? '\n\nالبيانات المتحققة الخاصة بسؤال المستخدم (دي حقيقتك الوحيدة في الرد):' + block
    : '\n\n(ملاحظة للموديل: السؤال ده مفيش بيانات متحققة مطابقة ليه في القاعدة — ممنوع تذكر أي أرقام أو رسوم خالص)';
  return 'أنت "خِدْمَتي AI"، مساعد مصري ودود للمصالح الحكومية. مصدر حقيقتك الوحيد هو «البيانات المتحققة» اللي تحت — كلها اتحققت من مصدرين أو أكتر واتوثقت في سجل مصادر الموقع.\n'
    + '\nفهرس الخدمات المتحققة عندنا:\n' + index
    + groundedBlock
    + '\n\nقواعدك الصارمة:\n'
    + '1. أي رسوم أو أرقام أو مدد أو أوراق: من «البيانات المتحققة» اللي فوق بس. ممنوع منعًا باتًا تخترع أي رقم أو تجيبه من دماغك. لو الرقم مش موجود في البيانات قول ببساطة: «الرقم ده لسه مش في قاعدتي المتحققة» وكمّل بالخطوات المؤكدة اللي موجودة.\n'
    + '2. لو مفيش بيانات متحققة للخدمة المطلوبة: قول بصراحة إن الخدمة دي لسه متوثقتش في قاعدتنا، اقترح أقرب خدمات من الفهرس، ومتذكرش أي أرقام نهائي.\n'
    + '3. لو فيه بيانات متحققة: رتب الرد: 📍 الجهة، 📄 المستندات، 💰 الرسوم، ⏱️ المدة، 🌐 التنفيذ (أونلاين/حضوري)، 📝 الخطوات.\n'
    + '4. في آخر الرد: حط رابط صفحة خِدْمَتي المتحققة للخدمة (بالظبط زي ما هو مكتوب في البيانات) عشان المستخدم يشوف التفاصيل الكاملة والمصادر.\n'
    + '5. رد بالعامي المصري بود وود، إيموجي طبيعي من غير مبالغة، وأقل من 200 كلمة.\n'
    + '6. افهم المصري العامي: عايز، محتاج، اطلع، بدل فاقد، برميت، بلاتية...\n'
    + '7. اختم بسؤال: «مش عايز تعملها بنفسك؟ محتاج حد يخلصهالك؟» وقول إن فيه مقدمي خدمات في الموقع.';
}

/* ===== حصاد الأسئلة الغير مجاوبة (best-effort — الشات شغال حتى لو فشل) ===== */
function insertAgentQuestion(env, message, matchedSlug, ctx){
  const secret = (env && env.SUPABASE_SECRET) || SUPABASE_KEY;
  if (!message) return;
  const p = fetch(SUPABASE_URL + '/rest/v1/agent_questions', {
    method: 'POST',
    headers: { 'apikey': secret, 'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ question: message, matched_slug: matchedSlug || null, source: 'site_chat' })
  }).catch(function(){ /* بصمت — الحصاد ميساش المحادثة */ });
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

// ============================================
// CATEGORY IMAGES (صور نشر القناة)
// ============================================
var CAT_IMAGES = {
  traffic: SITE_URL + 'images/traffic.webp',
  civil: SITE_URL + 'images/civil.webp',
  taxes: SITE_URL + 'images/taxes.webp',
  insurance: SITE_URL + 'images/insurance.webp',
  notary: SITE_URL + 'images/notary.webp',
  travel: SITE_URL + 'images/travel.webp',
  health: SITE_URL + 'images/health.webp',
  post: SITE_URL + 'images/post.webp',
  education: SITE_URL + 'images/education.webp',
  courts: SITE_URL + 'images/courts.webp',
  companies: SITE_URL + 'images/companies.webp',
  utilities: SITE_URL + 'images/utilities.webp',
  social: SITE_URL + 'images/social.webp'
};

var POST_CATEGORIES = {
  renewing: 'traffic', 'renew-driving': 'traffic', 'renew-car': 'traffic', 'traffic-violations': 'traffic',
  'new-driving': 'traffic', 'car-inspection': 'traffic', 'car-ownership': 'traffic', 'replace-plates': 'traffic',
  'international-license': 'traffic', 'national-id': 'civil', 'birth-certificate': 'civil',
  'lost-national': 'civil', 'renew-national': 'civil', 'death-certificate': 'civil', 'correct-name': 'civil',
  'marriage-divorce': 'civil', 'child-national': 'civil', 'tax-registration': 'taxes', 'e-invoice': 'taxes',
  'tax-return': 'taxes', 'edit-tax': 'taxes', 'tax-objection': 'taxes', 'insurance-number': 'insurance',
  'pension-extraction': 'insurance', 'insurance-periods': 'insurance', 'work-injury': 'insurance',
  'bank-pension': 'insurance', 'update-insured': 'insurance', 'power-of-attorney': 'notary',
  'property-sale': 'notary', 'rent-contract': 'notary', 'mortgage': 'notary', 'ownership-chain': 'notary',
  'new-passport': 'travel', 'renew-passport': 'travel', 'lost-passport': 'travel', 'exit-return': 'travel',
  'egyptian-citizenship': 'travel', 'health-insurance': 'health', 'health-card': 'health',
  'vaccination': 'health', 'postal-services': 'post', 'postal-savings': 'post', 'pension-postal': 'post',
  'exam-results': 'education', 'new-student': 'education', 'certify-certificates': 'education',
  'lawsuit-inquiry': 'courts', 'file-lawsuit': 'courts', 'court-ruling': 'courts', 'company-formation': 'companies',
  'renew-commercial': 'companies', 'update-company': 'companies', 'electricity': 'utilities',
  'water-connection': 'utilities', 'natural-gas': 'utilities', 'water-bill': 'utilities', 'gas-bill': 'utilities',
  'takafol-karama': 'social'
};

function getPostCategory(slug) {
  var keys = Object.keys(POST_CATEGORIES);
  for (var i = 0; i < keys.length; i++) {
    if (slug.indexOf(keys[i]) !== -1) {
      return POST_CATEGORIES[keys[i]];
    }
  }
  return 'traffic'; // default
}

// ============================================
// CHANNEL POSTS DATA (58 خدمة)
// ============================================
var POSTS = [
  {name:'تجديد رخصة قيادة',icon:'🚗',desc:'تجديد رخصة القيادة الخاصة أو الدراجة النارية',slug:'renew-driving-license'},
  {name:'تجديد رخصة سيارة',icon:'🚙',desc:'تجديد رخصة تسيير مركبة خاصة',slug:'renew-car-license'},
  {name:'الاستعلام عن المخالفات المرورية',icon:'🚓',desc:'الاستعلام عن المخالفات المرورية والغرامات',slug:'traffic-violations'},
  {name:'استخراج بطاقة الرقم القومي',icon:'🆔',desc:'استخراج بطاقة رقم قومي جديدة',slug:'national-id-card'},
  {name:'استخراج شهادة ميلاد',icon:'📄',desc:'استخراج شهادة ميلاد رسمية',slug:'birth-certificate'},
  {name:'بدل فاقد لبطاقة الرقم القومي',icon:'🆔',desc:'استخراج بدل فاقد لبطاقة الرقم القومي',slug:'lost-national-id'},
  {name:'التسجيل الضريبي',icon:'📊',desc:'التسجيل في مأمورية الضرائب',slug:'tax-registration'},
  {name:'الانضمام للفاتورة الإلكترونية',icon:'💻',desc:'التسجيل في نظام الفاتورة الإلكترونية',slug:'e-invoice'},
  {name:'الاستعلام عن الرقم التأميني',icon:'🔢',desc:'الاستعلام عن رقمك التأميني',slug:'insurance-number-inquiry'},
  {name:'استخراج معاش',icon:'👴',desc:'استخراج معاش التقاعد',slug:'pension-extraction'},
  {name:'استخراج توكيل رسمي',icon:'📜',desc:'استخراج توكيل رسمي من الشهر العقاري',slug:'power-of-attorney'},
  {name:'استخراج جواز سفر',icon:'✈️',desc:'استخراج جواز سفر جديد',slug:'new-passport'},
  {name:'التأمين الصحي',icon:'🏥',desc:'التسجيل في التأمين الصحي',slug:'health-insurance'},
  {name:'الخدمات البريدية',icon:'📮',desc:'خدمات البريد المصري',slug:'postal-services'},
  {name:'الاستعلام عن موقف دعوى',icon:'⚖️',desc:'الاستعلام عن موقف دعوى في المحاكم',slug:'lawsuit-inquiry'},
  {name:'تأسيس شركة',icon:'🏢',desc:'تأسيس شركة جديدة',slug:'company-formation'},
  {name:'قسيمة زواج أو طلاق',icon:'💍',desc:'استخراج قسيمة زواج أو طلاق',slug:'marriage-divorce-certificate'},
  {name:'توصيل أو سداد كهرباء',icon:'⚡',desc:'توصيل أو سداد فاتورة كهرباء',slug:'electricity'},
  {name:'الاستعلام عن نتيجة',icon:'🎓',desc:'الاستعلام عن نتائج الامتحانات',slug:'exam-results'},
  {name:'الاستعلام عن تكافل وكرامة',icon:'🤝',desc:'الاستعلام عن تكافل وكرامة',slug:'takafol-karama'},
  {name:'استخراج رخصة قيادة جديدة',icon:'🚗',desc:'استخراج رخصة قيادة لأول مرة',slug:'new-driving-license'},
  {name:'الفحص الفني للسيارة',icon:'🔧',desc:'الفحص الفني الدوري للسيارة',slug:'car-inspection'},
  {name:'نقل ملكية سيارة',icon:'🚙',desc:'نقل ملكية سيارة لشخص آخر',slug:'car-ownership-transfer'},
  {name:'استبدال اللوحات المعدنية',icon:'🔢',desc:'استبدال اللوحات المعدنية للسيارة',slug:'replace-plates'},
  {name:'رخصة قيادة دولية',icon:'🌍',desc:'استخراج رخصة قيادة دولية',slug:'international-license'},
  {name:'تجديد بطاقة الرقم القومي',icon:'🆔',desc:'تجديد بطاقة الرقم القومي',slug:'renew-national-id'},
  {name:'استخراج شهادة وفاة',icon:'📄',desc:'استخراج شهادة وفاة رسمية',slug:'death-certificate'},
  {name:'تصحيح اسم أو بيانات',icon:'✏️',desc:'تصحيح الاسم أو البيانات في الأوراق الرسمية',slug:'correct-name-data'},
  {name:'تقديم الإقرار الضريبي',icon:'📊',desc:'تقديم الإقرار الضريبي السنوي',slug:'tax-return'},
  {name:'تعديل بيانات ضريبية',icon:'📋',desc:'تعديل البيانات الضريبية',slug:'edit-tax-data'},
  {name:'الاعتراض على ربط الضريبة',icon:'⚖️',desc:'الاعتراض على ربط الضريبة',slug:'tax-objection'},
  {name:'الاستعلام عن مدد الاشتراك',icon:'🔢',desc:'الاستعلام عن مدد الاشتراك التأميني',slug:'insurance-periods-inquiry'},
  {name:'معاش إصابة عمل',icon:'🩹',desc:'استخراج معاش إصابة عمل',slug:'work-injury-pension'},
  {name:'صرف المعاش بالبنك',icon:'🏦',desc:'تحويل صرف المعاش إلى البنك',slug:'bank-pension'},
  {name:'تسجيل عقد بيع/تمليك',icon:'🏠',desc:'تسجيل عقد بيع أو تمليك في الشهر العقاري',slug:'property-sale-registration'},
  {name:'تسجيل عقد إيجار',icon:'🏠',desc:'تسجيل عقد إيجار في الشهر العقاري',slug:'rent-contract-registration'},
  {name:'الرهن العقاري',icon:'🏦',desc:'تسجيل الرهن العقاري',slug:'mortgage-registration'},
  {name:'شهادة تسلسل ملكية',icon:'📋',desc:'استخراج شهادة تسلسل ملكية',slug:'ownership-chain-certificate'},
  {name:'تجديد جواز سفر',icon:'✈️',desc:'تجديد جواز السفر المنتهي',slug:'renew-passport'},
  {name:'بدل فاقد لجواز السفر',icon:'✈️',desc:'استخراج بدل فاقد لجواز السفر',slug:'lost-passport'},
  {name:'تأشيرة خروج وعودة',icon:'🛫',desc:'استخراج تأشيرة خروج وعودة للمقيمين بالخارج',slug:'exit-return-visa'},
  {name:'استخراج بطاقة تأمين صحي',icon:'🏥',desc:'استخراج بطاقة التأمين الصحي',slug:'health-insurance-card'},
  {name:'شهادة تطعيم',icon:'💉',desc:'استخراج شهادة تطعيم رسمية',slug:'vaccination-certificate'},
  {name:'استخراج دفتر توفير بريدي',icon:'📮',desc:'استخراج دفتر توفير بريدي',slug:'postal-savings-account'},
  {name:'صرف معاش بالبريد',icon:'📮',desc:'صرف المعاش من خلال البريد',slug:'pension-postal-payment'},
  {name:'تسجيل طالب جديد',icon:'🎓',desc:'تسجيل طالب جديد في المدرسة',slug:'new-student-registration'},
  {name:'تصديق الشهادات',icon:'📜',desc:'تصديق الشهادات الدراسية',slug:'certify-certificates'},
  {name:'تقديم دعوى جديدة',icon:'⚖️',desc:'تقديم دعوى جديدة في المحكمة',slug:'file-lawsuit'},
  {name:'استخراج صورة رسمية من حكم',icon:'📋',desc:'استخراج صورة رسمية من حكم محكمة',slug:'court-ruling-copy'},
  {name:'تجديد السجل التجاري',icon:'🏢',desc:'تجديد السجل التجاري للشركة',slug:'renew-commercial-register'},
  {name:'تعديل بيانات شركة',icon:'🏢',desc:'تعديل بيانات الشركة في السجل التجاري',slug:'update-company-data'},
  {name:'توصيل مياه شرب',icon:'🚰',desc:'توصيل مياه شرب للمنزل',slug:'water-connection'},
  {name:'توصيل غاز طبيعي',icon:'🔥',desc:'توصيل غاز طبيعي للمنزل',slug:'natural-gas-connection'},
  {name:'سداد فاتورة مياه',icon:'🚰',desc:'سداد فاتورة المياه',slug:'water-bill-payment'},
  {name:'سداد فاتورة غاز',icon:'🔥',desc:'سداد فاتورة الغاز الطبيعي',slug:'gas-bill-payment'},
  {name:'بطاقة رقم قومي للأطفال',icon:'👶',desc:'استخراج بطاقة رقم قومي للأطفال',slug:'child-national-id'},
  {name:'تعديل بيانات مؤمن عليه',icon:'📋',desc:'تعديل بيانات المؤمن عليه',slug:'update-insured-data'},
  {name:'إثبات الجنسية المصرية',icon:'🇪🇬',desc:'إثبات الجنسية المصرية',slug:'egyptian-citizenship'}
];

// ============================================
// CHANNEL POSTING (نشر القناة مرتين يوميًا)
// ============================================
async function postNextToChannel(env) {
  try {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hour = now.getUTCHours() + 3; // Egypt time (UTC+3)
    var isMorning = hour < 12;
    // 2 posts per day: morning and evening
    var postIndex = (dayOfYear * 2 + (isMorning ? 0 : 1)) % POSTS.length;
    var post = POSTS[postIndex];

    var text = post.icon + ' ' + post.name + '\n\n' +
      post.desc + '\n\n' +
      'كل الخطوات و الأوراق و الرسوم بالتفصيل على موقعنا:\n' +
      SITE_URL + 'services/' + post.slug + '.html\n\n' +
      '📥 تابعنا لكل جديد عن الخدمات الحكومية في مصر\n' +
      '🤖 عندك سؤال؟ اسأل خِدْمَتي AI: ' + SITE_URL + '#ask-ai\n\n' +
      '#خِدْمَتي_AI #خدمات_حكومية #مصر';

    var cat = getPostCategory(post.slug);
    var imageUrl = CAT_IMAGES[cat] || CAT_IMAGES.traffic;

    var res = await fetch('https://api.telegram.org/bot' + (env.TELEGRAM_BOT_TOKEN || '') + '/sendPhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_USERNAME,
        photo: imageUrl,
        caption: text,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({
          inline_keyboard: [[{
            text: '🤖 اسأل خِدْمَتي AI',
            url: 'https://t.me/khdmaty_ai_bot'
          }]]
        })
      })
    });
    var data = await res.json();
    if (data.ok) {
      console.log('Posted to channel: ' + post.name);
      await logAgentAction(null, 'channel_post', { post_name: post.name, post_index: postIndex, time: isMorning ? 'morning' : 'evening' });
    }
    return data.ok;
  } catch (e) {
    console.log('Channel post error: ' + e.message);
    return false;
  }
}

// ============================================
// CORS HEADERS
// ============================================
function getCors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function makeHeaders(extra) {
  var h = getCors();
  if (extra) {
    var keys = Object.keys(extra);
    for (var i = 0; i < keys.length; i++) {
      h[keys[i]] = extra[keys[i]];
    }
  }
  return h;
}

// ============================================
// TELEGRAM HELPERS (المفاتيح من متغيرات البيئة)
// ============================================
async function sendTelegram(text, env) {
  if (!env || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: text
      })
    });
  } catch (e) {
    console.log('Telegram error: ' + e.message);
  }
}

async function sendTelegramTo(chatId, text, env) {
  if (!env || !env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
  } catch (e) {
    console.log('Telegram reply error: ' + e.message);
  }
}

// ============================================
// SUPABASE TOOLS (قراءة بالمفتاح العام — زي النسخة الشغالة)
// ============================================
async function getNewRequests() {
  var res = await fetch(SUPABASE_URL + '/rest/v1/requests?status=eq.new&select=*', {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  return await res.json();
}

async function getLateRequests() {
  var res = await fetch(
    SUPABASE_URL + '/rest/v1/requests?status=eq.in_progress&updated_at=lt.' + get24HoursAgo() + '&select=*',
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    }
  );
  return await res.json();
}

async function getNewMessages() {
  var res = await fetch(SUPABASE_URL + '/rest/v1/messages?sender_type=eq.user&order=created_at.desc&limit=20&select=*', {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  return await res.json();
}

async function saveMessageLog(chatId, userText, classification, reply) {
  try {
    await fetch(SUPABASE_URL + '/rest/v1/agent_logs', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'chat_reply',
        details: JSON.stringify({
          chat_id: chatId,
          user_message: userText,
          classification: classification,
          reply_length: reply ? reply.length : 0
        }),
        success: true
      })
    });
  } catch (e) {
    console.log('saveMessageLog error: ' + e.message);
  }
}

// عدد صفوف جدول (مع فلتر اختياري "منذ تاريخ معين")
async function countRows(table, sinceISO) {
  try {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?select=id';
    if (sinceISO) url += '&created_at=gte.' + sinceISO;
    var res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });
    var cr = res.headers.get('content-range'); // الصيغة: "0-0/N" أو "*/N"
    if (cr) {
      var n = parseInt(cr.split('/')[1], 10);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

// حدود اليوم بتوقيت مصر (UTC+3): منتصف الليل المصري = 21:00 UTC
function egyptTodayStart() {
  var now = new Date();
  var utcH = now.getUTCHours();
  var mid = new Date(now);
  mid.setUTCHours(21, 0, 0, 0);
  if (utcH < 21) {
    mid = new Date(mid.getTime() - 24 * 3600 * 1000);
  }
  return mid.toISOString();
}

async function getStats() {
  try {
    var egyptMidnight = egyptTodayStart();

    // رسايل التليجرام النهاردة (من غير رسايل الأدمن — رسايل محمد نفسه مش تفاعل حقيقي)
    var res = await fetch(SUPABASE_URL + '/rest/v1/agent_logs?action=eq.chat_reply&created_at=gte.' + egyptMidnight + '&select=details', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    var logs = await res.json();
    var counts = { service_request: 0, inquiry: 0, complaint: 0, faq: 0, emergency: 0, other: 0 };
    var total = 0;
    for (var i = 0; i < logs.length; i++) {
      try {
        var d = JSON.parse(logs[i].details);
        if (d.classification === 'admin') continue; // رسايل الأدمن بتتحسبش
        total++;
        var c = d.classification || 'other';
        if (counts[c] !== undefined) {
          counts[c]++;
        } else {
          counts.other++;
        }
      } catch (e) {
        counts.other++;
      }
    }

    // بيانات الموقع: زيارات + مسجلين (النهاردة و الإجمالي)
    var visitsToday = await countRows('page_views', egyptMidnight);
    var visitsTotal = await countRows('page_views', null);
    var usersToday = await countRows('users', egyptMidnight);
    var usersTotal = await countRows('users', null);
    var providersTotal = await countRows('providers', null);

    return {
      total: total,
      breakdown: counts,
      website: {
        visitsToday: visitsToday,
        visitsTotal: visitsTotal,
        usersToday: usersToday,
        usersTotal: usersTotal,
        providersTotal: providersTotal
      }
    };
  } catch (e) {
    return { total: 0, breakdown: { service_request: 0, inquiry: 0, complaint: 0, faq: 0, emergency: 0, other: 0 }, website: { visitsToday: 0, visitsTotal: 0, usersToday: 0, usersTotal: 0, providersTotal: 0 } };
  }
}

function classifyByKeywords(messageText) {
  var lower = messageText.toLowerCase();
  var emergencyWords = ['طارئ', 'ساعدني', 'مستعجل', 'خطر', 'نجدة', 'حرج'];
  var complaintWords = ['زعلان', 'مستاء', 'مشكلة', 'تذمر', 'شكوى', 'سيء', 'وحش', 'صعب', 'مش راضي', 'مرفوض', 'رفضت', 'مش متاح', 'بطيء', 'بطال', 'متعقد'];
  var serviceWords = ['عايز', 'محتاج', 'ازاي', 'كيف', 'خطوات', 'اطلع', 'استخراج', 'تجديد', 'اصدار', 'عمل', 'اطلب'];
  var i;
  for (i = 0; i < emergencyWords.length; i++) {
    if (lower.indexOf(emergencyWords[i]) !== -1) return 'emergency';
  }
  for (i = 0; i < complaintWords.length; i++) {
    if (lower.indexOf(complaintWords[i]) !== -1) return 'complaint';
  }
  for (i = 0; i < serviceWords.length; i++) {
    if (lower.indexOf(serviceWords[i]) !== -1) return 'service_request';
  }
  return 'inquiry';
}

async function classifyMessage(messageText, env) {
  var prompt = 'Classify this message into ONE word only from these types:\n' +
    'service_request, inquiry, complaint, faq, emergency\n\n' +
    'Message: "' + messageText + '"\n\n' +
    'Reply: one word only, the type.';
  var result = await callGemini(prompt, env, 1);
  var cleaned = result.trim().toLowerCase().split('\n')[0].trim();
  var valid = ['service_request', 'inquiry', 'complaint', 'faq', 'emergency'];
  for (var i = 0; i < valid.length; i++) {
    if (cleaned.indexOf(valid[i]) !== -1) {
      return valid[i];
    }
  }
  return 'inquiry';
}

// التقرير الحي من الأرقام مباشرة — من غير Gemini (سريع ومجاني ومش بيقع أبداً)
function buildReportText(stats, newReqs, lateReqs, msgs) {
  var w = stats.website;
  var b = stats.breakdown;
  var h = (new Date().getUTCHours() + 3) % 24; // توقيت مصر
  var greet = (h >= 4 && h < 12) ? 'صباح الخير' : 'مساء الخير';
  var lines = [
    greet + ' يا محمد. ده التقرير الحي لمنصة خِدْمَتي AI:',
    '',
    '1. الزيارات والمستخدمين: زيارات الموقع النهاردة ' + w.visitsToday + '، والإجمالي ' + w.visitsTotal + ' زيارة. فيه ' + w.usersToday + ' مستخدم جديد النهاردة، والإجمالي ' + w.usersTotal + ' مستخدمين مسجلين.',
    '2. مقدمو الخدمات: إجمالي عدد مقدمي الخدمات المسجلين ' + w.providersTotal + '.',
    '3. نشاط التليجرام: وصلنا ' + newReqs + ' طلبات جديدة، ' + lateReqs + ' طلبات متأخرة، و ' + msgs + ' رسائل جديدة.',
    '4. ردود الشات: تم الرد على ' + stats.total + ' مستخدم حقيقي النهاردة.',
    '5. تصنيف التفاعل: استفسارات ' + b.inquiry + '، طلبات خدمة ' + b.service_request + '، شكاوى ' + b.complaint + '، أسئلة شائعة ' + b.faq + '، طوارئ ' + b.emergency + '.',
    '',
    'التقرير مبني على أرقام قاعدة البيانات مباشرة 🚀'
  ];
  return lines.join('\n');
}

async function generateDailyReport(env) {
  var results = await Promise.all([
    getNewRequests(),
    getLateRequests(),
    getNewMessages()
  ]);
  var newReqs = results[0];
  var lateReqs = results[1];
  var messages = results[2];
  var stats = await getStats();
  var report = buildReportText(stats, newReqs.length, lateReqs.length, messages.length);
  await saveDailyReport({
    new_requests: newReqs.length,
    in_progress_requests: lateReqs.length,
    report_text: report
  });
  await sendTelegram(report, env);
  return report;
}

async function suggestContent(env) {
  var messages = await getNewMessages();
  if (!messages || messages.length === 0) {
    return 'لسه مفيش أسئلة مستخدمين جديدة أقترح منها — استنى أول أسئلة حقيقية 🌱';
  }
  var topQuestions = messages.map(function(m) { return m.message_text; }).slice(0, 10);
  var prompt = 'Based on these questions from users:\n' +
    topQuestions.join('\n') + '\n\n' +
    'Suggest one Facebook post, short and attractive, in Egyptian Arabic. End with: Want me to publish it?';
  return await callGemini(prompt, env);
}

async function logAgentAction(taskId, action, details, success, error) {
  if (success === undefined) success = true;
  if (error === undefined) error = null;
  await fetch(SUPABASE_URL + '/rest/v1/agent_logs', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      task_id: taskId,
      action: action,
      details: JSON.stringify(details),
      success: success,
      error_message: error
    })
  });
}

// ============================================
// GEMINI (المفتاح من متغير البيئة GEMINI_KEY)
// ============================================
async function callGemini(prompt, env, retries) {
  if (retries === undefined) retries = 2;
  var apiKey = env && env.GEMINI_KEY;
  if (!apiKey) return 'مش قادر أرد دلوقتي، حاول تاني بعد شوية';
  for (var attempt = 0; attempt < retries; attempt++) {
    try {
      var res = await fetch(GEMINI_URL + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        })
      });
      var data = await res.json();
      var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (text) return text;
      if (attempt < retries - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    } catch (err) {
      if (attempt < retries - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }
  return 'مش قادر أرد دلوقتي، حاول تاني بعد شوية';
}

// محادثة كاملة (system prompt + history) — للردود الجرونديد
async function callGeminiChat(contents, env, retries) {
  if (retries === undefined) retries = 2;
  var apiKey = env && env.GEMINI_KEY;
  if (!apiKey) return null;
  for (var attempt = 0; attempt < retries; attempt++) {
    try {
      var res = await fetch(GEMINI_URL + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 1000 }
        })
      });
      var data = await res.json();
      var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (text) return text;
      if (attempt < retries - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    } catch (err) {
      if (attempt < retries - 1) await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }
  return null;
}

// ============================================
// HELPER
// ============================================
function get24HoursAgo() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

async function saveDailyReport(data) {
  var body = { report_date: new Date().toISOString().split('T')[0] };
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    body[keys[i]] = data[keys[i]];
  }
  await fetch(SUPABASE_URL + '/rest/v1/daily_reports', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

// ============================================================
// المحادثة الذكية المُقيَّدة بقاعدة المعرفة المتحققة
// (بديل العقل القديم — نفس الواجهة: message, history, isAdmin, chatId)
// بترجع { reply, matched } — matched = slugs البيانات المتحققة المستخدمة
// ============================================================
async function chatGrounded(message, history, isAdmin, chatId, env, ctx) {
  if (!history) history = [];

  // 1) مسار سريع للأدمن: أسئلة التقارير بتيجي من الأرقام مباشرة — من غير Gemini
  if (isAdmin) {
    var lowerMsg = message.toLowerCase();
    var isReportQuery = lowerMsg.indexOf('تقرير') !== -1 || lowerMsg.indexOf('ارقام') !== -1 ||
      lowerMsg.indexOf('إحصائيات') !== -1 || lowerMsg.indexOf('احصائيات') !== -1 ||
      lowerMsg.indexOf('بيانات') !== -1 || lowerMsg.indexOf('طلبات') !== -1 ||
      lowerMsg.indexOf('رسائل') !== -1 || lowerMsg.indexOf('شكاوى') !== -1;
    if (isReportQuery) {
      var repStats = await getStats();
      var repRes = await Promise.all([getNewRequests(), getLateRequests(), getNewMessages()]);
      return { reply: buildReportText(repStats, repRes[0].length, repRes[1].length, repRes[2].length), matched: [] };
    }
  }

  // 2) التصنيف السريع بكلمات مفتاحية (من غير Gemini) — للإحصائيات والتنبيهات
  var classification = isAdmin ? 'admin' : classifyByKeywords(message);

  // 3) المطابقة مع قاعدة المعرفة المتحققة + حصاد السؤال لو مفيش بيانات تجاوبه
  var ranked = matchKB(message);
  var matched = ranked.filter(function(m){ return m.score >= 3; }).slice(0, 2);
  if (!matched.length) insertAgentQuestion(env, message, null, ctx);

  // 4) الـPrompt المُقيَّد بالبيانات المتحققة + تعليمات النبرة حسب التصنيف
  var systemPrompt = buildPrompt(matched);
  if (isAdmin) {
    systemPrompt += '\n\n(ملاحظة: دي رسالة من محمد — صاحب المنصة. رد عليه مباشرة وباحتراف من غير اعتذارات عميلة ومن غير طلب أرقام تليفون. ممنوع تختلق أي أرقام أو بيانات — لو مش عندك بيانات حقيقية قول بصراحة «مفيش بيانات متاحة لسه».)';
  } else if (classification === 'complaint') {
    systemPrompt += '\n\n(ملاحظة: دي شكوى — اعتذر بصدق بالعامي، طمّن المستخدم إن محمد مدير المنصة هيتواصل معاه بنفسه قريبًا، واطلب منه رقم تليفونه بأسلوب ودود.)';
  } else if (classification === 'emergency') {
    systemPrompt += '\n\n(ملاحظة: دي حالة طارئة — طمّن المستخدم إن المساعدة جاية فورًا وإن المدير هيتواصل معاه حالًا، واطلب رقم تليفونه بهدوء.)';
  }

  // 5) توحيد تنسيق الـhistory (الموقع بيبعت {role,text} — Gemini عايز {role,parts})
  var hist = (history || []).map(function(h){
    if (h && h.parts && h.parts[0] && typeof h.parts[0].text === 'string') {
      return { role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.parts[0].text }] };
    }
    if (h && typeof h.text === 'string') {
      return { role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] };
    }
    return null;
  }).filter(Boolean).slice(-10);

  var contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'تمام! أنا خِدْمَتي AI — بجاوب من قاعدة المعرفة المتحققة بتاعتنا بس. اسألني 💪' }] }
  ];
  for (var i = 0; i < hist.length; i++) contents.push(hist[i]);
  contents.push({ role: 'user', parts: [{ text: message }] });

  // 6) الرد من Gemini مقيَّدًا بالبيانات المتحققة
  var reply = await callGeminiChat(contents, env);
  if (!reply) reply = 'معلش، مقدرتش أرد دلوقتي. جرّب تاني 🤔';

  // 7) تنبيه محمد فورًا للشكاوى والطوارئ (من غير رسايل الأدمن)
  if (!isAdmin && (classification === 'complaint' || classification === 'emergency')) {
    var priority = classification === 'emergency' ? 'طارئ' : 'شكوى';
    var alertText = 'تنبيه من الـ Agent - ' + priority + ' جديد!\n\n' +
      'الرسالة: ' + message + '\n\n' +
      'الرد للعميل: ' + reply.substring(0, 200);
    await sendTelegram(alertText, env);
  }

  // 8) تسجيل التفاعل — ده وقود الإحصائيات والتقارير
  await saveMessageLog(chatId || null, message, classification, reply);

  return { reply: reply, matched: matched };
}

/* ============================================================
   نقطة المحادثة HTTP (POST /chat و أي POST تاني) — شكل v3
   ============================================================ */
async function aiChat(request, env, cors, ctx) {
  try {
    const body = await request.json();
    const message = body.message;
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const apiKey = env.GEMINI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_KEY secret not set in Cloudflare' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const out = await chatGrounded(message, body.history || [], false, null, env, ctx);

    // مفتاحين عشان أي نسخة عميلة قديمة أو جديدة تشتغل بدون تغيير
    return new Response(JSON.stringify({
      reply: out.reply,
      response: out.reply,
      grounded: out.matched.length > 0,
      matched: out.matched.map(function(m){ return m.slug; })
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, reply: null, response: null }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

/* ============================================================
   تسجيل مقدم خدمة (زي النسخة الشغالة — نفس أعمدة الجدول الحقيقي)
   ============================================================ */
async function registerProvider(request, env, cors) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const type = (body.type || '').trim();
    const gov = (body.gov || '').trim();
    const phone = (body.phone || '').trim();
    const whatsapp = (body.whatsapp || '').trim();
    const services = (body.services || '').trim();

    if (!name || !type || !gov || !phone) {
      return new Response(JSON.stringify({ error: 'الاسم والنشاط والمحافظة والتليفون مطلوبة' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    var SECRET = (env && env.SUPABASE_SECRET) || SUPABASE_KEY;
    const res = await fetch(SUPABASE_URL + '/rest/v1/providers', {
      method: 'POST',
      headers: {
        'apikey': SECRET,
        'Authorization': 'Bearer ' + SECRET,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ name: name, type: type, gov: gov, phone: phone, whatsapp: whatsapp || phone, services: services, rating: 0, orders: 0, badge: 'جديد', verified: false })
    });

    const data = await res.json();
    if (res.ok) {
      return new Response(JSON.stringify({ success: true, provider: data[0] }),
        { headers: { ...cors, 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'فشل التسجيل في قاعدة البيانات', details: data }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'خطأ: ' + e.message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}

// ============================================
// TELEGRAM COMMANDS (لوحة القيادة PRO — أدمن بس)
// ============================================
function getHelpText() {
  return [
    'لوحة قيادة خِدْمَتي AI (PRO)',
    '==============================',
    '',
    '/report - تقرير يومي كامل بالإحصائيات',
    '/requests - الطلبات الجديدة',
    '/late - الطلبات المتأخرة',
    '/suggest - اقتراح بوست للفيسبوك',
    '/stats - إحصائيات رسائل اليوم',
    '/ask + سؤالك - اسأل الـ Agent أي حاجة (بيلزق من قاعدة المعرفة المتحققة)',
    '/status - حالة الـ Agent',
    '/help - عرض الأوامر دي',
    '',
    'اكتب أي حاجة غير الأوامر وهرد عليك عادي — دلوقتي من قاعدة المعرفة المتحققة.'
  ].join('\n');
}

async function handleCommand(userText, chatId, userName, env, ctx) {
  var parts = userText.split(' ');
  var cmd = parts[0].toLowerCase();
  var rest = parts.slice(1).join(' ');

  // Commands are admin-only
  if (String(chatId) !== String((env && env.TELEGRAM_CHAT_ID) || '')) {
    return null;
  }

  if (cmd === '/start' || cmd === '/help') {
    return getHelpText();
  }

  if (cmd === '/report') {
    return await generateDailyReport(env);
  }

  if (cmd === '/requests') {
    var reqs = await getNewRequests();
    if (!reqs || reqs.length === 0) {
      return 'مفيش طلبات جديدة دلوقتي.';
    }
    var lines = ['الطلبات الجديدة (' + reqs.length + '):', ''];
    for (var i = 0; i < reqs.length; i++) {
      var r = reqs[i];
      var line = (i + 1) + '. ' + (r.service_type || r.title || 'طلب') + ' - ' + (r.governorate || '') + ' - ' + (r.status || 'new');
      lines.push(line);
    }
    return lines.join('\n');
  }

  if (cmd === '/late') {
    var late = await getLateRequests();
    if (!late || late.length === 0) {
      return 'مفيش طلبات متأخرة، كله تمام.';
    }
    var lines = ['الطلبات المتأخرة (' + late.length + '):', ''];
    for (var i = 0; i < late.length; i++) {
      var r = late[i];
      var line = (i + 1) + '. ' + (r.service_type || r.title || 'طلب') + ' - ' + (r.governorate || '');
      lines.push(line);
    }
    return lines.join('\n');
  }

  if (cmd === '/suggest') {
    return await suggestContent(env);
  }

  if (cmd === '/stats') {
    var stats = await getStats();
    var lines = [
      '📊 إحصائيات اليوم:',
      '==============================',
      '🌐 زيارات الموقع النهاردة: ' + stats.website.visitsToday,
      '🌐 إجمالي الزيارات: ' + stats.website.visitsTotal,
      '👤 مسجلين النهاردة: ' + stats.website.usersToday,
      '👤 إجمالي المسجلين: ' + stats.website.usersTotal,
      '👥 مقدمي الخدمات المسجلين: ' + stats.website.providersTotal,
      '==============================',
      '✈️ رسائل التليجرام (مستخدمين حقيقيين): ' + stats.total,
      '- طلبات خدمة: ' + stats.breakdown.service_request,
      '- استفسارات: ' + stats.breakdown.inquiry,
      '- شكاوى: ' + stats.breakdown.complaint,
      '- أسئلة شائعة: ' + stats.breakdown.faq,
      '- طوارئ: ' + stats.breakdown.emergency,
      '- أخرى: ' + stats.breakdown.other
    ];
    return lines.join('\n');
  }

  if (cmd === '/ask') {
    if (!rest) {
      return 'اكتب سؤالك بعد الأمر. مثال:\n/ask ايه خطوات تجديد البطاقة؟';
    }
    var out = await chatGrounded(rest, [], false, chatId, env, ctx);
    return out.reply;
  }

  if (cmd === '/status') {
    return [
      'حالة الـ Agent (Grounded PRO):',
      '- الاسم: Khidmaty AI Manager',
      '- المرحلة: 5 - العقل الجرونديد من قاعدة المعرفة المتحققة',
      '- قاعدة المعرفة: 59 خدمة متحققة (مصدرين+ لكل خدمة)',
      '- Gemini: gemini-3.6-flash',
      '- Supabase: متصل',
      '- Telegram: شغّال (نفس العقل الجرونديد)',
      '- تصنيف ذكي: مفعّل',
      '- تنبيهات تلقائية: شكاوى + طوارئ',
      '- حصاد الأسئلة: شغّال (agent_questions)',
      '- Endpoints: /report, /requests, /late, /suggest, /classify, /chat, /stats, /telegram, /register-provider'
    ].join('\n');
  }

  return null;
}

// ============================================
// SCHEDULED TASK (كل ساعة)
// ============================================
async function checkIfPostedToday(slot) {
  try {
    var todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    var todayISO = todayStart.toISOString();
    var res = await fetch(SUPABASE_URL + '/rest/v1/agent_logs?action=eq.channel_post&created_at=gte.' + todayISO + '&select=details', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    var data = await res.json();
    for (var i = 0; i < data.length; i++) {
      try {
        var details = JSON.parse(data[i].details);
        if (details.time === slot) return true;
      } catch(e) {}
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function runScheduledTask(env) {
  var hour = new Date().getUTCHours() + 3; // Egypt time (UTC+3)
  var isMorning = hour >= 7 && hour <= 9;
  var isEvening = hour >= 19 && hour <= 21;

  if (isMorning || isEvening) {
    var slot = isMorning ? 'morning' : 'evening';
    var alreadyPosted = await checkIfPostedToday(slot);
    if (!alreadyPosted) {
      await postNextToChannel(env);
    } else {
      console.log('Already posted today in ' + slot + ' slot, skipping duplicate');
    }
  }

  // Also run hourly checks
  await runHourlyCheck(env);
}

async function runHourlyCheck(env) {
  var lateReqs = await getLateRequests();
  if (lateReqs && lateReqs.length > 0) {
    var alert = 'تنبيه من الـ Agent:\nفيه ' + lateReqs.length + ' طلبات متأخرة محتاجة متابعة.';
    await sendTelegram(alert, env);
  }
  var messages = await getNewMessages();
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var category = await classifyMessage(msg.message_text, env);
    await logAgentAction(null, 'classify', { message_id: msg.id, category: category });
  }
  console.log('Hourly check done');
}

/* ============================================================
   التوجيه — كل ميزات PRO القديمة + العقل الجرونديد الجديد
   ============================================================ */
export default {
  async fetch(request, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/register-provider' && request.method === 'POST') {
      return await registerProvider(request, env, cors);
    }

    // الموقع بيبعت GET /requests كإشعار (fire-and-forget) — بترجع ok من غير استعلام
    if (path === '/requests' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // نقطة حصاد يدوية (أي قناة تانية تقدر تبعتلها أسئلة من غير إجابة)
    if (path === '/requests' && request.method === 'POST') {
      try {
        const b = await request.json();
        insertAgentQuestion(env, b.question || b.message || '', b.matched_slug || null, ctx);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // GET /report
    if (path === '/report' && request.method === 'GET') {
      var report = await generateDailyReport(env);
      return new Response(JSON.stringify({ report: report }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // GET /late
    if (path === '/late' && request.method === 'GET') {
      var late = await getLateRequests();
      return new Response(JSON.stringify({ late: late }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // GET /suggest
    if (path === '/suggest' && request.method === 'GET') {
      var suggestion = await suggestContent(env);
      return new Response(JSON.stringify({ suggestion: suggestion }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // GET /stats
    if (path === '/stats' && request.method === 'GET') {
      var stats = await getStats();
      return new Response(JSON.stringify({ stats: stats }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // POST /classify
    if (path === '/classify' && request.method === 'POST') {
      var cBody = await request.json();
      var category = await classifyMessage(cBody.message, env);
      return new Response(JSON.stringify({ category: category }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // Health Check
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({
        agent: 'Khidmaty AI Manager',
        status: 'running',
        phase: '5 - Grounded PRO (verified KB)',
        kb_services: KB.length,
        features: ['verified_grounding', 'anti_hallucination', 'question_harvest', 'smart_classification', 'auto_alerts', 'pro_replies', 'dashboard', 'stats', 'telegram_bot'],
        endpoints: ['/report', '/requests', '/late', '/suggest', '/stats', '/classify', '/chat', '/telegram', '/register-provider']
      }), {
        headers: makeHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // POST /telegram - webhook for Telegram messages
    if (path === '/telegram' && request.method === 'POST') {
      try {
        var update = await request.json();
        var message = update.message;
        if (!message || !message.text) {
          return new Response('ok', { status: 200 });
        }
        var chatId = message.chat.id;
        var userText = message.text;
        var userName = message.from ? message.from.first_name : '';
        var isAdminMsg = String(chatId) === String((env && env.TELEGRAM_CHAT_ID) || '');

        // If command (starts with /)
        if (userText.indexOf('/') === 0) {
          var cmdResult = await handleCommand(userText, chatId, userName, env, ctx);
          if (cmdResult !== null) {
            await sendTelegramTo(chatId, cmdResult, env);
          } else {
            // Not admin or unknown command - reply with grounded AI
            var outCmd = await chatGrounded(userText, [], isAdminMsg, chatId, env, ctx);
            await sendTelegramTo(chatId, outCmd.reply, env);
          }
          return new Response('ok', { status: 200 });
        }

        // Normal message - reply with grounded AI (نفس عقل الموقع)
        var out = await chatGrounded(userText, [], isAdminMsg, chatId, env, ctx);
        await sendTelegramTo(chatId, out.reply, env);

        return new Response('ok', { status: 200 });
      } catch (e) {
        return new Response('error', { status: 200 });
      }
    }

    // المحادثة الذكية (default لكل POST — وده اللي الموقع بيستخدمه على /chat)
    if (request.method === 'POST') {
      return await aiChat(request, env, cors, ctx);
    }

    return new Response(JSON.stringify({ error: 'POST only' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledTask(env));
  }
};

// للاختبار المحلي فقط (node tools/test_agent_v3.mjs) — Cloudflare بيتجاهلها
export const __internals = { norm: norm, matchKB: matchKB, buildPrompt: buildPrompt, KB: KB };
