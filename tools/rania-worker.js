// ============================================================
// رانيا — مديرة المحتوى + السكرتيرة على تيليجرام
// Cloudflare Worker — تفاعلي بـGemini AI + صباحية مجدولة
// النشر: wrangler deploy --config tools/rania-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SECRET (اختياري)
// ============================================================

const SUPABASE_URL = 'https://puhdastfiswcmbnczvwx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
const BRAIN_URL = 'https://khidmaty-agent.semohabiby7.workers.dev';
const SITE_URL = 'https://khidmatyai.com/';

const RANIA_SYSTEM = `أنتِ رانيا، مديرة المحتوى والسكرتيرة الشخصية لمحمد إسماعيل مؤسس منصة خِدْمَتي AI.
بتتكلمي بالمصري الدارج بثقة ودفء. محمد بيناديك "يا رانيا" وانتِ تناديه "يا ملك".
دورك:
1. المحتوى: اقتراح أفكار مقالات، متابعة تقويم النشر، تحسين SEO، تلخيص الأداء
2. السكرتارية: تنظيم المهام، التذكيرات، المواعيد، التقارير
3. المتابعة: أداء الموقع، إحصائيات، تنبيهات
منصة خِدْمَتي AI بتقدّم خدمات حكومية مصرية. الموقع فيه 40 مقال + 913 مكتب حكومي على الخريطة.
ردودك قصيرة ومباشرة، بلهجة مصرية ودودة. استخدمي الإيموجي باعتدال.`;

// ============ أدوات مساعدة ============

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}
function cairoHour(){try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}}
function cairoDate(){try{return new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'})}catch(e){return new Date().toISOString().slice(0,10)}}

async function tgSend(env,text,chatId){
  const cid=chatId||env.TELEGRAM_CHAT_ID;
  if(!env.TELEGRAM_BOT_TOKEN||!cid)return{sent:false,reason:'no_secrets'};
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:false})});
    const j=await r.json();
    return{sent:!!j.ok};
  }catch(e){return{sent:false,reason:(e&&e.name)||'Error'}}
}

async function tgSetWebhook(env,url){
  if(!env.TELEGRAM_BOT_TOKEN)return{ok:false,reason:'no_token'};
  try{
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/setWebhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url+'/webhook',allowed_updates:['message']})});
    return await r.json();
  }catch(e){return{ok:false,error:String(e)}}
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
          generationConfig:{temperature:0.7,maxOutputTokens:800}
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

// ============ Supabase ============

async function supaGet(env,path){
  const key=env.SUPABASE_SECRET||SUPABASE_KEY;
  try{
    const r=await fetch(SUPABASE_URL+path,{headers:{apikey:key,Authorization:'Bearer '+key}});
    if(r.status===200)return await r.json();
  }catch(e){}
  return null;
}

