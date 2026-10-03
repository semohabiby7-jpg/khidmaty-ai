const BRAIN_HOST='https://khidmaty-agent.semohabiby7.workers.dev'

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}

async function tgSend(env,text){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return{sent:false,reason:'no_secrets'}
  try{
    const t=text.length>3800?text.slice(0,3800)+'…':text
    const r=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:t})})
    const j=await r.json()
    return{sent:!!j.ok}
  }catch(e){return{sent:false,reason:(e&&e.name)||'Error'}}
}

async function buildReport(env){
  let rep=''
  try{
    const r=await env.BRAIN.fetch(BRAIN_HOST+'/report')
    const j=await r.json()
    rep=(j&&j.report)||''
  }catch(e){}
  let stats=''
  try{
    const r=await env.BRAIN.fetch(BRAIN_HOST+'/stats')
    const j=await r.json()
    const s=j&&j.stats
    if(s&&s.website){
      stats='📈 زيارات النهاردة: '+s.website.visitsToday+' | الإجمالي: '+s.website.visitsTotal
      stats+='\n👤 مسجلين النهاردة: '+s.website.usersToday+' | الإجمالي: '+s.website.usersTotal
      stats+='\n💼 مقدمي الخدمات: '+s.website.providersTotal
      stats+='\n✈️ رسائل التليجرام النهاردة: '+(s.total||0)
    }
  }catch(e){}
  let text='صباح الخير يا محمد ☕\nصباحية خِدْمَتي AI — فكري 📊\n==========\n'
  if(stats)text+=stats+'\n\n'
  if(rep)text+='📋 التقرير الكامل:\n'+rep+'\n\n'
  text+='— فكري 📊 | '+stamp()
  return text
}

export default{
  async scheduled(event,env,ctx){ctx.waitUntil(buildReport(env).then(t=>tgSend(env,t)))},
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname
    if(path==='/test'){
      const text=await buildReport(env)
      const r=await tgSend(env,text)
      return new Response(JSON.stringify(r,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})
    }
    return new Response(JSON.stringify({ok:true,name:'khidmaty-fkry',hint:'افتح /test ليبعت الصباحية فورًا'}),{headers:{'Content-Type':'application/json; charset=utf-8'}})
  }
}
