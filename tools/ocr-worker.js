// khidmaty-ocr — Cloudflare Worker يمرّر الصورة لـGemini Vision لاستخراج نص عربي/إنجليزي بدقّة عالية.
// المفتاح مخفي كـsecret في الـWorker (مش في التطبيق العام) — الـscan app يكلمه بلا مفتاح.
// القيود: Origin = khidmatyai.com بس (مثل khidmaty-tts).

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
      return new Response('khidmaty-ocr ✓ — POST {image, mime} لاستخراج النص', {status:200, headers:corsHeaders(origin)});
    }
    if(req.method !== 'POST'){
      return json({error:'method not allowed'}, 405, origin);
    }
    // حماية Origin (مثل tts-worker): اسمح لkhidmatyai.com + localhost للتجربة
    const allowed = !origin || origin === ORIGIN || origin.endsWith('.khidmatyai.com')
      || (ALLOW_LOCAL && origin.startsWith('http://localhost'));
    if(!allowed){
      return json({error:'origin not allowed'}, 403, origin);
    }
    try{
      const body = await req.json();
      const image = body && body.image;
      if(!image) return json({error:'no image (base64)'}, 400, origin);
      const mime = (body && body.mime) || 'image/jpeg';

      const key = env.GEMINI_API_KEY;
      const model = (env.GEMINI_MODEL) || 'gemini-3.6-flash';
      const endpoint = (env.GEMINI_ENDPOINT) || ('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent');
      const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'key=' + key;

      const geminiBody = {
        contents:[{parts:[
          {text:'استخرج نص المحتوى الأساسي للوثيقة فقط — تجاهل تمامًا عناصر واجهة التطبيق (شريط الحالة، البطارية، الساعة، الأزرار، القوائم، التذييل، شريط التنقل، الأيقونات، الشعارات، أرقام الصفحات، إعلانات الموقع). اكتب النص حرفياً مع الحفاظ على الأسطر والترتيب والفراغات، عربي وإنجليزي وأرقام (بما فيها الأرقام الهندية ٠١٢٣٤٥٦٧٨٩)، بدون أي تعليق أو شرح أو علامات اقتباس أو مقدمة. لو رأيت كلمات/أرقام مش واضحة اكتبها كما تظهر دون تخمين. النص فقط.'},
          {inline_data:{mime_type: mime, data: image}}
        ]}],
        generationConfig:{temperature:0}
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
      const text = (data && data.candidates && data.candidates[0] && data.candidates[0].content
        && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
      return json({text}, 200, origin);
    }catch(e){
      return json({error:'exception', detail:String(e).slice(0,400)}, 500, origin);
    }
  }
};
