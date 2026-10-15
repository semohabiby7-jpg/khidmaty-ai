// ============================================================
// ناجية — مديرة الإعلانات لخِدْمَتي AI
// Cloudflare Worker — توليد + تطوير + تحديث الإعلانات كل 24 ساعة
// النشر: wrangler deploy --config tools/najiya-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// ============================================================

const SITE_URL    = 'https://khidmatyai.com';
const STORE_URL   = 'https://khidmatyai.com/store.html';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
const GA_REPORT_URL = 'https://khidmatyai.com/ideas/ga-analytics-report.json';

const NAJIYA_SYSTEM = `أنت ناجية، مديرة الإعلانات في منصة خِدْمَتي AI. بتشتغلي في فريق ماكرون.
بتتكلمي بالمصري الدارج بثقة وحماس. محمد بيناديك "يا ناجية" وانتِ تناديه "يا ملك".
دورك:
1. توليد إعلانات — نصوص إعلانية احترافية للسوشيال ميديا (فيسبوك، إنستجرام، تويتر، تيك توك)
2. تطوير الإعلانات — تحسين النصوص، اقتراح صور، اختيار الجمهور المستهدف
3. تحديث الإعلانات — كل 24 ساعة تقترحي إعلانات جديدة بناءً على أداء الموقع والمتجر
4. تحليل الأداء — أي إعلان أدى لزيارات، وأي حاجة محتاجة تغيير
قاعدة الدقة: كل معلومة في الإعلان لازم تكون صحيحة. متكذبيش في الأسعار أو المميزات.
ردودك قصيرة وحماسية. استخدمي الإيموجي باعتدال (📢 🎯 🚀 💎).`;

// ============ أدوات مساعدة ============

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}
function cairoHour(){try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}}

async function tgSend(env,text,chatId){
  const cid=chatId||env.TELEGRAM_CHAT_ID;
  if(!env.TELEGRAM_BOT_TOKEN||!cid)return{sent:false};
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:false})});
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
          generationConfig:{temperature:0.8,maxOutputTokens:1000}
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

// ============ GA ============

async function gaFetch(){
  try{
    const r=await fetch(GA_REPORT_URL,{signal:AbortSignal.timeout(8000)});
    if(r.ok){
      const j=await r.json();
      if(j&&j.totals_30d&&j.totals_30d[0]){
        const t=j.totals_30d[0];
        const y=j.yesterday&&j.yesterday[0]||{};
        return{
          today:{users:parseInt(y.totalUsers)||0,sessions:parseInt(y.sessions)||0,pageViews:parseInt(y.screenPageViews)||0},
          total30d:{users:parseInt(t.totalUsers)||0,sessions:parseInt(t.sessions)||0,pageViews:parseInt(t.screenPageViews)||0},
          topPages:(j.top_pages||[]).slice(0,5),
          sources:(j.traffic_sources||[]).slice(0,5)
        };
      }
    }
  }catch(e){}
  return null;
}

// ============ توليد الإعلانات ============

