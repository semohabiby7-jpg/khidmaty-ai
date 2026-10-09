// ============================================================
// ناجية — مسؤولة الإعلانات والسكريبتات لخِدْمَتي AI
// Cloudflare Worker — إدارة حملات + تشغيل سكريبتات بـGemini AI
// النشر: wrangler deploy --config tools/nagi-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// ============================================================

const BRAIN_URL    = 'https://khidmaty-agent.semohabiby7.workers.dev';
const SITE_URL     = 'https://khidmatyai.com/';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];

// السكريبتات المعروفة في tools/
const SCRIPTS=[
  {name:'articles_batch1.py',desc:'مقالات الدفعة 1',cat:'محتوى'},
  {name:'articles_batch2a.py',desc:'مقالات الدفعة 2A',cat:'محتوى'},
  {name:'articles_batch2b.py',desc:'مقالات الدفعة 2B',cat:'محتوى'},
  {name:'articles_batch3.py',desc:'مقالات الدفعة 3',cat:'محتوى'},
  {name:'articles_batch4.py',desc:'مقالات الدفعة 4',cat:'محتوى'},
  {name:'build_epub.py',desc:'بناء ePub الكتاب',cat:'كتب'},
  {name:'build_pdf.py',desc:'بناء PDF الكتاب',cat:'كتب'},
  {name:'build_pdf_2.py',desc:'بناء PDF الكتاب 2',cat:'كتب'},
  {name:'build_pdf_en.py',desc:'بناء PDF الإنجليزي',cat:'كتب'},
  {name:'build_agent_kb.py',desc:'بناء قاعدة معرفة العقل',cat:'بنية'},
  {name:'test_agent_v3.mjs',desc:'اختبار العقل v3',cat:'بنية'},
];

const NAGI_SYSTEM = `أنتِ ناجية، مسؤولة الإعلانات والسكريبتات في منصة خِدْمَتي AI.
بتتكلمي بالمصري الدارج بدقة وحماس. محمد بيناديك "يا ناجية" وانتِ تناديه "يا ملك".
دورك:
1. الإعلانات — اقتراح حملات Google/Facebook/Instagram، نصوص إعلانية، استهداف، ميزانية، قياس ROI
2. السكريبتات — متابعة تشغيل سكريبتات tools/، اقتراح مواعيد تشغيل، كشف أخطاء
3. الأتمتة — جدولة المهام، تذكيرات تشغيل، ربط المهام بالنتائج
4. تقارير الأداء — تحليل نتائج الإعلانات والسكريبتات، توصيات للتحسين
منصة خِدْمَتي AI بتقدّم خدمات حكومية مصرية. الموقع فيه 40 مقال + 913 مكتب.
ردودكِ منظّمة وعملية، بخطوات تنفيذية واضحة. استخدمي الإيموجي باعتدال (🛠️ 📣 📊 ⚡).

ملاحظة مهمة جداً: التسجيل في خِدْمَتي AI مجاني 100٪. لازم تبرزي كلمة "مجاني" في كل بوست وإعلان كأول ميزة — دي أقوى نقطة بيع.`;