async function supaPost(env,path,body){
  const key=env.SUPABASE_SECRET||SUPABASE_KEY;
  try{
    const r=await fetch(SUPABASE_URL+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    return await r.json();
  }catch(e){}
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

// ============ الأوامر ============

async function cmdReport(env,chatId){
  let text='📊 <b>تقرير سريع — رانيا</b>\n\n';
  // إحصائيات من Brain
  const stats=await brainGet('/stats');
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    text+='📈 زيارات النهاردة: '+s.visitsToday+' | الإجمالي: '+s.visitsTotal+'\n';
    text+='👤 مسجلين النهاردة: '+s.usersToday+' | الإجمالي: '+s.usersTotal+'\n';
    text+='💼 مقدمي الخدمات: '+s.providersTotal+'\n';
  }else{
    text+='📈 البيانات مش متاحة دلوقتي\n';
  }
  text+='\n📄 المقالات: 40 مقال (كلها بإنفوجرافيك)\n';
  text+='🗺️ المكاتب: 913 مكتب حكومي\n';
  text+='\n— رانيا 📝 | '+stamp();
  await tgSend(env,text,chatId);
}

async function cmdContent(env,chatId){
  const prompt='اقترحي 5 أفكار مقالات جديدة لمنصة خِدْمَتي AI (خدمات حكومية مصرية). الموقع فيه 40 مقال بالفعل في: مرور، أحوال مدنية، جوازات، تأمينات، ضرائب، شركات، تعليم، شهر عقاري. اقترحي مواضيع ناقصة أو حصرية. ردك بالمصري، كل فكرة في سطر واحد.';
  const ai=await callGemini(env,RANIA_SYSTEM,prompt);
  if(ai){
    await tgSend(env,'💡 <b>أفكار محتوى جديدة:</b>\n\n'+ai+'\n\n— رانيا 📝',chatId);
  }else{
    await tgSend(env,'ما قدرتش أجيب أفكار دلوقتي يا ملك، Gemini مش راضي 😅\n— رانيا',chatId);
  }
}

async function cmdHelp(env,chatId){
  const text='👋 <b>رانيا في خدمتك يا ملك</b>\n\n<b>الأوامر:</b>\n/تقرير — إحصائيات سريعة للموقع\n/محتوى — أفكار مقالات جديدة\n/تذكير [نص] — ضبط تذكير\n/مهام — قائمة المهام\n/حاله — حالة النظام\n\nأو اكتب أي حاجة وهرد عليك 📝';
  await tgSend(env,text,chatId);
}

async function cmdReminder(env,chatId,text){
  const reminder=text.replace(/^\/تذكير\s*/,'').trim();
  if(!reminder){
    await tgSend(env,'اكتب التذكير بعد الأمر، مثلاً:\n/تذكير كلم بنك مصر بكرة',chatId);
    return;
  }
  // حفظ في Supabase لو الجدول موجود
  const saved=await supaPost(env,'/rest/v1/reminders',{text:reminder,created_at:new Date().toISOString(),done:false});
  await tgSend(env,'✅ سجّلت التذكير يا ملك:\n"'+reminder+'"\n— رانيا 📝',chatId);
}

async function cmdTasks(env,chatId){
  const tasks=await supaGet(env,'/rest/v1/reminders?done=eq.false&order=created_at.asc&limit=10');
  if(tasks&&Array.isArray(tasks)&&tasks.length>0){
    let text='📋 <b>مهام معلّقة:</b>\n\n';
    tasks.forEach((t,i)=>{text+=(i+1)+'. '+t.text+'\n'});
    text+='\n— رانيا 📝';
    await tgSend(env,text,chatId);
  }else{
    await tgSend(env,'مفيش مهام معلّقة دلوقتي يا ملك ✅\n— رانيا',chatId);
  }
}

async function cmdStatus(env,chatId){
  // فحص الموقع + Brain
  let text='🔍 <b>فحص سريع للنظام:</b>\n\n';
  try{
    const sr=await fetch(SITE_URL,{signal:AbortSignal.timeout(8000)});
    text+='🌐 الموقع: '+(sr.status===200?'✅ شغّال':'❌ HTTP '+sr.status)+'\n';
  }catch(e){text+='🌐 الموقع: ❌ ما وصلش\n'}
  const brain=await brainGet('/');
  if(brain&&brain.status==='running'){
    text+='🧠 العقل: ✅ Phase '+brain.phase+' ('+brain.kb_services+' خدمة)\n';
  }else{text+='🧠 العقل: ❌ مش راضي\n'}
  text+='\n— رانيا 📝 | '+stamp();
  await tgSend(env,text,chatId);
}

// ============ رد ذكي على أي رسالة ============

async function handleAI(env,chatId,text){
  // لو الرسالة قصيرة ومفيهاش سؤال مباشر، رد بسيط
  const prompt='رسالة من محمد (الملك): "'+text+'"\n\nردّي كرانيا (مديرة المحتوى والسكرتيرة) بشكل طبيعي وقصير. لو سؤال عن خدمات حكومية، جاوبي باختصار واقترحي الموقع. لو تحية، سلّمي. لو طلب محتوى أو تقرير، جاوبي.';
  const ai=await callGemini(env,RANIA_SYSTEM,prompt);
  if(ai){
    await tgSend(env,ai,chatId);
  }else{
    await tgSend(env,'سمعتك يا ملك بس Gemini مش متاح دلوقتي 🙁\n— رانيا',chatId);
  }
}

// ============ الصباحية المجدولة ============

async function morningBriefing(env){
  let text='☀️ <b>صباح الخير يا ملك</b>\nصباحية خِدْمَتي AI — رانيا 📝\n';
  text+='═══════════════\n';

  // إحصائيات
  const stats=await brainGet('/stats');
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    text+='📈 زيارات النهاردة: '+s.visitsToday+' | الإجمالي: '+s.visitsTotal+'\n';
    text+='👤 مسجلين النهاردة: '+s.usersToday+' | الإجمالي: '+s.usersTotal+'\n';
    text+='💼 مقدمين: '+s.providersTotal+'\n';
  }

  // تقرير Brain
  const rep=await brainGet('/report');
  if(rep&&rep.report){
    text+='\n📋 <b>تقرير العقل:</b>\n'+rep.report.slice(0,500)+'\n';
  }

  // مهام معلّقة
  const tasks=await supaGet(env,'/rest/v1/reminders?done=eq.false&order=created_at.asc&limit=5');
  if(tasks&&Array.isArray(tasks)&&tasks.length>0){
    text+='\n📌 <b>تذكيرات:</b>\n';
    tasks.forEach((t,i)=>{text+=(i+1)+'. '+t.text+'\n'});
  }

  text+='\nيوم سعيد يا صاحب الشركة 🐝\n— رانيا 📝 | '+stamp();
  await tgSend(env,text);
}

