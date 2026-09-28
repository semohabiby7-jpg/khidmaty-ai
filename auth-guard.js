/* ===== AUTH GUARD — نسخة SEO-آمنة ===== */
/* مش بيمنع المحتوى (عشان جوجل يفهرس كل الصفحات) — بس بيذكّر الزائر بالتسجيل بلطف */
/* الأفعال الحساسة (طلب خدمة / تقييم / الحاسبة) محمية من داخل app.js نفسه */
(function(){
  // لو مسجل دخول، مفيش حاجة
  if(localStorage.getItem('sb_token')) return;

  // بانر ناعم أسفل الشاشة — مش بيمنع التصفح وممكن يقفل
  function showSoftPrompt(){
    if(sessionStorage.getItem('reg_prompt_closed')) return;
    if(document.getElementById('regSoftPrompt')) return;

    var inServices = window.location.pathname.indexOf('/services/') !== -1;
    var prefix = inServices ? '../' : '';

    var bar = document.createElement('div');
    bar.id = 'regSoftPrompt';
    bar.dir = 'rtl';
    bar.style.cssText = 'position:fixed;bottom:76px;left:12px;right:12px;z-index:9998;background:linear-gradient(135deg,#0F1E3D,#1a2d5a);color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -4px 24px rgba(0,0,0,.35);border-radius:14px;font-family:Cairo,system-ui,sans-serif;border:1px solid rgba(230,194,88,.35);max-width:560px;margin:0 auto';

    var txt = document.createElement('span');
    txt.style.cssText = 'font-size:13.5px;line-height:1.5';
    txt.innerHTML = '👋 <b>أنشئ حسابك المجاني</b><br><span style="opacity:.8;font-size:12.5px">احفظ مصالحك وتابعها من مكان واحد</span>';

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0';

    var reg = document.createElement('button');
    reg.textContent = 'إنشاء حساب';
    reg.style.cssText = 'background:#e6c258;color:#0F1E3D;border:none;padding:9px 16px;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px;font-family:inherit';
    reg.onclick = function(){
      try{ sessionStorage.setItem('redirect_after_login', window.location.href); }catch(e){}
      window.location.href = prefix + 'index.html#login';
    };

    var x = document.createElement('button');
    x.textContent = '✕';
    x.setAttribute('aria-label', 'إغلاق');
    x.style.cssText = 'background:none;border:none;color:rgba(255,255,255,.55);cursor:pointer;font-size:15px;padding:6px;font-family:inherit';
    x.onclick = function(){
      try{ sessionStorage.setItem('reg_prompt_closed', '1'); }catch(e){}
      bar.remove();
    };

    btns.appendChild(reg);
    btns.appendChild(x);
    bar.appendChild(txt);
    bar.appendChild(btns);
    document.body.appendChild(bar);

    // اختفاء تلقائي بعد 12 ثانية
    setTimeout(function(){ if(bar.parentNode) bar.remove(); }, 12000);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(showSoftPrompt, 2000); });
  }else{
    setTimeout(showSoftPrompt, 2000);
  }
})();
