/* ===== SUPABASE CONFIG ===== */
const SUPABASE_URL='https://puhdastfiswcmbnczvwx.supabase.co'
const SUPABASE_KEY='sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY'

async function loadFromSupabase(){
  try{
    const [svcRes,catRes,prvRes] = await Promise.all([
      fetch(SUPABASE_URL+'/rest/v1/services?select=*', {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}}),
      fetch(SUPABASE_URL+'/rest/v1/categories?select=*', {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}}),
      fetch(SUPABASE_URL+'/rest/v1/providers?select=*', {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}})
    ])
    const svc = await svcRes.json()
    const cat = await catRes.json()
    const prv = await prvRes.json()
    if(svc.length){services.length=0;services.push(...svc.map(s=>({...s,desc:s.svc_desc})))}
    if(cat.length){categories.length=0;categories.push(...cat)}
    if(prv.length){providers.length=0;providers.push(...prv)}
    console.log('✅ Loaded from Supabase:',services.length,'services,',categories.length,'categories,',providers.length,'providers')
  }catch(e){console.log('Using local data:',e)}
}

/* ===== KHADMETY AI — App Logic ===== */

/* ===== Arabic Normalizer ===== */

/* ===== GEMINI AI INTEGRATION ===== */
function getGeminiKey(){return localStorage.getItem('gemini_key')||''}
function saveGeminiKey(k){localStorage.setItem('gemini_key',k)}
function saveAiSetup(e){e.preventDefault();const inp=document.getElementById('aiKeyInput');const k=inp.value.trim();if(!k){alert('ادخل الـ API key!');return false}saveGeminiKey(k);alert('تم تفعيل الذكاء الاصطناعي! 🎉');closeModal('aiSetupModal');return false}
function openAiSetup(){openModal('aiSetupModal');const inp=document.getElementById('aiKeyInput');const k=getGeminiKey();if(k)inp.value=k}
const aiHistory=[]

function buildSystemPrompt(){
  const svcList=services.map(s=>`- ${s.name} (${s.category}): ${s.desc} | الرسوم: ${s.fees} | المدة: ${s.duration} | المستندات: ${s.documents.join(', ')} | الخطوات: ${s.steps.join(' → ')} | الرابط: ${s.link}`).join('\n')
  return `أنت "خِدْمَتي AI"، مساعد ذكي مصري للمصالح الحكومية. بتعرف الخدمات دي:\n${svcList}\n\nقواعدك:\n1. ردّ بالعربي المصري بود وود\n2. لو سألوا عن خدمة، اعرض التفاصيل (المستندات، الخطوات، الرسوم، الرابط)\n3. لو السؤال عام، ساعد وارشح خدمات مناسبة\n4. خليك صديق وحبيب، استخدم إيموجي بشكل طبيعي\n5. لو محتاج حد، اقترح مقدم خدمة\n6. ردّ مختصر ومفيد`
}

async function callGemini(msg){
  aiHistory.push({role:'user',parts:[{text:msg}]})
  if(!getGeminiKey()){aiHistory.pop();return getAI(msg)}
  try{
    const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key='+getGeminiKey(),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:buildSystemPrompt()}]},
        contents:aiHistory
      })
    })
    const data=await res.json()
    const reply=data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0]?data.candidates[0].content.parts[0].text:null
    if(!reply)throw new Error('no reply')
    aiHistory.push({role:'model',parts:[{text:reply}]})
    return reply
  }catch(e){
    aiHistory.pop()
    console.log('Gemini error:',e)
    return getAI(msg)
  }
}

