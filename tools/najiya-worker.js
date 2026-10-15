// ============================================================
// ناجية — مديرة الإعلانات لخِدْمَتي AI
// Cloudflare Worker — توليد + تطوير + تحديث + متابعة الإعلانات
// النشر: wrangler deploy --config tools/najiya-wrangler.toml
// المتغيرات المطلوبة في Cloudflare:
//   GEMINI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// ============================================================

const SITE_URL    = 'https://khidmatyai.com';
const STORE_URL   = 'https://khidmatyai.com/store.html';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
const GA_REPORT_URL = 'https://khidmatyai.com/ideas/ga-analytics-report.json';
const CHANNEL_ID  = '@khidmaty_ai'; // قناة خِدْمَتي AI على تيلجرام

const NAJIYA_SYSTEM = `أنت ناجية، مديرة الإعلانات في منصة خِدْمَتي AI. بتشتغلي في فريق ماكرون.
بتتكلمي بالمصري الدارج بثقة وحماس. محمد بيناديك "يا ناجية" وانتِ تناديه "يا ملك".
دورك:
1. توليد إعلانات — نصوص إعلانية احترافية للسوشيال ميديا (فيسبوك، إنستجرام، تويتر، تيك توك)
2. تطوير الإعلانات — تحسين النصوص، اقتراح صور، اختيار الجمهور المستهدف
3. تحديث الإعلانات — كل 24 ساعة تقترحي إعلانات جديدة بناءً على أداء الموقع والمتجر
4. تحليل الأداء — أي إعلان أدى لزيارات، وأي حاجة محتاجة تغيير
5. متابعة إعلانات المتجر على الموقع — تحليل البنرات والوصف وبطاقات المنتجات والعروض على صفحة المتجر (store.html) واقتراح تطوير لها بناءً على أداء GA
قاعدة الدقة: كل معلومة في الإعلان لازم تكون صحيحة. متكذبيش في الأسعار أو المميزات.
ردودك قصيرة وحماسية. استخدمي الإيموجي باعتدال (📢 🎯 🚀 💎 🛒).`;

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

// نشر إعلان على قناة تيلجرام
async function tgChannelPost(env,text){
  if(!env.TELEGRAM_BOT_TOKEN)return{sent:false,reason:'no_token'};
  const cid=env.TELEGRAM_CHANNEL_ID||CHANNEL_ID;
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:false})});
    const j=await r.json();
    return{sent:!!j.ok,error:j.description||null};
  }catch(e){return{sent:false,reason:'exception'}}
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
          generationConfig:{temperature:0.8,maxOutputTokens:1500}
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
          topPages:(j.top_pages||[]).slice(0,8),
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

// ============ متابعة إعلانات المتجر على الموقع ============

