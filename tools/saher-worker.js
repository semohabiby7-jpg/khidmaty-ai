// ============================================================
// ساهر — الحارس الذكي لخِدْمَتي AI
// Cloudflare Worker — مراقبة 24/7 بـGemini AI + تنبيهات تيلجرام
// النشر: wrangler deploy --config tools/saher-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SECRET (اختياري)
// ============================================================

const SITE_URL    = 'https://khidmatyai.com';
const ARTICLES_URL= 'https://khidmatyai.com/articles.html';
const OFFICES_URL = 'https://khidmatyai.com/offices.html';
const BRAIN_URL   = 'https://khidmaty-agent.semohabiby7.workers.dev';
const RANIA_URL   = 'https://khidmaty-rania.semohabiby7.workers.dev';
const SUPABASE_URL= 'https://puhdastfiswcmbnczvwx.supabase.co';
const SUPABASE_KEY= 'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
const REALERT_MS  = 3 * 60 * 60 * 1000; // إعادة تنبيه بعد 3 ساعات

const SAHER_SYSTEM = `أنت ساهر، حارس نظام خِدْمَتي AI الذكي. بتتكلم بالمصري الدارج بثقة وحزم. محمد بيناديك "يا ساهر" وانت تناديه "يا ملك".
دورك:
1. مراقبة 24/7 لكل أنظمة المنصة: الموقع، صفحة المقالات، صفحة المكاتب، العقل (Brain)، رانيا، بوت التليجرام، Supabase
2. كشف الشذوذ بـAI — تحليل الأنماط، رصد الأخطاء، التنبؤ بالمشاكل
3. تنبيهات ذكية — لما يحصل مشكلة، تكتب تنبيه بالسبب المحتمل والحل المقترح والأولوية
4. إصلاح تلقائي — محاولة إصلاح المشاكل البسيطة (إعادة ضبط webhook)
5. تقارير صحة النظام
ردودك قصيرة وحازمة. استخدم الإيموجي باعتدال (👁️ 🟢 🟠 🔴).`;

// ============ أدوات مساعدة ============

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}
function cairoHour(){try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}}
function cairoHM(){try{const s=new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit',minute:'2-digit'});const p=s.split(':');return{h:parseInt(p[0],10),m:parseInt(p[1],10)}}catch(e){return{h:-1,m:-1}}}

async function hit(url,opts){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),20000);
  const t0=Date.now();
  try{
    const res=await fetch(url,{...opts,signal:ctl.signal});
    const body=await res.text();
    return{ok:true,status:res.status,body,ms:Date.now()-t0};
  }catch(e){
    return{ok:false,status:0,body:'',ms:Date.now()-t0,err:(e&&e.name==='AbortError')?'Timeout':(e&&e.name)||'FetchError'};
  }finally{clearTimeout(timer)}
}

async function tgSend(env,text,chatId){
  const cid=chatId||env.TELEGRAM_CHAT_ID;
  if(!env.TELEGRAM_BOT_TOKEN||!cid)return{sent:false};
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:true})});
    const j=await r.json();
    return{sent:!!j.ok};
  }catch(e){return{sent:false}}
}

