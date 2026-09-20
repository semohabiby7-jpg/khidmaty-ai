/* ===== SUPABASE CONFIG ===== */
const SUPABASE_URL='https://puhdastfiswcmbnczvwx.supabase.co'
const SUPABASE_KEY='sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY'
const WORKER_URL='https://wispy-pine-7fd2.semohabiby7.workers.dev'

/* ===== TOAST (إشعار نجاح/خطأ) ===== */
function showToast(msg,type){
  type=type||'success'
  let t=document.getElementById('appToast')
  if(!t){t=document.createElement('div');t.id='appToast';document.body.appendChild(t)}
  t.className='app-toast '+type
  t.innerHTML=msg.replace(/\n/g,'<br>')
  t.classList.add('show')
  clearTimeout(t._timer)
  t._timer=setTimeout(()=>t.classList.remove('show'),4500)
}


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

const aiHistory=[]

/* ===== KHADMATY AI — Local Smart Engine (fallback) ===== */
const synMap={
'عايز':'محتاج','عايزة':'محتاج','عايزين':'محتاج','نفسي':'محتاج',
'اطلع':'استخراج','اطلعها':'استخراج','اعمل':'استخراج','اخرج':'استخراج','مستخرج':'استخراج',
'بدل فاقد':'بدل','ضاعت':'بدل فاقد','ضاعتلي':'بدل فاقد','فقدت':'بدل فاقد',
'رخصة':'قيادة','سواقة':'قيادة',
'عربية':'سيارة','موتوسيكل':'دراجة',
'كرت':'بطاقة','كارنيه':'بطاقة',
'ضريبة':'ضريبي','ضرايب':'ضريبي',
'معاش':'تأمين','تقاعد':'تأمين',
'جواز':'سفر','ترافل':'سفر',
'تجديد':'تجديد','جدد':'تجديد','جدد':'تجديد',
'كهرباء':'كهرباء','نور':'كهرباء','مية':'مياه','مايه':'مياه','غاز':'غاز'
}

function getAI(msg){
  let matched=msg
  Object.keys(synMap).forEach(k=>{if(msg.includes(k))matched+=' '+synMap[k]})
  const q=norm(matched)
  let best=null,bestScore=0
  services.forEach(s=>{
    let score=0
    if(norm(s.name).includes(q)||q.includes(norm(s.name)))score+=10
    s.tags.forEach(t=>{if(q.includes(norm(t))||norm(t).includes(q.split(' ')[0]))score+=5})
    if(norm(s.desc).includes(q))score+=2
    if(q.includes(norm(s.category)))score+=3
    if(score>bestScore){bestScore=score;best=s}
  })
  if(best&&bestScore>0){
    const docs=best.documents.map(d=>'✓ '+d).join('<br>')
    const steps=best.steps.map((st,i)=>`<strong>${i+1}.</strong> ${st}`).join('<br>')
    return `<div class="ai-info-card">
<h4>📍 ${best.name}</h4>
<div class="ai-info-row"><span class="ai-info-ico">🏛️</span><span class="ai-info-val"><strong>الجهة:</strong> ${best.source||'غير محدد'}</span></div>
<div class="ai-info-row"><span class="ai-info-ico">📄</span><span class="ai-info-val"><strong>المستندات:</strong><br>${docs}</span></div>
<div class="ai-info-row"><span class="ai-info-ico">💰</span><span class="ai-info-val"><strong>الرسوم:</strong> ${best.fees||'غير محدد'}</span></div>
<div class="ai-info-row"><span class="ai-info-ico">⏱️</span><span class="ai-info-val"><strong>المدة:</strong> ${best.duration||'غير محدد'}</span></div>
<div class="ai-info-row"><span class="ai-info-ico">🌐</span><span class="ai-info-val"><strong>التنفيذ:</strong> ${best.online?'أونلاين ✓':'حضوري 🏛️'}</span></div>
<div class="ai-info-row"><span class="ai-info-ico">📝</span><span class="ai-info-val"><strong>الخطوات:</strong><br>${steps}</span></div>
</div>
<button class="ai-help-cta" onclick="needHelp()">👤 مش عايز تعملها بنفسك؟ محتاج حد يخلصهالك؟</button>
<a href="${best.link}" target="_blank" style="display:block;text-align:center;margin-top:8px;color:var(--gold-d);font-weight:600;font-size:14px">🔗 افتح الموقع الرسمي</a>`
  }
  const suggestions=services.slice(0,5).map(s=>`• ${s.icon} ${s.name}`).join('<br>')
  return `معلش، مقدرتش ألاقي خدمة مطابقة لطلبك ده 🤔<br><br>بس ممكن تساعدني بإنك تكتب اسم الخدمة أوضح، أو جرّب:<br>${suggestions}<br><br>أو تصفّح <a href="#services" style="color:var(--gold-d);font-weight:600">دليل الخدمات</a> 📋`
}

function buildSystemPrompt(){
  const svcList=services.map(s=>`- ${s.name} (${s.category}): ${s.desc} | الرسوم: ${s.fees} | المدة: ${s.duration} | المستندات: ${s.documents.join(', ')} | الخطوات: ${s.steps.join(' → ')} | الرابط: ${s.link}`).join('\n')
  return `أنت "خِدْمَتي AI"، مساعد ذكي مصري للمصالح الحكومية. بتعرف الخدمات دي:\n${svcList}\n\nقواعدك:\n1. ردّ بالعربي المصري بود وود\n2. لو سألوا عن خدمة، اعرض التفاصيل بشكل منظّم: 📍 الجهة، 📄 المستندات، 💰 الرسوم، ⏱️ المدة، 🌐 التنفيذ (أونلاين/حضوري)، 📝 الخطوات\n3. في آخر الرد، اسأل المستخدم: "مش عايز تعملها بنفسك؟ محتاج حد يخلصهالك؟" واقترح مقدم خدمة\n4. لو السؤال عام، ساعد وارشح خدمات مناسبة\n5. خليك صديق وحبيب، استخدم إيموجي بشكل طبيعي\n6. ردّ مختصر ومفيد\n7. افهم المصري العامي (عايز، محتاج، اطلع، بدل فاقد، ...)\n8. لو المستخدم كتب "محتاج حد يخلصهالي"، وجهه لقسم مقدمي الخدمات`
}

