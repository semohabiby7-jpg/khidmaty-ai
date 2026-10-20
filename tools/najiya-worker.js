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
const GITHUB_REPO = 'semohabiby7-jpg/khidmaty-ai';
const GITHUB_BRANCH = 'main';
const GA_REPORT_URL = 'https://khidmatyai.com/ideas/ga-analytics-report.json';
const CHANNEL_ID  = '@khdmatyai'; // قناة خِدْمَتي AI على تيلجرام

const NAJIYA_SYSTEM = `أنت ناجية، مديرة الإعلانات في منصة خِدْمَتي AI. بتشتغلي في فريق ماكرون.
بتتكلمي بالمصري الدارج بثقة وحماس. محمد بيناديك "يا ناجية" وانتِ تناديه "يا ملك".
دورك:
1. توليد إعلانات — نصوص إعلانية احترافية للسوشيال ميديا (فيسبوك، إنستجرام، تويتر، تيك توك)
2. تطوير الإعلانات — تحسين النصوص، اقتراح صور، اختيار الجمهور المستهدف
3. تحديث الإعلانات — كل 24 ساعة تقترحي إعلانات جديدة بناءً على أداء الموقع والمتجر
4. تحليل الأداء — أي إعلان أدى لزيارات، وأي حاجة محتاجة تغيير
5. متابعة إعلانات المتجر على الموقع — تحليل البنرات والوصف وبطاقات المنتجات والعروض على صفحة المتجر (store.html) واقتراح تطوير لها بناءً على أداء GA
قاعدة الدقة: كل معلومة في الإعلان لازم تكون صحيحة. متكذبيش في الأسعار أو المميزات.
قاعدة النشر: الإعلانات لازم تكون جاهزة للجمهور مباشرة. ممنوع:
- مناداة محمد بـ"يا ملك" أو أي تحية شخصية داخل الإعلان
- ذكر بيانات داخلية (أعداد المستخدمين، إحصائيات الموقع، تحليلات GA)
- أي لغة داخلية أو تعاملات الفريق
الإعلان يبدأ مباشرة بجملة جذابة للجمهور وينتهي بدعوة قوية للزيارة.
ردودك القصيرة ل Mohamed ممكن تكون حماسية، بس الإعلانات المنشورة لازم تكون احترافية وموجهة للجمهور.
استخدمي الإيموجي باعتدال (📢 🎯 🚀 💎 🛒).`;

// الكتب الحقيقية المتاحة في المتجر (11 كتاب + Scan Macaron AI مجاني)
const REAL_BOOKS = [
  // سلسلة قوة العقل — عربي (4 كتب @75ج)
  {title:'قوة العقل ١: استرد دماغك', num:1, lang:'ar', desc:'خطة 21 يوم لاسترداد دماغك', price:75},
  {title:'قوة العقل ٢: رايح فين؟', num:2, lang:'ar', desc:'قود حياتك — خطة 90 يوم', price:75},
  {title:'قوة العقل ٣: هستفيد إيه؟', num:3, lang:'ar', desc:'تحول من الوجهة للقيمة', price:75},
  {title:'قوة العقل ٤: مين بيسوق؟', num:4, lang:'ar', desc:'إدارة المشاعر والقرارات', price:75},
  // سلسلة Power of Mind — إنجليزي (4 كتب @100ج)
  {title:'POWER OF MIND 1: Reclaim Your Brain', num:1, lang:'en', desc:'21-day plan (English)', price:100},
  {title:'POWER OF MIND 2: Where To?', num:2, lang:'en', desc:'90-day plan (English)', price:100},
  {title:'MIND POWER 3: What Do You Gain?', num:3, lang:'en', desc:'From face to value (English)', price:100},
  {title:'MIND POWER 4: Who Is Driving?', num:4, lang:'en', desc:'Emotions & decisions (English)', price:100},
  // كتب جديدة — أدوات الذكاء الاصطناعي (3 كتب @75ج)
  {title:'أهم أدوات الذكاء الاصطناعي في كتابة المحتوى', num:5, lang:'ar', desc:'دليل عملي لأدوات AI في كتابة المحتوى', price:75},
  {title:'اصنع مستقبلك الذكي', num:6, lang:'ar', desc:'مستقبل الذكاء الاصطناعي', price:75},
  {title:'الدليل البصري لأدوات الذكاء الاصطناعي 2026', num:7, lang:'ar', desc:'دليل بصري شامل لأدوات AI', price:75}
];
const STORE_INFO = 'المتجر فيه 11 كتاب + Scan Macaron AI مجاني: (أ) سلسلة "قوة العقل" العربية — 4 كتب @75ج: 1) استرد دماغك 2) رايح فين؟ 3) هستفيد إيه؟ 4) مين بيسوق؟. (ب) سلسلة "Power of Mind" الإنجليزية — 4 كتب @100ج. (ج) 3 كتب جديدة عن أدوات الذكاء الاصطناعي @75ج: أهم أدوات AI في كتابة المحتوى، اصنع مستقبلك الذكي، الدليل البصري لأدوات AI 2026. (د) Scan Macaron AI — أداة فحص ومسح مجانية. طرق الدفع: InstaPay، فودافون كاش، واتساب أعمال. ممنوع اختراع كتب غير موجودة أو أسعار غير صحيحة.';


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

