#!/usr/bin/env python3
"""بناء صفحة فاحص المستندات docs-checker.html

بيقرا tools/documents-checker/docs-data.json (مستخرج من صفحات الخدمات)
وبيحطه جوه الصفحة نفسها عشان تشتغل من غير نت بعد أول تحميل.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "tools/documents-checker/docs-data.json").read_text(encoding="utf-8"))

# ترتيب أبجدي عربي مبسّط على الاسم
services = [{"slug": k, **v} for k, v in DATA.items()]
services.sort(key=lambda s: s["name"])

payload = json.dumps(services, ensure_ascii=False, separators=(",", ":"))
TOTAL_DOCS = sum(len(s["docs"]) for s in services)

HTML = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>فاحص المستندات — علّم على اللي معاك واعرف ناقصك إيه | خِدْمَتي AI</title>
<meta name="description" content="فاحص مستندات الخدمات الحكومية في مصر: اختار الخدمة، علّم على الأوراق اللي معاك، وشوف الناقص واطبع اللستة قبل ما تروح المكتب.">
<link rel="canonical" href="https://khidmatyai.com/docs-checker.html">
<meta property="og:title" content="فاحص المستندات — اعرف ناقصك إيه قبل ما تروح">
<meta property="og:description" content="٨٧ خدمة حكومية، و٥٠٣ ورقة مطلوبة. علّم على اللي معاك واعرف الناقص فورًا.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://khidmatyai.com/docs-checker.html">
<meta property="og:image" content="https://khidmatyai.com/assets/brand-logo.jpeg">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="فاحص المستندات — خِدْمَتي AI">
<meta name="twitter:description" content="علّم على الأوراق اللي معاك واعرف الناقص قبل ما تروح المكتب.">
<meta name="twitter:image" content="https://khidmatyai.com/assets/brand-logo.jpeg">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"فاحص المستندات","description":"أداة تفحص مستنداتك قبل زيارة المكتب الحكومي","url":"https://khidmatyai.com/docs-checker.html","applicationCategory":"UtilitiesApplication","operatingSystem":"Web","inLanguage":"ar-EG","offers":{"@type":"Offer","price":"0","priceCurrency":"EGP"}}</script>
<style>
*{box-sizing:border-box}
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}
.logo{color:#fff;font-weight:900;font-size:16px}
.logo i{color:#e6c258;font-style:normal}
.wrap{max-width:760px;margin:0 auto;padding:0 16px 60px}
.hero{text-align:center;padding:26px 0 8px}
.hero h1{font-size:23px;font-weight:900;margin:0 0 8px;line-height:1.5}
.hero h1 span{color:#e6c258}
.hero p{font-size:13.5px;color:#8ea0c4;margin:0;line-height:1.8}
.search-box{position:relative;margin:18px 0 10px}
.search-box input{width:100%;padding:14px 44px 14px 16px;border-radius:14px;border:1px solid #1e3556;background:#162847;color:#fff;font-family:Cairo,sans-serif;font-size:14px;outline:none}
.search-box input:focus{border-color:#e6c258}
.search-icon{position:absolute;top:14px;right:14px;font-size:16px;opacity:.6}
.hint{font-size:12px;color:#5a6a8a;margin:0 0 12px}
.list{display:flex;flex-direction:column;gap:8px;max-height:none}
.item{background:#162847;border:1px solid #1e3556;border-radius:12px;padding:13px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .2s,transform .2s}
.item:hover{border-color:#e6c258}
.item-name{font-size:14px;font-weight:700;flex:1;min-width:0;line-height:1.6}
.item-count{font-size:11.5px;color:#8ea0c4;background:rgba(255,255,255,.05);padding:3px 9px;border-radius:20px;white-space:nowrap}
.empty{text-align:center;color:#5a6a8a;font-size:13px;padding:18px 0}
.panel{display:none}
.panel.on{display:block}
.back{background:none;border:none;color:#e6c258;font-family:Cairo,sans-serif;font-size:13px;font-weight:800;padding:12px 0;cursor:pointer}
.ptitle{font-size:18px;font-weight:900;margin:0 0 4px;line-height:1.5}
.pbar{display:flex;align-items:center;gap:10px;margin:12px 0 16px}
.track{flex:1;height:8px;background:#1e3556;border-radius:4px;overflow:hidden}
.fill{height:100%;width:0;background:linear-gradient(90deg,#e6c258,#d4a843);transition:width .3s}
.stat-text{font-size:13px;font-weight:800;color:#e6c258;white-space:nowrap}
.check{display:flex;align-items:flex-start;gap:10px;background:#162847;border:1px solid #1e3556;border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer}
.check input{appearance:none;width:20px;height:20px;border:2px solid #3a5580;border-radius:6px;flex:0 0 auto;margin:1px 0 0;cursor:pointer;position:relative;background:transparent}
.check input:checked{background:#e6c258;border-color:#e6c258}
.check input:checked::after{content:"✓";position:absolute;inset:0;color:#0F1E3D;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center}
.check span{font-size:13.5px;line-height:1.7;color:#dbe4f2}
.check.done span{color:#7f90ad;text-decoration:line-through}
.result{margin-top:16px;border-radius:14px;padding:16px;display:none}
.result.on{display:block}
.result.all{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.45)}
.result.miss{background:rgba(230,194,88,.1);border:1px solid rgba(230,194,88,.45)}
.result h3{margin:0 0 8px;font-size:15px;font-weight:900}
.result ul{margin:8px 0 0;padding-inline-start:18px}
.result li{font-size:13px;line-height:1.9;color:#e8eef8}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.btn{flex:1;min-width:140px;border:none;border-radius:12px;padding:13px 16px;font-family:Cairo,sans-serif;font-size:13.5px;font-weight:800;cursor:pointer}
.btn-main{background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D}
.btn-ghost{background:#162847;border:1px solid #1e3556;color:#c8d4e8}
.note{font-size:12px;color:#5a6a8a;line-height:1.8;margin-top:18px}
.footer{text-align:center;padding:26px 18px;color:#5a6a8a;font-size:12.5px;line-height:2}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
@media print{
  .header,.hero,.search-box,.list,.hint,.back,.actions,.footer,.pbar{display:none!important}
  body{background:#fff;color:#000}
  .check{background:#fff;border:1px solid #ccc}
  .check span{color:#000}
  .result{border:1px solid #999}
}
</style>
</head>
<body>
<div class="header"><a href="index.html">← الرئيسية</a><span class="logo">خِدْمَتي <i>AI</i></span></div>
<div class="wrap">
  <div class="hero">
    <h1>فاحص <span>المستندات</span></h1>
    <p>اختار الخدمة، علّم على اللي معاك، واعرف اللي ناقصك قبل ما تتحرك من البيت.</p>
  </div>

  <div id="pickView">
    <div class="search-box">
      <input id="q" type="search" placeholder="اكتب اسم الخدمة… مثال: سجل تجاري" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <p class="hint" id="hint"></p>
    <div class="list" id="list"></div>
  </div>

  <div class="panel" id="panel">
    <button class="back" id="back">→ رجوع لكل الخدمات</button>
    <h2 class="ptitle" id="ptitle"></h2>
    <div class="pbar"><div class="track"><div class="fill" id="fill"></div></div><span class="stat-text" id="stat"></span></div>
    <div id="checks"></div>
    <div class="result" id="result"></div>
    <div class="actions">
      <button class="btn btn-main" id="print">🖨️ اطبع اللستة</button>
      <button class="btn btn-ghost" id="reset">↺ ابدأ من جديد</button>
    </div>
    <p class="note">اللستة دي مبنية على الأوراق المذكورة في صفحة الخدمة على الموقع. المكتب ممكن يطلب ورقة إضافية حسب حالتك، فخد الأصل معاك دايماً.</p>
  </div>

  <div class="footer">
    <p>© 2026 خِدْمَتي AI</p>
    <p><a href="services.html">كل الخدمات</a> · <a href="offices.html">المكاتب</a> · <a href="calc.html">حاسبة الرسوم</a></p>
  </div>
</div>

<script>
var SERVICES = __PAYLOAD__;
var TOTAL_DOCS = __TOTAL__;
var KEY = "docscheck:v1";
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { state = {}; }
var current = null;

var q = document.getElementById("q");
var listEl = document.getElementById("list");
var hintEl = document.getElementById("hint");
var pickView = document.getElementById("pickView");
var panel = document.getElementById("panel");

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

function norm(s) {
  return (s || "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[\\u064B-\\u0652]/g, "").trim();
}

function renderList(term) {
  var t = norm(term);
  var items = SERVICES.filter(function (s) {
    return !t || norm(s.name).indexOf(t) > -1 || norm(s.title).indexOf(t) > -1;
  });
  hintEl.textContent = t
    ? items.length + " خدمة مطابقة"
    : SERVICES.length + " خدمة · " + TOTAL_DOCS + " ورقة مطلوبة";
  if (!items.length) {
    listEl.innerHTML = '<div class="empty">مفيش خدمة بالاسم ده — جرّب كلمة أقصر</div>';
    return;
  }
  listEl.innerHTML = items.map(function (s) {
    var done = (state[s.slug] || []).length;
    var badge = done ? ("معاك " + done + "/" + s.docs.length) : (s.docs.length + " ورقة");
    return '<div class="item" data-slug="' + s.slug + '">' +
      '<span class="item-name">' + s.name + '</span>' +
      '<span class="item-count">' + badge + '</span></div>';
  }).join("");
}

function openService(slug) {
  var s = null;
  for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].slug === slug) s = SERVICES[i];
  if (!s) return;
  current = s;
  var picked = state[slug] || [];
  document.getElementById("ptitle").textContent = s.name;
  var html = s.docs.map(function (d, i) {
    var on = picked.indexOf(i) > -1;
    return '<label class="check' + (on ? " done" : "") + '">' +
      '<input type="checkbox" data-i="' + i + '"' + (on ? " checked" : "") + '>' +
      '<span>' + d + '</span></label>';
  }).join("");
  document.getElementById("checks").innerHTML = html;
  pickView.style.display = "none";
  panel.classList.add("on");
  window.scrollTo(0, 0);
  update();
}

function update() {
  if (!current) return;
  var boxes = document.querySelectorAll("#checks input");
  var picked = [];
  for (var i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) picked.push(Number(boxes[i].dataset.i));
    boxes[i].parentNode.classList.toggle("done", boxes[i].checked);
  }
  state[current.slug] = picked;
  save();
  var total = current.docs.length;
  var pct = total ? Math.round((picked.length / total) * 100) : 0;
  document.getElementById("fill").style.width = pct + "%";
  document.getElementById("stat").textContent = picked.length + " من " + total;

  var missing = [];
  current.docs.forEach(function (d, i) { if (picked.indexOf(i) === -1) missing.push(d); });

  var box = document.getElementById("result");
  if (!missing.length) {
    box.className = "result on all";
    box.innerHTML = "<h3>✅ معاك كل الأوراق</h3><p style='font-size:13px;margin:0;line-height:1.8'>اطبع اللستة وخد الأصل معاك، وابقى راجع إن حد من الأوراق قرب ينتهي.</p>";
  } else {
    box.className = "result on miss";
    box.innerHTML = "<h3>ناقصك " + missing.length + " من " + total + "</h3><ul>" +
      missing.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>";
  }
}

listEl.addEventListener("click", function (e) {
  var el = e.target.closest(".item");
  if (el) openService(el.dataset.slug);
});
document.getElementById("checks").addEventListener("change", update);
q.addEventListener("input", function () { renderList(q.value); });
document.getElementById("back").addEventListener("click", function () {
  panel.classList.remove("on");
  pickView.style.display = "block";
  renderList(q.value);
  window.scrollTo(0, 0);
});
document.getElementById("print").addEventListener("click", function () { window.print(); });
document.getElementById("reset").addEventListener("click", function () {
  if (!current) return;
  state[current.slug] = [];
  save();
  openService(current.slug);
});

renderList("");
</script>
</body>
</html>
"""

HTML = HTML.replace("__PAYLOAD__", payload).replace("__TOTAL__", str(TOTAL_DOCS))
(ROOT / "docs-checker.html").write_text(HTML, encoding="utf-8")
print(f"اتبنى: docs-checker.html — {len(services)} خدمة · {TOTAL_DOCS} ورقة")