async function callGemini(msg){
  aiHistory.push({role:'user',parts:[{text:msg}]})
  // Using Worker proxy - no key needed
  try{
    const svcContext=services.map(s=>`- ${s.icon} ${s.name} (${s.category}): ${s.desc} | المستندات: ${(s.documents||[]).join(', ')} | الخطوات: ${(s.steps||[]).join(' → ')} | الرسوم: ${s.fees||'غير محدد'} | المدة: ${s.duration||'غير محدد'} | الجهة: ${s.source||'غير محدد'} | الرابط: ${s.link||'غير متاح'}`).join('\n')
    const res=await fetch(WORKER_URL+'/',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:msg,history:aiHistory,services:svcContext})
    })
    const data=await res.json()
    if(data.reply){
      aiHistory.push({role:'model',parts:[{text:data.reply}]})
      return data.reply
    }
    throw new Error('no reply')
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
    let expanded=currentSearch
    Object.keys(synMap).forEach(k=>{if(currentSearch.includes(k))expanded+=' '+synMap[k]})
    const words=norm(expanded).split(/\s+/).filter(w=>w.length>2)
    list=list.filter(s=>{
      const sn=norm(s.name),sd=norm(s.desc),sc=norm(currentSearch)
      if(sn.includes(sc)||sd.includes(sc))return true
      if(s.tags.some(t=>norm(t).includes(sc)))return true
      return words.some(w=>sn.includes(w)||sd.includes(w)||s.tags.some(t=>norm(t).includes(w)))
    })
  }
  if(list.length===0){grid.innerHTML='<p class="no-results">لا توجد نتائج مطابقة 🤷‍♂️</p>';return}
  grid.innerHTML=list.map(s=>`
    <div class="svc-card" onclick="openService(${s.id})">
      <div class="svc-icon">${s.icon}</div>
      <h3 class="svc-name">${s.name}</h3>
      <p class="svc-desc">${s.desc}</p>
      <span class="svc-badge ${s.online?'badge-on':'badge-off'}">${s.online?'🌐 أونلاين':'🏛️ حضوري'}</span>
      <br><span class="svc-link">تفاصيل الخدمة ←</span>
      <div class="svc-fav" onclick="event.stopPropagation();toggleFav(${s.id})" style="position:absolute;top:10px;right:10px;font-size:18px;cursor:pointer">${isFav(s.id)?'❤️':'🤍'}</div>
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
  let expanded=val
  Object.keys(synMap).forEach(k=>{if(val.includes(k))expanded+=' '+synMap[k]})
  const words=norm(expanded).split(/\s+/).filter(w=>w.length>2)
  const sc=norm(val)
  const results=services.filter(s=>{
    const sn=norm(s.name),sd=norm(s.desc)
    if(sn.includes(sc)||sd.includes(sc)||s.tags.some(t=>norm(t).includes(sc)))return true
    return words.some(w=>sn.includes(w)||sd.includes(w)||s.tags.some(t=>norm(t).includes(w)))
  })
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
  if(!v){showToast('اكتب طلبك الأول! 😊','error');return}
  document.getElementById('searchDropdown').classList.remove('show')
  let expanded=v
  Object.keys(synMap).forEach(k=>{if(v.includes(k))expanded+=' '+synMap[k]})
  const words=norm(expanded).split(/\s+/).filter(w=>w.length>2)
  const match=services.find(s=>{
    const sn=norm(s.name),sd=norm(s.desc),sc=norm(v)
    if(sn.includes(sc)||sd.includes(sc)||s.tags.some(t=>norm(t).includes(sc)))return true
    return words.some(w=>sn.includes(w)||s.tags.some(t=>norm(t).includes(w)))
  })
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
  // Build interactive checklist
  const checklist=s.documents.map((d,i)=>`<label class="check-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--gray);border-radius:10px;margin-bottom:8px;cursor:pointer;border:1px solid var(--gray-m)" onclick="toggleCheck(${i})">
    <input type="checkbox" id="chk${i}" style="width:20px;height:20px;accent-color:var(--gold)">
    <span id="chkLabel${i}" style="font-size:15px">${d}</span>
  </label>`).join('')
  const stepsChecklist=s.steps.map((st,i)=>`<div class="step-check" id="stepCk${i}" style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--gray);border-radius:10px;margin-bottom:8px;cursor:pointer;border:1px solid var(--gray-m)" onclick="toggleStepCheck(${i})">
    <div id="stepIcon${i}" style="min-width:28px;height:28px;border-radius:50%;background:var(--navy);color:var(--white);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${i+1}</div>
    <div style="flex:1"><strong id="stepText${i}">${st}</strong><br><span style="font-size:12px;color:var(--text-l)" id="stepStatus${i}">اضغط لتحديد كإكتمل</span></div>
  </div>`).join('')
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
    <div style="margin-bottom:16px" id="docChecklist">${checklist}</div>
    <div style="background:rgba(212,169,55,.1);border-radius:10px;padding:12px;margin-bottom:20px;text-align:center">
      <span id="docProgress" style="font-size:14px;font-weight:600">جهزت 0 من ${s.documents.length} مستندات</span>
      <div style="height:6px;background:var(--gray-m);border-radius:3px;margin-top:8px"><div id="docBar" style="height:6px;background:linear-gradient(135deg,var(--gold),var(--gold-d));border-radius:3px;width:0%;transition:width .3s"></div></div>
    </div>
    <h3 class="sd-h3">📝 خطوات التنفيذ</h3>
    <div style="margin-bottom:16px" id="stepsChecklist">${stepsChecklist}</div>
    <div style="background:rgba(15,30,61,.05);border-radius:10px;padding:12px;margin-bottom:20px;text-align:center">
      <span id="stepProgress" style="font-size:14px;font-weight:600">خلصت 0 من ${s.steps.length} خطوات</span>
      <div style="height:6px;background:var(--gray-m);border-radius:3px;margin-top:8px"><div id="stepBarFill" style="height:6px;background:linear-gradient(135deg,var(--navy),var(--navy-l));border-radius:3px;width:0%;transition:width .3s"></div></div>
    </div>
    <div class="sd-actions">
      <a href="${s.link}" target="_blank" class="sd-link-btn">🔗 الموقع الرسمي</a>
      <button class="sd-ai-btn" onclick="askAIAbout('${s.name}')">🤖 اسأل AI عنها</button>
      <button class="sd-help-btn" onclick="closeModal('serviceModal');needHelp()">👤 محتاج حد يخلصهالي</button>
    </div>
    <p class="sd-source">المصدر: ${s.source} | آخر تحديث: ${s.updated}</p>
  `
  openModal('serviceModal')
  addUserService(id)
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

/* ===== AI Voice Input (Web Speech API) ===== */
let _aiRec=null,_aiListening=false
function aiVoiceInput(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){showToast('المتصفح مش بيدعم الصوت 🎤<br>جرّب Chrome أو Safari','error');return}
  const micIcon=document.getElementById('aiMicIcon')
  const voiceBtn=document.getElementById('aiVoiceBtn')
  if(_aiListening){if(_aiRec)_aiRec.stop();return}
  if(!_aiRec){
    _aiRec=new SR()
    _aiRec.lang='ar-EG'
    _aiRec.interimResults=true
    _aiRec.continuous=false
    _aiRec.onstart=()=>{
      _aiListening=true
      if(micIcon){micIcon.textContent='🔴';micIcon.style.animation='pulse 1s infinite'}
      if(voiceBtn)voiceBtn.classList.add('recording')
    }
    _aiRec.onend=()=>{
      _aiListening=false
      if(micIcon){micIcon.textContent='🎤';micIcon.style.animation=''}
      if(voiceBtn)voiceBtn.classList.remove('recording')
    }
    _aiRec.onerror=(e)=>{
      _aiListening=false
      if(micIcon){micIcon.textContent='🎤';micIcon.style.animation=''}
      if(voiceBtn)voiceBtn.classList.remove('recording')
      if(e.error!=='no-speech'&&e.error!=='aborted')console.log('ai voice error:',e.error)
    }
    _aiRec.onresult=(e)=>{
      let txt=''
      for(let i=e.resultIndex;i<e.results.length;i++){txt+=e.results[i][0].transcript}
      const inp=document.getElementById('aiInput')
      if(inp)inp.value=txt
      if(e.results[e.results.length-1].isFinal){
        // Auto-send after voice input finishes
        setTimeout(()=>aiSend(),400)
      }
    }
  }
  try{_aiRec.start()}catch(e){console.log('already listening')}
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
  const filtered=selectedGov==='all'?providers:providers.filter(p=>p.gov===selectedGov)
  const ALL_GOVS=['القاهرة','الجيزة','الإسكندرية','الشرقية','الدقهلية','البحيرة','القليوبية','الغربية','المنوفية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','بني سويف','الفيوم','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء']
  const filterHtml=`<div style="margin-bottom:20px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;align-items:center"><label style="font-weight:600;color:var(--text);font-size:14px">المحافظة:</label><select onchange="filterProviders(this.value)" style="padding:10px 16px;border-radius:8px;border:1px solid var(--gray-m);background:var(--card);color:var(--text);font-family:inherit;font-size:14px;min-width:220px;cursor:pointer"><option value="all" ${selectedGov==='all'?'selected':''}>📍 كل المحافظات</option>${ALL_GOVS.map(g=>`<option value="${g}" ${selectedGov===g?'selected':''}>${g}</option>`).join('')}</select></div>`
  if(filtered.length===0){grid.innerHTML=filterHtml+'<div style="text-align:center;padding:40px;background:var(--gray);border-radius:var(--radius)"><div style="font-size:40px;margin-bottom:12px">🔍</div><p style="color:var(--text-l)">لا توجد مقدمين في هذه المحافظة حالياً</p><p style="font-size:13px;margin-top:8px">كنت أول مقدم خدمة في منطقتك! <button onclick="openModal(\'providerModal\')" style="background:var(--gold);color:var(--navy);border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-top:8px">سجل كمقدم خدمة</button></p></div>';return}
  grid.innerHTML=filterHtml+filtered.map(p=>{
    const stars='★'.repeat(Math.floor(p.rating))+'☆'.repeat(5-Math.floor(p.rating))
    const bc=p.badge==='Top Provider'||p.badge==='Recommended'?'badge-on':p.badge==='جديد'?'badge-off':'badge-off'
    const verifiedIcon=p.verified?'✓':''
    const ic=p.type.includes('محام')?'⚖️':p.type.includes('محاسب')?'📊':p.type.includes('مرور')?'🚗':p.type.includes('شرك')?'🏢':p.type.includes('تأمين')?'👴':'📋'
    const servicesList=p.services||p.type
    return `
      <div class="prv-card" style="position:relative">
        ${p.verified?'<div style="position:absolute;top:10px;left:10px;background:var(--success);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700" title="موثوق">✓</div>':''}
        <div class="prv-top">
          <div class="prv-avatar">${ic}</div>
          <div class="prv-info"><h4>${p.name}</h4><span>${p.type} — ${p.gov}</span></div>
        </div>
        <div class="prv-badges">
          <span class="svc-badge ${bc}">${p.badge}</span>
          <span class="svc-badge badge-off">💼 ${p.orders} عملية</span>
        </div>
        <p class="prv-stars">${stars} <span style="font-size:14px;color:var(--text-l)">(${p.rating})</span></p>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="requestProvider('${p.name.replace(/'/g,"")}')" style="flex:1;background:linear-gradient(135deg,var(--gold),var(--gold-d));color:var(--navy);border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">📩 اطلب خدمة</button>
          <button onclick="openReviewModal('${p.name.replace(/'/g,"")}')" style="background:var(--gray);border:1px solid var(--gray-m);padding:10px 12px;border-radius:8px;cursor:pointer;font-size:14px" title="قيّم">⭐</button>
          <button onclick="shareProvider('${p.name.replace(/'/g,"")}')" style="background:var(--gray);border:1px solid var(--gray-m);padding:10px 12px;border-radius:8px;cursor:pointer;font-size:14px" title="شارك">📤</button>
        </div>
      </div>
    `
  }).join('')
}

