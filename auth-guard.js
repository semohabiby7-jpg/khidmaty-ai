/* ===== AUTH GUARD — قفل ذكي للموقع ===== */
/* الصفحات المفتوحة (articles + services + /services/*) = بانر خفيف بدون قفل */
/* الصفحات التانية = overlay كامل لحد التسجيل */
/* المحتوى يفضل في DOM (عشان SEO) بس overlay بيغطيه لحد التسجيل في الصفحات المقفولة */
/* التسجيل مجاني 100٪ */

/* ===== Google Analytics — تتبع كل الصفحات ===== */
var GA_ID='G-W7WT8KN8P9';
if(typeof gtag==='undefined'){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){dataLayer.push(arguments);};
  var ga=document.createElement('script');
  ga.async=true;ga.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
  document.head.appendChild(ga);
  gtag('js',new Date());
  gtag('config',GA_ID,{page_path:window.location.pathname});
  /* UTM capture */
  var params=new URLSearchParams(window.location.search);
  var utm={};
  ['source','medium','campaign','term','content'].forEach(function(k){
    var v=params.get('utm_'+k);
    if(v){utm['utm_'+k]=v;sessionStorage.setItem('utm_'+k,v);}
  });
  if(Object.keys(utm).length){gtag('event','utm_capture',{event_category:'traffic_source',event_label:JSON.stringify(utm)});}
}
/* GA conversion helper */
function kgGaConvert(label){
  if(typeof gtag==='function'){gtag('event','sign_up',{method:'website',event_category:'engagement',event_label:label||'auth_guard'});}
}

