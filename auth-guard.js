/* ===== AUTH GUARD — قفل كامل للموقع ===== */
/* الزائر لازم يسجل اسم + رقم موبايل قبل ما يتصفح */
/* المحتوى يفضل في DOM (عشان SEO) بس overlay كامل بيغطيه لحد التسجيل */
/* التسجيل مجاني 100٪ */
(function(){
  if(localStorage.getItem('sb_token') || sessionStorage.getItem('kg_registered')) return;

  document.documentElement.style.overflow='hidden';

  function createGate(){
    if(document.getElementById('kgGate')) return;
    var inServices = window.location.pathname.indexOf('/services/') !== -1;
    var prefix = inServices ? '../' : '';

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
