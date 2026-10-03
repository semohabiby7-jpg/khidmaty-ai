const WRITING_HOUR_UTC=null
const WRITING_TEXT='✍️ ساعة الكتب يا محمد — اقعد واكتب، أنا شايلة عنك الباقي.\n— سامية 🎀'

const FIXED=[
  {utc_hour:6,text:'صباح الخير يا محمد ☀️ أنا سامية 🎀 — سكرتيرتك الشخصية.\nبرنامج النهاردة باختصار:\n1. دفعة المكاتب الجديدة نازلة على المنصة\n2. صباحية الأرقام واصلاك من فكري 📊\n3. ساعة كتبك — قولي الساعة اللي تناسبك وهحجزها\nيوم سعيد يا صاحب الشركة 🐝'}
]
const DATED=[
  {utc_date:'2026-10-04',utc_hour:7,text:'🔔 تذكير مهم من سامية: متابعة رجوع الـ10,000ج من بنك مصر (كارت 2528) — النهاردة الأحد. لو لسه مارجعتش كلم البنك.\n— سامية 🎀'}
]

async function tgSend(env,text){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return{sent:false,reason:'no_secrets'}
  try{
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text})})
    const j=await r.json()
    return{sent:!!j.ok}
  }catch(e){return{sent:false,reason:(e&&e.name)||'Error'}}
}

async function matchAndSend(env){
  const now=new Date()
  const h=now.getUTCHours()
  const day=now.toISOString().slice(0,10)
  const out=[]
  for(const f of FIXED){if(f.utc_hour===h)out.push(f.text)}
  for(const d of DATED){if(d.utc_date===day&&d.utc_hour===h)out.push(d.text)}
  if(WRITING_HOUR_UTC!==null&&WRITING_HOUR_UTC===h)out.push(WRITING_TEXT)
  let sent=0
  for(const t of out){const r=await tgSend(env,t);if(r.sent)sent++}
  return{hour_utc:h,date:day,messages:out.length,sent:sent}
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