function requestProvider(name){
  const token=localStorage.getItem('sb_token')
  const user=JSON.parse(localStorage.getItem('sb_user')||'{}')
  if(!token){
    showToast('سجل دخول الأول عشان تطلب خدمة 👍','error')
    openModal('loginModal')
    return
  }
  // إرسال الطلب لـ Supabase (جدول requests)
  fetch(SUPABASE_URL+'/rest/v1/requests',{
    method:'POST',
    headers:{
      'apikey':SUPABASE_KEY,
      'Authorization':'Bearer '+token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({provider_name:name,status:'new',notes:'طلب من الموقع'})
  }).then(r=>{
    // تسجيل في localStorage كمان
    const myReqs=JSON.parse(localStorage.getItem('myRequests')||'[]')
    myReqs.unshift({id:Date.now(),provider:name,service:'',status:'new',date:new Date().toISOString()})
    localStorage.setItem('myRequests',JSON.stringify(myReqs))
    showToast('تم إرسال طلبك لـ '+name+'! 🎉<br>هيتواصل معاك قريب<br>تقدر تتابع طلبك في "مصالحي"')
    // إرسال إشعار للـ Agent
    fetch('https://khidmaty-agent.semohabiby7.workers.dev/requests').catch(()=>{})
  }).catch(()=>{
    showToast('في خطأ، جرّب تاني','error')
  })
}

function shareProvider(name){
  const text='شوف '+name+' على خِدْمَتي AI — مقدم خدمة موثوق 🔗'
  const url='https://semohabiby7-jpg.github.io/khidmaty-ai/#providers'
  window.open('https://wa.me/?text='+encodeURIComponent(text+'\n'+url),'_blank')
}

/* ===== Modals ===== */
function openModal(id){document.getElementById(id).classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}
/* ===== SUPABASE AUTH ===== */
function makeEmail(phone){return 'khidmatyai+'+phone.replace(/[^0-9]/g,'')+'@gmail.com'}

async function handleRegister(e){
  e.preventDefault()
  const name=document.getElementById('regName').value.trim()
  const phone=document.getElementById('regPhone').value.trim()
  const gov=document.getElementById('regGov').value
  const emailInput=document.getElementById('regEmail')?document.getElementById('regEmail').value.trim():''
  const pass=document.getElementById('regPass').value
  const pass2=document.getElementById('regPass2').value
  const terms=document.getElementById('regTerms').checked
  if(!name||!phone||!gov||!pass){showToast('املأ كل البيانات!','error');return false}
  if(pass!==pass2){showToast('كلمتا المرور مش متطابقتين','error');return false}
  if(!terms){showToast('لازم توافق على الشروط والأحكام','error');return false}
  try{
    const email=emailInput||makeEmail(phone)
    const res=await fetch(SUPABASE_URL+'/auth/v1/signup',{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pass,data:{name,gov,phone}})
    })
    const data=await res.json()
    if(data.access_token){
      localStorage.setItem('sb_token',data.access_token)
      localStorage.setItem('sb_user',JSON.stringify({name,gov,phone,email}))
      showToast('تم إنشاء حسابك بنجاح! 🎉<br>أهلاً '+name)
      closeModal('registerModal')
      updateAuthUI()
    }else{
      showToast(data.msg||data.message||'رقم الموبايل مستخدم بالفعل','error')
    }
  }catch(err){showToast('حصلت مشكلة، جرّب تاني','error')}
  return false
}

async function handleLogin(e){
  e.preventDefault()
  const phone=document.getElementById('loginPhone').value.trim()
  const pass=document.getElementById('loginPass').value
  if(!phone||!pass){showToast('املأ البيانات!','error');return false}
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
      showToast('أهلاً '+name+' 👋')
      closeModal('loginModal')
      updateAuthUI()
    }else{
      showToast('رقم الموبايل أو كلمة المرور غلط','error')
    }
  }catch(err){showToast('حصلت مشكلة، جرّب تاني','error')}
  return false
}

function logout(){
  localStorage.removeItem('sb_token')
  localStorage.removeItem('sb_user')
  updateAuthUI()
  showToast('تم تسجيل الخروج 👋')
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
  if(typeof renderWelcomeBanner==='function')renderWelcomeBanner()
  if(typeof updateReminderBadge==='function')updateReminderBadge()
}

updateAuthUI()

async function handleProvider(e){
  e.preventDefault()
  const name=document.getElementById('provName').value.trim()
  const type=document.getElementById('provType').value
  const gov=document.getElementById('provGov').value
  const phone=document.getElementById('provPhone').value.trim()
  const services=document.getElementById('provServices').value.trim()
  const whatsapp=document.getElementById('provWhatsApp').value.trim()
  if(!name||!type||!gov||!phone){showToast('من فضلك املأ الحقول المطلوبة: الاسم، النشاط، المحافظة، التليفون','error');return false}
  const btn=document.getElementById('provSubmitBtn')
  const original=btn.textContent
  btn.textContent='جاري التسجيل...';btn.disabled=true
  const providerData={name,type,gov,phone,whatsapp:whatsapp||phone,services}
  try{
    // ===== الطريق 1: عبر Cloudflare Worker (يدخل في providers table ويتجاوز RLS) =====
    let workerOk=false
    try{
      const res=await fetch(WORKER_URL+'/register-provider',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(providerData)
      })
      if(res.ok){
        const data=await res.json()
        if(data.success&&data.provider){
          if(!providers.find(p=>p.id===data.provider.id)){
            providers.push(data.provider)
            renderProviders()
          }
          showToast('تم تسجيلك بنجاح! 🎉<br>أهلاً '+name+'<br>هنتواصل معاك للتوثيق خلال 24 ساعة.')
          closeModal('providerModal')
          document.querySelectorAll('#providerModal form').forEach(f=>f.reset())
          workerOk=true
        }
      }
    }catch(workerErr){console.log('Worker route failed, falling back:',workerErr)}
    if(workerOk)return false

    // ===== الطريق 2: تسجيل في Supabase Auth (بيانات المقدم في user_metadata) =====
    try{
      const email=makeEmail(phone)
      const randomPass=Math.random().toString(36).slice(2,10)+name.slice(0,3)
      const authRes=await fetch(SUPABASE_URL+'/rest/v1/providers',{
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
        body:JSON.stringify({...providerData,rating:0,orders:0,badge:'جديد',verified:false})
      })
      if(authRes.ok){
        const authData=await authRes.json()
        if(authData&&authData[0]){
          if(!providers.find(p=>p.id===authData[0].id)){providers.push(authData[0]);renderProviders()}
        }
        showToast('تم تسجيلك بنجاح! 🎉<br>أهلاً '+name+'<br>هنتواصل معاك للتوثيق خلال 24 ساعة.')
        closeModal('providerModal')
        document.querySelectorAll('#providerModal form').forEach(f=>f.reset())
        return false
      }
    }catch(authErr){console.log('Direct Supabase insert failed:',authErr)}

    // ===== الطريق 3: حفظ محلي (لو النت فشل كله) =====
    const pending=JSON.parse(localStorage.getItem('pendingProviders')||'[]')
    pending.push({...providerData,date:new Date().toISOString()})
    localStorage.setItem('pendingProviders',JSON.stringify(pending))
    showToast('سجلنا طلبك! ✅ هنتواصل معاك للتوثيق خلال 24 ساعة.')
    closeModal('providerModal')
  }catch(err){
    console.error('Provider submit error:',err)
    const pending=JSON.parse(localStorage.getItem('pendingProviders')||'[]')
    pending.push({...providerData,date:new Date().toISOString()})
    localStorage.setItem('pendingProviders',JSON.stringify(pending))
    showToast('في مشكلة في النت، بس سجلنا طلبك محلياً ✅ هنتواصل معاك.','error')
    closeModal('providerModal')
  }finally{
    btn.textContent=original;btn.disabled=false
  }
  return false
}

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
  const links=services.map(s=>({link:s.link,source:s.source,icon:s.icon,cat:s.category,updated:s.updated,names:services.filter(x=>x.link===s.link).map(x=>x.name).join(' ')})).filter(x=>{
    if(seen.has(x.link))return false
    seen.add(x.link);return true
  })
  const catName=id=>{const c=categories.find(c=>c.id===id);return c?c.icon+' '+c.name:id}
  const svcCount=link=>services.filter(s=>s.link===link).length
  
  // Search box with voice + search button
  const searchBox=`<div class="gov-search-wrap">
    <div class="gov-search-bar">
      <span class="search-icon">🔍</span>
      <input type="text" id="govSearch" placeholder="ابحث بالاسم أو النوع... مثال: ضرائب، مرور، جوازات" oninput="filterGovLinks(this.value)">
      <button class="gov-voice-btn" id="govVoiceBtn" onclick="govVoiceSearch()" title="ابحث بالصوت">
        <span id="govMicIcon">🎤</span>
      </button>
      <button class="gov-search-btn" onclick="govSearchSubmit()" title="بحث">
        <span>🔍 بحث</span>
      </button>
      <button class="search-clear" id="govSearchClear" onclick="clearGovSearch()">✕</button>
    </div>
    <div class="gov-search-meta" id="govSearchMeta"></div>
  </div>`
  
  window._govLinks=links
  window._catName=catName
  window._svcCount=svcCount
  
  const cards=links.map((l,idx)=>`
    <a href="${l.link}" target="_blank" class="svc-card gov-card" data-source="${l.source}" data-cat="${catName(l.cat)}" data-keywords="${l.names}" style="text-decoration:none;cursor:pointer;position:relative">
      <div class="svc-icon">${l.icon}</div>
      <h3 class="svc-name" style="font-size:15px">${l.source}</h3>
      <p class="svc-desc" style="font-size:12px">${catName(l.cat)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <span style="background:var(--gold);color:var(--navy);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">✓ موثوق</span>
        <span style="background:var(--gray);color:var(--text);padding:3px 8px;border-radius:6px;font-size:11px">${svcCount(l.link)} خدمة</span>
        <span style="background:rgba(15,30,61,.08);color:var(--navy);padding:3px 8px;border-radius:6px;font-size:11px">📅 ${l.updated||'2026'}</span>
      </div>
      <span class="svc-link">زيارة الموقع ←</span>
    </a>
  `).join('')
  
  grid.innerHTML=searchBox+`<div id="govCards">${cards}</div>`
}