async function callGemini(env,systemPrompt,userMessage){
  for(const model of GEMINI_MODELS){
    try{
      const r=await fetch(GEMINI_BASE+model+':generateContent?key='+env.GEMINI_KEY,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:systemPrompt}]},
          contents:[{role:'user',parts:[{text:userMessage}]}],
          generationConfig:{temperature:0.4,maxOutputTokens:600}
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

async function supaRpc(env,fn,body){
  const key=env.SUPABASE_SECRET||SUPABASE_KEY;
  const r=await hit(SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  if(!r.ok)return null;
  try{return JSON.parse(r.body)}catch(e){return null}
}

// ============ الفحوصات ============

async function checkHttp(name,url){
  const r=await hit(url);
  if(r.ok&&r.status===200)return{name,up:true,ms:r.ms,detail:'HTTP 200 ('+(r.ms/1000).toFixed(2)+'s)'};
  if(r.ok)return{name,up:false,ms:r.ms,detail:'HTTP '+r.status};
  return{name,up:false,ms:r.ms,detail:r.err||'فشل'};
}

async function checkBrain(url){
  const r=await hit(url+'/requests');
  if(!r.ok)return{name:'العقل (Brain)',up:false,ms:r.ms,detail:r.err||'فشل'};
  if(r.status!==200)return{name:'العقل (Brain)',up:false,ms:r.ms,detail:'HTTP '+r.status};
  try{
    const data=JSON.parse(r.body);
    if(!data.ok)return{name:'العقل (Brain)',up:false,ms:r.ms,detail:'استجابة غير سليمة'};
    return{name:'العقل (Brain)',up:true,ms:r.ms,detail:'HTTP 200 ('+(r.ms/1000).toFixed(2)+'s)'};
  }catch(e){return{name:'العقل (Brain)',up:false,ms:r.ms,detail:'JSON غير صالح'}}
}

async function checkRania(url){
  const r=await hit(url+'/');
  if(!r.ok)return{name:'رانيا',up:false,ms:r.ms,detail:r.err||'فشل'};
  if(r.status!==200)return{name:'رانيا',up:false,ms:r.ms,detail:'HTTP '+r.status};
  try{
    const data=JSON.parse(r.body);
    if(data.ok&&data.name==='khidmaty-rania')return{name:'رانيا',up:true,ms:r.ms,detail:'شغّالة v'+(data.version||'1.0')};
    return{name:'رانيا',up:false,ms:r.ms,detail:'استجابة غير متوقعة'};
  }catch(e){return{name:'رانيا',up:false,ms:r.ms,detail:'JSON غير صالح'}}
}

async function checkTelegram(env){
  if(!env.TELEGRAM_BOT_TOKEN)return null;
  const r=await hit('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/getMe');
  if(!r.ok)return{name:'بوت التليجرام',up:false,ms:r.ms,detail:r.err||'فشل'};
  if(r.status!==200)return{name:'بوت التليجرام',up:false,ms:r.ms,detail:'HTTP '+r.status};
  try{
    const data=JSON.parse(r.body);
    if(data.ok)return{name:'بوت التليجرام',up:true,ms:r.ms,detail:'getMe سليم ('+(data.result.username||'bot')+')'};
    return{name:'بوت التليجرام',up:false,ms:r.ms,detail:'getMe فاشل'};
  }catch(e){return{name:'بوت التليجرام',up:false,ms:r.ms,detail:'JSON غير صالح'}}
}

async function checkSupabase(){
  const r=await hit(SUPABASE_URL+'/rest/v1/',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
  if(!r.ok)return{name:'Supabase',up:false,ms:r.ms,detail:r.err||'فشل'};
  if(r.status===200||r.status===404||r.status===401)return{name:'Supabase',up:true,ms:r.ms,detail:'متجاوب ('+(r.ms/1000).toFixed(2)+'s)'};
  return{name:'Supabase',up:false,ms:r.ms,detail:'HTTP '+r.status};
}

async function runChecks(env){
  const results=[
    await checkHttp('الموقع',SITE_URL),
    await checkHttp('المقالات',ARTICLES_URL),
    await checkHttp('المكاتب',OFFICES_URL),
    await checkBrain(BRAIN_URL),
    await checkRania(RANIA_URL),
  ];
  const tg=await checkTelegram(env);
  if(tg)results.push(tg);
  results.push(await checkSupabase());
  const ups=results.filter(r=>r.up).length;
  const status=ups===results.length?'ok':(ups===0?'down':'partial');
  return{results,status,ups:ups,total:results.length};
}

// ============ تحليل AI للشذوذ ============

async function analyzeHealth(env,results,status){
  if(status==='ok'&&!hasAnomaly(results))return null;
  const summary=results.map(r=>(r.up?'✅':'❌')+' '+r.name+': '+r.detail+' ('+(r.ms/1000).toFixed(2)+'s)').join('\n');
  const prompt=`تحليل فحص نظام خِدْمَتي AI:
${summary}
الحالة: ${status==='ok'?'سليم':status==='partial'?'جزئي':'واقعة بالكامل'}

حلل المشاكل، اكتب تنبيه ذكي قصير يحتوي على:
1. السبب المحتمل لكل مشكلة
2. الحل المقترح
3. مستوى الأولوية (عالية/متوسطة/منخفضة)
ردك بالمصري، قصير ومباشر.`;
  return await callGemini(env,SAHER_SYSTEM,prompt);
}

function hasAnomaly(results){
  // رصد البطء الشديد حتى لو الصفحة شغالة
  return results.some(r=>r.up&&r.ms>5000);
}

// ============ الإصلاح التلقائي ============

async function attemptRepair(env,results){
  const repairs=[];
  // لو بوت التليجرام واقع → إعادة ضبط webhook لرانيا
  const tg=results.find(r=>r.name==='بوت التليجرام');
  if(tg&&!tg.up&&env.TELEGRAM_BOT_TOKEN&&env.RANIA_WEBHOOK_URL){
    try{
      const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/setWebhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:env.RANIA_WEBHOOK_URL+'/webhook',allowed_updates:['message']})});
      const j=await r.json();
      repairs.push('إعادة ضبط webhook تيلجرام: '+(j.ok?'✅ نجح':'❌ فشل'));
    }catch(e){repairs.push('إعادة ضبط webhook: ❌ خطأ')}
  }
  // لو الموقع واقع → محاولة تفعيل GitHub Pages (ملاحظة بس)
  const site=results.find(r=>r.name==='الموقع');
  if(site&&!site.up){
    repairs.push('الموقع واقع — GitHub Pages بيشتغل تلقائي، ننتظر دقيقة ونفحص تاني');
  }
  return repairs;
}

