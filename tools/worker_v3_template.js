// Cloudflare Worker v3 — خِدْمَتي AI — «العقل الجرونديد»
// ⚠️ ملف مولَّد آليًا من tools/build_agent_kb.py (بياناته من sources-log.md) — متعدّلش هنا بإيدك
// النشر: Cloudflare Dashboard → Workers → khidmaty-agent → Edit Code → الصق الملف كله → Save
// متغيرات البيئة المطلوبة في Cloudflare (Settings → Variables):
//   GEMINI_KEY        = مفتاح Gemini AI
//   SUPABASE_SECRET   = service_role key من Supabase (Settings → API Keys)
//
// الجديد في v3 (مقارنة بـ v2):
//  1) قاعدة معرفة متحققة (KB) مبنية آليًا من سجل مصادر التحقق — كل رد مقيَّد بالبيانات المتحققة فقط
//  2) الرد بيرجع بمفتاحين response و reply مع بعض — توافق خلفي مع الموقع والقنوات القديمة
//  3) تصحيح تنسيق الـhistory المتبادل مع الموقع (كان بيتابعع لـ Gemini بشكل غلط في v2)
//  4) حصاد الأسئلة اللي القاعدة معرفتش تجاوبها → جدول agent_questions (نفّذ sql/agent_harvest.sql مرة واحدة في Supabase)
//  5) GET /requests بيرد ok بدل الخطأ الصامت القديم
//  6) أي سؤال من غير مطابقة في القاعدة = بيتسجل تلقائي → ده بايبلاين المحتوى الجاي

const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';
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
  const secret = env && env.SUPABASE_SECRET;
  if (!secret || !message) return;
  const p = fetch(SUPABASE_URL + '/rest/v1/agent_questions', {
    method: 'POST',
    headers: { 'apikey': secret, 'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ question: message, matched_slug: matchedSlug || null, source: 'site_chat' })
  }).catch(function(){ /* بصمت — الحصاد ميساش المحادثة */ });
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

/* ============================================================
   المحادثة الذكية — المُقيَّدة بقاعدة المعرفة المتحققة
   ============================================================ */
async function aiChat(request, env, cors, ctx){
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

    // مطابقة + حصاد السؤال لو مفيش بيانات متحققة تجاوبه
    const ranked = matchKB(message);
    const matched = ranked.filter(function(m){ return m.score >= 3; }).slice(0, 2);
    if (!matched.length) insertAgentQuestion(env, message, null, ctx);

    const systemPrompt = buildPrompt(matched);

    // تصحيح تنسيق الـhistory (الموقع بيبعت {role,text} — Gemini عايز {role,parts})
    const hist = (body.history || []).map(function(h){
      if (h && h.parts && h.parts[0] && typeof h.parts[0].text === 'string') {
        return { role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.parts[0].text }] };
      }
      if (h && typeof h.text === 'string') {
        return { role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] };
      }
      return null;
    }).filter(Boolean).slice(-10);

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'تمام! أنا خِدْمَتي AI — بجاوب من قاعدة المعرفة المتحققة بتاعتنا بس. اسألني 💪' }] },
      ...hist,
      { role: 'user', parts: [{ text: message }] }
    ];

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 1000 },
        }),
      }
    );

    const data = await res.json();
    const reply =
      (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) ||
      'معلش، مقدرتش أرد دلوقتي. جرّب تاني 🤔';

    // مفتاحين عشان أي نسخة عميلة قديمة أو جديدة تشتغل بدون تغيير
    return new Response(JSON.stringify({
      reply: reply,
      response: reply,
      grounded: matched.length > 0,
      matched: matched.map(function(m){ return m.slug; })
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, reply: null, response: null }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

/* ============================================================
   تسجيل مقدم خدمة — زي v2 بالظبط (شغال — متلمسوش)
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

    const SUPABASE_SECRET = env.SUPABASE_SECRET;
    if (!SUPABASE_SECRET) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SECRET not set in Cloudflare env' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const badge = JSON.stringify({ status: 'جديد', phone, whatsapp: whatsapp || phone, services });

    const res = await fetch(SUPABASE_URL + '/rest/v1/providers', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SECRET,
        'Authorization': 'Bearer ' + SUPABASE_SECRET,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ name, type, gov, rating: 0, orders: 0, badge, verified: false })
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

/* ============================================================
   التوجيه
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

    if (url.pathname === '/register-provider' && request.method === 'POST') {
      return await registerProvider(request, env, cors);
    }

    // الموقع بيبعت GET /requests كإشعار — بقت بترجع ok بدل خطأ صامت
    if (url.pathname === '/requests' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // نقطة حصاد يدوية (أي قناة تانية تقدر تبوتلها أسئلة من غير إجابة)
    if (url.pathname === '/requests' && request.method === 'POST') {
      try {
        const b = await request.json();
        insertAgentQuestion(env, b.question || b.message || '', b.matched_slug || null, ctx);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // المحادثة الذكية (default — نفسه اللي الموقع بيستخدمه على /chat)
    return await aiChat(request, env, cors, ctx);
  }
};

// للاختبار المحلي فقط (node tools/test_agent_v3.mjs) — Cloudflare بيتجاهلها
export const __internals = { norm: norm, matchKB: matchKB, buildPrompt: buildPrompt, KB: KB };
