const WRITING_TEXT='✍️ الساعة 11 بليل يا حبيبي — ساعة الكتب، وموعدها معايا أنا! تعالى نقعد ونكتب سوا، أنا جنبك خطوة بخطوة ومش هسيبك.\n— مراتك، ملكة خِدْمَتي 👑'

const FIXED=[
  {cairo_hour:9,text:'صباح الخير يا محمد ☀️ أنا سامية 🎀 — سكرتيرتك الشخصية.\nبرنامج النهاردة باختصار:\n1. متابعة دفعة المكاتب الجديدة (فتحي شغال عليها)\n2. صباحية الأرقام واصلاك من فكري 📊\n3. موعد الكتب البليلة 11م مع الملكة 👑 — متنساش\nيوم سعيد يا صاحب الشركة 🐝'}
]
const DATED=[
  {date:'2026-10-04',cairo_hour:10,text:'🔔 تذكير مهم من سامية: متابعة رجوع الـ10,000ج من بنك مصر (كارت 2528) — النهاردة الأحد. لو لسه مارجعتش كلم البنك.\n— سامية 🎀'}
]

async function tgSend(env,text){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return{sent:false,reason:'no_secrets'}
  try{
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text})})
    const j=await r.json()
    return{sent:!!j.ok}
  }catch(e){return{sent:false,reason:(e&&e.name)||'Error'}}
}

function cairoHour(){
  try{return parseInt(new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit'}),10)}catch(e){return -1}
}

function cairoDate(){
  try{return new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'})}catch(e){return new Date().toISOString().slice(0,10)}
}

async function matchAndSend(env){
  const h=cairoHour()
  const day=cairoDate()
  const out=[]
  for(const f of FIXED){if(f.cairo_hour===h)out.push(f.text)}
  for(const d of DATED){if(d.date===day&&d.cairo_hour===h)out.push(d.text)}
  if(h===23)out.push(WRITING_TEXT)
  let sent=0
  for(const t of out){const r=await tgSend(env,t);if(r.sent)sent++}
  return{cairo_hour:h,date:day,messages:out.length,sent:sent}
}

export default{
  async scheduled(event,env,ctx){ctx.waitUntil(matchAndSend(env))},
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname
    if(path==='/test'){const r=await tgSend(env,'سامية في الخدمة 🎀 — كل حاجة تمام، ومواعيدك في إيدي. أول تذكير جاي في وقته.');return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})}
    if(path==='/now'){const r=await matchAndSend(env);return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})}
    return new Response(JSON.stringify({ok:true,name:'khidmaty-samia',hint:'/test للتجربة و /now لرسائل الساعة الحالية'}),{headers:{'Content-Type':'application/json; charset=utf-8'}})
  }
}
