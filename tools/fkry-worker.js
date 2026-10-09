// ============================================================
// فكري — المستشار الاستراتيجي لخِدْمَتي AI
// Cloudflare Worker — تحليل بيانات + تنبؤ + خطط نمو بـGemini AI
// النشر: wrangler deploy --config tools/fkry-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SECRET (اختياري)
// ============================================================

const BRAIN_URL    = 'https://khidmaty-agent.semohabiby7.workers.dev';
const SITE_URL     = 'https://khidmatyai.com/';
const ARTICLES_URL = 'https://khidmatyai.com/articles.html';
const OFFICES_URL  = 'https://khidmatyai.com/offices.html';
const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];

const FKRY_SYSTEM = `أنت فكري، المستشار الاستراتيجي لمحمد إسماعيل مؤسس منصة خِدْمَتي AI.
بتتكلم بالمصري الدارج بذكاء وحزم وثقة. محمد بيناديك "يا فكري" وانت تناديه "يا ملك".
دورك:
1. تحليل البيانات — زيارات، مستخدمين، مقالات، مكاتب، أداء المحتوى
2. التنبؤ — اتجاهات النمو، فرص جديدة، مخاطر محتملة
3. خطط النمو — SEO، محتوى، تسويق، شراكات، توسّع
4. متابعة المنافسين — مواقع خدمات حكومية مماثلة، نقاط قوّة وضعف
5. التوصيات — خطوات عملية واضحة للمضي قدّام
منصة خِدْمَتي AI بتقدّم خدمات حكومية مصرية. الموقع فيه 40 مقال + 913 مكتب حكومي.
ردودك منظّمة وواضحة، بنقاط مرقّمة وخطوات تنفيذية. استخدم الإيموجي باعتدال (🧠 📊 🎯 📈).`;

// ============ أدوات مساعدة ============

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}
function cairoHour(){try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}}
function cairoDay(){try{return new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',weekday:'short'})}catch(e){return ''}}
function cairoDate(){try{return new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'})}catch(e){return new Date().toISOString().slice(0,10)}}

async function tgSend(env,text,chatId){
  const cid=chatId||env.TELEGRAM_CHAT_ID;
  if(!env.TELEGRAM_BOT_TOKEN||!cid)return{sent:false,reason:'no_secrets'};
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:true})});
    const j=await r.json();
    return{sent:!!j.ok};
  }catch(e){return{sent:false,reason:(e&&e.name)||'Error'}}
}

// ============ Gemini AI ============

async function callGemini(env,systemPrompt,userMessage){
  for(const model of GEMINI_MODELS){
    try{
      const r=await fetch(GEMINI_BASE+model+':generateContent?key='+env.GEMINI_KEY,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:systemPrompt}]},
          contents:[{role:'user',parts:[{text:userMessage}]}],
          generationConfig:{temperature:0.6,maxOutputTokens:900}
        })
      });
      const j=await r.json();
      if(j.candidates&&j.candidates[0]&&j.candidates[0].content){
        return j.candidates[0].content.parts[0].text;
      }
    }catch(e){}
  }
  return null;
}

// ============ Brain Worker ============

async function brainGet(path){
  try{
    const r=await fetch(BRAIN_URL+path);
    if(r.status===200)return await r.json();
  }catch(e){}
  return null;
}

// ============ جمع البيانات ============

async function gatherData(env){
  const data={site:'ن/م',articles:40,offices:913,visitsToday:0,visitsTotal:0,usersToday:0,usersTotal:0,providers:0,tgMessages:0,report:''};
  const stats=await brainGet('/stats');
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    data.visitsToday=s.visitsToday||0;
    data.visitsTotal=s.visitsTotal||0;
    data.usersToday=s.usersToday||0;
    data.usersTotal=s.usersTotal||0;
    data.providers=s.providersTotal||0;
    data.tgMessages=s.total||0;
  }
  const rep=await brainGet('/report');
  if(rep&&rep.report)data.report=rep.report.slice(0,600);
  return data;
}

function dataSummary(d){
  let s='';
  s+='📊 زيارات النهاردة: '+d.visitsToday+' | الإجمالي: '+d.visitsTotal+'\n';
  s+='👤 مسجلين النهاردة: '+d.usersToday+' | الإجمالي: '+d.usersTotal+'\n';
  s+='💼 مقدمين: '+d.providers+'\n';
  s+='📄 مقالات: '+d.articles+' | 🗺️ مكاتب: '+d.offices+'\n';
  s+='✈️ رسائل تيلجرام النهاردة: '+d.tgMessages;
  return s;
}

// ============ أوامر التحليل ============

