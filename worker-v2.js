// Cloudflare Worker v3 — خِدْمَتي AI (Gemini AI Proxy + Provider Registration)
// انسخ ده كله في Cloudflare Dashboard → Workers → wispy-pine-7fd2 → Edit Code → احفظ
// متغيرات البيئة المطلوبة في Cloudflare (Settings → Variables):
//   GEMINI_KEY        = مفتاح Gemini AI
//   SUPABASE_SECRET   = service_role key من Supabase (Settings → API Keys)

const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const url = new URL(request.url);

    // ===== تسجيل مقدم خدمة =====
    if (url.pathname === '/register-provider') {
      return await registerProvider(request, env, cors);
    }

    // ===== المحادثة الذكية (default) =====
    return await aiChat(request, env, cors);
  }
};

/* ============================================================
   تسجيل مقدم خدمة — يدخل البيانات في Supabase providers table
   باستخدام service_role secret (يتجاوز RLS)
   بيانات التواصل تُخزَّن في عمود badge بشكل JSON
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

    // نخزن بيانات التواصل في عمود badge كـ JSON (لأن الأعمدة المنفصلة غير موجودة بعد)
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
   المحادثة الذكية مع Gemini AI
   ============================================================ */
async function aiChat(request, env, cors) {
  try {
    const { message, history, services } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const apiKey = env.GEMINI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_KEY secret not set in Cloudflare' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const systemPrompt =
      'أنت "خِدْمَتي AI"، مساعد ذكي مصري للمصالح الحكومية. بتعرف الخدمات دي:\n' +
      (services || '') +
      '\n\nقواعدك:\n' +
      '1. ردّ بالعربي المصري بود وود\n' +
      '2. لو سألوا عن خدمة، اعرض التفاصيل بشكل منظّم: 📍 الجهة، 📄 المستندات، 💰 الرسوم، ⏱️ المدة، 🌐 التنفيذ (أونلاين/حضوري)، 📝 الخطوات\n' +
      '3. في آخر الرد، اسأل المستخدم: "مش عايز تعملها بنفسك؟ محتاج حد يخلصهالك؟" واقترح مقدم خدمة\n' +
      '4. لو السؤال عام، ساعد وارشح خدمات مناسبة\n' +
      '5. خليك صديق وحبيب، استخدم إيموجي بشكل طبيعي\n' +
      '6. ردّ مختصر ومفيد (أقل من 200 كلمة)\n' +
      '7. افهم المصري العامي (عايز، محتاج، اطلع، بدل فاقد، ...)';

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'تمام! أنا خِدْمَتي AI، جاهز أساعدك في مصالحي الحكومية بكل ود 🤖 مصر' }] },
      ...(history || []),
      { role: 'user', parts: [{ text: message }] }
    ];

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      }
    );

    const data = await res.json();
    const reply =
      (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) ||
      'معلش، مقدرتش أرد دلوقتي. جرّب تاني 🤔';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, reply: null }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