function norm(s){return s.replace(/[\u064B-\u0652]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim().toLowerCase()}

/* ===== Render Categories ===== */
function renderCats(){
  const el=document.getElementById('catFilter')
  let h='<button class="cat-pill active" onclick="filterCat(\'all\',this)">الكل</button>'
  categories.forEach(c=>{h+=`<button class="cat-pill" onclick="filterCat('${c.id}',this)">${c.icon} ${c.name}</button>`})
  el.innerHTML=h
}

/* ===== Render Services ===== */
let currentCat='all', currentSearch=''
function renderServices(){
  const grid=document.getElementById('servicesGrid')
  let list=currentCat==='all'?services:services.filter(s=>s.category===currentCat)
  if(currentSearch){
    const q=norm(currentSearch)
    list=list.filter(s=>norm(s.name).includes(q)||norm(s.desc).includes(q)||s.tags.some(t=>norm(t).includes(q)))
  }
  if(list.length===0){grid.innerHTML='<p class="no-results">لا توجد نتائج مطابقة 🤷‍♂️</p>';return}
  grid.innerHTML=list.map(s=>`
    <div class="svc-card" onclick="openService(${s.id})">
      <div class="svc-icon">${s.icon}</div>
      <h3 class="svc-name">${s.name}</h3>
      <p class="svc-desc">${s.desc}</p>
      <span class="svc-badge ${s.online?'badge-on':'badge-off'}">${s.online?'🌐 أونلاين':'🏛️ حضوري'}</span>
      <br><span class="svc-link">تفاصيل الخدمة ←</span>
      <div class="svc-share" onclick="event.stopPropagation();shareService('${s.name.replace(/'/g,"")}','${s.link||""}')" style="position:absolute;top:10px;left:10px;background:var(--gold);color:var(--navy);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;border:none">📤</div>
    </div>
  `).join('')
}

/* ===== Filter Category ===== */
function filterCat(cat,btn){
  document.querySelectorAll('.cat-pill').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  currentCat=cat
  renderServices()
}

/* ===== Main Search Live ===== */
function mainSearchLive(val){
  currentSearch=val
  document.getElementById('searchClear').classList.toggle('show',val.length>0)
  renderServices()
}
function clearMainSearch(){
  document.getElementById('mainSearch').value=''
  currentSearch=''
  document.getElementById('searchClear').classList.remove('show')
  renderServices()
}

/* ===== Hero Search Live ===== */
function heroSearchLive(val){
  const dd=document.getElementById('searchDropdown')
  if(val.length<2){dd.classList.remove('show');return}
  const q=norm(val)
  const results=services.filter(s=>norm(s.name).includes(q)||norm(s.desc).includes(q)||s.tags.some(t=>norm(t).includes(q)))
  if(results.length===0){
    dd.innerHTML='<div class="dd-no">لا توجد نتائج — جرّب كلمة تانية</div>'
  }else{
    dd.innerHTML=results.map(s=>`
      <div class="dd-item" onclick="openService(${s.id});document.getElementById('searchDropdown').classList.remove('show')">
        <span class="dd-icon">${s.icon}</span>
        <div class="dd-info"><h4>${s.name}</h4><p>${s.desc}</p></div>
      </div>
    `).join('')
  }
  dd.classList.add('show')
}
function heroSubmit(){
  const v=document.getElementById('heroSearch').value.trim()
  if(!v){alert('اكتب طلبك الأول! 😊');return}
  document.getElementById('searchDropdown').classList.remove('show')
  const q=norm(v)
  const match=services.find(s=>norm(s.name).includes(q)||s.tags.some(t=>norm(t).includes(q))||norm(s.desc).includes(q))
  if(match){openService(match.id)}else{
    document.getElementById('services').scrollIntoView({behavior:'smooth'})
    setTimeout(()=>{document.getElementById('mainSearch').value=v;currentSearch=v;document.getElementById('searchClear').classList.add('show');renderServices()},400)
  }
}

/* ===== Open Service Detail ===== */
function openService(id){
  const s=services.find(x=>x.id===id)
  if(!s)return
  const c=document.getElementById('serviceContent')
  c.innerHTML=`
    <div class="sd-head">
      <span class="sd-icon">${s.icon}</span>
      <div><h2 class="sd-title">${s.name}</h2><p class="sd-desc">${s.desc}</p></div>
    </div>
    <div class="sd-grid">
      <div class="sd-box"><span>الجهة</span><strong>${s.source}</strong></div>
      <div class="sd-box"><span>الرسوم</span><strong>${s.fees}</strong></div>
      <div class="sd-box"><span>المدة</span><strong>${s.duration}</strong></div>
      <div class="sd-box"><span>التنفيذ</span><strong>${s.online?'🌐 أونلاين':'🏛️ حضوري'}</strong></div>
    </div>
    ${s.eligibility?`<h3 class="sd-h3">من يستطيع الحصول عليها</h3><p style="color:var(--text);font-size:14px;margin-bottom:10px;">${s.eligibility}</p>`:''}
    <h3 class="sd-h3">📋 المستندات المطلوبة</h3>
    <ul class="sd-list">${s.documents.map(d=>`<li>${d}</li>`).join('')}</ul>
    <h3 class="sd-h3">📝 خطوات التنفيذ</h3>
    <ol class="sd-ol">${s.steps.map((st,i)=>`<li><strong>${i+1}.</strong> ${st}</li>`).join('')}</ol>
    <div class="sd-actions">
      <a href="${s.link}" target="_blank" class="sd-link-btn">🔗 الموقع الرسمي</a>
      <button class="sd-ai-btn" onclick="askAIAbout('${s.name}')">🤖 اسأل AI عنها</button>
      <button class="sd-help-btn" onclick="closeModal('serviceModal');needHelp()">👤 محتاج حد يخلصهالي</button>
    </div>
    <p class="sd-source">المصدر: ${s.source} | آخر تحديث: ${s.updated}</p>
  `
  openModal('serviceModal')
}

/* ===== AI Chat ===== */
async function aiSend(){
  const inp=document.getElementById('aiInput')
  const msg=inp.value.trim()
  if(!msg)return
  const chat=document.getElementById('aiChat')
  chat.innerHTML+=`<div class="ai-msg user"><div class="ai-bubble">${msg}</div></div>`
  inp.value=''
  chat.scrollTop=chat.scrollHeight
  const loadingMsgs=['🤔 بفكر في طلبك...','بـدور على أفضل طريقة...','🤖 خِدْمَتي بتجهّز الرد...','بـحلل المعلومات...']
  const lm=loadingMsgs[Math.floor(Math.random()*loadingMsgs.length)]
  chat.innerHTML+=`<div class="ai-msg bot" id="typing"><span class="ai-avatar">🤖</span><div class="ai-bubble">${lm}</div></div>`
  chat.scrollTop=chat.scrollHeight
  const reply=await callGemini(msg)
  const t=document.getElementById('typing');if(t)t.remove()
  chat.innerHTML+=`<div class="ai-msg bot"><span class="ai-avatar">🤖</span><div class="ai-bubble">${reply.replace(/\n/g,'<br>')}</div></div>`
  chat.scrollTop=chat.scrollHeight
}
function askAIAbout(name){
  closeModal('serviceModal')
  document.getElementById('ask-ai').scrollIntoView({behavior:'smooth'})
  setTimeout(()=>{
    document.getElementById('aiInput').value='عايز أعرف عن '+name
    aiSend()
  },400)
}

/* ===== Hero Actions ===== */
function quickAsk(term){
  document.getElementById('heroSearch').value=term
  heroSubmit()
}
function goToAI(){
  document.getElementById('ask-ai').scrollIntoView({behavior:'smooth'})
  setTimeout(()=>document.getElementById('aiInput').focus(),500)
}
function needHelp(){
  document.getElementById('providers').scrollIntoView({behavior:'smooth'})
}

/* ===== Render Providers ===== */
function renderProviders(){
  const grid=document.getElementById('providersGrid')
  grid.innerHTML=providers.map(p=>{
    const stars='★'.repeat(Math.floor(p.rating))+'☆'.repeat(5-Math.floor(p.rating))
    const bc=p.badge==='Top Provider'?'badge-on':p.badge==='Recommended'?'badge-on':'badge-off'
    const ic=p.type.includes('محام')?'⚖️':p.type.includes('محاسب')?'📊':p.type.includes('مرور')?'🚗':p.type.includes('شرك')?'🏢':p.type.includes('تأمين')?'👴':'📋'
    return `
      <div class="prv-card">
        <div class="prv-top">
          <div class="prv-avatar">${ic}</div>
          <div class="prv-info"><h4>${p.name}</h4><span>${p.type} — ${p.gov}</span></div>
        </div>
        <div class="prv-badges">
          <span class="svc-badge ${bc}">${p.badge}</span>
          <span class="svc-badge badge-off">${p.orders} طلب</span>
        </div>
        <p class="prv-stars">${stars} ${p.rating}</p>
      </div>
    `
  }).join('')
}

/* ===== Modals ===== */
function openModal(id){document.getElementById(id).classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}
/* ===== SUPABASE AUTH ===== */
function makeEmail(phone){return phone.replace(/[^0-9]/g,'')+'@khidmaty.ai'}

async function handleRegister(e){
  e.preventDefault()
  const name=document.getElementById('regName').value.trim()
  const phone=document.getElementById('regPhone').value.trim()
  const gov=document.getElementById('regGov').value
  const pass=document.getElementById('regPass').value
  if(!name||!phone||!gov||!pass){alert('املأ كل البيانات!');return false}
  try{
    const email=makeEmail(phone)
    const res=await fetch(SUPABASE_URL+'/auth/v1/signup',{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pass,data:{name,gov,phone}})
    })
    const data=await res.json()
    if(data.access_token){
      localStorage.setItem('sb_token',data.access_token)
      localStorage.setItem('sb_user',JSON.stringify({name,gov,phone,email}))
      alert('تم إنشاء حسابك بنجاح! 🎉\nأهلاً '+name)
      closeModal('registerModal')
      updateAuthUI()
    }else{
      alert(data.msg||data.message||'رقم الموبايل مستخدم بالفعل')
    }
  }catch(err){alert('حصلت مشكلة، جرّب تاني')}
  return false
}