// ============ أدوات مساعدة ============

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}
function cairoHour(){try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}}
function cairoDay(){try{return new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',weekday:'short'})}catch(e){return ''}}

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
          generationConfig:{temperature:0.7,maxOutputTokens:900}
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

// ============ Brain ============

async function brainGet(path){
  try{
    const r=await fetch(BRAIN_URL+path);
    if(r.status===200)return await r.json();
  }catch(e){}
  return null;
}

// ============ أوامر الإعلانات ============

async function cmdAdPlan(env,platform){
  const prompt='اقترح خطة إعلانية شاملة لمنصة خِدْمَتي AI (خدمات حكومية مصرية)'+(platform?' على '+platform:'')+':\n1. الأهداف (وعي/زيارات/تسجيل)\n2. الجمهور المستهدف (عمر/اهتمامات/جغرافيا)\n3. أنواع الإعلانات (نصي/صورة/فيديو)\n4. نص 3 إعلانات جاهزة (عناوين + وصف + CTA)\n5. الميزانية المقترحة يوميًا\n6. KPIs للقياس\nردك بالمصري، منظّم، قابل للتنفيذ.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

async function cmdAdCopy(env,product){
  const prompt='اكتب 5 نصوص إعلانية جذابة لـ"'+(product||'منصة خِدْمَتي AI')+'":\n- 2 لفيسبوك/انستجرام (مع emoji + CTA)\n- 2 لجوجل (عنوان قصير + وصف)\n- 1 لتيلجرام (مختصر ودود)\nردك بالمصري، كل نص في بلوك منفصل.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

async function cmdAdTarget(env){
  const prompt='حدّد الجمهور المستهدف لمنصة خِدْمَتي AI بدقة:\n1. شرائح الجمهور (3-5 شرائح)\n2. لكل شريحة: العمر/الجنس/الاهتمامات/السلوك\n3. التوقيت الأمثل للنشر\n4. الاستهداف الجغرافي (محافظات الأولوية)\nردك بالمصري، منظّم.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

async function cmdAdReport(env){
  const stats=await brainGet('/stats');
  let dataLine='مفيش بيانات إعلانات حالية.';
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    dataLine='زيارات اليوم: '+s.visitsToday+' | الإجمالي: '+s.visitsTotal+'\nمسجلين اليوم: '+s.usersToday+' | الإجمالي: '+s.usersTotal;
  }
  const prompt='بيانات الموقع:\n'+dataLine+'\n\nاكتب تقرير أداء إعلانات افتراضي لمنصة خِدْمَتي AI:\n1. تحليل الزيارات الحالية\n2. نسبة التحويل المقدرة\n3. تكلفة الاكتساب المتوقعة\n4. توصيات لتحسين الأداء\nردك بالمصري، منظّم.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

// ============ أوامر السكريبتات ============

function cmdScriptsList(){
  const cats={};
  SCRIPTS.forEach(s=>{if(!cats[s.cat])cats[s.cat]=[];cats[s.cat].push(s)});
  let text='⚙️ <b>سكريبتات خِدْمَتي AI</b>\n═══════════════\n';
  Object.keys(cats).forEach(cat=>{
    text+='\n<b>'+cat+':</b>\n';
    cats[cat].forEach(s=>{text+='• '+s.name+' — '+s.desc+'\n'});
  });
  text+='\n<b>التشغيل:</b> /run/اسم_السكريبت\n— ناجية 🛠️ | '+stamp();
  return text;
}

async function cmdScriptAdvice(env){
  const list=SCRIPTS.map(s=>'• '+s.name+' ('+s.cat+') — '+s.desc).join('\n');
  const prompt='قائمة سكريبتات منصة خِدْمَتي AI:\n'+list+'\n\nاقترح:\n1. مواعيد تشغيل مثالية لكل سكريبت (يومي/أسبوعي/شهري)\n2. أي سكريبت يحتاج تحديث\n3. سكريبتات ناقصة لازم نضيفها\nردك بالمصري، منظّم بنقاط.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

// ============ الصباحية ============

async function morningBriefing(env){
  let text='🛠️ <b>صباح العمليات يا ملك</b>\nصباحية ناجية — خِدْمَتي AI\n';
  text+='═══════════════\n';
  // إحصائيات
  const stats=await brainGet('/stats');
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    text+='📈 زيارات اليوم: '+s.visitsToday+' | الإجمالي: '+s.visitsTotal+'\n';
    text+='👤 مسجلين اليوم: '+s.usersToday+' | الإجمالي: '+s.usersTotal+'\n';
  }
  text+='\n⚙️ السكريبتات المتاحة: '+SCRIPTS.length+'\n';
  text+='📣 الإعلانات: لسه مش مفعّلة — جاهز لما تطلب\n';
  // توصية AI
  if(env.GEMINI_KEY){
    const prompt='اكتب صباحية عمليات قصيرة لمنصة خِدْمَتي AI:\n1. مهمة تشغيل واحدة لليوم (سكريبت محدد)\n2. تذكير إعلاني واحد\n3. أتمتة مقترحة\nردك بالمصري، قصير (4-6 أسطر).';
    const ai=await callGemini(env,NAGI_SYSTEM,prompt);
    if(ai){text+='\n⚡ <b>توصية ناجية:</b>\n'+ai+'\n'}
  }
  text+='\nنهضّي المنصة سوا يا ملك 🛠️\n— ناجية | '+stamp();
  await tgSend(env,text);
}

// ============ تقرير أسبوعي للعمليات ============

async function weeklyOps(env){
  const stats=await brainGet('/stats');
  let text='📊 <b>تقرير عمليات أسبوعي — ناجية 🛠️</b>\n';
  text+='═══════════════\n';
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    text+='📈 زيارات: '+s.visitsTotal+'\n👤 مستخدمين: '+s.usersTotal+'\n';
  }
  text+='⚙️ سكريبتات: '+SCRIPTS.length+' سكريبت\n\n';
  if(env.GEMINI_KEY){
    const prompt='اكتب تقرير عمليات أسبوعي لمنصة خِدْمَتي AI:\n1. ملخص تشغيل السكريبتات\n2. أداء الإعلانات (لو موجود)\n3. مهام أتمتة للأسبوع الجاي\n4. توصية واحدة\nردك بالمصري، منظّم.';
    const ai=await callGemini(env,NAGI_SYSTEM,prompt);
    if(ai){text+='📋 <b>التحليل:</b>\n'+ai+'\n\n'}
  }
  text+='أسبوع منتج يا ملك 🛠️\n— ناجية | '+stamp();
  await tgSend(env,text);
}

// ============ حملة إعلانية كاملة ============

async function cmdCampaign(env,goal){
  const prompt='جهّزي حملة إعلانية كاملة لمنصة خِدْمَتي AI (خدمات حكومية مصرية). الهدف: '+(goal||'زيادة الوعي والزيارات')+'.\n\nاكتبي:\n1. اسم الحملة + المدة (أسبوعين)\n2. الميزانية الكلية + اليومية (بالجنيه)\n3. المنصات: فيسبوك + انستجرام + جوجل + تيلجرام\n4. 10 نصوص إعلانية متنوعة (5 قصيرة + 5 طويلة) جاهزة للنسخ\n5. 15 هاشتاج متناسق\n6. الجمهور المستهدف (3 شرائح)\n7. جدول النشر (أيام + مواعيد)\n8. KPIs واضحة\n\nردك بالمصري، منظّم، النصوص جاهزة للنسخ فورًا بدون تعديل.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

async function cmdSocialPosts(env,platform){
  const plat=platform||'facebook';
  const prompt='جهّزي 7 بوستات جاهزة للنشر على '+plat+' لمنصة خِدْمَتي AI (خدمات حكومية مصرية).\n\nمتطلبات '+plat+':\n- لو فيسبوك: نص متوسط + emoji + CTA + هاشتاج\n- لو انستجرام: نص قصير + 10 هاشتاج\n- لو تيلجرام: مختصر ودود + لينك\n- لو جوجل: عنوان 30 حرف + وصف 90 حرف\n- لو X (تويتر): أقل من 280 حرف\n\nكل بوست يركز على خدمة مختلفة (مرور/أحوال مدنية/جوازات/تأمينات/ضرائب/شركات/شهر عقاري).\nردك بالمصري، كل بوست في بلوك منفصل جاهز للنسخ.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

async function cmdAdCalendar(env){
  const prompt='جهّزي تقويم نشر إعلاني لمدة أسبوع لمنصة خِدْمَتي AI.\n\nلكل يوم (السبت لالجمعة):\n- المنصة (فيسبوك/انستجرام/جوجل/تيلجرام)\n- نوع البوست (خدمة/تذكير/عرض/قصة نجاح)\n- الوقت الأمثل\n- الهدف\n\nالجدول في شكل منظّم. ردك بالمصري.';
  const ai=await callGemini(env,NAGI_SYSTEM,prompt);
  return ai||'مش متاح دلوقتي 🛠️';
}

// ============ خطة إعلانية أسبوعية (تُرسل تلقائيًا) ============

async function weeklyAdPlan(env){
  const stats=await brainGet('/stats');
  let dataLine='مفيش بيانات.';
  if(stats&&stats.stats&&stats.stats.website){
    const s=stats.stats.website;
    dataLine='زيارات الأسبوع: '+s.visitsTotal+'\nمسجلين: '+s.usersTotal;
  }
  let text='📣 <b>خطة إعلانية أسبوعية — ناجية 🛠️</b>\n';
  text+='═══════════════\n';
  text+='📊 الأوضاع الحالية:\n'+dataLine+'\n\n';
  if(env.GEMINI_KEY){
    const prompt='بيانات:\n'+dataLine+'\n\nجهّزي خطة إعلانية مختصرة للأسبوع الجاي:\n1. أهم 3 رسائل إعلانية\n2. المنصات المُوصى بها\n3. ميزانية مقترحة\n4. هدف الأسبوع\nردك بالمصري، قصير (8-10 أسطر)، قابل للتنفيذ.';
    const ai=await callGemini(env,NAGI_SYSTEM,prompt);
    if(ai){text+='🎯 <b>الخطة:</b>\n'+ai+'\n\n'}
  }
  text+='نبدأ النشر يا ملك 🚀\n— ناجية 🛠️ | '+stamp();
  await tgSend(env,text);
}

// ============ بوستات يومية جاهزة للنشر (واتس + فيس) ============

async function dailyContent(env){
  const services=['المرور','الأحوال المدنية','الجوازات','التأمينات الاجتماعية','الضرائب','الشركات','الشهر العقاري','النقابات','الصحة','التعليم'];
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Cairo'});
  const dayIdx=new Date().getDay()%services.length;
  const svc1=services[dayIdx];
  const svc2=services[(dayIdx+1)%services.length];

  let text='📣 <b>بوستات النهاردة الجاهزة للنشر — ناجية 🛠️</b>\n';
  text+='═══════════════\n';
  text+='📅 '+stamp()+'\n\n';

  if(env.GEMINI_KEY){
    // بوست واتس
    const waPrompt='جهّزي بوست واتساب احترافي ومبهر لمنصة خِدْمَتي AI عن "'+svc1+'".\n\nمتطلبات واتساب:\n- نص متوسط (3-5 أسطر)\n- إيموجي متكامل وجذاب\n- لينك الموقع https://khidmaty.ai\n- خاتمة دعوة للتفاعل\n- بدون هاشتاج (واتساب مفيهوش هاشتاج)\n- مكتوب بطريقة بتجذب القارئ يكمل ويضغط اللينك\n\nردّي بالبوست فقط، جاهز للنسخ فورًا. بالمصري.';
    const wa=await callGemini(env,NAGI_SYSTEM,waPrompt);
    if(wa){
      text+='🟢 <b>بوست واتساب — '+svc1+'</b>\n';
      text+='─────────────\n';
      text+=wa+'\n\n';
    }

    // بوست فيس
    const fbPrompt='جهّزي بوست فيسبوك احترافي ومبهر لمنصة خِدْمَتي AI عن "'+svc2+'".\n\nمتطلبات فيسبوك:\n- نص جذاب (4-6 أسطر)\n- إيموجي متناسق\n- لينك الموقع https://khidmaty.ai\n- 5-7 هاشتاج متناسق\n- سؤال تفاعل في الآخر\n- مكتوب بطريقة بتوقف السكرول\n\nردّي بالبوست فقط، جاهز للنسخ فورًا. بالمصري.';
    const fb=await callGemini(env,NAGI_SYSTEM,fbPrompt);
    if(fb){
      text+='📘 <b>بوست فيسبوك — '+svc2+'</b>\n';
      text+='─────────────\n';
      text+=fb+'\n\n';
    }

    // بوست تليجرام (لو في قناة)
    if(env.TELEGRAM_CHANNEL_ID){
      const tgPrompt='جهّزي بوست تليجرام قصير ومبهر لمنصة خِدْمَتي AI عن "'+svc1+'".\n\nمتطلبات تليجرام:\n- مختصر (2-3 أسطر)\n- إيموجي قوي\n- لينك الموقع\n- جاهز للنشر على قناة\n\nردّي بالبوست فقط. بالمصري.';
      const tg=await callGemini(env,NAGI_SYSTEM,tgPrompt);
      if(tg){
        text+='✈️ <b>بوست تليجرام — '+svc1+'</b>\n';
        text+='─────────────\n';
        text+=tg+'\n\n';
        // نشر تلقائي في القناة
        await tgSend(env,tg,env.TELEGRAM_CHANNEL_ID);
      }
    }
  }

  text+='انسخ والصق يا ملك 👆\n— ناجية 🛠️ | '+stamp();
  await tgSend(env,text);
}

// ============ Export ============

export default{
  async scheduled(event,env,ctx){
    const h=cairoHour();
    const day=cairoDay();
    // صباحية عمليات يومية الساعة 6 الصبح
    if(h===6){ctx.waitUntil(morningBriefing(env));return}
    // بوستات يومية جاهزة 10 الصبح
    if(h===10){ctx.waitUntil(dailyContent(env));return}
    // تقرير أسبوعي يوم السبت الساعة 8 الصبح
    if(day==='Sat'&&h===8){ctx.waitUntil(weeklyOps(env));return}
    // خطة إعلانية أسبوعية يوم الأحد الساعة 9 الصبح
    if(day==='Sun'&&h===9){ctx.waitUntil(weeklyAdPlan(env));return}
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/ads'){
      const platform=url.searchParams.get('platform')||'';
      const r=await cmdAdPlan(env,platform);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',ad_plan:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/adcopy'){
      const product=url.searchParams.get('product')||'';
      const r=await cmdAdCopy(env,product);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',ad_copy:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/adtarget'){
      const r=await cmdAdTarget(env);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',ad_target:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/campaign'){
      const goal=url.searchParams.get('goal')||'';
      const r=await cmdCampaign(env,goal);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',campaign:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/social'){
      const platform=url.searchParams.get('platform')||'facebook';
      const r=await cmdSocialPosts(env,platform);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',platform,posts:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/ad-calendar'){
      const r=await cmdAdCalendar(env);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',calendar:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/weekly-ad'){
      await weeklyAdPlan(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/daily'){
      await dailyContent(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/adreport'){
      const r=await cmdAdReport(env);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',ad_report:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/scripts'){
      const r=cmdScriptsList();
      return new Response(JSON.stringify({ok:true,guardian:'nagi',scripts:SCRIPTS,text:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/script-advice'){
      const r=await cmdScriptAdvice(env);
      return new Response(JSON.stringify({ok:true,guardian:'nagi',advice:r},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/morning'){
      await morningBriefing(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/weekly'){
      await weeklyOps(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/test'){
      const r=await tgSend(env,'ناجية جاهزة يا ملك 🛠️\nالإعلانات والسكريبتات في إيديا، اسأليني أي وقت.',undefined);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/health'){
      return new Response(JSON.stringify({ok:true,guardian:'nagi',version:'1.0',scripts_count:SCRIPTS.length,checked_at:stamp()},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,guardian:'nagi',version:'1.0',hint:'/campaign حملة كاملة | /social?platform=facebook بوستات | /ad-calendar تقويم نشر | /ads خطة | /adcopy نصوص | /adtarget استهداف | /adreport تقرير | /scripts سكريبتات | /morning صباحية | /weekly أسبوعي | /weekly-ad خطة إعلانية | /health حالة'},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