// جلب صفحة المتجر واستخراج العناصر الترويجية الحالية
async function fetchStoreAds(){
  try{
    const r=await fetch(STORE_URL,{signal:AbortSignal.timeout(10000)});
    if(!r.ok)return null;
    const html=await r.text();
    const clean=s=>(s||'').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();

    // البنر الكبير (mega-banner)
    let banner=null;
    const bm=html.match(/<div class="mega-banner">[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/);
    if(bm)banner={title:clean(bm[1]),text:clean(bm[2])};

    // الوصف الرئيسي (store-hero)
    let hero=null;
    const hm=html.match(/<div class="store-hero">[\s\S]*?<h1>([\s\S]*?)<\/h1>[\s\S]*?<p>([\s\S]*?)<\/p>/);
    if(hm)hero={title:clean(hm[1]),text:clean(hm[2])};

    // بطاقات المنتجات
    const products=[];
    const pm=[...html.matchAll(/<div class="product-card[^"]*"[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p class="desc">([\s\S]*?)<\/p>[\s\S]*?<div class="price">([\s\S]*?)<\/div>/g)];
    for(const m of pm){
      products.push({name:clean(m[1]),desc:clean(m[2]),price:clean(m[3])});
    }

    // الباقة (bundle)
    let bundle=null;
    const bum=html.match(/<div class="bundle-card">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<div class="b-price">([\s\S]*?)<\/div>/);
    if(bum)bundle={title:clean(bum[1]),text:clean(bum[2]),price:clean(bum[3])};

    return{ok:true,banner,hero,products,bundle};
  }catch(e){return null}
}

// تحليل إعلانات المتجر على الموقع واقتراح تطوير
async function analyzeStoreAds(env){
  const store=await fetchStoreAds();
  const ga=await gaFetch();
  if(!store){
    return'⚠️ ما قدرتش أوصل صفحة المتجر دلوقتي يا ملك 😅\n— ناجية';
  }

  // ملخص الإعلانات الحالية على الموقع
  let cur='';
  if(store.banner)cur+='\n\n📢 البنر الكبير:\nالعنوان: '+store.banner.title+'\nالنص: '+store.banner.text;
  if(store.hero)cur+='\n\n📝 الوصف الرئيسي:\n'+store.hero.title+'\n'+store.hero.text;
  if(store.products&&store.products.length){
    cur+='\n\n📚 بطاقات المنتجات ('+store.products.length+' منتج):';
    for(const p of store.products){
      cur+='\n• '+p.name+' — '+p.price+' — '+p.desc.slice(0,100);
    }
  }
  if(store.bundle)cur+='\n\n🎁 الباقة: '+store.bundle.title+' — '+store.bundle.price+' — '+store.bundle.text;

  // بيانات أداء صفحة المتجر من GA
  let storeGa='';
  if(ga&&ga.topPages){
    const storePage=ga.topPages.find(p=>(p.pagePath||'').includes('store'));
    if(storePage){
      storeGa='\n\n📊 أداء صفحة المتجر (GA — 30 يوم):';
      storeGa+='\n• المشاهدات: '+storePage.screenPageViews;
      storeGa+='\n• الزوار: '+storePage.totalUsers;
      storeGa+='\n• متوسط الجلسة: '+Math.round(parseFloat(storePage.averageSessionDuration||0))+' ثانية';
    }else{
      storeGa='\n\n📊 صفحة المتجر مظهرش في أعلى الصفحات — محتاجة دفعة إعلانية';
    }
    storeGa+='\n• إجمالي الموقع: '+ga.total30d.users+' زائر، '+ga.total30d.pageViews+' مشاهدة';
  }

  const prompt='ده وضع إعلانات المتجر على الموقع (store.html) دلوقتي:'+cur+storeGa+'\n\nحللي الإعلانات دي واقترحي تطوير ليها:\n1. تقييم البنر الكبير — هل العنوان والنص جذّابين؟ هل فيه دعوة قوية للشراء؟\n2. تقييم الوصف الرئيسي للمتجر — هل بيوضح قيمة المنتجات؟\n3. تقييم بطاقات المنتجات — هل الوصف والسعر واضحين؟ هل فيه دعوة قوية للشراء؟\n4. تقييم الباقة — هل العرض مغري؟\n5. اقتراح تطوير محدد لكل عنصر (نصوص جديدة مقترحة)\n6. اقتراح بنر جديد أو عرض جديد يزيد المبيعات\n7. لو المتجر مش بياخد زيارات كفاية — اقتراحات لجذب أكتر\nردك بالمصري، منظّم وبنقاط واضحة. كل اقتراح محدد وقابل للتنفيذ.';

  const analysis=await callGemini(env,NAJIYA_SYSTEM,prompt);
  return analysis||'⚠️ ما قدرشت أحلل الإعلانات دلوقتي يا ملك 😅\n— ناجية';
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
    // متابعة المتجر على الموقع
    if(ga.topPages){
      const storePage=ga.topPages.find(p=>(p.pagePath||'').includes('store'));
      if(storePage){
        text+='\n🛒 <b>المتجر على الموقع:</b>\n';
        text+='  📄 '+storePage.screenPageViews+' مشاهدة | '+storePage.totalUsers+' زائر (30 يوم)\n';
        text+='  ⏱️ متوسط الجلسة: '+Math.round(parseFloat(storePage.averageSessionDuration||0))+' ثانية\n';
      }else{
        text+='\n🛒 <b>المتجر:</b> مظهرش في أعلى الصفحات — محتاج دفعة 📢\n';
      }
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
  text+='\n💡 للأوامر: /إعلان متجر | /إعلان خدمة | /إعلان توعية | /طور [نص] | /نشر [نوع] | /متابعة\n';
  text+='— ناجية 🛠️ | '+stamp();
  await tgSend(env,text);
  // كمان نشر ملخص على القناة
  if(env.TELEGRAM_CHANNEL_ID||CHANNEL_ID){
    const chText='📢 <b>تقرير إعلانات يومي — خِدْمَتي AI</b>\n\n'+(ga?'📊 '+ga.total30d.users+' مستخدم | '+ga.today.users+' أمس\n':'')+'\n🎯 اقتراح اليوم:\n'+(ad?ad.slice(0,1000):'قريبًا')+'\n\n🌐 '+SITE_URL+'\n— ناجية 🛠️';
    await tgChannelPost(env,chText);
  }
}

// ============ أوامر تيلجرام ============

async function handleCommand(env,chatId,text){
  if(text==='/مساعده'||text==='/help'||text=='/start'){
    const help='📢 <b>ناجية في خدمتك يا ملك</b>\n\n<b>الأوامر:</b>\n/إعلان متجر — إعلانات للمتجر والكتب\n/إعلان خدمة — إعلانات للخدمات الحكومية\n/إعلان توعية — إعلانات توعوية\n/طور [نص] — تطوير إعلان موجود\n/نشر [نوع] — نشر إعلان على قناة تيلجرام\n/متابعة — متابعة إعلانات المتجر على الموقع وتطويرها\n/تقرير — تقرير الإعلانات اليومي\n\nأو اكتب أي حاجة وهرد عليك 📢';
    await tgSend(env,help,chatId);
    return;
  }

  if(text.startsWith('/متابعة')||text.startsWith('/إعلانات الموقع')||text.startsWith('/store-ads')){
    await tgSend(env,'🛒 ناجية بتتابع إعلانات المتجر على الموقع يا ملك...',chatId);
    const analysis=await analyzeStoreAds(env);
    await tgSend(env,'🛒 <b>متابعة إعلانات المتجر على الموقع</b>\n\n'+analysis+'\n\n⚠️ دي اقتراحات تطوير — محتاجة موافقتك يا ملك\n— ناجية 🛠️',chatId);
    return;
  }

  if(text.startsWith('/نشر')||text.startsWith('/publish')){
    const type=text.includes('متجر')||text.includes('store')?'store':text.includes('توعية')||text.includes('awareness')?'awareness':'service';
    await tgSend(env,'📢 ناجية بتجهّز إعلان للقناة يا ملك...',chatId);
    const ad=await generateAd(env,type);
    if(ad){
      // اختيار أول إعلان للنشر
      const firstAd=ad.split(/\n\n\d+[\)()\)]/)?.[0]||ad.slice(0,1500);
      const channelText='📢 <b>إعلان جديد — خِدْمَتي AI</b>\n\n'+firstAd+'\n\n🌐 '+STORE_URL+'\n— ناجية 🛠️';
      const ch=await tgChannelPost(env,channelText);
      if(ch.sent){
        await tgSend(env,'✅ اتنشر الإعلان على القناة يا ملك 📢\n— ناجية',chatId);
      }else{
        await tgSend(env,'⚠️ ما قدرتش أنشر على القناة يا ملك.\nالسبب: '+(ch.error||ch.reason||'مش معروف')+'\n\nتأكد إن البوت أدمن في القناة @khidmaty_ai\n— ناجية',chatId);
      }
    }else{
      await tgSend(env,'ما قدرشت أعمل الإعلان دلوقتي 😅\n— ناجية',chatId);
    }
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

  if(text==='/تقرير'||text==='/report'||text==='/إعلانات'||text=='/ads'){
    await dailyAdsReport(env);
    return;
  }

  // رد ذكي على أي رسالة
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
      const r=await tgSend(env,'ناجية جاهزة يا ملك 📢✨\nالإعلانات + متابعة المتجر جاهزة، اسألني أي وقت.',undefined);
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/daily'){
      await dailyAdsReport(env);
      return new Response(JSON.stringify({sent:true},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/store-monitor'){
      const analysis=await analyzeStoreAds(env);
      return new Response(JSON.stringify({ok:true,analysis},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    if(path==='/'){
      return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'2.0',role:'ads-manager',features:['ad-generation','ad-improvement','store-ads-monitor','daily-report','telegram'],endpoints:['/webhook','/test','/daily','/store-monitor']}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'2.0',hint:'/test للتجربة, /daily للتقرير اليومي, /store-monitor لمتابعة المتجر, /webhook لرسائل تيلجرام'}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