// ============ معالج رسائل تيليجرام ============

async function handleUpdate(env,update){
  if(!update.message||!update.message.text)return;
  const text=update.message.text;
  const chatId=update.message.chat.id;

  // التحقق إن الرسالة من الأدمن
  if(env.TELEGRAM_CHAT_ID&&String(chatId)!==String(env.TELEGRAM_CHAT_ID)){
    return; // رسائل من غير الأدمن — تجاهل
  }

  try{
    if(text==='/تقرير'||text==='/report'){await cmdReport(env,chatId)}
    else if(text.startsWith('/محتوى')||text==='/content'){await cmdContent(env,chatId)}
    else if(text.startsWith('/تذكير')){await cmdReminder(env,chatId,text)}
    else if(text==='/مهام'||text==='/tasks'){await cmdTasks(env,chatId)}
    else if(text==='/حاله'||text==='/status'){await cmdStatus(env,chatId)}
    else if(text==='/مساعده'||text==='/help'||text=='/start'){await cmdHelp(env,chatId)}
    else{await handleAI(env,chatId,text)}
  }catch(e){
    await tgSend(env,'حصل خطأ بسيط يا ملك، جرب تاني 🙏\n— رانيا',chatId);
  }
}

// ============ Export ============

export default{
  async scheduled(event,env,ctx){
    const h=cairoHour();
    // صباحية 9 الصبح
    if(h===9){ctx.waitUntil(morningBriefing(env))}
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/webhook'&&request.method==='POST'){
      // استقبال رسائل تيليجرام
      try{
        const update=await request.json();
        ctx.waitUntil(handleUpdate(env,update));
        return new Response('ok',{status:200});
      }catch(e){
        return new Response('error',{status:200}); // Telegram يتوقع 200
      }
    }

    if(path==='/test'){
      const r=await tgSend(env,'رانيا في الخدمة يا ملك 📝✨\nكل حاجة تمام، اكتب لي أي وقت.',undefined);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/setup'){
      const r=await tgSetWebhook(env,url.origin);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/morning'){
      await morningBriefing(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,name:'khidmaty-rania',version:'1.0',hint:'/test للتجربة، /setup لضبط الـwebhook، /morning للصباحية'},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
}