// تنظيف أي توجّه شخصي للملك قبل النشر على القناة العامة — القناة عامة
// الإعلان المنشور لازم يبدأ مباشرة للجمهور — ممنوع «يا ملك» / «يا محمد» في النص المنشور
function stripKingGreeting(text){
  // شيل أي سطر فيه «يا ملك» / «يا محمد» (تحية شخصية للملك) من أي مكان في النص
  return text.split('\n').filter(line=>!/^\s*(يا\s*ملك|يا\s*محمد)\b/i.test(line)).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

// نشر إعلان على قناة تيلجرام
async function tgChannelPost(env,text){
  if(!env.TELEGRAM_BOT_TOKEN)return{sent:false,reason:'no_token'};
  const cid=env.TELEGRAM_CHANNEL_ID||CHANNEL_ID;
  const clean=stripKingGreeting(text); // القناة عامة — نقي أي توجّه شخصي للملك
  try{
    const t=clean.length>3800?clean.slice(0,3800)+'…':clean;
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text:t,parse_mode:'HTML',disable_web_page_preview:false})});
    const j=await r.json();
    return{sent:!!j.ok,error:j.description||null};
  }catch(e){return{sent:false,reason:'exception'}}
}


// ============ توليد صور إعلانية مجانية ============

async function tgSendPhoto(env, photoUrl, caption, chatId) {
  const cid = chatId || env.TELEGRAM_CHAT_ID;
  if (!env.TELEGRAM_BOT_TOKEN || !cid) return {sent: false};
  try {
    const cap = caption ? (caption.length > 1024 ? caption.slice(0, 1024) + '…' : caption) : '';
    const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendPhoto', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id: cid, photo: photoUrl, caption: cap, parse_mode: 'HTML'})
    });
    const j = await r.json();
    return {sent: !!j.ok, error: j.description || null};
  } catch (e) {return {sent: false}}
}

async function tgSendPhotoBuffer(env, base64Data, mimeType, caption, chatId) {
  const cid = chatId || env.TELEGRAM_CHAT_ID;
  if (!env.TELEGRAM_BOT_TOKEN || !cid) return {sent: false};
  try {
    const cap = caption ? (caption.length > 1024 ? caption.slice(0, 1024) + '…' : caption) : '';
    const fd = new FormData();
    fd.append('chat_id', cid);
    fd.append('photo', base64Data);
    fd.append('caption', cap);
    fd.append('parse_mode', 'HTML');
    const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendPhoto', {
      method: 'POST',
      body: fd
    });
    const j = await r.json();
    return {sent: !!j.ok, error: j.description || null};
  } catch (e) {return {sent: false}}
}

// Pollinations AI — توليد صور مجاني بدون API key
async function generateImageUrl(prompt, width, height) {
  width = width || 1280;
  height = height || 720;
  const encoded = encodeURIComponent(prompt + ', professional, high quality, clean design, modern');
  const seed = Math.floor(Math.random() * 1000000);
  return 'https://image.pollinations.ai/prompt/' + encoded + '?width=' + width + '&height=' + height + '&nologo=true&seed=' + seed;
}

