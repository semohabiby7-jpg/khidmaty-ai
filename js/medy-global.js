/* مدي — طبقة عامة على كل صفحات خِدْمَتي AI (v2)
   - إجابات مرتّبة بأقسام + مصادر + أزرار تنقّل
   - ذاكرة خدمة أخيرة بين الصفحات (لو سألت «وبعدين؟» وهي عارفة الخدمة)
   - صفر تخمين: أي رقم مش في الداتا بيقول «مش معايا» */
(function () {
  if (window.__MEDY_GLOBAL__) return;
  window.__MEDY_GLOBAL__ = true;
  if (/\/medy\.html$/.test(location.pathname)) return;

  var BRAIN = 'https://khidmaty-agent.semohabiby7.workers.dev/chat';
  var RANIA = 'https://khidmaty-rania.semohabiby7.workers.dev/chat';
  var KB = '/data/medy-kb.json';
  var HKEY = 'medy_global_hist_v2';
  var LKEY = 'medy_last_svc_v1';

  var kb = { items: [], updated: '' };
  var pageItem = null;
  var lastSlug = null;
  var history = [];
  var busy = false;
  var built = false;

  /* ---------- أدوات ---------- */
  var DIAC = /[\u064B-\u0652\u0670\u0640]/g;
  function norm(s) {
    return String(s || '').replace(DIAC, '').replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmt(t) {
    var h = esc(t);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/^\s*[-*•]\s+/gm, '• ');
    h = h.replace(/\*/g, '').replace(/^\s*#{1,6}\s*/gm, '');
    return h.replace(/\n/g, '<br>');
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function track(name, data) { if (window.gtag) try { gtag('event', name, data || {}); } catch (e) {} }

  /* ---------- قاعدة المعرفة ---------- */
  function loadKB() {
    return fetch(KB, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        (d.items || []).forEach(function (i) { if (!i.name) i.name = i.title; });
        kb = d;
        matchPage();
        if (built) { paintContext(); paintChips(); }
      })
      .catch(function () {});
  }

  function bySlug(slug) {
    for (var i = 0; i < (kb.items || []).length; i++) if (kb.items[i].slug === slug) return kb.items[i];
    return null;
  }

  function matchPage() {
    var p = location.pathname.replace(/^\//, '');
    if (!p) return;
    for (var i = 0; i < (kb.items || []).length; i++) {
      var it = kb.items[i];
      if (it.page && (it.page === p || '/' + it.page === location.pathname)) {
        pageItem = it;
        remember(it.slug, true);
        return;
      }
    }
  }

  function remember(slug, soft) {
    if (!slug) return;
    lastSlug = slug;
    try { localStorage.setItem(LKEY, slug); } catch (e) {}
    if (!soft) track('medy_context', { slug: slug });
  }

  function findService(text) {
    var t = norm(text);
    if (!t) return null;
    var best = null, bs = 0;
    (kb.items || []).forEach(function (it) {
      var s = 0;
      (it.kw || []).forEach(function (k) {
        var nk = norm(k);
        if (nk && nk.length > 2 && t.indexOf(nk) >= 0) s += nk.length + 2;
      });
      if (norm(it.name) && t.indexOf(norm(it.name)) >= 0) s += 6;
      if (s > bs) { bs = s; best = it; }
    });
    return bs >= 5 ? best : null;
  }

  /* ---------- تصنيف السؤال ---------- */
  var FEE = ['رسوم', 'بكام', 'كام', 'سعر', 'تكلفه', 'تكلفة', 'فلوس', 'دفع', 'جنيه', 'مصاريف'];
  var DOC = ['مستند', 'ورق', 'مطلوب', 'اجيب', 'أجيب', 'معايا ايه', 'ناقص'];
  var DUR = ['مده', 'مدة', 'وقت', 'ياخد', 'كام يوم', 'امتى', 'متى', 'بدري'];
  var STEP = ['خطوات', 'اعمل', 'أعمل', 'ازاي', 'إزاي', 'طريقه', 'طريقة', 'ابدأ', 'ابدا'];
  var OFFICE = ['فين', 'مكتب', 'مكان', 'عنوان', 'فرع'];
  var FOLLOW = ['وبعدين', 'وكمان', 'طب', 'ولو', 'وكمل', 'كمل', 'وعلى فكره', 'ده كده', 'تمام وبعدين', 'زياده'];

  function has(list, t) {
    for (var i = 0; i < list.length; i++) if (t.indexOf(norm(list[i])) >= 0) return true;
    return false;
  }

  /* ---------- بناء الإجابة ---------- */
  function answer(it, q, focus) {
    if (!it) return null;
    var t = norm(q);
    var wantFee = focus === 'fee' || has(FEE, t);
    var wantDoc = focus === 'docs' || has(DOC, t);
    var wantDur = focus === 'dur' || has(DUR, t);
    var wantStep = focus === 'steps' || has(STEP, t);
    var wantOffice = has(OFFICE, t);
    var j = it.journey || {};
    var docs = it.docs || [];
    var L = [];

    L.push('**' + it.title + '**');
    var facts = [];
    if (it.auth) facts.push(it.auth);
    if (it.dur) facts.push(it.dur);
    if (facts.length) L.push(facts.join(' · '));
    L.push('');

    /* الرسوم */
    if (wantFee || (!wantDoc && !wantStep)) {
      L.push('💸 **الرسوم**');
      L.push(it.fee ? it.fee : 'الرقم ده مش معايا متأكد منه — متأكدش من دماغي، راجع المصدر الرسمي.');
      L.push('');
    }

    /* المدة */
    if (wantDur && it.dur) {
      L.push('⏱️ **بكام وقت**');
      L.push(it.dur);
      L.push('');
    }

    /* الورق */
    if (wantDoc || (!wantFee && !wantStep)) {
      if (docs.length) {
        L.push('📄 **الورق اللي هتحتاجه (' + docs.length + ')**');
        docs.slice(0, wantDoc ? 12 : 6).forEach(function (x) { L.push('• ' + x); });
        if (docs.length > (wantDoc ? 12 : 6)) L.push('• ... وغيرها في صفحة الخدمة');
        L.push('');
      }
    }

    /* الخطوات */
    if ((wantStep || !wantFee) && j.steps && j.steps.length) {
      L.push('🪜 **الخطوات**');
      j.steps.slice(0, 8).forEach(function (s, i) {
        var x = (typeof s === 'string') ? s : (s.title || s.t || s.name || s.text || '');
        if (x) L.push((i + 1) + '. ' + x);
      });
      L.push('');
    }

    /* التحذيرات */
    if (it.warn || j.warning) {
      L.push('⚠️ **خد بالك**');
      L.push(it.warn || j.warning);
      L.push('');
    }

    /* المكان */
    if (wantOffice) {
      L.push('📍 **تعملها فين**');
      L.push((it.auth || 'الجهة المختصة') + ' — وتقدر تشوف أقرب مكتب ليك على الخريطة.');
      L.push('');
    }

    /* المصدر الأول مضمّن */
    var srcs = it.sources || [];
    if (srcs.length) {
      L.push('📚 المصدر: ' + srcs[0].label + (srcs[0].official ? ' ✓' : ''));
    }

    return L.join('\n').replace(/\n+$/, '');
  }

  /* ---------- الواجهة ---------- */
  var CSS = [
    '.mg-btn{position:fixed;bottom:18px;left:18px;z-index:99998;display:flex;align-items:center;gap:8px;',
    'background:#0F1E3D;border:1.5px solid #E6C258;color:#fff;border-radius:999px;padding:9px 15px 9px 12px;',
    'font-family:Cairo,system-ui,sans-serif;font-weight:800;font-size:13px;cursor:pointer;',
    'box-shadow:0 10px 28px rgba(15,30,61,.28);transition:transform .15s}',
    '.mg-btn:hover{transform:translateY(-2px)}',
    '.mg-btn img{width:26px;height:26px;object-fit:contain;border-radius:50%}',
    '.mg-btn .mg-dot{width:7px;height:7px;border-radius:50%;background:#34D399;box-shadow:0 0 0 3px rgba(52,211,153,.18)}',
    '.mg-panel{position:fixed;bottom:18px;left:18px;z-index:99999;width:378px;max-width:calc(100vw - 24px);',
    'height:min(580px,calc(100vh - 36px));background:#0F1E3D;border:1px solid #1e3556;border-radius:20px;',
    'display:none;flex-direction:column;overflow:hidden;font-family:Cairo,system-ui,sans-serif;direction:rtl;',
    'box-shadow:0 24px 60px rgba(8,19,38,.45)}',
    '.mg-panel.open{display:flex}',
    '.mg-top{display:flex;align-items:center;gap:9px;padding:11px 13px;border-bottom:1px solid #1e3556;background:#0c1930}',
    '.mg-top img{width:34px;height:34px;object-fit:contain;border-radius:50%;background:#162847}',
    '.mg-top .mg-n{flex:1;min-width:0}',
    '.mg-top .mg-n b{display:block;color:#fff;font-size:13.5px;font-weight:900}',
    '.mg-top .mg-n span{display:block;color:#8ea0c4;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mg-x{background:transparent;border:none;color:#8ea0c4;font-size:19px;cursor:pointer;line-height:1;padding:4px 6px}',
    '.mg-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px;background:#0F1E3D}',
    '.mg-msg{max-width:92%;border-radius:14px;padding:9px 12px;font-size:12.8px;line-height:1.9;white-space:normal}',
    '.mg-msg.me{align-self:flex-start;background:#1a2d5a;color:#dbe6f7}',
    '.mg-msg.md{align-self:stretch;background:rgba(230,194,88,.08);border:1px solid rgba(230,194,88,.2);color:#e8eef8}',
    '.mg-msg.md strong{color:#fff;font-weight:800}',
    '.mg-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:7px;border-top:1px dashed rgba(230,194,88,.25)}',
    '.mg-act{background:#0b1730;border:1px solid #24395c;color:#cddcf3;border-radius:9px;padding:5px 10px;',
    'font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;text-decoration:none}',
    '.mg-act:hover{border-color:#E6C258;color:#E6C258}',
    '.mg-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}',
    '.mg-chip{background:rgba(230,194,88,.1);border:1px solid rgba(230,194,88,.28);color:#E6C258;border-radius:999px;',
    'padding:6px 11px;font-size:11.5px;font-weight:800;cursor:pointer;font-family:inherit}',
    '.mg-chip:hover{background:rgba(230,194,88,.2)}',
    '.mg-src{display:none;margin-top:7px;border-top:1px dashed #24395c;padding-top:7px}',
    '.mg-src.open{display:block}',
    '.mg-src a{display:block;color:#cddcf3;text-decoration:none;font-size:11px;padding:4px 0;word-break:break-word}',
    '.mg-src a i{color:#7f93b5;font-style:normal;display:block;font-size:10px}',
    '.mg-sbtn{background:none;border:none;color:#E6C258;font-size:11px;font-weight:800;cursor:pointer;padding:6px 0 0;font-family:inherit}',
    '.mg-in{display:flex;gap:7px;padding:10px;border-top:1px solid #1e3556;background:#0c1930}',
    '.mg-in input{flex:1;min-width:0;background:#081326;border:1px solid #24395c;border-radius:12px;padding:10px 12px;',
    'color:#fff;font-family:inherit;font-size:13px;outline:none}',
    '.mg-in input:focus{border-color:#E6C258}',
    '.mg-in button{background:#E6C258;color:#0F1E3D;border:none;border-radius:12px;padding:0 14px;font-weight:900;',
    'font-size:13px;font-family:inherit;cursor:pointer}',
    '.mg-think{align-self:flex-start;color:#9fb4d6;font-size:11.5px;display:flex;align-items:center;gap:7px}',
    '.mg-think i{width:7px;height:7px;border-radius:50%;background:#E6C258;animation:mgp 1.1s infinite}',
    '@keyframes mgp{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}',
    '@media(max-width:430px){.mg-panel{width:calc(100vw - 20px);left:10px;bottom:10px;height:calc(100vh - 20px);max-height:none}',
    '.mg-btn{bottom:14px;left:14px;padding:8px 13px 8px 10px;font-size:12.5px}}'
  ].join('');

  var root, bodyEl, inputEl, ctxEl, chipsEl;

  function build() {
    if (built) return;
    built = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    root = el('div', 'mg-panel');
    root.innerHTML =
      '<div class="mg-top">' +
        '<img src="/assets/brand/medy-3d.webp" alt="مدي">' +
        '<div class="mg-n"><b>مدي</b><span class="mg-ctx">مساعدتك في خِدْمَتي AI</span></div>' +
        '<button class="mg-x" aria-label="إغلاق">×</button>' +
      '</div>' +
      '<div class="mg-body"></div>' +
      '<div class="mg-chips"></div>' +
      '<div class="mg-in"><input type="text" placeholder="اسألني بالعامية…" autocomplete="off"><button>اسأل</button></div>';
    document.body.appendChild(root);

    bodyEl = root.querySelector('.mg-body');
    inputEl = root.querySelector('.mg-in input');
    chipsEl = root.querySelector('.mg-chips');
    ctxEl = root.querySelector('.mg-ctx');

    var btn = el('button', 'mg-btn');
    btn.innerHTML = '<img src="/assets/brand/medy-3d.webp" alt=""><span>اسأل مدي</span><span class="mg-dot"></span>';
    btn.setAttribute('aria-label', 'اسأل مدي');
    btn.addEventListener('click', function () { open(); });
    document.body.appendChild(btn);

    root.querySelector('.mg-x').addEventListener('click', function () { close(); });
    root.querySelector('.mg-in button').addEventListener('click', ask);
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });

    try {
      var saved = sessionStorage.getItem(HKEY);
      if (saved) history = JSON.parse(saved) || [];
    } catch (e) {}
    try { lastSlug = localStorage.getItem(LKEY) || null; } catch (e) {}

    paintContext();
    paintChips();
    greet();
  }

  function paintContext() {
    if (!ctxEl) return;
    var cur = pageItem || (lastSlug ? bySlug(lastSlug) : null);
    ctxEl.textContent = pageItem
      ? ('واقفين على: ' + pageItem.title)
      : (cur ? ('آخر حاجة سألت عنها: ' + cur.title) : 'مساعدتك في خِدْمَتي AI');
  }

  function paintChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    var it = pageItem || (lastSlug ? bySlug(lastSlug) : null);
    var list = it
      ? ['الرسوم كام؟', 'الورق المطلوب', 'الخطوات بالترتيب', 'أقرب مكتب فين؟']
      : ['عايز أنقل ملكية عربية', 'بطاقتي ضاعت أعمل إيه', 'عايز أطلع جواز سفر', 'إعلام الوراثة إزاي'];
    list.forEach(function (t) {
      var b = el('button', 'mg-chip', t);
      b.addEventListener('click', function () { inputEl.value = t; ask(); });
      chipsEl.appendChild(b);
    });
  }

  function greet() {
    if (bodyEl.children.length) return;
    var it = pageItem || (lastSlug ? bySlug(lastSlug) : null);
    var hi = it
      ? 'أنا مدي 🤍 إحنا في **' + it.title + '**. اسألني عن الرسوم أو الورق أو الخطوات — وهجاوبك من الداتا المتحققة بس.'
      : 'أنا مدي 🤍 احكيلي إنت محتاج إيه وأنا أرتّبلك الخطوات والورق والجهة الصح.';
    sys(hi);
  }

  function sys(t) {
    var m = el('div', 'mg-msg md');
    m.innerHTML = fmt(t);
    bodyEl.appendChild(m);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return m;
  }

  function mine(t) {
    var m = el('div', 'mg-msg me');
    m.textContent = t;
    bodyEl.appendChild(m);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  /* ---------- السؤال ---------- */
  function ask() {
    var raw = (inputEl.value || '').trim();
    if (!raw || busy) return;
    build();
    busy = true;
    inputEl.value = '';
    mine(raw);

    var t = norm(raw);
    var ctxSvc = pageItem || (lastSlug ? bySlug(lastSlug) : null);
    var isFollow = has(FOLLOW, t) && ctxSvc;
    var target = findService(raw) || (isFollow ? ctxSvc : null);

    var think = el('div', 'mg-think');
    think.innerHTML = '<i></i><span>مدي بتسمع…</span>';
    bodyEl.appendChild(think);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    var stages = ['مدي بتسمع…', 'مدي بتراجع البيانات…', 'مدي بتدوّر في المصادر…'];
    var si = 0;
    var tick = setInterval(function () {
      si = Math.min(si + 1, stages.length - 1);
      var s = think.querySelector('span'); if (s) s.textContent = stages[si];
    }, 1100);

    var local = target ? answer(target, raw) : '';

    function done(text, svc) {
      clearInterval(tick);
      if (think.parentNode) think.remove();
      addAnswer(text, svc);
      if (svc) { remember(svc.slug); paintContext(); paintChips(); }
      history.push({ role: 'user', text: raw }, { role: 'model', text: text });
      if (history.length > 12) history = history.slice(-12);
      try { sessionStorage.setItem(HKEY, JSON.stringify(history)); } catch (e) {}
      track('medy_ask', {
        q: raw,
        slug: svc ? svc.slug : 'none',
        page: pageItem ? pageItem.slug : location.pathname,
        mode: text === local ? 'local' : 'server'
      });
      busy = false;
    }

    if (local) { done(local, target); return; }

    var ctx = 'المستخدم واقف على صفحة: ' +
      (pageItem ? pageItem.title + ' (' + pageItem.page + ')' : (document.title || location.pathname)) +
      '. ' + (ctxSvc ? 'آخر خدمة اتكلمنا عنها: ' + ctxSvc.title + '. ' : '');
    var urls = [BRAIN, RANIA];
    (function next(i) {
      if (i >= urls.length) {
        var it = findService(raw);
        if (it && (it.docs || []).length) { done(answer(it, raw), it); return; }
        done('معلش، مش قادرة أوصل للسيرفر دلوقتي. جرّب تاني بعد شوية — ولو معاك اسم الخدمة اكتبه وأنا أقولك اللي عندي عنها من الداتا المتحققة.', null);
        return;
      }
      fetch(urls[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ctx + raw,
          question: raw,
          history: history,
          context: {
            page: pageItem ? pageItem.slug : location.pathname,
            topic: ctxSvc ? ctxSvc.title : null,
            last: lastSlug
          }
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        var rep = d && (d.response || d.reply);
        if (rep) {
          rep = String(rep).replace(/رانيا|راينا|رنيا/g, 'مدى').replace(/Rania/gi, 'Medy');
          done(rep, target || findService(raw));
        } else next(i + 1);
      }).catch(function () { next(i + 1); });
    })(0);
  }

  function addAnswer(text, svc) {
    var m = el('div', 'mg-msg md');
    m.innerHTML = fmt(text);

    /* أزرار تنقّل */
    var acts = el('div', 'mg-acts');
    if (svc) {
      if (svc.page) {
        var a1 = el('a', 'mg-act', '📄 صفحة الخدمة');
        a1.href = '/' + svc.page;
        acts.appendChild(a1);
      }
      var a2 = el('a', 'mg-act', '🧮 احسب الرسوم');
      a2.href = '/calc.html?service=' + encodeURIComponent(svc.slug || '');
      acts.appendChild(a2);
      var a3 = el('a', 'mg-act', '🗺️ رحلة الخدمة');
      a3.href = '/journeys.html#' + (svc.slug || '');
      acts.appendChild(a3);
      var a4 = el('a', 'mg-act', '📍 أقرب مكتب');
      a4.href = '/offices.html';
      acts.appendChild(a4);
    }

    var srcs = (svc && svc.sources) || [];
    if (srcs.length) {
      var box = el('div', 'mg-src');
      srcs.slice(0, 6).forEach(function (s) {
        var a = document.createElement('a');
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = s.label + (s.official ? ' ✓' : '');
        var i = document.createElement('i'); i.textContent = s.domain || '';
        a.appendChild(i);
        box.appendChild(a);
      });
      var b = el('button', 'mg-sbtn', '📚 كل المصادر (' + srcs.length + ')');
      b.addEventListener('click', function () {
        box.classList.toggle('open');
        b.textContent = box.classList.contains('open') ? 'إخفاء المصادر' : '📚 كل المصادر (' + srcs.length + ')';
      });
      m.appendChild(b);
      m.appendChild(box);
      acts.appendChild(el('span'));
    }

    if (acts.children.length) m.appendChild(acts);
    bodyEl.appendChild(m);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function open() {
    build();
    root.classList.add('open');
    greet();
    setTimeout(function () { if (window.innerWidth > 430) inputEl.focus(); }, 120);
    track('medy_open', { page: pageItem ? pageItem.slug : location.pathname });
  }
  function close() { root.classList.remove('open'); }

  /* ---------- التشغيل ---------- */
  function boot() {
    build();
    loadKB();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  try {
    var q = new URLSearchParams(location.search);
    if (q.get('medy') === '1') setTimeout(open, 400);
    if (q.get('ask')) setTimeout(function () { build(); inputEl.value = q.get('ask'); ask(); }, 700);
  } catch (e) {}
})();