// ============ منطق التنبيه ============

async function getState(env){return await supaRpc(env,'watchdog_get_state',{})}
async function setState(env,alertAt,status){return await supaRpc(env,'watchdog_set_state',{p_last_alert_at:alertAt,p_status:status})}

function buildBasicAlert(status,results){
  let header;
  if(status==='down')header='🔴 خِدْمَتي AI واقعة بالكامل — كل الأنظمة مش راضية ترد';
  else if(status==='partial')header='🟠 تحذير جزئي في خِدْمَتي AI — فيه أنظمة واقعة';
  else header='🟢 خِدْمَتي AI رجعت طبيعي — كل الأنظمة شغالة';
  const lines=results.map(r=>(r.up?'✅ ':'❌ ')+r.name+': '+r.detail).join('\n');
  return header+'\n'+lines+'\n'+stamp();
}

async function runSaher(env){
  const{results,status,ups,total}=await runChecks(env);
  const prev=await getState(env);
  const aiAnalysis=await analyzeHealth(env,results,status);
  let alertText=null;

  if(status!=='ok'){
    const last=prev&&prev.last_alert_at?new Date(prev.last_alert_at).getTime():0;
    if(!prev||!last||(Date.now()-last)>REALERT_MS||(prev.last_status==='ok')){
      if(aiAnalysis){
        let header=status==='down'?'🔴 تنبيه ذكي من ساهر':'🟠 تنبيه ذكي من ساهر';
        alertText=header+'\n\n'+aiAnalysis+'\n\n'+stamp();
      }else{
        alertText=buildBasicAlert(status,results);
      }
    }
  }else if(prev&&prev.last_status&&prev.last_status!=='ok'){
    alertText=buildBasicAlert(status,results);
  }

  // إصلاح تلقائي
  let repairs=[];
  if(status!=='ok'){
    repairs=await attemptRepair(env,results);
    if(repairs.length>0&&alertText){
      alertText+='\n\n🔧 إصلاح تلقائي:\n'+repairs.join('\n');
    }
  }

  let sent=false;
  if(alertText&&env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID){
    const send=await tgSend(env,alertText);
    sent=send.sent;
  }

  const newAlertAt=(alertText&&sent)?new Date().toISOString():(prev&&prev.last_alert_at)||null;
  await setState(env,newAlertAt,status);

  return{status,results,ups,total,alerted:!!alertText,sent,aiAnalysis,repairs};
}

// ============ تقرير الصباح ============