function filterGovLinks(val){
  const q=(val||'').toLowerCase().trim()
  let visible=0,total=0
  document.querySelectorAll('.gov-card').forEach(card=>{
    total++
    const src=(card.dataset.source||'').toLowerCase()
    const cat=(card.dataset.cat||'').toLowerCase()
    const kw=(card.dataset.keywords||'').toLowerCase()
    const match=!q||src.includes(q)||cat.includes(q)||kw.includes(q)
    card.style.display=match?'':'none'
    if(match)visible++
  })
  // toggle clear button + meta info
  const clearBtn=document.getElementById('govSearchClear')
  if(clearBtn)clearBtn.classList.toggle('show',!!q)
  const meta=document.getElementById('govSearchMeta')
  if(meta){
    if(!q){meta.innerHTML=''}
    else if(visible===0){meta.innerHTML='<span class="gov-meta-empty">لا توجد نتائج لـ "'+val+'" 🤷‍♂️ جرّب كلمة تانية</span>'}
    else{meta.innerHTML='<span class="gov-meta-ok">✓ '+visible+' نتيجة من '+total+'</span>'}
  }
}

function clearGovSearch(){
  const inp=document.getElementById('govSearch')
  if(inp){inp.value='';inp.focus()}
  filterGovLinks('')
}

function govSearchSubmit(){
  const inp=document.getElementById('govSearch')
  const val=inp?inp.value:''
  filterGovLinks(val)
  const cards=document.getElementById('govCards')
  if(cards)cards.scrollIntoView({behavior:'smooth',block:'nearest'})
}

/* ===== Voice Search (Web Speech API) ===== */
let _govRec=null,_govListening=false
function govVoiceSearch(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){showToast('المتصفح مش بيدعم البحث بالصوت 🎤<br>جرّب Chrome أو Safari','error');return}
  const micIcon=document.getElementById('govMicIcon')
  if(_govListening){
    if(_govRec)_govRec.stop()
    return
  }
  if(!_govRec){
    _govRec=new SR()
    _govRec.lang='ar-EG'
    _govRec.interimResults=true
    _govRec.continuous=false
    _govRec.onstart=()=>{
      _govListening=true
      if(micIcon){micIcon.textContent='🔴';micIcon.style.animation='pulse 1s infinite'}
    }
    _govRec.onend=()=>{
      _govListening=false
      if(micIcon){micIcon.textContent='🎤';micIcon.style.animation=''}
    }
    _govRec.onerror=(e)=>{
      _govListening=false
      if(micIcon){micIcon.textContent='🎤';micIcon.style.animation=''}
      if(e.error!=='no-speech'&&e.error!=='aborted')console.log('voice error:',e.error)
    }
    _govRec.onresult=(e)=>{
      let txt=''
      for(let i=e.resultIndex;i<e.results.length;i++){txt+=e.results[i][0].transcript}
      const inp=document.getElementById('govSearch')
      if(inp){inp.value=txt;filterGovLinks(txt)}
      if(e.results[e.results.length-1].isFinal){
        const cards=document.getElementById('govCards')
        if(cards)cards.scrollIntoView({behavior:'smooth',block:'nearest'})
      }
    }
  }
  try{_govRec.start()}catch(e){console.log('already listening')}
}

/* ===== PAGE VIEW TRACKING ===== */
async function trackPageView(page){
  try{
    let vid=localStorage.getItem('khidmaty_vid')
    if(!vid){vid='v'+Date.now()+Math.random().toString(36).slice(2,8);localStorage.setItem('khidmaty_vid',vid)}
    await fetch(SUPABASE_URL+'/rest/v1/page_views',{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({visitor_id:vid,page:page||'#home',referrer:document.referrer||null,user_agent:navigator.userAgent})})
  }catch(e){console.log('track err',e)}
}

document.addEventListener('DOMContentLoaded',async()=>{
  await loadFromSupabase()
  renderCats()
  renderServices()
  renderProviders()
  renderGovLinks()
  renderWelcomeBanner()
  updateReminderBadge()
  initNotifications()
  checkAndNotifyReminders()
  setInterval(checkAndNotifyReminders,3600000)
  trackPageView(location.hash||'#home')
})
window.addEventListener('hashchange',()=>{trackPageView(location.hash||'#home')})

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

/* ===== FAVORITES SYSTEM ===== */
function toggleFav(id){
  let favs=JSON.parse(localStorage.getItem('favs')||'[]')
  const i=favs.indexOf(id)
  if(i>-1){favs.splice(i,1)}else{favs.push(id)}
  localStorage.setItem('favs',JSON.stringify(favs))
  renderServices()
}
function isFav(id){return(JSON.parse(localStorage.getItem('favs')||'[]')).includes(id)}