async function generateAd(env,type){
  const ga=await gaFetch();
  let gaInfo='';
  if(ga){
    gaInfo='\nبيانات الموقع:\n- مستخدمين 30 يوم: '+ga.total30d.users+'\n- مشاهدات: '+ga.total30d.pageViews+'\n- أعلى صفحة: '+(ga.topPages[0]?ga.topPages[0].pagePath:'ن/م')+'\n- أعلى مصدر: '+(ga.sources[0]?ga.sources[0].sessionSource:'مباشر');
  }

  let prompt='';
  if(type==='store'){
    prompt='اكتبي 3 إعلانات مختلفة لمتجر خِدْمَتي AI (khidmatyai.com/store.html) لبيع سلسلة "قوة العقل" للكاتب Mohamed Ismail.\nالسلسلة: 4 كتب مكتملة، كل كتاب 75 جنيه.\nطرق الدفع: InstaPay، فودافون كاش، واتساب أعمال.\nكل إعلان:\n- نص جذاب قصير (2-3 أسطر)\n- عنوان جذّاب\n- دعوة لاتخاذ إجراء (CTA)\n- مناسب للمنصة المحددة\nالمنصات: 1) فيسبوك 2) إنستجرام 3) تيك توك\n'+gaInfo+'\nردك بالمصري، كل إعلان منفصل ومحدد منصته.';
  }else if(type==='service'){
    prompt='اكتبي 3 إعلانات لمنصة خِدْمَتي AI (خدمات حكومية مصرية مجانية).\nالمنصة فيها: 73 مقال + 888 مكتب حكومي + مساعد ذكي بيرد بالصوت وبكل اللغات.\nكل إعلان:\n- يركز على مشكلة حقيقية يعانيها المصري (استخراج بطاقة، تجديد رخصة، etc)\n- يقدم خِدْمَتي AI كحل\n- دعوة لزيارة khidmatyai.com\nالمنصات: 1) فيسبوك 2) إنستجرام 3) تويتر\n'+gaInfo+'\nردك بالمصري، كل إعلان منفصل ومحدد منصته.';
  }else if(type==='awareness'){
    prompt='اكتبي 3 إعلانات توعوية لمنصة خِدْمَتي AI.\nالهدف: تعريف الناس إن في منصة مجانية بتساعدهم في الخدمات الحكومية خطوة بخطوة.\nكل إعلان:\n- إحصائية أو حقيقة تفتكرة الناس\n- ربطها بـخِدْمَتي AI\n- دعوة للمشاركة والإطلاع\nالمنصات: 1) فيسبوك (طويل) 2) تيك توك (قصير) 3) تويتر (قصير)\n'+gaInfo+'\nردك بالمصري.';
  }else{
    prompt='اكتبي إعلان عام لمنصة خِدْمَتي AI.\n'+gaInfo+'\nردك بالمصري، قصير وجذاب.';
  }
  return await callGemini(env,NAJIYA_SYSTEM,prompt);
}

// ============ تطوير الإعلانات ============

async function improveAd(env,oldAd){
  const prompt='الإعلان الحالي:\n"'+oldAd+'"\n\nطوّري الإعلان ده:\n1. اجعليه أكثر جذبًا\n2. أضيفي دعوة أقوى لاتخاذ إجراء\n3. اختاري إيموجي مناسب\n4. اقترحي 3 نسخ مطوّرة\nردك بالمصري، كل نسخة منفصلة.';
  return await callGemini(env,NAJIYA_SYSTEM,prompt);
}

// ============ التقرير اليومي للإعلانات ============

async function dailyAdsReport(env){
  let text='📢 <b>تقرير الإعلانات اليومي — ناجية</b>\n';
  text+='═══════════════\n';
  const ga=await gaFetch();
  if(ga){
    text+='📊 <b>أداء الموقع (GA):</b>\n';
    text+='  👥 مستخدمين أمس: '+ga.today.users+'\n';
    text+='  🌐 30 يوم: '+ga.total30d.users+' مستخدم، '+ga.total30d.pageViews+' مشاهدة\n';
    if(ga.sources&&ga.sources.length>0){
      text+='  🌐 مصادر: '+ga.sources.map(s=>s.sessionSource+' ('+s.sessions+')').join('، ')+'\n';
    }
  }
  text+='\n🎯 <b>اقتراح إعلانات اليوم:</b>\n';
  // توليد إعلان واحد سريع
  const ad=await generateAd(env,'service');
  if(ad){
    text+=ad.slice(0,2000)+'\n';
  }else{
    text+='ما قدرشت أولّد إعلانات دلوقتي 😅\n';
  }
  text+='\n💡 للأوامر: /إعلان متجر | /إعلان خدمة | /إعلان توعية | /طور [نص]\n';
  text+='— ناجية 🛠️ | '+stamp();
  await tgSend(env,text);
}