async function morningHealth(env){
  const{results,status,ups,total}=await runChecks(env);
  let text='☀️ <b>تقرير صحة النظام — ساهر</b> 👁️\n';
  text+='═══════════════\n';
  text+=`الأنظمة الشغالة: ${ups}/${total}\n\n`;
  results.forEach(r=>{
    text+=(r.up?'✅':'❌')+' '+r.name+': '+r.detail+'\n';
  });

  // تحليل AI للصحة العامة
  if(env.GEMINI_KEY){
    const summary=results.map(r=>(r.up?'✅':'❌')+' '+r.name+' ('+(r.ms/1000).toFixed(2)+'s)').join('\n');
    const ai=await callGemini(env,SAHER_SYSTEM,'تقرير صباحي للنظام:\n'+summary+'\nحالة عامة: '+status+'\nاكتب تقييم قصير لصحة النظام وتوصية واحدة للمضي. بالمصري.');
    if(ai){
      text+='\n📊 <b>تقييم ساهر:</b>\n'+ai+'\n';
    }
  }

  text+='\nيوم سليم يا ملك 👁️\n— ساهر | '+stamp();
  await tgSend(env,text);
}

// ============ طمنة الليل ============

async function nightCheckin(env,status){
  if(status!=='ok'||!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return;
  const t=cairoHM();
  if(t.h!==0||t.m>=30)return;
  await tgSend(env,'🌙 طمنة من ساهر: كل أنظمة خِدْمَتي شغالة تمام — خلصت كتابتك النهاردة؟ نام مرتاح يا ملك.\n— ساهر، حارس الليل 🌙');
}

// ============ Export ============

export default{
  async scheduled(event,env,ctx){
    const h=cairoHour();
    // تقرير صباحي الساعة 8 الصبح
    if(h===8){ctx.waitUntil(morningHealth(env));return}
    // باقي الساعات: مراقبة عادية
    ctx.waitUntil(runSaher(env).then(r=>nightCheckin(env,r.status).then(()=>r)));
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/check'){
      const{results,status,ups,total}=await runChecks(env);
      return new Response(JSON.stringify({ok:true,guardian:'saher',status,ups,total,results,checked_at:stamp()},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/run'){
      const r=await runSaher(env);
      await nightCheckin(env,r.status);
      return new Response(JSON.stringify({ok:true,guardian:'saher',ran:true,status:r.status,ups:r.ups,total:r.total,alerted:r.alerted,sent:r.sent,aiAnalysis:r.aiAnalysis,repairs:r.repairs,results:r.results,checked_at:stamp()},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/report'){
      await morningHealth(env);
      return new Response(JSON.stringify({ok:true,sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/health'){
      const{results,status,ups,total}=await runChecks(env);
      let html='<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ساهر — خِدْمَتي AI</title>';
      html+='<style>body{font-family:system-ui;max-width:600px;margin:0 auto;padding:20px;background:#0d1117;color:#c9d1d9}h1{color:#58a6ff}.ok{color:#3fb950}.bad{color:#f85149}.partial{color:#d29922}div{padding:10px;margin:8px 0;border-radius:8px;background:#161b22}</style></head><body>';
      html+='<h1>👁️ ساهر — الحارس الذكي</h1>';
      const cls=status==='ok'?'ok':status==='down'?'bad':'partial';
      html+='<div>الحالة العامة: <span class="'+cls+'">'+(status==='ok'?'🟢 سليم':status==='down'?'🔴 واقعة':'🟠 جزئي')+'</span> ('+ups+'/'+total+')</div>';
      results.forEach(r=>{
        html+='<div><span class="'+(r.up?'ok':'bad')+'">'+(r.up?'✅':'❌')+'</span> <b>'+r.name+'</b> — '+r.detail+'</div>';
      });
      html+='<div style="text-align:center;color:#8b949e;font-size:0.85em">ساهر v1.0 — '+stamp()+'</div>';
      html+='</body></html>';
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    }

    const prev=await getState(env);
    return new Response(JSON.stringify({ok:true,guardian:'saher',version:'1.0',last_state:prev,hint:'/check فحص فوري | /run فحص+تنبيه | /report تقرير صباحي | /health صفحة صحة'},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