async function handleLogin(e){
  e.preventDefault()
  const phone=document.getElementById('loginPhone').value.trim()
  const pass=document.getElementById('loginPass').value
  if(!phone||!pass){alert('املأ البيانات!');return false}
  try{
    const email=makeEmail(phone)
    const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pass})
    })
    const data=await res.json()
    if(data.access_token){
      const user=data.user
      const name=user.user_metadata?.name||user.email
      localStorage.setItem('sb_token',data.access_token)
      localStorage.setItem('sb_user',JSON.stringify({name:name,gov:user.user_metadata?.gov||'',phone,email}))
      alert('أهلاً '+name+' 👋')
      closeModal('loginModal')
      updateAuthUI()
    }else{
      alert('رقم الموبايل أو كلمة المرور غلط')
    }
  }catch(err){alert('حصلت مشكلة، جرّب تاني')}
  return false
}

function logout(){
  localStorage.removeItem('sb_token')
  localStorage.removeItem('sb_user')
  updateAuthUI()
  alert('تم تسجيل الخروج 👋')
}

function updateAuthUI(){
  const token=localStorage.getItem('sb_token')
  const user=JSON.parse(localStorage.getItem('sb_user')||'{}')
  const btns=document.querySelector('.header-btns')
  if(token&&user.name){
    if(btns)btns.innerHTML='<span style="color:var(--navy);font-weight:600;font-size:14px">👋 '+user.name+'</span><button class="btn-gold" onclick="logout()">خروج</button>'
  }else{
    if(btns)btns.innerHTML='<button class="btn-ghost" onclick="openModal(\'loginModal\')">تسجيل الدخول</button><button class="btn-gold" onclick="openModal(\'registerModal\')">إنشاء حساب</button><button class="btn-gold" onclick="openModal(\'settingsModal\')" style="background:linear-gradient(135deg,var(--navy-l),var(--navy));margin-right:6px" aria-label="الإعدادات">⚙️</button>'
  }
}

