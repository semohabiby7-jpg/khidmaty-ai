// khidmaty-chat — Cloudflare Worker يمرّر أسئلة المستخدم + نص المستند لـGemini (chat with document).
// المفتاح مخفي كـsecret في الـWorker (مش في التطبيق العام) — الـscan app يكلمه بلا مفتاح.
// القيود: Origin = khidmatyai.com بس (مثل khidmaty-ocr / khidmaty-tts).

const ORIGIN = 'https://khidmatyai.com';
const ALLOW_LOCAL = true; // للتجربة المحلية (localhost)

function corsHeaders(origin){
  const allow = (origin && (origin === ORIGIN || origin.endsWith('.khidmatyai.com'))) ? origin
    : (ALLOW_LOCAL && origin && origin.startsWith('http://localhost')) ? origin
    : ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(obj, status, origin){
  return new Response(JSON.stringify(obj), {status, headers:{'Content-Type':'application/json', ...corsHeaders(origin)}});
}

export default {
  async fetch(req, env){
    const origin = req.headers.get('Origin') || '';
    if(req.method === 'OPTIONS'){
      return new Response(null, {status:204, headers:corsHeaders(origin)});
    }
    if(req.method === 'GET'){
      return new Response('khidmaty-chat ✓ — POST {document_text, question} للدردشة مع المستند', {status:200, headers:corsHeaders(origin)});
    }
    if(req.method !== 'POST'){
      return json({error:'method not allowed'}, 405, origin);
    }
    // حماية Origin: اسمح لkhidmatyai.com + localhost للتجربة
    const allowed = !origin || origin === ORIGIN || origin.endsWith('.khidmatyai.com')
      || (ALLOW_LOCAL && origin.startsWith('http://localhost'));
    if(!allowed){
      return json({error:'origin not allowed'}, 403, origin);
    }
    try{
      const body = await req.json();
      const documentText = (body && body.document_text) || '';
      const question = (body && body.question) || '';
      const history = (body && body.history) || []; // [{role:'user'|'model', text:'...'}]

      if(!question.trim()){
        return json({error:'no question'}, 400, origin);
      }
      if(!documentText.trim()){
        return json({error:'no document text — run OCR first'}, 400, origin);
      }

      const key = env.GEMINI_API_KEY;
      const model = (env.GEMINI_MODEL) || 'gemini-2.0-flash';
      const endpoint = (env.GEMINI_ENDPOINT) || ('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent');
      const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'key=' + key;

      // نبني محادثة Gemini: نظام (السياق) + تاريخ المحادثة + السؤال الجديد
      // المحتوى الأول = تعليمات النظام + نص المستند كسياق
      // باقي المحادثة = الأسئلة والأجوبة السابقة (history)
      // آخر عنصر = السؤال الجديد
      const systemPrompt =
        'أنت مساعد ذكي لمستندات Scan Macaron AI. المستخدم استخرج نص وثيقة عبر OCR وبيسالك عنها. ' +
        'جاوب بالعربية المصرية الواضحة. اعتمد فقط على نص المستند المرفق — لو الإجابة مش موجودة في النص، قولها بصراحة. ' +
        'لو السؤال بالإنجليزي جاوب بالإنجليزي. كن مختصرًا ومفيدًا.\n\n' +
        '=== نص المستند ===\n' + documentText + '\n=== نهاية النص ===';

      // contents: أول عنصر = تعليمات النظام + نص المستند (role=user)
      // بعدها = تاريخ المحادثة (history)
      // آخر عنصر = السؤال الحالي (role=user)
      const contents = [{role:'user', parts:[{text: systemPrompt}]}];
      // إذا فيه تاريخ محادثة، نضيفه
      for(const h of history){
        if(h && h.role && h.text){
          contents.push({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{text: h.text}]
          });
        }
      }
      // السؤال الجديد
      contents.push({role:'user', parts:[{text: question}]});

      const geminiBody = {
        contents,
        generationConfig:{temperature:0.3, maxOutputTokens:1024}
      };

      const r = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(geminiBody)
      });
      if(!r.ok){
        const t = await r.text();
        return json({error:'gemini '+r.status, detail:t.slice(0,400)}, 502, origin);
      }
      const data = await r.json();
      const answer = (data && data.candidates && data.candidates[0] && data.candidates[0].content
        && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
      return json({answer}, 200, origin);
    }catch(e){
      return json({error:'exception', detail:String(e).slice(0,400)}, 500, origin);
    }
  }
};
