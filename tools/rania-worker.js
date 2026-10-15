// ============================================================
// رانيا — مديرة المحتوى على تيليجرام
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

// رانيا — الواجهة العامة للمنصة (متعددة اللغات + محترفة)
const RANIA_PUBLIC_SYSTEM = `You are Rania (رانيا), the intelligent virtual assistant for the Khidmaty AI platform (khidmatyai.com).

CRITICAL ACCURACY RULES — MOST IMPORTANT:
1. NEVER fabricate, invent, or guess information. Every fact you state must be verifiable from official Egyptian government sources or the platform's own verified content.
2. If you are not 100% certain about a fee, a document requirement, a process step, a deadline, or a location — say clearly: "I am not sure about this specific detail. Please verify on the official website or contact the relevant authority."
3. NEVER give specific numbers (fees, durations, office addresses) unless you are confident they are correct. General guidance is better than wrong specifics.
4. If information might be outdated, add: "Please confirm this information as it may have changed."
5. Always encourage users to verify with official sources. Suggest checking the official government website or calling the relevant authority.
6. Do not present assumptions as facts. Distinguish clearly between what you know and what you are uncertain about.

LANGUAGE RULES:
7. Detect the language of the user's message and ALWAYS reply in the SAME language. Arabic->Arabic, English->English, French->French, etc.
8. Tone: Professional, respectful, warm, and clear. You represent the platform.
9. Keep replies SHORT and to the point. Maximum 3-4 sentences unless the user asks for details.

PLATFORM KNOWLEDGE (verified facts only):
10. Khidmaty AI is an Egyptian platform offering government services guidance.
11. The platform has 73 articles and 888 government offices on the map.
12. There is an online store selling the "Mind Power" book series by Mohamed Ismail.
13. Store URL: khidmatyai.com/store.html
14. 4 books completed in the series (Parts 1-4).

BEHAVIOR:
15. IF asked about government services: Give general guidance only. Advise the user to check the specific service page on the website for verified details (documents, fees, steps).
16. IF asked about books/store: Describe the Mind Power series briefly and direct to the store.
17. IF greeting: Respond warmly in the same language.
18. IF you don't know: Say so honestly. Never make up an answer.
19. NEVER ask for sensitive data (national ID, passwords, etc).
20. Be interactive — ask follow-up questions to guide the user.
21. When unsure, prefer directing the user to the website (khidmatyai.com) over giving unverified information.`;

const RANIA_SYSTEM = `أنتِ رانيا، مديرة المحتوى في منصة خِدْمَتي AI. بتشتغلي في فريق ماكرون — مرات الملك ومديرته التنفيذية.
بتتكلمي بالمصري الدارج بثقة ودفء. محمد بيناديك "يا رانيا" وانتِ تناديه "يا ملك".
دورك:
1. المحتوى: اقتراح أفكار مقالات، متابعة تقويم النشر، تحسين SEO، تلخيص الأداء
2. المتابعة: أداء الموقع، إحصائيات، تنبيهات
3. تقويم النشر: جدولة المقالات، اقتراح مواضيع حسب الموسم والأحداث
4. SEO: اقتراح كلمات مفتاحية، تحسين العناوين، تحليل ترتيب البحث
منصة خِدْمَتي AI بتقدّم خدمات حكومية مصرية. الموقع فيه 73 مقال + 888 مكتب حكومي على الخريطة.
ردودك قصيرة ومباشرة، بلهجة مصرية ودودة. استخدمي الإيموجي باعتدال.

قاعدة الدقة (الأهم):
- ما تطلعيش معلومة من دماغك. أي رقم أو رسم أو خطوة أو عنوان لازم يكون مؤكد.
- لو مش متأكدة من تفصيلة قولي بصراحة "مش متأكدة، اتأكد من المصدر الرسمي"
- فضّلي توجيه الملك للموقع على إعطاء معلومات غير مؤكدة

فريق العمل (حوّلي الملك لهم):
- 🧠 فكري → الداشبورد التحليلي: https://khidmaty-fkry.semohabiby7.workers.dev/dashboard
- 👁️ ساهر → صحة النظام: https://khidmaty-saher.semohabiby7.workers.dev/health
- 🛠️ ناجية → الإعلانات والبوستات (تنشر في @khdmatyai تلقائيًا)

قواعد:
1. لو طلب داشبورد/تحليل/إحصائيات → ابعتيله لينك فكري على طول.
2. لو طلب صحة النظام → ابعتيله لينك ساهر.
3. لو طلب إعلانات/بوستات → قوليله ناجية بتجهّرهم.
4. ما توعدش بحاجة مش هتعمليها — حوّلي وابعتي اللينك فورًا، ما تقوليش دقائق وتشوف.`;

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

// ============ CORS ============

function corsHeaders(){
  return{
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Content-Type':'application/json; charset=utf-8'
  };
}

// ============ كشف اللغة ============

