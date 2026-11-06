#!/usr/bin/env python3
"""بناء صفحة «فاحص المستندات» من أوراق الخدمات الحقيقية.

البيانات من tools/seo/service-docs.json (مستخرجة من صفحات services/*.html).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "tools/seo/service-docs.json").read_text(encoding="utf-8"))
BASE = "https://khidmatyai.com"
URL = f"__BASE__/docs-checker.html"

payload = json.dumps(DATA, ensure_ascii=False, separators=(",", ":"))
total_docs = sum(len(s["docs"]) for s in DATA)

HTML = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>فاحص المستندات — اعرف الناقص قبل ما تروح | خِدْمَتي AI</title>
<meta name="description" content="اختار الخدمة، علّم على الورق اللي معاك، والفاحص يقولك الناقص بالظبط. __N__ خدمة حكومية و__T__ ورقة — قايمة تاخدها معاك للمكتب.">
<link rel="canonical" href="__URL__">
<meta property="og:title" content="فاحص المستندات — اعرف الناقص قبل ما تروح">
<meta property="og:description" content="علّم على الورق اللي معاك، واعرف الناقص قبل ما تروح المكتب.">
<meta property="og:type" content="website">
<meta property="og:url" content="__URL__">
<meta property="og:image" content="__BASE__/assets/brand-logo.jpeg">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="فاحص المستندات — اعرف الناقص قبل ما تروح">
<meta name="twitter:description" content="علّم على الورق اللي معاك، واعرف الناقص قبل ما تروح المكتب.">
<meta name="twitter:image" content="__BASE__/assets/brand-logo.jpeg">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"فاحص المستندات — خِدْمَتي AI","description":"أداة تعرض الأوراق المطلوبة لكل خدمة حكومية وتحدد الناقص منها","url":"__URL__","applicationCategory":"GovernmentService","operatingSystem":"Any","inLanguage":"ar-EG","offers":{"@type":"Offer","price":"0","priceCurrency":"EGP"}}
</script>
<style>
*{box-sizing:border-box}
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}
.wrap{max-width:760px;margin:0 auto;padding:0 16px 50px}
.hero{text-align:center;padding:26px 4px 18px}
.hero h1{font-size:24px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.4}
.hero h1 span{color:#e6c258}
.hero p{font-size:14px;color:#8ea0c4;margin:0;line-height:1.8}
.search-box{margin-top:6px}
.search-box input{width:100%;padding:13px 16px;border-radius:14px;border:1px solid #1e3556;background:#162847;color:#e8eef8;font-family:Cairo,sans-serif;font-size:14px}
.search-box input::placeholder{color:#5a6a8a}
.list{margin-top:10px;max-height:270px;overflow-y:auto;border:1px solid #1e3556;border-radius:14px;background:#0d1a33}
.list button{display:flex;width:100%;justify-content:space-between;gap:10px;padding:12px 14px;background:none;border:0;border-bottom:1px solid #16274a;color:#e8eef8;font-family:Cairo,sans-serif;font-size:13.5px;text-align:right;cursor:pointer}
.list button:last-child{border-bottom:0}
.list button:hover{background:#16274a}
.list button bdi{color:#5a6a8a;font-size:12px;flex-shrink:0}
.empty{padding:16px;color:#8ea0c4;font-size:13px;text-align:center}
.card{display:none;margin-top:18px;background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:18px}
.card.show{display:block}
.card h2{font-size:17px;font-weight:800;color:#fff;margin:0 0 4px;line-height:1.5}
.card .sub{font-size:12.5px;color:#8ea0c4;margin:0 0 14px}
.bar{height:7px;background:#1e3556;border-radius:4px;overflow:hidden;margin-bottom:6px}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#e6c258,#d4a843);border-radius:4px;transition:width .3s}
.bar-txt{font-size:12.5px;color:#8ea0c4;margin-bottom:14px}
.item{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid #1e3556;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#12203c}
.item.on{border-color:#e6c258;background:rgba(230,194,88,.08)}
.item input{appearance:none;width:20px;height:20px;border:2px solid #3a5580;border-radius:6px;flex-shrink:0;margin:1px 0 0;position:relative;cursor:pointer}
.item input:checked{background:#e6c258;border-color:#e6c258}
.item input:checked::after{content:"✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#0F1E3D;font-size:14px;font-weight:900}
.item span{font-size:13.5px;line-height:1.7;color:#e8eef8}
.verdict{margin-top:14px;border-radius:12px;padding:14px 16px;font-size:13.5px;line-height:1.8}
.verdict.ok{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.45);color:#6ee7b7}
.verdict.miss{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.4);color:#fca5a5}
.verdict b{color:#fff}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.actions button{flex:1;min-width:140px;padding:11px 14px;border-radius:12px;border:1px solid #3a5580;background:#162847;color:#e8eef8;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.actions button.primary{background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;border-color:#e6c258}
.actions button:active{transform:translateY(1px)}
.open-link{display:block;text-align:center;margin-top:12px;font-size:13px;font-weight:800;color:#e6c258;text-decoration:none}
.note{margin-top:26px;border-top:1px solid #1e3556;padding-top:16px}
.note h2{font-size:16px;color:#fff;font-weight:800;margin:0 0 8px}
.note p{font-size:13.5px;color:#a9b8d4;line-height:1.9;margin:0 0 10px}
.footer{text-align:center;padding:26px 20px;color:#5a6a8a;font-size:12.5px;line-height:2}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
@media(max-width:430px){.hero h1{font-size:20px}}
</style>
</head>
<body>
<div class="header"><a href="index.html">← الرئيسية</a><span style="color:#fff;font-weight:900;font-size:16px">خِدْمَتي <span style="color:#e6c258">AI</span></span></div>
<div class="wrap">
  <div class="hero">
    <h1>فاحص <span>المستندات</span></h1>
    <p>اختار الخدمة، علّم على اللي معاك، والباقي بيظهرلك لوحده — قبل ما تروح المكتب</p>
  </div>

  <div class="search-box">
    <input id="q" type="search" placeholder="دوّر على الخدمة… (مثال: سجل تجاري)" aria-label="ابحث عن خدمة">
  </div>
  <div class="list" id="list" role="listbox" aria-label="الخدمات"></div>

  <div class="card" id="card">
    <h2 id="sTitle"></h2>
    <p class="sub" id="sSub"></p>
    <div class="bar"><i id="barFill"></i></div>
    <div class="bar-txt" id="barTxt"></div>
    <div id="items"></div>
    <div class="verdict" id="verdict"></div>
    <div class="actions">
      <button class="primary" id="copyBtn">📋 انسخ الناقص</button>
      <button id="printBtn">🖨️ اطبع الليستة</button>
      <button id="resetBtn">↺ من الأول</button>
    </div>
    <a class="open-link" id="svcLink" href="#">دليل الخدمة كامل — الخطوات والرسوم ←</a>
  </div>

  <div class="note">
    <h2>ليه الفاحص ده موجود</h2>
    <p>أغلب المشاوير الضايعة في المصالح الحكومية سببها ورقة ناقصة، مش الخدمة نفسها. الفاحص بيجمع الأوراق المطلوبة لكل خدمة من صفحاتها في الموقع، ويخليك تعرف الناقص وإنت في البيت.</p>
    <p>علاماتك بتتحفظ على جهازك بس — مفيش حساب ولا تسجيل، ومفيش حاجة بتتبعت لأي حد.</p>
  </div>

  <div class="footer">
    <p>© 2026 خِدْمَتي AI</p>
    <p><a href="services.html">كل الخدمات</a> · <a href="calc.html">حاسبة الرسوم</a> · <a href="offices.html">المكاتب</a></p>
  </div>
</div>

<script type="application/json" id="docsData">__PAYLOAD__</script>
<script>
(function(){
  var DATA = JSON.parse(document.getElementById('docsData').textContent);
  var listEl = document.getElementById('list');
  var qEl = document.getElementById('q');
  var card = document.getElementById('card');
  var itemsEl = document.getElementById('items');
  var sTitle = document.getElementById('sTitle');
  var sSub = document.getElementById('sSub');
  var barFill = document.getElementById('barFill');
  var barTxt = document.getElementById('barTxt');
  var verdict = document.getElementById('verdict');
  var svcLink = document.getElementById('svcLink');
  var current = null;

  function key(slug){ return 'khadmaty.docs.' + slug; }
  function load(slug){
    try { return JSON.parse(localStorage.getItem(key(slug)) || '[]'); } catch(e) { return []; }
  }
  function save(slug, arr){
    try { localStorage.setItem(key(slug), JSON.stringify(arr)); } catch(e) {}
  }

  function norm(t){
    return (t || '')
      .replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^ء-ي0-9a-z\s]/gi, ' ')
      .replace(/\bال/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function renderList(filter){
    var parts = norm(filter).split(' ').filter(function(w){ return w; });
    var out = '';
    for (var i = 0; i < DATA.length; i++){
      var s = DATA[i];
      var hay = norm(s.title) + ' ' + s.slug.replace(/-/g, ' ');
      var ok = true;
      for (var k = 0; k < parts.length; k++){
        if (hay.indexOf(parts[k]) === -1){ ok = false; break; }
      }
      if (!ok) continue;
      out += '<button data-slug="' + s.slug + '"><span>' + s.title + '</span><bdi>' + s.docs.length + ' ورقة</bdi></button>';
    }
    listEl.innerHTML = out || '<div class="empty">مفيش خدمة بالاسم ده — جرّب كلمة تانية</div>';
  }

  function update(){
    if (!current) return;
    var checks = {};
    var inputs = itemsEl.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) checks[inputs[i].value] = inputs[i].checked;
    var have = 0;
    var missing = [];
    for (var j = 0; j < current.docs.length; j++){
      if (checks[j]) have++; else missing.push(current.docs[j]);
    }
    var pct = Math.round((have / current.docs.length) * 100);
    barFill.style.width = pct + '%';
    barTxt.textContent = 'معاك ' + have + ' من ' + current.docs.length + ' (' + pct + '%)';
    if (missing.length === 0){
      verdict.className = 'verdict ok';
      verdict.innerHTML = '<b>أوراقك كاملة ✅</b> ماتنساش البطاقة نفسها وإيصال السداد لو الخدمة بتطلبهم.';
    } else {
      verdict.className = 'verdict miss';
      verdict.innerHTML = '<b>ناقصك ' + missing.length + ':</b> ' + missing.join(' · ');
    }
    var arr = [];
    for (var k = 0; k < current.docs.length; k++) if (checks[k]) arr.push(k);
    save(current.slug, arr);
  }

  function open(slug){
    for (var i = 0; i < DATA.length; i++){
      if (DATA[i].slug === slug) { current = DATA[i]; break; }
    }
    if (!current) return;
    sTitle.textContent = current.title;
    sSub.textContent = current.docs.length + ' ورقة مطلوبة';
    var saved = load(slug);
    var html = '';
    for (var j = 0; j < current.docs.length; j++){
      var on = saved.indexOf(j) !== -1;
      html += '<label class="item' + (on ? ' on' : '') + '"><input type="checkbox" value="' + j + '"' + (on ? ' checked' : '') + '><span>' + current.docs[j] + '</span></label>';
    }
    itemsEl.innerHTML = html;
    svcLink.href = 'services/' + slug + '.html';
    card.classList.add('show');
    update();
    var inputs = itemsEl.querySelectorAll('input');
    for (var m = 0; m < inputs.length; m++){
      inputs[m].addEventListener('change', function(){
        this.parentElement.classList.toggle('on', this.checked);
        update();
      });
    }
    card.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  listEl.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-slug]');
    if (btn) open(btn.getAttribute('data-slug'));
  });

  qEl.addEventListener('input', function(){ renderList(this.value); });

  document.getElementById('resetBtn').addEventListener('click', function(){
    if (!current) return;
    save(current.slug, []);
    open(current.slug);
  });

  document.getElementById('copyBtn').addEventListener('click', function(){
    if (!current) return;
    var inputs = itemsEl.querySelectorAll('input');
    var miss = [];
    for (var i = 0; i < inputs.length; i++) if (!inputs[i].checked) miss.push('• ' + current.docs[i]);
    var txt = current.title + '\\n' + (miss.length ? 'الناقص:\\n' + miss.join('\\n') : 'كل الأوراق جاهزة ✅');
    var done = function(){ this.textContent = '✓ اتنسخ'; var b = this; setTimeout(function(){ b.textContent = '📋 انسخ الناقص'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done.bind(this), function(){ window.prompt('انسخ من هنا:', txt); });
    } else {
      window.prompt('انسخ من هنا:', txt);
    }
  });

  document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });

  renderList('');
})();
</script>
</body>
</html>
"""


def main() -> int:
    html = (
        HTML.replace("__N__", str(len(DATA)))
        .replace("__T__", str(total_docs))
        .replace("__URL__", URL)
        .replace("__BASE__", BASE)
        .replace("__PAYLOAD__", payload)
    )
    (ROOT / "docs-checker.html").write_text(html, encoding="utf-8")
    print(f"اتبنى: docs-checker.html — {len(DATA)} خدمة · {total_docs} ورقة")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