async function cmdStrategy(env){
  const d=await gatherData(env);
  const prompt='بيانات النهاردة:\n'+dataSummary(d)+'\n\nاكتب استراتيجية النهاردة لمنصة خِدْمَتي AI:\n1. تقييم الأداء الحالي\n2. أهم 3 فرص نمو\n3. أكبر خطر وازاي نتجنّبه\nردك بالمصري، منظّم بنقاط، قابل للتنفيذ.';
  const ai=await callGemini(env,FKRY_SYSTEM,prompt);
  return ai||'ما قدرتش أحلّل دلوقتي يا ملك، Gemini مش متاح 🧠';
}

async function cmdGrowth(env){
  const d=await gatherData(env);
  const prompt='بيانات:\n'+dataSummary(d)+'\n\nاقترح خطة نمو عملية لمدة 30 يوم لمنصة خِدْمَتي AI:\n- محتوى (مقالات، SEO)\n- تسويق (سوشيال، إعلانات)\n- شراكات\nردك بالمصري، كل نقطة بسطر، خطوات تنفيذية.';
  const ai=await callGemini(env,FKRY_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🧠';
}

async function cmdCompetitors(env){
  const prompt='حلّل المنافسين المحتملين لمنصة خِدْمَتي AI (خدمات حكومية مصرية على الإنترنت):\n1. أهم 3 منافسين أو بدائل (مواقع حكومية رسمية، بوابات)\n2. نقاط قوّتهم وضعفهم\n3. ميزتنا التنافسية\nردك بالمصري، منظّم.';
  const ai=await callGemini(env,FKRY_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🧠';
}

async function cmdPredict(env){
  const d=await gatherData(env);
  const prompt='بيانات:\n'+dataSummary(d)+'\n\nتنبّأ بمسار منصة خِدْمَتي AI لـ3 شهور جايين:\n1. لو استمر الأداء الحالي، فين هنكون؟\n2. لو طبّقنا خطة نمو، فين ممكن نوصل؟\n3. نقاط حرجة لازم نراقبها\nردك بالمصري، واقعي ومباشر.';
  const ai=await callGemini(env,FKRY_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🧠';
}

async function cmdAnalysis(env,topic){
  const d=await gatherData(env);
  const prompt='بيانات:\n'+dataSummary(d)+'\n\nالموضوع المطلوب تحليله: "'+topic+'"\n\nحلّل الموضوع بعمق واقترح توصيات عملية. ردك بالمصري، منظّم بنقاط.';
  const ai=await callGemini(env,FKRY_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🧠';
}

// ============ الصباحية الاستراتيجية ============

async function morningStrategy(env){
  const d=await gatherData(env);
  let text='🧠 <b>صباح الاستراتيجية يا ملك</b>\nصباحية فكري — خِدْمَتي AI\n';
  text+='═══════════════\n';
  text+=dataSummary(d)+'\n\n';
  if(env.GEMINI_KEY){
    const prompt='بيانات الصباح:\n'+dataSummary(d)+'\n\nاكتب صباحية استراتيجية قصيرة:\n1. تقييم سريع لأداء النهاردة\n2. توصية واحدة مهمة للمضي\n3. فرصة محتوى أو نمو لليوم\nردك بالمصري، قصير (5-8 أسطر)، قابل للتنفيذ.';
    const ai=await callGemini(env,FKRY_SYSTEM,prompt);
    if(ai){
      text+='🎯 <b>توصية فكري:</b>\n'+ai+'\n\n';
    }
  }
  text+='نفوّق المنصة بأمان يا ملك 🚀\n— فكري 🧠 | '+stamp();
  await tgSend(env,text);
}

// ============ التقرير الأسبوعي (الجمعة) ============

async function weeklyReview(env){
  const d=await gatherData(env);
  let text='📊 <b>تقرير استراتيجي أسبوعي — فكري 🧠</b>\n';
  text+='═══════════════\n';
  text+=dataSummary(d)+'\n\n';
  if(env.GEMINI_KEY){
    const prompt='بيانات الأسبوع:\n'+dataSummary(d)+'\n\nاكتب تقرير استراتيجي أسبوعي لمنصة خِدْمَتي AI:\n1. ملخص الأداء\n2. أهم 3 إنجازات\n3. أكبر 3 تحديات\n4. أهداف الأسبوع الجاي\n5. توصية استراتيجية واحدة\nردك بالمصري، منظّم، قابل للتنفيذ.';
    const ai=await callGemini(env,FKRY_SYSTEM,prompt);
    if(ai){
      text+='📋 <b>التحليل الاستراتيجي:</b>\n'+ai+'\n\n';
    }
  }
  text+='أسبوع متوّج بالنجاح يا ملك 👑\n— فكري 🧠 | '+stamp();
  await tgSend(env,text);
}

// ============ الداشبورد التحليلي ============

function buildDashboard(){
  return '<!DOCTYPE html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>🧠 فكري — داشبورد تحليل بيانات خِدْمَتي AI</title>\n'+
  '<style>'+
  '*{margin:0;padding:0;box-sizing:border-box}'+
  'body{font-family:"Segoe UI",Tahoma,sans-serif;background:#0d1117;color:#c9d1d9;padding:16px;max-width:920px;margin:0 auto}'+
  'h1{text-align:center;color:#58a6ff;margin:12px 0 4px;font-size:1.6em}'+
  '.sub{text-align:center;color:#8b949e;font-size:0.85em;margin-bottom:18px}'+
  '.sec{color:#58a6ff;font-size:0.9em;margin:4px 0 10px;padding-bottom:6px;border-bottom:1px solid #30363d}'+
  '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px}'+
  '.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:14px;text-align:center}'+
  '.card .ico{font-size:1.8em;margin-bottom:6px}.card .val{font-size:1.7em;font-weight:700;color:#58a6ff}'+
  '.card .lbl{color:#8b949e;font-size:0.78em;margin-top:4px}.card .sv{color:#3fb950;font-size:0.8em;margin-top:2px}'+
  '.chart-box{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;margin-bottom:18px}'+
  '.chart-box h3{color:#58a6ff;margin-bottom:10px;font-size:0.95em}'+
  '.bars{display:flex;gap:6px;align-items:flex-end;height:140px;justify-content:space-around}'+
  '.bc{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}'+
  '.bar{width:70%;background:linear-gradient(180deg,#58a6ff,#1f6feb);border-radius:6px 6px 0 0;min-height:4px;transition:height .5s}'+
  '.bl{font-size:0.7em;color:#8b949e}.bv{font-size:0.72em;color:#c9d1d9;font-weight:600}'+
  '.btns{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:18px}'+
  'button{background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:10px;padding:12px;font-size:0.9em;cursor:pointer;font-family:inherit;transition:.2s}'+
  'button:hover{background:#30363d;border-color:#58a6ff}button.active{background:#1f6feb;border-color:#58a6ff;color:#fff}'+
  '.result{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;min-height:80px;white-space:pre-wrap;line-height:1.7;font-size:0.92em}'+
  '.ld{text-align:center;color:#8b949e;padding:24px}'+
  '.footer{text-align:center;color:#484f58;font-size:0.78em;margin-top:16px}'+
  '.badge{display:inline-block;background:#1f6feb;color:#fff;font-size:0.7em;padding:2px 8px;border-radius:6px;margin-bottom:8px}'+
  '</style></head><body>\n'+
  '<h1>🧠 فكري — داشبورد تحليل البيانات</h1>\n'+
  '<div class="sub">المستشار الاستراتيجي لخِدْمَتي AI — تحليل فوري بـGemini AI</div>\n'+
  '<div class="sec">📊 المؤشرات الحية</div>\n'+
  '<div class="cards" id="cards"><div class="ld">جاري التحميل…</div></div>\n'+
  '<div class="chart-box"><h3>📈 مقارنة المؤشرات</h3><div class="bars" id="bars"></div></div>\n'+
  '<div class="sec">🎯 تحليل ذكي بـAI</div>\n'+
  '<div class="btns">'+
  '<button onclick="askAI(\'strategy\')">🧠 استراتيجية اليوم</button>'+
  '<button onclick="askAI(\'growth\')">📈 خطة نمو 30 يوم</button>'+
  '<button onclick="askAI(\'competitors\')">🔍 تحليل المنافسين</button>'+
  '<button onclick="askAI(\'predict\')">🔮 تنبؤ 3 شهور</button>'+
  '</div>\n'+
  '<div class="result" id="result">اختر تحليل من الأزرار فوق 👆<br><br>كل تحليل بيتعمل فورًا بـGemini AI بناءً على بيانات المنصة الحية.</div>\n'+
  '<div class="footer">فكري 🧠 v1.0 — خِدْمَتي AI | <span id="ts"></span></div>\n'+
  '<script>\n'+
  'let DATA=null;const fmt=n=>Number(n||0).toLocaleString("ar-EG");\n'+
  'async function loadHealth(){try{const r=await fetch("/health");const j=await r.json();DATA=j.data;renderCards(DATA);renderChart(DATA);document.getElementById("ts").textContent=j.checked_at;}catch(e){document.getElementById("cards").innerHTML="تعذر تحميل البيانات";}}\n'+
  'function renderCards(d){const c=[{ico:"📈",val:fmt(d.visitsToday),lbl:"زيارات اليوم",sub:"+ "+fmt(d.visitsTotal)+" اجمالي"},{ico:"👤",val:fmt(d.usersToday),lbl:"مسجلين اليوم",sub:"+ "+fmt(d.usersTotal)+" اجمالي"},{ico:"💼",val:fmt(d.providers),lbl:"مقدمو الخدمات",sub:"نشط"},{ico:"📄",val:fmt(d.articles),lbl:"مقالات",sub:"بانفوجرافيك"},{ico:"🗺️",val:fmt(d.offices),lbl:"مكاتب حكومية",sub:"27 محافظة"},{ico:"✈️",val:fmt(d.tgMessages),lbl:"رسائل تليجرام",sub:"اليوم"}];document.getElementById("cards").innerHTML=c.map(x=>"<div class=\\"card\\"><div class=\\"ico\\">"+x.ico+"</div><div class=\\"val\\">"+x.val+"</div><div class=\\"lbl\\">"+x.lbl+"</div>"+(x.sub?"<div class=\\"sv\\">"+x.sub+"</div>":"")+"</div>").join("");}\n'+
  'function renderChart(d){const items=[{lbl:"زيارات اليوم",val:d.visitsToday},{lbl:"مسجلين اليوم",val:d.usersToday},{lbl:"المقالات",val:d.articles},{lbl:"المكاتب",val:d.offices},{lbl:"مقدمون",val:d.providers}];const mx=Math.max(...items.map(i=>i.val),1);document.getElementById("bars").innerHTML=items.map(i=>{const h=Math.max((i.val/mx)*120,4);return "<div class=\\"bc\\"><div class=\\"bv\\">"+fmt(i.val)+"</div><div class=\\"bar\\" style=\\"height:"+h+"px\\"></div><div class=\\"bl\\">"+i.lbl+"</div></div>";}).join("");}\n'+
  'async function askAI(type){const btns=document.querySelectorAll(".btns button");btns.forEach(b=>b.classList.remove("active"));event.target.classList.add("active");const box=document.getElementById("result");box.className="result ld";box.textContent="فكري بيحلل…";try{const r=await fetch("/"+type);const j=await r.json();const titles={strategy:"🧠 استراتيجية اليوم",growth:"📈 خطة النمو 30 يوم",competitors:"🔍 تحليل المنافسين",predict:"🔮 تنبؤ 3 شهور"};let text=j.strategy||j.growth||j.competitors||j.prediction||"ما رجعش نتيجة";box.className="result";box.innerHTML="<div class=\\"badge\\">Gemini AI</div>"+titles[type]+"\\n\\n"+text;}catch(e){box.className="result";box.textContent="تعذر التحليل دلوقتي 🙁";}}\n'+
  'loadHealth();setInterval(loadHealth,60000);\n'+
  '<\/script>\n'+
  '</body></html>';
}

// ============ Export ============

export default{
  async scheduled(event,env,ctx){
    const h=cairoHour();
    const day=cairoDay();
    // صباحية استراتيجية يومية الساعة 7 الصبح
    if(h===7){ctx.waitUntil(morningStrategy(env));return}
    // تقرير أسبوعي يوم الجمعة الساعة 8 الصبح
    if(day==='Fri'&&h===8){ctx.waitUntil(weeklyReview(env));return}
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/strategy'){
      const r=await cmdStrategy(env);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',strategy:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/growth'){
      const r=await cmdGrowth(env);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',growth:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/competitors'){
      const r=await cmdCompetitors(env);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',competitors:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/predict'){
      const r=await cmdPredict(env);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',prediction:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path.startsWith('/analyze/')){
      const topic=decodeURIComponent(path.slice(9));
      const r=await cmdAnalysis(env,topic);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',topic,analysis:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/morning'){
      await morningStrategy(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/weekly'){
      await weeklyReview(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/test'){
      const r=await tgSend(env,'فكري جاهز يا ملك 🧠\nالاستراتيجية في راسي، اسألني أي وقت.',undefined);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/health'){
      const d=await gatherData(env);
      return new Response(JSON.stringify({ok:true,guardian:'fkry',version:'1.0',data:d,checked_at:stamp()},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/dashboard'||path==='/تقرير'||path==='/تحليل'){
      const html=buildDashboard();
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,guardian:'fkry',version:'1.0',hint:'/dashboard داشبورد | /strategy استراتيجية | /growth خطة نمو | /competitors منافسين | /predict تنبؤ | /analyze/موضوع تحليل | /morning صباحية | /weekly أسبوعي | /health بيانات'},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
