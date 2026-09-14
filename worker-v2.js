// Cloudflare Worker v2 — خِدْمَتي AI (Gemini AI Proxy)
// انسخ ده كله في Cloudflare Dashboard → Workers → wispy-pine-7fd2 → Edit Code → احفظ
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
        { role: 'model', parts: [{ text: 'تمام! أنا خِدْمَتي AI، جاهز أساعدك في مصالحك الحكومية بكل ود 🤖 مصر' }] },
        ...(history || []),
        { role: 'user', parts: [{ text: message }] }
      ];

      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
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
};