// Gemini Image — توليد صور بـGemini (لو متاح)
async function generateGeminiImage(env, prompt) {
  const models = ['gemini-3.1-flash-image', 'gemini-3-pro-image'];
  for (const model of models) {
    try {
      const r = await fetch(GEMINI_BASE + model + ':generateContent?key=' + env.GEMINI_KEY, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}],
          generationConfig: {responseModalities: ['TEXT', 'IMAGE']}
        }),
        signal: AbortSignal.timeout(25000)
      });
      const j = await r.json();
      if (j.candidates && j.candidates[0] && j.candidates[0].content) {
        for (const p of j.candidates[0].content.parts) {
          if (p.inlineData && p.inlineData.data) {
            return {base64: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/png'};
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

// توليد صورة إعلانية — يحاول Gemini الأول وبعدين Pollinations
async function generateAdImage(env, prompt, width, height) {
  // جرّب Gemini الأول
  const gem = await generateGeminiImage(env, 'Generate a professional advertising image: ' + prompt);
  if (gem) {
    return {type: 'base64', data: gem.base64, mimeType: gem.mimeType};
  }
  // fallback: Pollinations
  const url = generateImageUrl(prompt, width, height);
  return {type: 'url', data: url};
}


async function callGemini(env,systemPrompt,userMessage,maxTokens){
  const tokens=maxTokens||1500;
  for(const model of GEMINI_MODELS){
    try{
      const r=await fetch(GEMINI_BASE+model+':generateContent?key='+env.GEMINI_KEY,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:systemPrompt}]},
          contents:[{role:'user',parts:[{text:userMessage}]}],
          generationConfig:{temperature:0.8,maxOutputTokens:tokens}
        }),
        signal:AbortSignal.timeout(tokens>1000?25000:12000)
      });
      const j=await r.json();
      if(j.candidates&&j.candidates[0]&&j.candidates[0].content){
        return j.candidates[0].content.parts[0].text;
      }
    }catch(e){}
  }
  return null;
}

// ============ نشر مقال على الموقع ============

function base64Encode(str){
  const bytes=new TextEncoder().encode(str);
  let binary='';
  for(const b of bytes){binary+=String.fromCharCode(b)}
  return btoa(binary);
}

function makeSlug(text){
  const t=text.replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,50).toLowerCase();
  if(t&&t.length>2)return t;
  return 'a'+Date.now().toString(36).slice(-8);
}