function detectLang(text){
  // كشف سريع للغة من النص
  const ar=/[\u0600-\u06FF]/.test(text);
  if(ar)return'ar';
  const fr=/[àâäéèêëïîôöùûüç]/i.test(text)&&/\b(je|tu|il|nous|vous|bonjour|merci|salut)\b/i.test(text);
  if(fr)return'fr';
  const es=/[áéíóúñ¿¡]/.test(text)&&/\b(hola|gracias|por favor|buenos|como|que)\b/i.test(text);
  if(es)return'es';
  const de=/[äöüß]/.test(text)||/\b(ich|du|hallo|danke|bitte|guten)\b/i.test(text);
  if(de)return'de';
  // افتراضي: إنجليزي
  return'en';
}

// ============ Google TTS (مجاني — كل اللغات) ============

async function googleTTS(text,lang){
  // Google Translate TTS — مجاني ويدعم كل اللغات
  // بيرجع MP3
  try{
    // تقسيم النص الطويل إلى أجزاء (حد 200 حرف)
    const chunks=[];
    let remaining=text;
    while(remaining.length>200){
      let cut=remaining.lastIndexOf(' ',200);
      if(cut<50)cut=200;
      chunks.push(remaining.slice(0,cut).trim());
      remaining=remaining.slice(cut).trim();
    }
    if(remaining)chunks.push(remaining);
    
    if(chunks.length===1){
      const url='https://translate.google.com/translate_tts?ie=UTF-8&q='+encodeURIComponent(chunks[0])+'&tl='+lang+'&client=tw-ob';
      const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
      if(r.ok){
        const buf=await r.arrayBuffer();
        return new Uint8Array(buf);
      }
    }
    // لو نص طويل — ندمج الأجزاء
    const parts=[];
    for(const ch of chunks){
      const url='https://translate.google.com/translate_tts?ie=UTF-8&q='+encodeURIComponent(ch)+'&tl='+lang+'&client=tw-ob';
      const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
      if(r.ok){
        const buf=await r.arrayBuffer();
        parts.push(new Uint8Array(buf));
      }
    }
    if(parts.length===0)return null;
    // حساب الطول الكلي
    let total=0;
    parts.forEach(p=>total+=p.length);
    const merged=new Uint8Array(total);
    let offset=0;
    parts.forEach(p=>{merged.set(p,offset);offset+=p.length});
    return merged;
  }catch(e){return null}
}

// ============ إرسال صوت لتيلجرام ============

async function tgSendAudio(env,audioBytes,chatId,caption,lang){
  const cid=chatId||env.TELEGRAM_CHAT_ID;
  if(!env.TELEGRAM_BOT_TOKEN||!cid||!audioBytes)return{sent:false};
  try{
    const form=new FormData();
    form.append('chat_id',cid);
    form.append('audio',new Blob([audioBytes],{type:'audio/mpeg'}),'rania_voice.mp3');
    if(caption)form.append('caption',caption.slice(0,1000));
    form.append('performer','رانيا — Khidmaty AI');
    form.append('title','Rania Voice Reply');
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendAudio',{method:'POST',body:form});
    const j=await r.json();
    return{sent:!!j.ok};
  }catch(e){return{sent:false,error:String(e)}}
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
  text+='\n📄 المقالات: 73 مقال (كلها بإنفوجرافيك)\n';
  text+='🗺️ المكاتب: 888 مكتب حكومي\n';
  text+='\n— رانيا 📝 | '+stamp();
  await tgSend(env,text,chatId);
}

async function cmdContent(env,chatId){
  const prompt='اقترحي 5 أفكار مقالات جديدة لمنصة خِدْمَتي AI (خدمات حكومية مصرية). الموقع فيه 73 مقال بالفعل في: مرور، أحوال مدنية، جوازات، تأمينات، ضرائب، شركات، تعليم، شهر عقاري، كهرباء، مياه، غاز، بريد، محاكم، تكافل وكرامة. اقترحي مواضيع ناقصة أو حصرية. ردك بالمصري، كل فكرة في سطر واحد.';
  const ai=await callGemini(env,RANIA_SYSTEM,prompt);
  if(ai){
    await tgSend(env,'💡 <b>أفكار محتوى جديدة:</b>\n\n'+ai+'\n\n— رانيا 📝',chatId);
  }else{
    await tgSend(env,'ما قدرتش أجيب أفكار دلوقتي يا ملك، Gemini مش راضي 😅\n— رانيا',chatId);
  }
}

async function cmdSEO(env,chatId){
  const prompt='اقترح 5 كلمات مفتاحية عربية لمنصة خِدْمَتي AI (خدمات حكومية مصرية) عليها بحث عالي على Google مصر ومفيش منافس قوي فيها. الموقع فيه 73 مقال + 888 مكتب. ردك بالمصري، كل كلمة في سطر، مع تقدير حجم البحث (عالي/متوسط/منخفض).';
  const ai=await callGemini(env,RANIA_SYSTEM,prompt);
  if(ai){
    await tgSend(env,'🔍 <b>كلمات مفتاحية مقترحة:</b>\n\n'+ai+'\n\n— رانيا 📝',chatId);
  }else{
    await tgSend(env,'ما قدرشت أجيب كلمات دلوقتي يا ملك 😅\n— رانيا',chatId);
  }
}

