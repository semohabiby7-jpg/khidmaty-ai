const SITE_URL='https://khidmatyai.com'
const ARTICLES_URL='https://khidmatyai.com/articles.html'
const WORKER_URL='https://khidmaty-agent.semohabiby7.workers.dev/requests'
const SUPA_URL='https://puhdastfiswcmbnczvwx.supabase.co'
const SUPA_KEY='sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY'
const REALERT_MS=6*60*60*1000

function stamp(){
  try{return new Date().toLocaleString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' بتوقيت القاهرة'}catch(e){return new Date().toISOString()}
}

async function hit(url,opts){
  const ctl=new AbortController()
  const timer=setTimeout(()=>ctl.abort(),20000)
  const t0=Date.now()
  try{
    const res=await fetch(url,{...opts,signal:ctl.signal})
    const body=await res.text()
    return {ok:true,status:res.status,body,ms:Date.now()-t0}
  }catch(e){
    return {ok:false,status:0,body:'',ms:Date.now()-t0,err:e&&e.name==='AbortError'?'Timeout':(e&&e.name)||'FetchError'}
  }finally{clearTimeout(timer)}
}

async function checkHttp(name,url){
  const r=await hit(url)
  if(r.ok&&r.status===200)return{name,up:true,detail:'HTTP 200 ('+(r.ms/1000).toFixed(2)+'s)'}
  if(r.ok)return{name,up:false,detail:'HTTP '+r.status}
  return{name,up:false,detail:r.err}
}

async function checkBrain(name,url,env){
  if(env&&env.BRAIN){
    const t0=Date.now()
    for(const h of ['https://brain.internal','https://khidmaty-agent.semohabiby7.workers.dev']){
      try{
        const res=await env.BRAIN.fetch(h+'/requests')
        if(res.status===200){
          const data=JSON.parse(await res.text())
          if(data.ok)return{name,up:true,detail:'سليم عبر ربط داخلي ('+(Date.now()-t0)+'ms)'}
        }
      }catch(e){}
    }
    return{name,up:false,detail:'الربط الداخلي فشل مرتين'}
  }
  const r=await hit(url)
  if(!r.ok)return{name,up:false,detail:r.err}
  if(r.status!==200)return{name,up:false,detail:'HTTP '+r.status}
  try{
    const data=JSON.parse(r.body)
    if(!data.ok)return{name,up:false,detail:'استجابة غير سليمة من العقل'}
    return{name,up:true,detail:'HTTP 200 ('+(r.ms/1000).toFixed(2)+'s)'}
  }catch(e){return{name,up:false,detail:'JSON غير صالح'}}
}

async function checkTelegram(env){
  if(!env.TELEGRAM_BOT_TOKEN)return null
  const r=await hit('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/getMe')
  if(!r.ok)return{name:'بوت التليجرام',up:false,detail:r.err}
  if(r.status!==200)return{name:'بوت التليجرام',up:false,detail:'HTTP '+r.status}
  try{
    const data=JSON.parse(r.body)
    if(data.ok)return{name:'بوت التليجرام',up:true,detail:'getMe سليم'}
    return{name:'بوت التليجرام',up:false,detail:'getMe فاشل'}
  }catch(e){return{name:'بوت التليجرام',up:false,detail:'JSON غير صالح'}}
}

async function runChecks(env){
  const results=[await checkHttp('الموقع الرئيسي',SITE_URL),await checkHttp('صفحة المقالات',ARTICLES_URL),await checkBrain('عقل البوت',WORKER_URL,env)]
  const tg=await checkTelegram(env)
  if(tg)results.push(tg)
  const ups=results.filter(r=>r.up).length
  const status=ups===results.length?'ok':(ups===0?'down':'partial')
  return{results,status}
}

function buildMessage(status,results){
  let header
  if(status==='down')header='🔴 خِدْمَتي AI واقعة بالكامل — الموقع والعقل مش راضيين يردوا'
  else if(status==='partial')header='🟠 تحذير جزئي في خِدْمَتي AI — فيه جزء واقع'
  else header='🟢 خِدْمَتي AI رجعت طبيعي — كل الأنظمة شغالة'
  const lines=results.map(r=>(r.up?'✅ ':'❌ ')+r.name+': '+r.detail).join('\n')
  return header+'\n'+lines+'\n'+stamp()
}

async function supaRpc(fn,body){
  const r=await hit(SUPA_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify(body||{})})
  if(!r.ok)return null
  try{return JSON.parse(r.body)}catch(e){return null}
}

async function getState(){return await supaRpc('watchdog_get_state',{})}

async function setState(alertAt,status){return await supaRpc('watchdog_set_state',{p_last_alert_at:alertAt,p_status:status})}

async function runWatchdog(env){
  const {results,status}=await runChecks(env)
  const prev=await getState()
  let alertText=null
  if(status!=='ok'){
    const last=prev&&prev.last_alert_at?new Date(prev.last_alert_at).getTime():0
    if(!prev||!last||(Date.now()-last)>REALERT_MS||(prev.last_status==='ok'))alertText=buildMessage(status,results)
  }else if(prev&&prev.last_status&&prev.last_status!=='ok'){
    alertText=buildMessage(status,results)
  }
  if(alertText&&env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID){
    await hit('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:alertText})})
  }
  const newAlertAt=alertText?new Date().toISOString():(prev&&prev.last_alert_at)||null
  await setState(newAlertAt,status)
  return{status,results,alerted:!!alertText}
}

function cairoHM(){
  try{
    const s=new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',hour12:false,hour:'2-digit',minute:'2-digit'})
    const p=s.split(':')
    return{h:parseInt(p[0],10),m:parseInt(p[1],10)}
  }catch(e){return{h:-1,m:-1}}
}

async function nightCheckin(env,status){
  if(status!=='ok'||!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return
  const t=cairoHM()
  if(t.h!==23||t.m>=30)return
  await hit('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:'🌙 طمنة من ساهر: كل أنظمة خِدْمَتي شغالة تمام — نام مرتاح يا محمد.\n— ساهر، حارس الليل 🌙'})})
}

export default{
  async scheduled(event,env,ctx){ctx.waitUntil(runWatchdog(env).then(r=>nightCheckin(env,r.status).then(()=>r)))},
  async fetch(request,env,ctx){
    const url=new URL(request.url)
    if(url.pathname==='/check'){
      const {results,status}=await runChecks(env)
      return new Response(JSON.stringify({v4_sig:'WD4-9F3A',status,results,brain_binding:!!(env&&env.BRAIN),checked_at:stamp()},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})
    }
    const prev=await getState()
    return new Response(JSON.stringify({ok:true,name:'khidmaty-watchdog',last_state:prev,hint:'افتح /check للفحص الفوري'},null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})
  }
}