/* ===== KHADMATY FAHMANI — Smart Reminders + Notifications ===== */
function getRenewalMonths(s){
  const n=norm(s.name||'')
  if(n.includes('تجديد رخصه'))return 12
  if(n.includes('جواز'))return 84
  if(n.includes('تامين صح'))return 12
  if(n.includes('ضريب')||n.includes('فاتوره'))return 12
  if(n.includes('تكافل'))return 12
  if(n.includes('معاش'))return 12
  if(n.includes('كهرباء')||n.includes('مياه'))return 1
  return 12
}
function getUserServices(){
  return JSON.parse(localStorage.getItem('userServices')||'[]')
}
function addUserService(serviceId){
  const s=services.find(x=>x.id===serviceId)
  if(!s)return
  const us=getUserServices()
  if(us.find(u=>u.serviceId===serviceId))return
  const today=new Date()
  const renewalDate=new Date(today)
  renewalDate.setMonth(renewalDate.getMonth()+getRenewalMonths(s))
  us.push({
    id:Date.now(),serviceId,name:s.name,icon:s.icon,
    dateAdded:today.toISOString(),
    renewalDate:renewalDate.toISOString(),
    status:'active',progress:0
  })
  localStorage.setItem('userServices',JSON.stringify(us))
  updateReminderBadge()
}
function getReminders(){
  const us=getUserServices()
  const today=new Date()
  return us.map(u=>{
    const r=new Date(u.renewalDate)
    const days=Math.round((r-today)/(1000*60*60*24))
    return {...u,days}
  }).filter(u=>u.days<=30).sort((a,b)=>a.days-b.days)
}
function reminderLabel(days){
  if(days<0)return '⏰ عدى الموعد من '+Math.abs(days)+' يوم!'
  if(days===0)return '🔴 النهارده!'
  if(days<=7)return '🟡 بعد '+days+' يوم'
  return '📅 بعد '+days+' يوم'
}
function updateReminderBadge(){
  const reminders=getReminders()
  const badge=document.getElementById('reminderBadge')
  if(!badge)return
  if(reminders.length>0){
    badge.textContent=reminders.length
    badge.style.display='flex'
  }else{
    badge.style.display='none'
  }
}
function renderWelcomeBanner(){
  const user=JSON.parse(localStorage.getItem('sb_user')||'{}')
  const token=localStorage.getItem('sb_token')
  const reminders=getReminders()
  const banner=document.getElementById('welcomeBanner')
  if(!banner)return
  if(!token||!user.name){
    banner.innerHTML=''
    banner.style.display='none'
    return
  }
  let name=user.name||'صديقي'
  let html='<div class="welcome-card"><div class="wc-head">👋 أهلاً '+name+'</div>'
  if(reminders.length===0){
    html+='<div class="wc-body">مفيش تذكيرات دلوقتي — كل حاجة تحت التحكم ✅</div>'
  }else{
    html+='<div class="wc-body">عندك <strong>'+reminders.length+'</strong> مصلحة محتاجة متابعة:</div><div class="wc-reminders">'
    reminders.slice(0,3).forEach(r=>{
      html+='<div class="wc-reminder" onclick="openService('+r.serviceId+')"><span class="wr-icon">'+r.icon+'</span><div class="wr-info"><strong>'+r.name+'</strong><span class="wr-when">'+reminderLabel(r.days)+'</span></div></div>'
    })
    html+='</div><button class="wc-cta" onclick="openDashboard()">📋 شوف كل مصالحي</button>'
  }
  html+='</div>'
  banner.innerHTML=html
  banner.style.display='block'
}

/* ===== WEB NOTIFICATIONS ===== */
let _notifReady=false
function initNotifications(){
  if(!('Notification' in window))return
  if(Notification.permission==='granted'){_notifReady=true;return}
  // Ask after user logs in or interacts
  if(localStorage.getItem('sb_token')&&Notification.permission==='default'){
    setTimeout(()=>askNotifications(),3000)
  }
}
function askNotifications(){
  if(!('Notification' in window))return
  if(Notification.permission!=='default')return
  Notification.requestPermission().then(p=>{
    if(p==='granted'){
      _notifReady=true
      showNotification('خِدْمَتي AI','🔔 دلوقتي هفكّرك بمواعيد مصالحك على طول! 👌')
    }
  })
}
function showNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return
  try{
    const n=new Notification(title,{body,icon:'icon-192.png',badge:'icon-192.png',tag:'khidmaty-reminder'})
    n.onclick=()=>{window.focus();n.close()}
  }catch(e){console.log('notif error',e)}
}
function checkAndNotifyReminders(){
  if(!_notifReady)return
  const reminders=getReminders().filter(r=>r.days<=3)
  reminders.forEach(r=>{
    const key='notified_'+r.id+'_'+r.days
    if(localStorage.getItem(key))return
    localStorage.setItem(key,'1')
    showNotification('🔔 تذكير: '+r.name,reminderLabel(r.days)+' — افتح خِدْمَتي AI للمتابعة')
  })
}

/* ===== PROVIDER FILTER BY GOV ===== */
let selectedGov='all'
function filterProviders(gov){
  selectedGov=gov
  renderProviders()
}

/* ===== REVIEWS & VERIFICATION ===== */
function getProviderReviews(providerId){
  return JSON.parse(localStorage.getItem('reviews_'+providerId)||'[]')
}
function addReview(providerId,review){
  const reviews=getProviderReviews(providerId)
  review.id=Date.now()
  review.date=new Date().toLocaleDateString('ar-EG')
  reviews.unshift(review)
  localStorage.setItem('reviews_'+providerId,JSON.stringify(reviews))
}
function renderReviews(providerName){
  // Find provider
  const p=providers.find(x=>x.name===providerName)
  if(!p)return ''
  const pid=p.id||providerName
  const reviews=getProviderReviews(pid)
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.stars,0)/reviews.length).toFixed(1):p.rating
  
  const starsHtml=Array(5).fill(0).map((_,i)=>`<span style="font-size:20px;cursor:pointer;color:${i<Math.round(avg)?'var(--gold)':'var(--gray-m)'}" onclick="setReviewStars(${i+1})">${i<Math.round(avg)?'★':'☆'}</span>`).join('')
  
  const reviewsList=reviews.slice(0,5).map(r=>`
    <div style="background:var(--gray);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:14px">${r.name||'مستخدم'}</strong>
        <span style="color:var(--gold)">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
      </div>
      <p style="font-size:13px;color:var(--text-l);margin:4px 0 0">${r.text||''}</p>
      <small style="color:var(--text-l)">${r.date}</small>
    </div>
  `).join('')
  
  return `
    <div style="margin-top:16px;border-top:1px solid var(--gray-m);padding-top:16px">
      <h4 style="margin:0 0 8px;font-size:16px">⭐ التقييمات (${reviews.length} تقييم)</h4>
      <div style="background:var(--gray);border-radius:10px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:32px;font-weight:900;color:var(--gold)">${avg}</div>
        <div style="margin:4px 0">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</div>
        <small style="color:var(--text-l)">${reviews.length} تقييم من عملاء فعليين</small>
      </div>
      <div id="reviewsList">${reviewsList||'<p style="text-align:center;color:var(--text-l);padding:20px">لسه مفيش تقييمات. كن أول واحد! 🌟</p>'}</div>
    </div>
  `
}

let selectedReviewStars=5
function setReviewStars(n){
  selectedReviewStars=n
  const stars=document.querySelectorAll('#reviewStarPicker span')
  stars.forEach((s,i)=>{s.textContent=i<n?'★':'☆';s.style.color=i<n?'var(--gold)':'var(--gray-m)'})
}

function submitReview(providerName){
  const token=localStorage.getItem('sb_token')
  const user=JSON.parse(localStorage.getItem('sb_user')||'{}')
  if(!token){alert('سجل دخول الأول عشان تقيّم 👍');openModal('loginModal');return}
  
  const text=document.getElementById('reviewText')?.value?.trim()||''
  const p=providers.find(x=>x.name===providerName)
  if(!p)return
  const pid=p.id||providerName
  addReview(pid,{name:user.name||'مستخدم',stars:selectedReviewStars,text})
  alert('شكراً لتقييمك! ⭐')
  closeModal('reviewModal')
  renderProviders()
}

function openReviewModal(providerName){
  const token=localStorage.getItem('sb_token')
  if(!token){alert('سجل دخول الأول عشان تقيّم 👍');openModal('loginModal');return}
  
  // Create modal dynamically
  let modal=document.getElementById('reviewModal')
  if(!modal){
    modal=document.createElement('div')
    modal.className='modal-overlay'
    modal.id='reviewModal'
    modal.innerHTML=`<div class="modal"><button class="modal-x" onclick="closeModal('reviewModal')">✕</button><h2 class="modal-title">⭐ قيّم المقدم</h2><div id="reviewContent"></div></div>`
    document.body.appendChild(modal)
  }
  
  document.getElementById('reviewContent').innerHTML=`
    <p style="text-align:center;margin-bottom:16px"><strong>${providerName}</strong></p>
    <div id="reviewStarPicker" style="text-align:center;margin:16px 0">
      ${Array(5).fill(0).map((_,i)=>`<span style="font-size:36px;cursor:pointer;color:${i<5?'var(--gold)':'var(--gray-m)'}" onclick="setReviewStars(${i+1})">${i<5?'★':'☆'}</span>`).join('')}
    </div>
    <textarea id="reviewText" placeholder="اكتب تعليقك (اختياري)..." style="width:100%;min-height:80px;padding:12px;border:1px solid var(--gray-m);border-radius:10px;font-family:Cairo,sans-serif;resize:vertical"></textarea>
    <button onclick="submitReview('${providerName.replace(/'/g,"")}')" style="width:100%;margin-top:12px;background:linear-gradient(135deg,var(--gold),var(--gold-d));color:var(--navy);border:none;padding:14px;border-radius:10px;cursor:pointer;font-weight:700;font-size:15px">⭐ أضف التقييم</button>
  `
  openModal('reviewModal')
}