async function cmdCalendar(env,chatId){
  const prompt='اقترح تقويم نشر لـ7 أيام لمنصة خِدْمَتي AI. كل يوم: موضوع مقال + نوع محتوى (مقال/إنفوجرافيك/فيديو) + منصة النشر. ردك بالمصري، منظم في جدول، قابل للتنفيذ.';
  const ai=await callGemini(env,RANIA_SYSTEM,prompt);
  if(ai){
    await tgSend(env,'📅 <b>تقويم نشر 7 أيام:</b>\n\n'+ai+'\n\n— رانيا 📝',chatId);
  }else{
    await tgSend(env,'ما قدرشت أجهز التقويم دلوقتي يا ملك 😅\n— رانيا',chatId);
  }
}

async function cmdHelp(env,chatId){
  const text='👋 <b>رانيا في خدمتك يا ملك</b>\n\n<b>الأوامر:</b>\n/تقرير — إحصائيات سريعة للموقع\n/محتوى — أفكار مقالات جديدة\n/seo — كلمات مفتاحية مقترحة\n/تقويم — تقويم نشر 7 أيام\n/تذكير [نص] — ضبط تذكير\n/مهام — قائمة المهام\n/حاله — حالة النظام\n\nأو اكتب أي حاجة وهرد عليك 📝';
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
  // كشف لغة الرسالة
  const lang=detectLang(text);
  // استخدم النظام المناسب: لو من تيلجرام (الملك) → المصري، لو لغة تانية → العام
  const sysPrompt=(lang==='ar')?RANIA_SYSTEM:RANIA_PUBLIC_SYSTEM;
  const prompt=(lang==='ar')
    ?'رسالة من محمد (الملك): "'+text+'"\n\nردّي كرانيا (مديرة المحتوى) بشكل طبيعي وقصير. لو سؤال عن خدمات حكومية، جاوبي باختصار واقترحي الموقع. لو تحية، سلّمي. لو طلب محتوى أو تقرير، جاوبي.'
    :'Message from user: "'+text+'"\n\nReply as Rania. Keep it short, professional, and helpful. Respond in the SAME language as the message.';
  const ai=await callGemini(env,sysPrompt,prompt);
  if(ai){
    // إرسال النص
    await tgSend(env,ai,chatId);
    // إرسال صوت (لو الرد قصير بما يكفي)
    try{
      const audio=await googleTTS(ai.replace(/<[^>]*>/g,'').slice(0,500),lang);
      if(audio){
        await tgSendAudio(env,audio,chatId,null,lang);
      }
    }catch(e){}
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
    else if(text.startsWith('/seo')||text.startsWith('/كلمات')){await cmdSEO(env,chatId)}
    else if(text.startsWith('/تقويم')||text.startsWith('/calendar')){await cmdCalendar(env,chatId)}
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

    // ====== رانيا على الموقع — chat endpoint ======
    if(path==='/chat'&&request.method==='POST'){
      try{
        const body=await request.json();
        const message=body.message||body.text||'';
        const history=body.history||[];
        const lang=detectLang(message);

        // بناء السياق من التاريخ
        let contextMsg=message;
        if(history&&history.length>0){
          const recent=history.slice(-6).map(h=>{
            const t=h.text||h.parts?.[0]?.text||'';
            return h.role==='user'?'User: '+t:'Rania: '+t;
          }).join('\n');
          contextMsg=recent+'\n\nUser: '+message;
        }

        const prompt=lang==='ar'
          ? 'رسالة من زائر المنصة: "'+message+'"\n\nردّي كرانيا (واجهة المنصة) بشكل احترافي ومحترم وقصير. ردّي بالعربي.'
          : 'Message from a website visitor: "'+message+'"\n\nReply as Rania (platform assistant). Keep it short, professional, and helpful. Respond in the SAME language as the message.';

        const ai=await callGemini(env,RANIA_PUBLIC_SYSTEM,prompt);
        if(ai){
          return new Response(JSON.stringify({response:ai,lang:lang}),{headers:corsHeaders()});
        }
        return new Response(JSON.stringify({response:'Sorry, I could not process your request right now. Please try again.',lang:lang,error:true}),{headers:corsHeaders(),status:200});
      }catch(e){
        return new Response(JSON.stringify({response:'Error',error:true}),{headers:corsHeaders()});
      }
    }

    // ====== CORS preflight ======
    if(request.method==='OPTIONS'){
      return new Response(null,{status:204,headers:corsHeaders()});
    }

    return new Response(JSON.stringify({ok:true,name:'khidmaty-rania',version:'2.0',features:['website-chat','telegram-voice','multilingual'],endpoints:['/chat','/webhook','/test','/setup','/morning','/speak']}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
}