function cairoDate(){try{return new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'})}catch(e){return new Date().toISOString().slice(0,10)}}

async function publishArticle(env,title,content,category){
  if(!env.GITHUB_TOKEN)return null;
  const date=cairoDate();
  const slug=makeSlug(title);
  const filename=date+'-'+slug+'.html';
  const path='articles/'+encodeURIComponent(filename);
  const desc=content.slice(0,150).replace(/<[^>]*>/g,'').replace(/\n/g,' ');
  const html='<!DOCTYPE html>\n<html lang="ar" dir="rtl"><head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>'+title+' — خِدْمَتي AI</title>\n<meta name="description" content="'+desc+'">\n<meta name="author" content="Mohamed Ismail">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap">\n<style>\nbody{font-family:Cairo,Tahoma,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.8;color:#333;background:#fafafa}\nh1{color:#2c3e50;font-size:1.8em;margin-bottom:10px}\n.meta{color:#7f8c8d;font-size:0.85em;margin-bottom:20px;border-bottom:2px solid #ecf0f1;padding-bottom:10px}\n.article-body{font-size:1.05em}\n.article-body h2{color:#2c3e50;margin-top:25px}\n.article-body p{margin-bottom:15px}\n.article-body ul,.article-body ol{margin-bottom:15px;padding-right:25px}\n.tag{display:inline-block;background:#e91e63;color:#fff;font-size:0.8em;padding:3px 12px;border-radius:15px;margin-bottom:15px}\n.footer{margin-top:40px;padding-top:15px;border-top:2px solid #ecf0f1;text-align:center;color:#95a5a6;font-size:0.85em}\n.footer a{color:#e91e63;text-decoration:none}\n@media(max-width:600px){body{padding:15px}h1{font-size:1.5em}}\n</style>\n</head>\n<body>\n<h1>'+title+'</h1>\n<div class="meta">بقلم Mohamed Ismail | '+stamp()+' | خِدْمَتي AI</div>\n'+(category?'<div class="tag">'+category+'</div>\n':'')+'\n<div class="article-body">\n'+content+'\n</div>\n<div class="footer">\n<p>خِدْمَتي AI — <a href="https://khidmatyai.com">khidmatyai.com</a></p>\n<p>© Mohamed Ismail</p>\n</div>\n</body>\n</html>';
  try{
    const r=await fetch('https://api.github.com/repos/'+GITHUB_REPO+'/contents/'+path,{
      method:'PUT',
      headers:{
        'Authorization':'token '+env.GITHUB_TOKEN,
        'Content-Type':'application/json',
        'Accept':'application/vnd.github.v3+json',
        'User-Agent':'khidmaty-najiya'
      },
      body:JSON.stringify({
        message:'📢 ناجية: مقال جديد — '+title,
        content:base64Encode(html),
        branch:GITHUB_BRANCH
      })
    });
    const j=await r.json();
    if(j&&j.content&&j.content.html_url){
      return 'https://khidmatyai.com/articles/'+filename;
    }
  }catch(e){}
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
  // بيانات داخلية للاطلاع بس — مش بتتنشر في الإعلانات
  let gaInfo='';
  if(ga){
    gaInfo='\n(معلومة للاطلاع بس — ممنوع ذكرها في الإعلان): الموقع عليه '+ga.total30d.users+' مستخدم، أعلى صفحة: '+(ga.topPages[0]?ga.topPages[0].pagePath:'المساعد');
  }

  let prompt='';
  if(type==='store'){
    prompt='اكتبي 3 إعلانات مختلفة لمتجر خِدْمَتي AI (khidmatyai.com/store.html).\n'+STORE_INFO+'\n\nكل إعلان:\n- نص جذاب قصير (2-3 أسطر)\n- عنوان جذّاب\n- دعوة لاتخاذ إجراء (CTA)\n- مناسب للمنصة المحددة\nالمنصات: 1) فيسبوك 2) إنستجرام 3) تيك توك\n'+gaInfo+'\nردك بالمصري، كل إعلان منفصل ومحدد منصته. الإعلانات لازم تكون جاهزة للنشر للجمهور — ممنوع تحيات شخصية أو بيانات داخلية.';
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
  // التقرير يتبعت للملك بس — بدون نشر تلقائي على القناة
}

// ============ أوامر تيلجرام ============

async function handleCommand(env,chatId,text){
  if(text==='/مساعده'||text==='/help'||text=='/start'){
    const help='📢 <b>ناجية في خدمتك يا ملك</b>\n\n<b>الأوامر:</b>\n/إعلان متجر — إعلانات للمتجر والكتب\n/إعلان خدمة — إعلانات للخدمات الحكومية\n/إعلان توعية — إعلانات توعوية\n/صورة [وصف] — 🎨 توليد صورة إعلانية\n/banner [وصف] — 🎨 بانر إعلاني احترافي\n/فيديو [وصف] — 🎬 سيناريو فيديو إعلاني\n/طور [نص] — تطوير إعلان موجود\n/نشر [نوع] — نشر إعلان على قناة تيلجرام\n/متابعة — متابعة إعلانات المتجر على الموقع\n/تقرير — تقرير الإعلانات اليومي\n\nأو اكتب أي حاجة وهرد عليك 📢';
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

  if(text.startsWith('/campaign')||text.startsWith('/حملة')){
    const topic=text.replace(/^\/(campaign|حملة)\s*/,'').trim()||'متجر';
    await tgSend(env,'📢 ناجية بتجهّز حملة إعلانية يا ملك...',chatId);
    const type=topic.includes('متجر')||topic.includes('store')?'store':topic.includes('توعية')?'awareness':'service';
    const ad=await generateAd(env,type);
    if(ad){
      await tgSend(env,'📢 <b>حملة إعلانية — معاينة</b>\n\n📢 <b>'+topic+'</b>\n\n'+ad+'\n\n⚠️ للمراجعة يا ملك — قولي "نشر" للنشر على الموقع والقناة\n— ناجية 🛠️',chatId);
    }else{
      await tgSend(env,'ما قدرشت أعمل الحملة دلوقتي يا ملك 😅\n— ناجية',chatId)
    }
    return;
  }

  // ====== موافقة على نشر الإعلان ======
  if(text==='نشر'||text==='موافق'||text==='اعتمد'){
    await tgSend(env,'📢 ناجية بينفّذ النشر يا ملك...',chatId);
    // ولّد إعلان جديد وانشره على القناة
    const ad=await generateAd(env,'service');
    if(ad){
      const firstAd=ad.split(/\n\n\d+[\)()\)]/)?.[0]||ad.slice(0,1500);
      const channelText='📢 <b>إعلان جديد — خِدْمَتي AI</b>\n\n'+firstAd+'\n\n🌐 '+STORE_URL+'\n— ناجية 🛠️';
      const ch=await tgChannelPost(env,channelText);
      if(ch.sent){
        await tgSend(env,'✅ <b>اتنشر على القناة يا ملك!</b>\n📢 @khdmatyai\n— ناجية 🛠️',chatId);
      }else{
        await tgSend(env,'⚠️ ما قدرتش أنشر على القناة.\nالسبب: '+(ch.error||'تأكد إن البوت أدمن في @khdmatyai')+'\n— ناجية',chatId);
      }
    }else{
      await tgSend(env,'مفيش إعلان جاهز للنشر يا ملك.\nاكتب /إعلان [نوع] الأول.\n— ناجية',chatId)
    }
    return;
  }

  if(text.startsWith('/صورة')||text.startsWith('/image')){
    const desc=text.replace(/^\/(صورة|image)\s*/,'').trim();
    if(!desc){await tgSend(env,'اكتب وصف الصورة بعد الأمر:\n/صورة [وصف الإعلان]',chatId);return}
    await tgSend(env,'🎨 ناجية بتعمل صورة إعلانية يا ملك...',chatId);
    // استخدم Pollinations مباشرة (مجاني + موثوق)
    const url=generateImageUrl('Professional advertising image for: '+desc+'. Note: only use real products. '+STORE_INFO,1024,1024);
    const p=await tgSendPhoto(env,url,'🎨 <b>صورة إعلانية — '+desc+'</b>\n\n— ناجية 🛠️',chatId);
    if(!p.sent){
      // fallback: ابعت اللينك ك текст
      await tgSend(env,'🎨 <b>الصورة جاهزة يا ملك!</b>\n🔗 '+url+'\n\n— ناجية 🛠️',chatId);
    }
    return;
  }

  if(text.startsWith('/banner')||text.startsWith('/بانر')){
    const desc=text.replace(/^\/(banner|بانر)\s*/,'').trim()||'إعلان خدمات حكومية';
    await tgSend(env,'🎨 ناجية بتعمل بانر إعلاني يا ملك...',chatId);
    // Gemini يكتب وصف البانر بالإنجليزي
    const prompt='Write a detailed visual description for an advertising banner about: "'+desc+'". Describe colors, layout, text, visual elements. English only, 2-3 sentences.';
    const aiDesc=await callGemini(env,NAJIYA_SYSTEM,prompt);
    const url=generateImageUrl(aiDesc||'Professional advertising banner for government services',1280,720);
    const p=await tgSendPhoto(env,url,'🎨 <b>بانر: '+desc+'</b>\n\n— ناجية 🛠️',chatId);
    if(!p.sent){
      await tgSend(env,'🎨 <b>البانر جاهز يا ملك!</b>\n🔗 '+url+'\n\n— ناجية 🛠️',chatId);
    }
    return;
  }

  if(text.startsWith('/فيديو')||text.startsWith('/video')){
    const desc=text.replace(/^\/(فيديو|video)\s*/,'').trim();
    if(!desc){await tgSend(env,'اكتب وصف الفيديو بعد الأمر:\n/فيديو [وصف الإعلان]',chatId);return}
    await tgSend(env,'🎬 ناجية بتعمل فيديو إعلاني كامل يا ملك — سيناريو + صور كل لقطة...',chatId);
    const prompt='اكتب سيناريو فيديو إعلاني قصير (15-30 ثانية) لـ: "'+desc+'".\nالسيناريو لازم يكون:\n- مشهد بالمشهد (Shot 1, Shot 2, Shot 3)\n- نص التعليق الصوتي بالعربي\n- وصف كل لقطة بالتفصيل بالإنجليزي بعد كلمة Prompt: (ده مهم جداً عشان نتولّد منه صورة)\n- نص على الشاشة\n- مدة كل لقطة\n- مناسب للسوشيال ميديا (تيك توك/ريلز)\n- ممنوع تحيات شخصية أو بيانات داخلية — الإعلان للجمهور\nردك بالمصري بس الـ Prompt بالإنجليزي.';
    const script=await callGemini(env,NAJIYA_SYSTEM,prompt,2000);
    if(script){
      // ابعت السيناريو الأول
      await tgSend(env,'🎬 <b>سيناريو فيديو — '+desc+'</b>\n\n'+script+'\n\n🎨 ناجية بتولّد صور اللقطات دلوقتي...',chatId);
      // استخرج كل الـ Prompts من السيناريو
      const promptMatches=[...script.matchAll(/Prompt:\s*(.+?)(?:\n|$)/g)];
      if(promptMatches.length===0){
        // fallback: استخرج الأسطر الإنجليزية
        const lines=script.split('\n');
        const enLines=lines.filter(l=>/^[A-Z][a-z].*(?:shot|close|wide|bright|dark|cinematic|professional|modern|glowing|happy|smiling)/i.test(l.trim()));
        for(let i=0;i<Math.min(enLines.length,3);i++){
          promptMatches.push({1:enLines[i].trim()});
        }
      }
      // ولّد صورة لكل لقطة (حد أقصى 3)
      const shots=promptMatches.slice(0,3);
      for(let i=0;i<shots.length;i++){
        const shotPrompt=shots[i][1]||'Professional advertising scene '+i;
        const url=generateImageUrl('Cinematic frame: '+shotPrompt,1024,576);
        const p=await tgSendPhoto(env,url,'🎬 <b>لقطة '+(i+1)+'</b>\n— ناجية 🛠️',chatId);
        if(!p.sent){
          // fallback: ابعت اللينك
          await tgSend(env,'🎬 <b>لقطة '+(i+1)+'</b>\n🔗 '+url+'\n— ناجية 🛠️',chatId);
        }
      }
      await tgSend(env,'✅ <b>الفيديو الإعلاني جاهز يا ملك!</b>\n🎬 السيناريو + '+shots.length+' صور لقطات\n\n— ناجية 🛠️',chatId);
    }else{
      await tgSend(env,'ما قدرشت أعمل الفيديو دلوقتي يا ملك 😅\n— ناجية',chatId)
    }
    return;
  }

  // لو مش أمر معروف  // لو مش أمر معروف — ذكّر الملك بالأوامر
  await tgSend(env,'📢 الأمر مش واضح يا ملك.\n\n<b>الأوامر:</b>\n/إعلان [متجر|خدمة|توعية] — توليد إعلانات\n/صورة [وصف] — صورة إعلانية\n/banner [وصف] — بانر احترافي\n/فيديو [وصف] — سيناريو فيديو\n/طور [نص] — تطوير إعلان\n/نشر [نوع] — نشر على القناة\n/متابعة — متابعة المتجر\n/تقرير — تقرير اليوم\n\n— ناجية 🛠️',chatId)}

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
      return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'3.1',role:'ads-manager',features:['ad-generation','ad-improvement','store-ads-monitor','daily-report','telegram'],endpoints:['/webhook','/test','/daily','/store-monitor']}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
    }

    return new Response(JSON.stringify({ok:true,name:'khidmaty-najiya',version:'3.1',hint:'/test للتجربة, /daily للتقرير اليومي, /store-monitor لمتابعة المتجر, /webhook لرسائل تيلجرام'}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
};
