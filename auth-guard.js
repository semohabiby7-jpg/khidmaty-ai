/* ===== AUTH GUARD — قفل ذكي للموقع ===== */
/* الصفحات المفتوحة (articles + services + /services/*) = بانر خفيف بدون قفل */
/* الصفحات التانية = overlay كامل لحد التسجيل */
/* المحتوى يفضل في DOM (عشان SEO) بس overlay بيغطيه لحد التسجيل في الصفحات المقفولة */
/* التسجيل مجاني 100٪ */
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