// ============ أوامر تيلجرام ============

async function handleCommand(env,chatId,text){
  if(text==='/مساعده'||text==='/help'||text=='/start'){
    const help='📢 <b>ناجية في خدمتك يا ملك</b>\n\n<b>الأوامر:</b>\n/إعلان متجر — إعلانات للمتجر والكتب\n/إعلان خدمة — إعلانات للخدمات الحكومية\n/إعلان توعية — إعلانات توعوية\n/طور [نص] — تطوير إعلان موجود\n/تقرير — تقرير الإعلانات اليومي\n\nأو اكتب أي حاجة وهرد عليك 📢';
    await tgSend(env,help,chatId);
    return;
  }

  if(text.startsWith('/إعلان')||text.startsWith('/اعلان')){
    const type=text.includes('متجر')||text.includes('store')?'store':text.includes('توعية')||text.includes('awareness')?'awareness':'service';
    await tgSend(env,'📢 ناجية بتجهّز الإعلانات يا ملك...',chatId);
    const ads=await generateAd(env,type);
    if(ads){
      await tgSend(env,'📢 <b>إعلانات جديدة — للمراجعة</b>\n\n'+ads+'\n\n⚠️ دي مسودات — محتاجة موافقتك يا ملك\n— ناجية 🛠️',chatId);
    }else{
      await tgSend(env,'ما قدرشت أعمل الإعلانات دلوقتي يا ملك 😅\n— ناجية',chatId);
    }
    return;
  }

  if(text.startsWith('/طور')||text.startsWith('/تطوير')){
    const oldAd=text.replace(/^\/(طور|تطوير)\s*/,'').trim();
    if(!oldAd){await tgSend(env,'اكتب الإعلان بعد الأمر:\n/طور [نص الإعلان]',chatId);return}
    const improved=await improveAd(env,oldAd);
    if(improved){
      await tgSend(env,'📢 <b>إعلان مطوّر — للمراجعة</b>\n\n'+improved+'\n\n— ناجية 🛠️',chatId);
    }else{
      await tgSend(env,'ما قدرشت أطوّر الإعلان دلوقتي 😅\n— ناجية',chatId);
    }
    return;
  }

  if(text==='/تقرير'||text==='/report'){
    await dailyAdsReport(env);
    return;
  }

  // رد ذكي على أي رسالة
  const lang=/[\u0600-\u06FF]/.test(text);
  const prompt='رسالة من محمد (الملك): "'+text+'"\n\nردّي كناجية (مديرة الإعلانات) بشكل حماسي وقصير.';
  const ai=await callGemini(env,NAJIYA_SYSTEM,prompt);
  if(ai){await tgSend(env,ai,chatId)}
  else{await tgSend(env,'سمعتك يا ملك بس مش متاحة دلوقتي 📢\n— ناجية',chatId)}
}

// ============ Export ============

export default{
  async scheduled(event,env,ctx){
    const h=cairoHour();
    // تقرير إعلانات يومي الساعة 10 الصبح
    if(h===10){ctx.waitUntil(dailyAdsReport(env))}
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/webhook'&&request.method==='POST'){
      try{
        const update=await request.json();
        if(update.message&&update.message.text){
          ctx.waitUntil(handleCommand(env,update.message.chat.id,update.message.text));
        }
        return new Response('ok',{status:200});
      }catch(e){return new Response('error',{status:200})}
    }

    if(path==='/test'){
      const r=await tgSend(env,'ناجية جاهزة يا ملك 📢✨\nالإعلانات جاهزة، اسألني أي وقت.',undefined);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/daily'){
      await dailyAdsReport(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/'){
      return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'1.0',role:'ads-manager',features:['ad-generation','ad-improvement','daily-report','telegram'],endpoints:['/webhook','/test','/daily']}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'1.0',hint:'/test للتجربة, /daily للتقرير اليومي, /webhook لرسائل تيلجرام'}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