/* ===== ARTICLES (مقالات ونصائح) ===== */
const articles=[
  {id:1,icon:'🚗',cat:'مرور',title:'إزاي تتجدد رخصة سيارتك؟',excerpt:'دليلك الكامل لتجديد رخرة السيارة في مصر — الخطوات والمستندات والمصاريف',readTime:'5 دقائق',content:`<h3>📋 الخطوات</h3><p>1. ادخل على موقع <a href="https://traffic.gov.eg" target="_blank">traffic.gov.eg</a></p><p>2. اختار "تجديد رخصة سيارة"</p><p>3. اكتب رقم السيارة ورقم الشاسيه</p><p>4. ادفع المصاريف (حوالي 400 جنيه)</p><p>5. استلم الرخصة من المرور أو بالبريد</p><h3>📄 المستندات المطلوبة</h3><p>• بطاقة الرقم القومي</p><p>• الفحص الفني للسيارة</p><p>• وثيقة التأمين</p><h3>💰 المصاريف</h3><p>تجديد سنة: 266 جنيه | تجديد 3 سنوات: 798 جنيه</p>`},
  {id:2,icon:'📊',cat:'ضرائب',title:'إزاي تسجل في الضريبة؟',excerpt:'خطوات التسجيل في المصلحة الضريبية وأهم المستندات المطلوبة',readTime:'7 دقائق',content:`<h3>📋 الخطوات</h3><p>1. ادخل على <a href="https://eta.gov.eg" target="_blank">eta.gov.eg</a></p><p>2. اختار "تسجيل جديد"</p><p>3. اكتب بياناتك (اسم، سجل تجاري، بطاقة)</p><p>4. ارفع المستندات</p><p>5. استلم رقم التسجيل الضريبي</p><h3>📄 المستندات</h3><p>• بطاقة الرقم القومي</p><p>• السجل التجاري</p><p>• عقد الإيجار أو ملكية المقر</p><h3>💡 نصيحة</h3><p>لو مشروعك صغير، ممكن تستفيد من نظام الـ Lump Sum (التخمين)</p>`},
  {id:3,icon:'🪪',cat:'أحوال مدنية',title:'إزاي تتجدد بطاقتك الشخصية؟',excerpt:'تجديد البطاقة الشخصية في 5 خطوات بسيطة',readTime:'4 دقائق',content:`<h3>📋 الخطوات</h3><p>1. اذهب لأقرب مكتب مصلحة الأحوال المدنية</p><p>2. اكتب استمارة تجديد البطاقة</p><p>3. استخراج البطاقة بـ 15 جنيه</p><p>4. الاستلام بعد 3 أيام</p><h3>📄 المستندات</h3><p>• البطاقة القديمة</p><p>• بطاقة أحد الوالدين (لو تحت 18)</p><h3>⏰ إمتى لازم تتجدد؟</h3><p>البطاقة بتتجدد كل 7 سنين، أو لو غيرت عنوانك أو حالتك الاجتماعية</p>`},
  {id:4,icon:'🛂',cat:'جوازات',title:'إزاي تستخرج جواز السفر؟',excerpt:'دليلك الكامل لاستخراج جواز سفر مصري جديد',readTime:'6 دقائق',content:`<h3>📋 الخطوات</h3><p>1. احجز موعد من <a href="https://egpassport.gov.eg" target="_blank">egpassport.gov.eg</a></p><p>2. اذهب لمكتب الجوازات في الموعد</p><p>3. تسجيل البيانات وأخذ البصمة</p><p>4. دفع المصاريف (250 جنيه)</p><p>5. الاستلام بعد أسبوع</p><h3>📄 المستندات</h3><p>• بطاقة الرقم القومي</p><p>• شهادة الميلاد</p><p>• 4 صور شخصية</p><p>• موافقة الزوج (للمرأة المتزوجة)</p>`},
  {id:5,icon:'📋',cat:'أحوال مدنية',title:'إزاي تطلب شهادة ميلاد؟',excerpt:'استخراج شهادة ميلاد لنفسك أو لأطفالك',readTime:'3 دقائق',content:`<h3>📋 الخطوات</h3><p>1. ادخل على <a href="https://www.civilregistry.gov.eg" target="_blank">civilregistry.gov.eg</a></p><p>2. اختار "استخراج شهادة ميلاد"</p><p>3. اكتب رقم القومي للمولود</p><p>4. دفع 15 جنيه</p><p>5. استلام الكتروني أو من المكتب</p><h3>📄 المستندات</h3><p>• بطاقة رقم قومي للأب/الأم</p><p>• رقم قومي للمولود</p>`},
  {id:6,icon:'🛂',cat:'جوازات',title:'إزاي تتجدد جواز السفر؟',excerpt:'تجديد الجواز قبل انتهاءه — الخطوات والمستندات',readTime:'5 دقائق',content:`<h3>📋 الخطوات</h3><p>1. احجز موعد من <a href=\"https://egpassport.gov.eg\" target=\"_blank\">egpassport.gov.eg</a></p><p>2. روح لمكتب الجوازات في الموعد</p><p>3. سلّم الجواز القديم وسجّل البيانات الجديدة</p><p>4. ادفع الرسوم (250 جنيه للعادي، 400 للمستعجل)</p><p>5. الاستلام بعد أسبوع للعادي، 3 أيام للمستعجل</p><h3>📄 المستندات</h3><p>• الجواز القديم</p><p>• بطاقة الرقم القومي</p><p>• صورة من البطاقة</p><h3>⏰ إمتى تتجدد؟</h3><p>قبل انتهائه بـ 6 شهور على الأقل، أو لو خلص تماماً</p>`},
  {id:7,icon:'👴',cat:'تأمينات',title:'إزاي تطلع المعاش؟',excerpt:'دليلك لاستخراج معاش التأمينات الاجتماعية',readTime:'8 دقائق',content:`<h3>📋 الخطوات</h3><p>1. ادخل على <a href=\"https://ensani.gov.eg\" target=\"_blank\">ensani.gov.eg</a></p><p>2. اختار \"طلب معاش\"</p><p>3. اكتب رقم التأميني وبياناتك</p><p>4. ارفع المستندات المطلوبة</p><p>5. انتظر الموافقة وصرف المعاش</p><h3>📄 المستندات</h3><p>• بطاقة الرقم القومي</p><p>• شهادة المؤهل الدراسي</p><p>• إيصال سداد الاشتراكات</p><p>• نموذج طلب المعاش</p><h3>💰 المعلومات</h3><p>المعاش بيتحسب حسب مدة الاشتراك ومتوسط الأجر</p><h3>💡 نصيحة</h3><p>اتأكد إن كل اشتراكاتك مدفوعة قبل ما تقدم على المعاش</p>`},
  {id:8,icon:'🤱',cat:'أحوال مدنية',title:'إزاي تسجّل مولود جديد؟',excerpt:'خطوات تسجيل المواليد الجدد واستخراج شهادة الميلاد',readTime:'4 دقائق',content:`<h3>📋 الخطوات</h3><p>1. روح لمكتب الأحوال المدنية في منطقتك خلال 30 يوم من الولادة</p><p>2. معاك شهادة الولادة من المستشفى</p><p>3. اكتب استمارة قيد المولود</p><p>4. استلم شهادة الميلاد في نفس اليوم أو اليوم التالي</p><h3>📄 المستندات</h3><p>• شهادة الولادة من المستشفى</p><p>• بطاقة الرقم القومي للأب</p><p>• بطاقة الرقم القومي للأم</p><p>• عقد الزواج</p><h3>⏰ مهم!</h3><p>لازم تسجّل المولود خلال 30 يوم، لو اتأخرت هتدفع غرامة</p>`},
  {id:9,icon:'🏥',cat:'تأمين صحي',title:'إزاي تسجّل في التأمين الصحي؟',excerpt:'التسجيل في التأمين الصحي للموظفين والعائلة',readTime:'5 دقائق',content:`<h3>📋 الخطوات</h3><p>1. ادخل على موقع التأمين الصحي</p><p>2. اختار \"تسجيل جديد\"</p><p>3. اكتب بياناتك (اسم، رقم قومي، جهة العمل)</p><p>4. ارفع المستندات</p><p>5. استلم كارت التأمين الصحي</p><h3>📄 المستندات</h3><p>• بطاقة الرقم القومي</p><p>• شهادة العمل أو إيصال المرتب</p><p>• صورة شخصية</p><h3>💰 الرسوم</h3><p>التأمين الصحي بيخصم 1% من المرتب للعامل، 3% من صاحب العمل</p>`},
  {id:10,icon:'💼',cat:'شركات',title:'إزاي تفتح مشروعك الخاص؟',excerpt:'خطوات تسجيل مشروع صغير أو متوسط في مصر',readTime:'7 دقائق',content:`<h3>📋 الخطوات</h3><p>1. حدد نشاط المشروع (تجاري، صناعي، خدمي)</p><p>2. استخرج السجل التجاري من gafinet.com</p><p>3. سجّل في الضرائب واتجنب الغرامات</p><p>4. استخرج البطاقة الضريبية</p><p>5. افتح حساب بنكي باسم المشروع</p><h3>📄 المستندات</h3><p>• بطاقة الرقم القومي</p><p>• عقد الإيجار أو ملكية المقر</p><p>• شهادة الميلاد</p><h3>💰 التكاليف</h3><p>السجل التجاري: 50-200 جنيه حسب النشاط | البطاقة الضريبية: مجانية</p><h3>💡 نصائح مهمة</h3><p>• لو مشروعك صغير، ممكن تستفيد من نظام الـ Lump Sum</p><p>• سجّل في صندوق تنمية الصناعة لو مشروعك صناعي</p>`}
]