updateAuthUI()

function handleProvider(e){e.preventDefault();alert('تم تسجيلك كمقدم خدمة! هنتواصل معاك للتوثيق ✅');closeModal('providerModal');return false}

/* ===== Mobile Nav ===== */
function toggleMobileNav(){document.getElementById('navMobile').classList.toggle('show')}

/* ===== Header Scroll ===== */
window.addEventListener('scroll',()=>{
  const h=document.getElementById('header')
  h.classList.toggle('scrolled',window.scrollY>50)
})

/* ===== Close search dropdown on outside click ===== */
document.addEventListener('click',e=>{
  const wrap=document.querySelector('.hero-search-wrap')
  if(wrap&&!wrap.contains(e.target))document.getElementById('searchDropdown').classList.remove('show')
  document.querySelectorAll('.modal-overlay').forEach(m=>{if(e.target===m)m.classList.remove('show')})
})

/* ===== Bottom Nav Active ===== */
window.addEventListener('scroll',()=>{
  const secs=['home','services','ask-ai','providers']
  let cur=''
  secs.forEach(id=>{const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<200)cur=id})
  document.querySelectorAll('.bn-item').forEach(b=>{
    const href=b.getAttribute('href')||''
    b.classList.toggle('active',href==='#'+cur)
  })
})

