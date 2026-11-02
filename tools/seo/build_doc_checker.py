#!/usr/bin/env python3
"""بناء صفحة «فاحص المستندات» doc-checker.html

بتقرا الأوراق المطلوبة من صفحات الخدمات نفسها (tools/seo/service-docs.json)
وبتولّد صفحة واحدة: تختار الخدمة → تعلّم على اللي معاك → ناقصك إيه.
مفيش ولا ورقة مكتوبة بالإيد هنا؛ كلها مستخرجة من صفحات الموقع.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "tools/seo/service-docs.json").read_text(encoding="utf-8"))
BASE = "https://khidmatyai.com"

# نستبعد صفحات الأقسام لو دخلت بالغلط
DATA = [d for d in DATA if not any(k in d["name"] for k in ("القسم", "كل خدمات"))]
DATA.sort(key=lambda d: d["name"])

payload = [
    {"s": d["slug"], "n": d["name"], "d": [re.sub(r"\s+", " ", x).strip() for x in d["docs"]]}
    for d in DATA
]

PAGE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>فاحص المستندات — ناقصك إيه قبل ما تروح؟ | خِدْمَتي AI</title>
<meta name="description" content="اختار الخدمة الحكومية، علّم على الورق اللي معاك، وشوف ناقصك إيه قبل ما تروح المكتب. __COUNT__ خدمة و__DOCS__ ورقة مطلوبة — مجاني وبدون حساب.">
<link rel="canonical" href="__BASE__/doc-checker.html">
<meta property="og:title" content="فاحص المستندات — ناقصك إيه قبل ما تروح؟">
<meta property="og:description" content="__COUNT__ خدمة حكومية و__DOCS__ ورقة — علّم على اللي معاك واعرف الناقص في ثانية.">
<meta property="og:type" content="website">
<meta property="og:url" content="__BASE__/doc-checker.html">
<meta property="og:image" content="__BASE__/assets/brand-logo.jpeg">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="فاحص المستندات — ناقصك إيه قبل ما تروح؟">
<meta name="twitter:description" content="__COUNT__ خدمة حكومية و__DOCS__ ورقة — علّم على اللي معاك واعرف الناقص.">
<meta name="twitter:image" content="__BASE__/assets/brand-logo.jpeg">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"فاحص المستندات — خِدْمَتي AI","description":"أداة تقولك الأوراق الناقصة لأي خدمة حكومية مصرية","url":"__BASE__/doc-checker.html","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","inLanguage":"ar-EG","offers":{"@type":"Offer","price":"0","priceCurrency":"EGP"}}
</script>
<style>
*{box-sizing:border-box}
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0;min-height:100vh}
a{color:#e6c258}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{text-decoration:none;font-weight:800;font-size:15px}
.header .brand{color:#fff;font-weight:900;font-size:17px}
.header .brand span{color:#e6c258}
.wrap{max-width:760px;margin:0 auto;padding:0 16px 60px}
.hero{padding:26px 2px 14px;text-align:center}
.hero h1{font-size:24px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.45}
.hero h1 span{color:#e6c258}
.hero p{font-size:14px;color:#8ea0c4;margin:0;line-height:1.8}
.field{margin-top:16px}
.field label{display:block;font-size:13px;font-weight:700;color:#a9b8d4;margin-bottom:6px}
select,input[type=search]{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #24406b;background:#12203c;color:#e8eef8;font-family:Cairo,sans-serif;font-size:14px;font-weight:600}
select:focus,input[type=search]:focus{outline:2px solid #e6c258;outline-offset:1px}
.progress{margin-top:18px;background:#12203c;border:1px solid #24406b;border-radius:14px;padding:14px 16px}
.progress-top{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:#8ea0c4;font-weight:700}
.progress-top b{font-size:18px;color:#e6c258}
.track{height:8px;background:#1b2f52;border-radius:6px;margin-top:10px;overflow:hidden}
.fill{height:100%;width:0;background:linear-gradient(90deg,#e6c258,#d4a843);border-radius:6px;transition:width .25s ease}
.docs{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.doc{display:flex;gap:10px;align-items:flex-start;background:#162847;border:1px solid #1e3556;border-radius:12px;padding:12px 14px;cursor:pointer}
.doc.on{border-color:#10b981;background:#12313a}
.doc input{margin:3px 0 0;width:18px;height:18px;accent-color:#10b981;flex:0 0 auto}
.doc span{font-size:13.5px;line-height:1.8;color:#dbe4f2}
.doc.on span{color:#9fe8cf}
.summary{margin-top:16px;border-radius:14px;padding:14px 16px;border:1px solid #24406b;background:#12203c}
.summary h2{font-size:14.5px;margin:0 0 8px;color:#fff;font-weight:800}
.summary ul{margin:0;padding-inline-start:18px}
.summary li{font-size:13.5px;line-height:1.9;color:#f0b9b0}
.summary.ok{border-color:#10b981;background:#0f2e2a}
.summary.ok p{margin:0;color:#9fe8cf;font-size:13.5px;line-height:1.8}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.btn{flex:1 1 160px;text-align:center;padding:13px 16px;border-radius:30px;font-family:Cairo,sans-serif;font-size:14px;font-weight:800;cursor:pointer;border:none;text-decoration:none}
.btn-main{background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D}
.btn-ghost{background:transparent;border:1px solid #24406b;color:#cbd7ea}
.empty{text-align:center;color:#7e8fb0;font-size:13.5px;padding:26px 0;line-height:1.9}
.foot{margin-top:26px;font-size:12px;color:#5a6a8a;line-height:1.9;text-align:center}
.foot a{color:#8ea0c4;text-decoration:none}
@media print{
  .header,.hero,.field,.progress,.actions,.foot,.summary ul{display:none!important}
  body{background:#fff;color:#000}
  .doc{border:1px solid #ccc;background:#fff;color:#000;break-inside:avoid}
  .doc span{color:#000}
  .doc input{display:none}
  .doc:not(.on)::before{content:"☐ ";font-size:16px}
  .doc.on::before{content:"✓ ";font-size:16px;color:#070}
  .summary{display:block;border:1px solid #000;background:#fff;color:#000}
}
</style>
</head>
<body>
<div class="header"><a href="index.html">← الرئيسية</a><span class="brand">خِدْمَتي <span>AI</span></span></div>
<div class="wrap">
  <div class="hero">
    <h1>ناقصك إيه <span>قبل ما تروح</span>؟</h1>
    <p>اختار الخدمة، علّم على الورق اللي معاك، واعرف الناقص في ثانية — __COUNT__ خدمة و__DOCS__ ورقة.</p>
  </div>

  <div class="field">
    <label for="q">دوّر على الخدمة</label>
    <input type="search" id="q" placeholder="اكتب اسم الخدمة… مثلًا: رخصة، سجل تجاري، معاش" autocomplete="off">
  </div>
  <div class="field">
    <label for="svc">الخدمة</label>
    <select id="svc"><option value="">اختار خدمة…</option></select>
  </div>

  <div class="progress" id="progress" style="display:none">
    <div class="progress-top"><span>معاك</span><span><b id="okCount">0</b> / <span id="allCount">0</span></span></div>
    <div class="track"><div class="fill" id="fill"></div></div>
  </div>

  <div class="docs" id="docs"></div>
  <div class="summary" id="summary" style="display:none"></div>

  <div class="actions" id="actions" style="display:none">
    <a class="btn btn-main" id="svcLink" href="#">افتح صفحة الخدمة ←</a>
    <button class="btn btn-ghost" onclick="window.print()">🖨️ اطبع اللستة</button>
  </div>

  <div class="empty" id="empty">اختار خدمة من القايمة وهنطلعلك أوراقها كلها.</div>

  <div class="foot">
    الأوراق مأخوذة من صفحات الخدمات على الموقع نفسه · <a href="services.html">كل الخدمات</a> · <a href="calc.html">حاسبة الرسوم</a><br>
    التأكيد النهائي من الجهة الرسمية قبل التقديم.
  </div>
</div>

<script>
var DATA = __DATA__;
var sel = document.getElementById('svc'),
    q = document.getElementById('q'),
    docsBox = document.getElementById('docs'),
    progress = document.getElementById('progress'),
    summary = document.getElementById('summary'),
    actions = document.getElementById('actions'),
    empty = document.getElementById('empty'),
    fill = document.getElementById('fill'),
    okCount = document.getElementById('okCount'),
    allCount = document.getElementById('allCount'),
    svcLink = document.getElementById('svcLink'),
    current = null;

function fillSelect(list){
  sel.innerHTML = '<option value="">اختار خدمة…</option>';
  list.forEach(function(d, i){
    var o = document.createElement('option');
    o.value = d.s; o.textContent = d.n;
    sel.appendChild(o);
  });
}
fillSelect(DATA);

q.addEventListener('input', function(){
  var term = q.value.trim();
  if(!term){ fillSelect(DATA); return; }
  fillSelect(DATA.filter(function(d){ return d.n.indexOf(term) > -1 || d.d.join(' ').indexOf(term) > -1; }));
});

sel.addEventListener('change', function(){
  var slug = sel.value;
  current = DATA.filter(function(d){ return d.s === slug; })[0];
  if(!current){ reset(); return; }
  render();
});

function reset(){
  docsBox.innerHTML = ''; progress.style.display = 'none';
  summary.style.display = 'none'; actions.style.display = 'none';
  empty.style.display = 'block';
}

function render(){
  empty.style.display = 'none';
  docsBox.innerHTML = '';
  progress.style.display = 'block';
  actions.style.display = 'flex';
  summary.style.display = 'block';
  allCount.textContent = current.d.length;
  svcLink.href = 'services/' + current.s;
  current.d.forEach(function(text, i){
    var lab = document.createElement('label');
    lab.className = 'doc';
    lab.innerHTML = '<input type="checkbox" data-i="' + i + '"><span></span>';
    lab.querySelector('span').textContent = text;
    lab.querySelector('input').addEventListener('change', function(e){
      lab.classList.toggle('on', e.target.checked);
      update();
    });
    docsBox.appendChild(lab);
  });
  update();
}

function update(){
  var boxes = docsBox.querySelectorAll('input'),
      have = [], miss = [];
  [].forEach.call(boxes, function(b, i){
    (b.checked ? have : miss).push(current.d[i]);
  });
  var pct = current.d.length ? Math.round(have.length * 100 / current.d.length) : 0;
  okCount.textContent = have.length;
  fill.style.width = pct + '%';

  if(miss.length === 0){
    summary.className = 'summary ok';
    summary.innerHTML = '<h2>تمام — معاك كل الأوراق ✅</h2><p>راجع إن كل ورقة سارية ومطابقة للاسم، وبعدها اتحرك.</p>';
  } else {
    summary.className = 'summary';
    summary.innerHTML = '<h2>ناقصك ' + miss.length + ' من ' + current.d.length + '</h2><ul>'
      + miss.map(function(m){ return '<li>' + m + '</li>'; }).join('') + '</ul>';
  }
}

reset();
</script>
</body>
</html>
"""

html = (
    PAGE.replace("__DATA__", json.dumps(payload, ensure_ascii=False))
    .replace("__COUNT__", str(len(payload)))
    .replace("__DOCS__", str(sum(len(p["d"]) for p in payload)))
    .replace("__BASE__", BASE)
)
(ROOT / "doc-checker.html").write_text(html, encoding="utf-8")
print(f"اتبنى doc-checker.html · {len(payload)} خدمة · {sum(len(p['d']) for p in payload)} ورقة")