function renderArticles(){
  const grid=document.getElementById('articlesGrid')
  if(!grid)return
  grid.innerHTML=articles.map(a=>`
    <article class="article-card" onclick="openArticle(${a.id})">
      <div class="article-icon">${a.icon}</div>
      <span class="article-cat">${a.cat}</span>
      <h3 class="article-title">${a.title}</h3>
      <p class="article-excerpt">${a.excerpt}</p>
      <div class="article-meta">
        <span>⏱️ ${a.readTime}</span>
        <span class="article-read">اقرأ المزيد ←</span>
      </div>
    </article>
  `).join('')
}

function openArticle(id){
  const a=articles.find(x=>x.id===id)
  if(!a)return
  const modal=document.getElementById('articleModal')
  if(!modal)return
  const siteUrl=window.location.href
  const fbShareUrl='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(siteUrl)+'&quote='+encodeURIComponent(a.title+' — خِدْمَتي AI')
  const waShareUrl='https://wa.me/?text='+encodeURIComponent(a.title+' — خِدْمَتي AI\n\n'+siteUrl)
  const tgShareUrl='https://t.me/share/url?url='+encodeURIComponent(siteUrl)+'&text='+encodeURIComponent(a.title+' — خِدْمَتي AI')
  const xShareUrl='https://twitter.com/intent/tweet?text='+encodeURIComponent(a.title+' — خِدْمَتي AI')+'&url='+encodeURIComponent(siteUrl)
  document.getElementById('articleModalTitle').textContent=a.title
  const safeTitle=a.title.replace(/'/g,"\\'")
  const shareButtons=`<div style="text-align:center;margin-bottom:16px;position:relative">
    <button onclick="shareArticle(event,'${safeTitle}','${siteUrl}')" style="background:linear-gradient(135deg,var(--gold),var(--gold-d));color:var(--navy);border:none;padding:10px 28px;border-radius:30px;cursor:pointer;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;font-family:Cairo,sans-serif;box-shadow:0 4px 14px rgba(212,169,55,.3)">📤 مشاركة المقال</button>
    <div id="articleShareMenu" style="display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--gray-m);border-radius:12px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:1000;min-width:200px;margin-top:8px">
      <a href="${fbShareUrl}" target="_blank" style="display:block;padding:10px 14px;color:var(--text);text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:Cairo,sans-serif">📘 فيسبوك</a>
      <a href="${waShareUrl}" target="_blank" style="display:block;padding:10px 14px;color:var(--text);text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:Cairo,sans-serif">📲 واتساب</a>
      <a href="${tgShareUrl}" target="_blank" style="display:block;padding:10px 14px;color:var(--text);text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:Cairo,sans-serif">✈️ تليجرام</a>
      <a href="${xShareUrl}" target="_blank" style="display:block;padding:10px 14px;color:var(--text);text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;font-family:Cairo,sans-serif">𝕏 إكس (تويتر)</a>
      <button onclick="copyArticleLink('${siteUrl}')" style="display:block;width:100%;padding:10px 14px;background:none;border:none;color:var(--text);border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-align:right;font-family:Cairo,sans-serif">🔗 نسخ الرابط</button>
    </div>
  </div>`
  const installBanner=`<div style="margin-top:24px;background:linear-gradient(135deg,#0F1E3D,#1a2d5a);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border:1px solid rgba(230,194,88,.3)">
    <div style="font-size:32px">📲</div>
    <div style="flex:1;min-width:200px">
      <strong style="color:#e6c258;font-size:15px;display:block;margin-bottom:4px">نزّل التطبيق عشان ترجع للأوراق المطلوبة وأنت جوة المصلحة</strong>
      <span style="color:rgba(255,255,255,.8);font-size:13px">حتى لو النت قطع — التطبيق بيشتغل offline بعد تثبيته ✅</span>
    </div>
    <button onclick="installAppFromArticle()" style="background:linear-gradient(135deg,#e6c258,#b8923a);color:#0F1E3D;border:none;padding:12px 22px;border-radius:25px;font-weight:800;font-size:14px;cursor:pointer;font-family:Cairo,sans-serif;box-shadow:0 4px 14px rgba(212,169,55,.4);white-space:nowrap">📲 ثبّت التطبيق</button>
  </div>`
  const articleCTA=`<div style="margin-top:24px;background:linear-gradient(135deg,#0F1E3D,#1a2d5a);border-radius:14px;padding:20px;text-align:center;border:1px solid rgba(230,194,88,.3)"><h3 style="color:#e6c258;font-size:17px;margin-bottom:10px">لسه محتاج مساعدة؟ 🤔</h3><p style="color:rgba(255,255,255,.85);font-size:14px;margin-bottom:16px">خِدْمَتي AI فاهم حالتك وموجّهك خطوة بخطوة</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a href="#ai" onclick="closeModal('articleModal');setTimeout(function(){var el=document.getElementById('ai');if(el)el.scrollIntoView({behavior:'smooth'})},200);return false" style="background:linear-gradient(135deg,#e6c258,#b8923a);color:#0F1E3D;text-decoration:none;padding:12px 24px;border-radius:25px;font-weight:800;font-size:14px;display:inline-flex;align-items:center;gap:6px">🤖 اسأل خِدْمَتي AI</a><a href="#providers" onclick="closeModal('articleModal');setTimeout(function(){var el=document.getElementById('providers');if(el)el.scrollIntoView({behavior:'smooth'})},200);return false" style="background:rgba(255,255,255,.1);color:#e6c258;border:1px solid #e6c258;text-decoration:none;padding:12px 24px;border-radius:25px;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:6px">👤 اطلب مقدم خدمة</a></div></div>`
  document.getElementById('articleModalBody').innerHTML=shareButtons+a.content+articleCTA+installBanner
  openModal('articleModal')
}

function copyArticleLink(url){
  navigator.clipboard.writeText(url).then(()=>alert('تم نسخ الرابط! ✅')).catch(()=>alert('انسخ: '+url))
}

/* ===== Share Site Menu (footer) ===== */
function shareSiteMenu(e){
  e.stopPropagation()
  const url='https://semohabiby7-jpg.github.io/khidmaty-ai/'
  const title='خِدْمَتي AI - مصلحتك في مكان واحد!'
  if(navigator.share){
    navigator.share({title:'خِدْمَتي AI',text:title,url:url}).catch(()=>{})
    return
  }
  const menu=document.getElementById('siteShareMenu')
  if(menu)menu.style.display=menu.style.display==='none'?'block':'none'
}

/* Close site share menu on outside click */
document.addEventListener('click',e=>{
  const menu=document.getElementById('siteShareMenu')
  if(menu&&menu.style.display==='block'&&!e.target.closest('#siteShareMenu')&&!e.target.matches('button[onclick*="shareSiteMenu"]')){
    menu.style.display='none'
  }
})

/* ===== Share Article (Web Share API + dropdown fallback) ===== */
function shareArticle(e,title,url){
  e.stopPropagation()
  // لو navigator.share متاح (موبايل/بعض المتصفحات) — بيفتح قائمة المشاركة الأصلية
  if(navigator.share){
    navigator.share({
      title:title+' — خِدْمَتي AI',
      text:title+' — خِدْمَتي AI',
      url:url
    }).catch(()=>{})
    return
  }
  // لو مش متاح، اظهر القائمة المخصصة
  const menu=document.getElementById('articleShareMenu')
  if(menu)menu.style.display=menu.style.display==='none'?'block':'none'
}

/* Close share menu on outside click */
document.addEventListener('click',e=>{
  const menu=document.getElementById('articleShareMenu')
  if(menu&&menu.style.display==='block'&&!e.target.closest('#articleShareMenu')&&!e.target.matches('button[onclick*="shareArticle"]')){
    menu.style.display='none'
  }
})

/* ===== Install App from Article (PWA prompt) ===== */
function installAppFromArticle(){
  if(typeof deferredPrompt!=='undefined'&&deferredPrompt){
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(()=>{deferredPrompt=null})
  }else{
    const isiOS=/iPhone|iPad|iPod/.test(navigator.userAgent)
    if(isiOS){
      alert('لتثبيت خِدْمَتي AI على iPhone:\n\n1️⃣ اضغط زر المشاركة 📲\n2️⃣ اختار "Add to Home Screen"\n3️⃣ اضغط "Add"\n\nهتلاقي خِدْمَتي AI على شاشتك! 🎉')
    }else{
      alert('لتثبيت خِدْمَتي AI:\n\n🌐 Chrome أو Edge:\n1️⃣ اضغط زر التثبيت 📲 في شريط العنوان\n2️⃣ اضغط "Install"\n\nهتلاقي خِدْمَتي AI على جهازك! 🎉')
    }
  }
}

/* init articles */
document.addEventListener('DOMContentLoaded',renderArticles)

/* ===== FAQ (الأسئلة الشائعة) ===== */
const faqs=[
  {q:'هل خِدْمَتي AI منصة حكومية رسمية؟',a:'لا، خِدْمَتي AI منصة مستقلة بتساعدك تعرف وتفهم الخدمات الحكومية. كل الروابط والمعلومات من مصادر رسمية موثوقة، بس إحنا مش جهة حكومية.<div class="faq-cta"><a href="#services" onclick="closeAndScroll(event)">🏛️ اذهب للخدمات الرسمية</a></div>'},
  {q:'هل المنصة مجانية؟',a:'آه، خِدْمَتي AI مجانية بالكامل. تقدر تبحث، تسأل الـ AI، وتقرأ المقالات من غير أي رسوم.<div class="faq-cta"><a href="#ai" onclick="closeAndScroll(event)">🤖 اسأل خِدْمَتي AI مجاناً</a></div>'},
  {q:'إزاي أتحدث بالصوت مع الـ AI؟',a:'في خانة الكتابة في الـ AI chat، هتلاقي زر مايك 🎤. اضغط عليه، اسمح للمتصفح يستخدم المايك، واتكلم بالعربي المصري. الكلام هيتحول لنص تلقائياً.<div class="faq-cta"><a href="#ai" onclick="closeAndScroll(event)">🤖 جرّب اسأل خِدْمَتي AI</a></div>'},
  {q:'هل بياناتي آمنة؟',a:'آه، بياناتك آمنة. إحنا مش بنحفظ بياناتك الشخصية على سيرفراتنا. كل اللي بتكتبه بيبقى على جهازك (localStorage).<div class="faq-cta"><a href="#ai" onclick="closeAndScroll(event)">🤖 اسأل بأمان</a></div>'},
  {q:'إزاي أثبت التطبيق على موبايلي؟',a:'اضغط على زر "📲 حمل التطبيق من هنا" في أعلى الموقع، واتبع الخطوات. أو من قائمة المتصفح اختار "Add to Home Screen".<div class="faq-cta"><a href="#" onclick="installApp(event)">📲 حمل التطبيق من هنا</a></div>'},
  {q:'إزاي ألاقي خدمة معينة؟',a:'تقدر تبحث في الصفحة الرئيسية، أو في الدليل الحكومي الذكي، أو تسأل الـ AI مباشرة بالعربي المصري.<div class="faq-cta"><a href="#services" onclick="closeAndScroll(event)">🔍 تصفح دليل الخدمات</a></div>'},
  {q:'هل تقدروا تساعدوني أخلص معاملاتي؟',a:'خِدْمَتي AI بيساعدك تفهم الخطوات والمستندات المطلوبة. لو محتاج حد يخلصها لك، تقدر تطلب من قسم "مقدمو الخدمات" وتتواصل مع مقدم خدمة.<div class="faq-cta"><a href="#providers" onclick="closeAndScroll(event)">👤 اطلب مقدم خدمة</a></div>'},
  {q:'هل المنصة بتشتغل على الكمبيوتر والموبايل؟',a:'آه، خِدْمَتي AI بتشتغل على كل الأجهزة: موبايل، تابلت، كمبيوتر. وتقدر تثبتها كتطبيق على جهازك.<div class="faq-cta"><a href="#ai" onclick="closeAndScroll(event)">🤖 جرّب دلوقتي</a></div>'}
]

function renderFAQ(){
  const list=document.getElementById('faqList')
  if(!list)return
  list.innerHTML=faqs.map((f,i)=>`
    <div class="faq-item" onclick="toggleFAQ(${i})">
      <div class="faq-q">
        <span class="faq-q-text">${f.q}</span>
        <span class="faq-q-icon" id="faqIcon${i}">➕</span>
      </div>
      <div class="faq-a" id="faqA${i}">${f.a}<div style="text-align:left;margin-top:12px"><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(f.q+' — خِدْمَتي AI')}" target="_blank" onclick="event.stopPropagation()" style="background:#1877F2;color:#fff;padding:8px 18px;border-radius:25px;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px">📘 مشاركة</a></div></div>
    </div>
  `).join('')
}

function toggleFAQ(i){
  const ans=document.getElementById('faqA'+i)
  const icon=document.getElementById('faqIcon'+i)
  if(!ans)return
  const open=ans.style.display==='block'
  ans.style.display=open?'none':'block'
  icon.textContent=open?'➕':'➖'
}

document.addEventListener('DOMContentLoaded',renderFAQ)

/* ===== REVIEWS (آراء المستخدمين) ===== */
const reviews=[
  {name:'أحمد محمد',role:'صاحب شركة',stars:5,text:'منصة تحفة! بسألها بالعربي المصري بترد عليا فوراً وتوجّهني خطوة بخطوة. وفّرت عليا وقت كتير في تجديد الرخصة.',icon:'👨‍💼'},
  {name:'سارة عبدالله',role:'أم/ربة منزل',stars:5,text:'الميزة الصوتية ممتازة! ماكنتش أعرف أتكلم مع الكمبيوتر كده. دلوقتي بسأل وأتكلم وبتفهمني على طول.',icon:'👩'},
  {name:'محمود علي',role:'موظف',stars:5,text:'كنت محتار في تسجيل الضريبة، بس خِدْمَتي AI شرحتلي كل خطوة والمستندات المطلوبة. حاجة محترمة جداً.',icon:'👨'},
  {name:'فاطمة سيد',role:'طالبة',stars:5,text:'استخرجت شهادة ميلاد لأختي في دقايق! الموقع بسيط وسهل، والمقالات مفيدة جداً.',icon:'👩‍🎓'},
  {name:'خالد إبراهيم',role:'تاجر',stars:5,text:'أحسن حاجة إنه مجاني! ببحث عن أي خدمة حكومية وألاقيها هنا. الرابط المباشر للجهة الحكومية بيوفّر عليا التدوير.',icon:'🧑‍🔧'},
  {name:'منى رشاد',role:'محاسبة',stars:5,text:'أنصح كل عملائي بالمنصة دي. بتوضّح المعاملات الضريبية بطريقة بسيطة. تحفة فعلاً!',icon:'👩‍💼'}
]

function renderReviews(){
  const grid=document.getElementById('reviewsGrid')
  if(!grid)return
  grid.innerHTML=reviews.map(r=>`
    <div class="review-card">
      <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-user">
        <span class="review-icon">${r.icon}</span>
        <div>
          <strong class="review-name">${r.name}</strong>
          <span class="review-role">${r.role}</span>
        </div>
      </div>
    </div>
  `).join('')
}

document.addEventListener('DOMContentLoaded',renderReviews)

/* ===== closeAndScroll (CTA helper) ===== */
function closeAndScroll(e){
  e.stopPropagation()
  const href=e.currentTarget.getAttribute('href')
  if(href&&href.startsWith('#')){
    e.preventDefault()
    const el=document.querySelector(href)
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'})
  }
}