/* ===== Init ===== */
/* ===== Render Government Links ===== */
function renderGovLinks(){
  const grid=document.getElementById('govLinksGrid')
  if(!grid)return
  const seen=new Set()
  const links=services.map(s=>({link:s.link,source:s.source,icon:s.icon,cat:s.category})).filter(x=>{
    if(seen.has(x.link))return false
    seen.add(x.link);return true
  })
  const catName=id=>{const c=categories.find(c=>c.id===id);return c?c.icon+' '+c.name:id}
  grid.innerHTML=links.map(l=>`
    <a href="${l.link}" target="_blank" class="svc-card" style="text-decoration:none;cursor:pointer">
      <div class="svc-icon">${l.icon}</div>
      <h3 class="svc-name" style="font-size:15px">${l.source}</h3>
      <p class="svc-desc" style="font-size:12px">${catName(l.cat)}</p>
      <span class="svc-link">زيارة الموقع ←</span>
    </a>
  `).join('')
}

document.addEventListener('DOMContentLoaded',async()=>{
  await loadFromSupabase()
  renderCats()
  renderServices()
  renderProviders()
  renderGovLinks()
})

/* ===== SERVICE DETAIL PAGE ===== */
function openServicePage(id){
  const s=services.find(x=>x.id===id)
  if(!s)return
  const app=document.getElementById('app')
  document.body.scrollTop=0
  const docs=s.documents.map((d,i)=>`<div class="doc-check" id="doc${i}" onclick="toggleDoc(${i})"><div class="dc-icon">✓</div><div class="dc-text">${d}</div></div>`)
  const steps=s.steps.map((st,i)=>`<div class="journey-step" id="step${i}" onclick="toggleStep(${i})"><div class="js-circle">${i+1}<div class="js-line"></div></div><div class="js-content"><h4>${st}</h4><p>اضغط لتحديد كإكتمل</p></div></div>`)
  const main=document.querySelector('.categories-section')
  main.innerHTML=`
    <div class="service-page">
      <div class="container">
        <button class="sp-back" onclick="location.reload()">→ رجوع للخدمات</button>
        <div class="sp-header">
          <div class="sp-icon">${s.icon}</div>
          <div class="sp-info">
            <h1>${s.name}</h1>
            <p>${s.desc}</p>
            <div class="sp-badges">
              <span class="svc-badge ${s.online?'badge-on':'badge-off'}">${s.online?'🌐 متاح أونلاين':'🏛️ حضوري'}</span>
              <span class="svc-badge badge-off">🏛️ ${s.source}</span>
            </div>
          </div>
        </div>
        <div class="sp-grid">
          <div class="sp-main">
            <h2>📋 المستندات المطلوبة</h2>
            <div class="checklist-progress">
              <div class="cp-bar"><div class="cp-fill" id="docBar" style="width:0%"></div></div>
              <p class="cp-text">جهزت <strong id="docCount">0</strong> من ${s.documents.length} مستندات</p>
            </div>
            ${docs.join('')}
            <h2>📝 رحلة إنجاز المصلحة</h2>
            <p class="desc">اتبع الخطوات دي واحدة واحدة وعلّم كل خطوة لما تخلصها</p>
            <div class="journey-step" id="step-all">
              <div style="width:100%">
                ${steps.join('')}
              </div>
            </div>
            <h2>💰 الرسوم والمدة</h2>
            <div class="sp-info-box"><p><strong>الرسوم:</strong> ${s.fees}<br><strong>المدة المتوقعة:</strong> ${s.duration}</p></div>
            ${s.eligibility?`<h2>👤 من يستطيع الحصول عليها</h2><p class="desc">${s.eligibility}</p>`:''}
          </div>
          <div class="sp-side">
            <div class="sp-side-card">
              <h3>📊 معلومات سريعة</h3>
              <div class="sp-stat"><span>الجهة</span><strong>${s.source}</strong></div>
              <div class="sp-stat"><span>التنفيذ</span><strong>${s.online?'أونلاين':'حضوري'}</strong></div>
              <div class="sp-stat"><span>الرسوم</span><strong>${s.fees}</strong></div>
              <div class="sp-stat"><span>المدة</span><strong>${s.duration}</strong></div>
            </div>
            <div class="sp-side-card">
              <h3>إجرائات</h3>
              <div class="sp-actions">
                <a href="${s.link}" target="_blank" class="btn-help">🔗 الموقع الرسمي</a>
                <button class="btn-primary" onclick="askAIAbout('${s.name}')">🤖 اسأل AI عنها</button>
                <button class="btn-ghost" onclick="needHelp()" style="border:2px solid var(--navy);padding:14px;border-radius:12px;font-weight:700;cursor:pointer;background:transparent;color:var(--navy)">👤 محتاج حد يخلصهالي</button>
              </div>
              <p class="sp-source">المصدر: ${s.source}<br>آخر تحديث: ${s.updated}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  document.getElementById('services').scrollIntoView({behavior:'smooth'})
  state.serviceId=id
  state.docsDone=new Array(s.documents.length).fill(false)
  state.stepsDone=new Array(s.steps.length).fill(false)
}

/* Toggle Document */
function toggleDoc(i){
  state.docsDone[i]=!state.docsDone[i]
  const el=document.getElementById('doc'+i)
  el.classList.toggle('done',state.docsDone[i])
  const done=state.docsDone.filter(Boolean).length
  const total=state.docsDone.length
  document.getElementById('docCount').textContent=done
  document.getElementById('docBar').style.width=(done/total*100)+'%'
}

/* Toggle Step */
function toggleStep(i){
  state.stepsDone[i]=!state.stepsDone[i]
  const el=document.getElementById('step'+i)
  el.classList.toggle('done',state.stepsDone[i])
  el.classList.toggle('active',!state.stepsDone[i]&&state.stepsDone.slice(0,i).every(Boolean))
}

/* State */
const state={serviceId:null,docsDone:[],stepsDone:[]}

/* ===== USER DASHBOARD ===== */
const myServices=[
  {id:1,svc:'تجديد رخصة قيادة',icon:'🚗',status:'progress',progress:60,docs:4,total:5},
  {id:2,svc:'استخراج بطاقة رقم قومي',icon:'🆔',status:'pending',progress:20,docs:1,total:3},
  {id:3,svc:'التسجيل الضريبي',icon:'📊',status:'done',progress:100,docs:4,total:4}
];
const myRequests=[
  {id:1,svc:'تجديد رخصة سيارة',provider:'مكتب الأهرام',date:'12 سبتمبر',status:'pending'},
  {id:2,svc:'استخراج جواز سفر',provider:'أ. خالد مصطفى',date:'10 سبتمبر',status:'progress'}
];

function openDashboard(){
  const main=document.querySelector('.categories-section')
  main.innerHTML=`
    <div class="dashboard">
      <div class="container">
        <div class="dash-header">
          <h1>أهلاً بك في حسابك 👋</h1>
          <p>تابع مصالحك وطلباتك في مكان واحد</p>
        </div>
        <div class="dash-tabs">
          <button class="dash-tab active" onclick="dashTab('services',this)">📋 مصالحي</button>
          <button class="dash-tab" onclick="dashTab('requests',this)">📨 طلباتي</button>
          <button class="dash-tab" onclick="dashTab('saved',this)">⭐ محفوظات</button>
          <button class="dash-tab" onclick="dashTab('profile',this)">👤 حسابي</button>
        </div>
        <div id="dashContent"></div>
      </div>
    </div>
  `
  dashTab('services')
  document.getElementById('services').scrollIntoView({behavior:'smooth'})
}

function dashTab(tab,btn){
  if(btn){document.querySelectorAll('.dash-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}
  const c=document.getElementById('dashContent')
  if(tab==='services'){
    c.innerHTML=`<div class="dash-grid">${myServices.map(s=>{
      const st={pending:['🟡 قيد التجهيز','status-pending'],progress:['🔵 جاري التنفيذ','status-progress'],done:['✅ مكتمل','status-done']}[s.status]
      return `<div class="dash-card">
        <span class="dc-status ${st[1]}">${st[0]}</span>
        <h4>${s.icon} ${s.svc}</h4>
        <p>جهزت ${s.docs} من ${s.total} مستندات</p>
        <div class="dash-progress"><div class="dash-progress-fill" style="width:${s.progress}%"></div></div>
        <div class="dash-card-actions">
          <button class="dash-btn-gold" onclick="location.reload()">متابعة</button>
          <button class="dash-btn-navy" onclick="alert('سيتم تفعيل لاحقاً')">تفاصيل</button>
        </div>
      </div>`
    }).join('')}</div>`
  } else if(tab==='requests'){
    c.innerHTML=`<div class="dash-grid">${myRequests.map(r=>`
      <div class="dash-card">
        <span class="dc-status ${r.status==='pending'?'status-pending':'status-progress'}">${r.status==='pending'?'🟡 في انتظار القبول':'🔵 جاري التنفيذ'}</span>
        <h4>📨 ${r.svc}</h4>
        <p>المقدم: ${r.provider}<br>التاريخ: ${r.date}</p>
        <div class="dash-card-actions">
          <button class="dash-btn-gold" onclick="alert('سيتم تفعيل الشات لاحقاً')">💬 مراسلة</button>
          <button class="dash-btn-navy" onclick="alert('تفاصيل الطلب')">تفاصيل</button>
        </div>
      </div>
    `).join('')}</div>`
  } else if(tab==='saved'){
    c.innerHTML=`<div class="dash-empty"><span>⭐</span><p>لا توجد خدمات محفوظة بعد</p><br><button class="dash-btn-gold" style="padding:12px 24px" onclick="location.reload()">تصفح الخدمات</button></div>`
  } else if(tab==='profile'){
    c.innerHTML=`<div class="dash-card" style="max-width:500px;margin:0 auto;text-align:center">
      <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--navy),var(--navy-l));display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px">👤</div>
      <h4 style="font-size:20px;color:var(--navy);margin-bottom:8px">محمد عبد الله</h4>
      <p style="color:var(--text-l);margin-bottom:20px">القاهرة - 01012345678</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="dash-btn-navy" style="padding:10px 20px">تعديل البيانات</button>
        <button class="dash-btn-gold" style="padding:10px 20px">تسجيل الخروج</button>
      </div>
    </div>`
  }
}

/* ===== ADMIN DASHBOARD ===== */
function openAdmin(){
  const main=document.querySelector('.categories-section')
  main.innerHTML=`
    <div class="admin">
      <div class="container">
        <div class="admin-header">
          <h1>⚙️ لوحة الإدارة</h1>
          <p>إدارة الخدمات والمستخدمين والمقدمين</p>
        </div>
        <div class="admin-stats">
          <div class="admin-stat"><div class="as-icon">👥</div><div class="as-num">${services.length}</div><div class="as-label">خدمة</div></div>
          <div class="admin-stat"><div class="as-icon">🧑‍💼</div><div class="as-num">${providers.length}</div><div class="as-label">مقدم خدمة</div></div>
          <div class="admin-stat"><div class="as-icon">📨</div><div class="as-num">${myRequests.length}</div><div class="as-label">طلب</div></div>
          <div class="admin-stat"><div class="as-icon">📋</div><div class="as-num">${categories.length}</div><div class="as-label">تصنيف</div></div>
        </div>
        <div class="admin-table">
          <h3>الخدمات الأخيرة</h3>
          <table>
            <tr><th>الخدمة</th><th>التصنيف</th><th>الحالة</th><th>إجراء</th></tr>
            ${services.slice(0,8).map(s=>`<tr>
              <td>${s.icon} ${s.name}</td>
              <td>${categories.find(c=>c.id===s.category)?.name||'-'}</td>
              <td><span class="at-badge ${s.online?'badge-on':'badge-off'}">${s.online?'أونلاين':'حضوري'}</span></td>
              <td><button class="dash-btn-navy" style="padding:6px 12px;font-size:12px" onclick="alert('تعديل')">تعديل</button></td>
            </tr>`).join('')}
          </table>
        </div>
        <div class="admin-table">
          <h3>مقدمو الخدمات</h3>
          <table>
            <tr><th>الاسم</th><th>النوع</th><th>المحافظة</th><th>الحالة</th><th>إجراء</th></tr>
            ${providers.map(p=>`<tr>
              <td>${p.name}</td>
              <td>${p.type}</td>
              <td>${p.gov}</td>
              <td><span class="at-badge badge-on">${p.badge}</span></td>
              <td><button class="dash-btn-navy" style="padding:6px 12px;font-size:12px" onclick="alert('مراجعة')">مراجعة</button></td>
            </tr>`).join('')}
          </table>
        </div>
      </div>
    </div>
  `
  document.getElementById('services').scrollIntoView({behavior:'smooth'})
}

/* ===== THEME TOGGLE ===== */
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')
  const next=cur==='dark'?'light':'dark'
  document.documentElement.setAttribute('data-theme',next)
  localStorage.setItem('theme',next)
  const btn=document.getElementById('themeToggle')
  if(btn)btn.textContent=next==='dark'?'☀️':'🌙'
  const sb=document.getElementById('themeBtn');if(sb)sb.textContent=next==='dark'?'☀️':'🌙'
}
(function(){
  const saved=localStorage.getItem('theme')
  if(saved==='dark'){
    document.documentElement.setAttribute('data-theme','dark')
    setTimeout(()=>{const b=document.getElementById('themeToggle');if(b)b.textContent='☀️'},100)
  }
})()

/* ===== LANGUAGE TOGGLE ===== */
function toggleLang(){
  const cur=localStorage.getItem('lang')||'ar'
  const next=cur==='ar'?'en':'ar'
  localStorage.setItem('lang',next)
  const btn=document.getElementById('langBtn')
  if(btn)btn.textContent=next==='ar'?'عربي':'English'
  if(next==='en'){
    document.documentElement.lang='en'
    document.documentElement.dir='ltr'
    alert('English mode selected ✅\nFull translation coming soon!')
  }else{
    document.documentElement.lang='ar'
    document.documentElement.dir='rtl'
    alert('تم تفعيل العربية ✅')
  }
}

/* ===== SHARE FUNCTIONS ===== */
function shareService(name,link){
  const text='شوف خدمة '+name+' على خِدْمَتي AI 🔗\n'+link+'\n\nمصلحتك في مكان واحد!'
  const url='https://wa.me/?text='+encodeURIComponent(text)
  window.open(url,'_blank')
}
function shareFacebook(url){
  window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url),'_blank')
}
function shareTwitter(text,url){
  window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(url),'_blank')
}
function copyLink(url){
  navigator.clipboard.writeText(url).then(()=>alert('تم نسخ الرابط! ✅')).catch(()=>alert('انسخ: '+url))
}
function shareSite(){
  const text='خِدْمَتي AI - مصلحتك في مكان واحد! 🎯'
  const url='https://semohabiby7-jpg.github.io/khidmaty-ai/'
  const full=text+'\n'+url
  if(navigator.share){
    navigator.share({title:'خِدْمَتي AI',text:text,url:url}).catch(()=>{})
  }else{
    window.open('https://wa.me/?text='+encodeURIComponent(full),'_blank')
  }
}