(function(){
  if(localStorage.getItem('sb_token') || sessionStorage.getItem('kg_registered')) return;

  var path = window.location.pathname;
  var inServices = path.indexOf('/services/') !== -1;
  var isOpen = path.indexOf('articles.html') !== -1 || path.indexOf('services.html') !== -1 || inServices;
  var prefix = inServices ? '../' : '';

  /* ===== الصفحات المفتوحة: بانر خفيف بدل القفل ===== */
  if(isOpen){
    function createBanner(){
      if(document.getElementById('kgBanner')) return;
      var banner=document.createElement('div');
      banner.id='kgBanner';
      banner.dir='rtl';
      banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99998;background:linear-gradient(135deg,#0F1E3D,#1a2d5a);border-top:2px solid #e6c258;padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-family:Cairo,system-ui,sans-serif;box-shadow:0 -4px 20px rgba(0,0,0,.3)';
      banner.innerHTML=
        '<span style="color:#fff;font-size:14px;font-weight:700">🔑 سجّل مجانًا — وافتح كل المميزات</span>'+
        '<button id="kgBannerBtn" style="padding:10px 24px;border-radius:30px;border:none;background:linear-gradient(135deg,#e6c258,#d4af37);color:#0F1E3D;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap">🚀 ادخل مجانًا</button>'+
        '<button id="kgBannerClose" style="padding:8px 14px;border-radius:50%;border:none;background:rgba(255,255,255,.1);color:#8ea0c4;font-size:18px;cursor:pointer;font-family:inherit;line-height:1">×</button>';
      document.body.appendChild(banner);
      document.getElementById('kgBannerBtn').addEventListener('click',function(){createGate();});
      document.getElementById('kgBannerClose').addEventListener('click',function(){banner.style.transition='opacity .3s';banner.style.opacity='0';setTimeout(function(){banner.remove();},300);});
    }
    function createGate(){
      if(document.getElementById('kgGate')) return;
      var b=document.getElementById('kgBanner'); if(b)b.remove();
      var gate=document.createElement('div');
      gate.id='kgGate';
      gate.dir='rtl';
      gate.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Cairo,system-ui,sans-serif;overflow-y:auto';
      gate.innerHTML=
        '<div style="max-width:420px;width:100%;text-align:center;direction:rtl">'+
          '<div style="font-size:3em;margin-bottom:12px">🔐</div>'+
          '<h1 style="color:#e6c258;font-size:1.7em;margin:0 0 6px;font-weight:800">خِدْمَتي AI</h1>'+
          '<p style="color:#3fb950;font-size:1.05em;margin:0 0 8px;font-weight:700">التسجيل مجاني 100٪ 🆓</p>'+
          '<p style="color:#fff;opacity:.85;font-size:0.9em;margin:0 0 22px;line-height:1.6">سجّل دلوقتي وافتح كل الخدمات الحكومية المصرية<br>خطوة واحدة بس وأنت جوه 👇</p>'+
          '<form id="kgForm" style="display:flex;flex-direction:column;gap:12px">'+
            '<input id="kgName" type="text" placeholder="الاسم بالكامل" required maxlength="60" style="padding:14px 16px;border-radius:12px;border:2px solid rgba(230,194,88,.3);background:#fff;color:#0F1E3D;font-size:15px;font-family:inherit;text-align:right;direction:rtl">'+
            '<input id="kgPhone" type="tel" placeholder="رقم الموبايل (01xxxxxxxxx)" required pattern="01[0-9]{9}" maxlength="11" style="padding:14px 16px;border-radius:12px;border:2px solid rgba(230,194,88,.3);background:#fff;color:#0F1E3D;font-size:15px;font-family:inherit;text-align:right;direction:rtl;letter-spacing:1px">'+
            '<button type="submit" id="kgBtn" style="padding:15px;border-radius:12px;border:none;background:#e6c258;color:#0F1E3D;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit">🚀 ادخل مجانًا</button>'+
          '</form>'+
          '<p style="color:rgba(255,255,255,.5);font-size:0.72em;margin:16px 0 0;line-height:1.5">بتسجيلك بتوافق على <a href="'+prefix+'terms.html" style="color:#e6c258">شروط الاستخدام</a> و<a href="'+prefix+'privacy.html" style="color:#e6c258">الخصوصية</a><br>متنشرش بياناتك لأي حد 🔒</p>'+
          '<div id="kgErr" style="color:#f87171;font-size:0.85em;margin-top:12px;display:none"></div>'+
          '<button id="kgBack" style="margin-top:16px;padding:8px 20px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#8ea0c4;font-size:13px;cursor:pointer;font-family:inherit">← رجوع</button>'+
        '</div>';
      document.body.appendChild(gate);
      document.getElementById('kgBack').addEventListener('click',function(){gate.remove();createBanner();});
      var form=document.getElementById('kgForm');
      var btn=document.getElementById('kgBtn');
      var err=document.getElementById('kgErr');
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var name=document.getElementById('kgName').value.trim();
        var phone=document.getElementById('kgPhone').value.trim();
        if(name.length<3){err.textContent='اكتب اسمك صح يا فندم';err.style.display='block';return;}
        if(!/^01[0-9]{9}$/.test(phone)){err.textContent='رقم الموبايل غلط — لازم 01xxxxxxxxx';err.style.display='block';return;}
        err.style.display='none';btn.textContent='⏳ ثواني...';btn.disabled=true;
        fetch('https://puhdastfiswcmbnczvwx.supabase.co/rest/v1/users',{
          method:'POST',
          headers:{'apikey':'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY','Authorization':'Bearer sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY','Content-Type':'application/json','Prefer':'return=minimal'},
          body:JSON.stringify({name:name,phone:phone,source:'banner',page:window.location.pathname,created_at:new Date().toISOString()})
        }).then(function(){done();}).catch(function(){done();});
        function done(){
          try{localStorage.setItem('sb_token','gate_'+Date.now());sessionStorage.setItem('kg_registered','1');sessionStorage.setItem('kg_name',name);sessionStorage.setItem('kg_phone',phone);}catch(e){}
          kgGaConvert('banner_gate');
          gate.style.transition='opacity .4s';gate.style.opacity='0';
          setTimeout(function(){gate.remove();document.documentElement.style.overflow='';},400);
        }
        setTimeout(function(){if(document.getElementById('kgGate'))done();},3000);
      });
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',createBanner);}
    else{createBanner();}
    return;
  }

  /* ===== الصفحات المقفولة: overlay كامل ===== */
  document.documentElement.style.overflow='hidden';

  function createGate(){
    if(document.getElementById('kgGate')) return;

    var gate=document.createElement('div');
    gate.id='kgGate';
    gate.dir='rtl';
    gate.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0F1E3D,#1a2d5a);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Cairo,system-ui,sans-serif;overflow-y:auto';

    gate.innerHTML=
      '<div style="max-width:420px;width:100%;text-align:center;direction:rtl">'+
        '<div style="font-size:3em;margin-bottom:12px">🔐</div>'+
        '<h1 style="color:#e6c258;font-size:1.7em;margin:0 0 6px;font-weight:800">خِدْمَتي AI</h1>'+
        '<p style="color:#3fb950;font-size:1.05em;margin:0 0 8px;font-weight:700">التسجيل مجاني 100٪ 🆓</p>'+
        '<p style="color:#fff;opacity:.85;font-size:0.9em;margin:0 0 22px;line-height:1.6">سجّل دلوقتي وافتح كل الخدمات الحكومية المصرية<br>خطوة واحدة بس وأنت جوه 👇</p>'+
        '<form id="kgForm" style="display:flex;flex-direction:column;gap:12px">'+
          '<input id="kgName" type="text" placeholder="الاسم بالكامل" required maxlength="60" style="padding:14px 16px;border-radius:12px;border:2px solid rgba(230,194,88,.3);background:#fff;color:#0F1E3D;font-size:15px;font-family:inherit;text-align:right;direction:rtl">'+
          '<input id="kgPhone" type="tel" placeholder="رقم الموبايل (01xxxxxxxxx)" required pattern="01[0-9]{9}" maxlength="11" style="padding:14px 16px;border-radius:12px;border:2px solid rgba(230,194,88,.3);background:#fff;color:#0F1E3D;font-size:15px;font-family:inherit;text-align:right;direction:rtl;letter-spacing:1px">'+
          '<button type="submit" id="kgBtn" style="padding:15px;border-radius:12px;border:none;background:#e6c258;color:#0F1E3D;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit">🚀 ادخل مجانًا</button>'+
        '</form>'+
        '<p style="color:rgba(255,255,255,.5);font-size:0.72em;margin:16px 0 0;line-height:1.5">بتسجيلك بتوافق على <a href="'+prefix+'terms.html" style="color:#e6c258">شروط الاستخدام</a> و<a href="'+prefix+'privacy.html" style="color:#e6c258">الخصوصية</a><br>متنشرش بياناتك لأي حد 🔒</p>'+
        '<div id="kgErr" style="color:#f87171;font-size:0.85em;margin-top:12px;display:none"></div>'+
      '</div>';

    document.body.appendChild(gate);

    var form=document.getElementById('kgForm');
    var btn=document.getElementById('kgBtn');
    var err=document.getElementById('kgErr');

    form.addEventListener('submit',function(e){
      e.preventDefault();
      var name=document.getElementById('kgName').value.trim();
      var phone=document.getElementById('kgPhone').value.trim();
      if(name.length<3){err.textContent='اكتب اسمك صح يا فندم';err.style.display='block';return;}
      if(!/^01[0-9]{9}$/.test(phone)){err.textContent='رقم الموبايل غلط — لازم 01xxxxxxxxx';err.style.display='block';return;}
      err.style.display='none';
      btn.textContent='⏳ ثواني...';
      btn.disabled=true;

      // إرسال لـSupabase
      fetch('https://puhdastfiswcmbnczvwx.supabase.co/rest/v1/users',{
        method:'POST',
        headers:{'apikey':'sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY','Authorization':'Bearer sb_publishable_L7FO3IA44NZeLxODpGKjaw_5y6MD8wY','Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify({name:name,phone:phone,source:'gate',page:window.location.pathname,created_at:new Date().toISOString()})
      }).then(function(){done();}).catch(function(){done();});

      function done(){
        try{localStorage.setItem('sb_token','gate_'+Date.now());sessionStorage.setItem('kg_registered','1');sessionStorage.setItem('kg_name',name);sessionStorage.setItem('kg_phone',phone);}catch(e){}
        kgGaConvert('locked_gate');
        gate.style.transition='opacity .4s';gate.style.opacity='0';
        setTimeout(function(){gate.remove();document.documentElement.style.overflow='';},400);
      }
      // fallback لو Supabase بطيء
      setTimeout(function(){if(document.getElementById('kgGate'))done();},3000);
    });
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',createGate);}
  else{createGate();}
})();

/* ===== مدي العائم — زرار واحد في كل صفحات الموقع ===== */
(function(){
  try{
    var p=location.pathname||'';
    if(/\/medy\.html$/i.test(p))return;
    if(/(admin|dashboard|dash|login|signin|register|gate|404)/i.test(p))return;
    if(document.getElementById('medyFab'))return;

    var css=document.createElement('style');
    css.textContent=
      '#medyFab{position:fixed;inset-inline-start:16px;bottom:18px;z-index:99990;display:flex;align-items:center;gap:9px;'+
      'background:linear-gradient(145deg,#e6c258,#c9a33c);color:#0F1E3D;border:0;border-radius:40px;padding:10px 16px 10px 12px;'+
      'font-family:Cairo,system-ui,sans-serif;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.12) inset;'+
      'opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .45s ease,box-shadow .25s ease}'+
      '#medyFab.on{opacity:1;transform:translateY(0)}'+
      '#medyFab:hover{box-shadow:0 14px 30px rgba(0,0,0,.45)}'+
      '#medyFab:active{transform:scale(.97)}'+
      '#medyFab svg{width:24px;height:24px;flex:0 0 auto}'+
      '#medyFab .mdot{width:7px;height:7px;border-radius:50%;background:#0F1E3D;opacity:.55;animation:mfab 1.6s infinite}'+
      '@keyframes mfab{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:.9;transform:scale(1)}}'+
      '@media(max-width:430px){#medyFab{font-size:13px;padding:9px 13px 9px 10px;bottom:14px;inset-inline-start:12px}}'+
      '@media(prefers-reduced-motion:reduce){#medyFab{transition:none;opacity:1;transform:none}#medyFab .mdot{animation:none}}';
    document.head.appendChild(css);

    var b=document.createElement('a');
    var t=(document.title||'').replace(/\s*[|—–-]\s*.*$/,'').trim().slice(0,70);
    b.id='medyFab';
    b.href='/medy.html?from='+encodeURIComponent(p)+'&t='+encodeURIComponent(t);
    b.setAttribute('aria-label','اسأل مدي — مساعدة خِدْمَتي AI');
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+
      '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4"/><circle cx="9" cy="13" r="1.3" fill="#0F1E3D" stroke="none"/>'+
      '<circle cx="15" cy="13" r="1.3" fill="#0F1E3D" stroke="none"/><path d="M9.5 16.5h5"/></svg>'+
      '<span>اسأل مدي</span><span class="mdot"></span>';
    document.body.appendChild(b);
    setTimeout(function(){b.className='on'},900);
  }catch(e){}
})();
