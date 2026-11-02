# -*- coding: utf-8 -*-
"""يبني docs-finder.html من data/docs-finder.json

باحث المستندات: المستخدم يكتب طلبه بالعامية، والصفحة تطلّع الخدمة + الأوراق
(أصل/صورة/أصل وصورة/صور/اتأكد) + الجهة + الرسوم + المدة. كل بيان منقول من صفحات services/*.html.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data/docs-finder.json"
OUT = ROOT / "docs-finder.html"

CSS = """
*{box-sizing:border-box}
body{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}
.wrap{max-width:760px;margin:0 auto;padding:0 16px 60px}
.hero{text-align:center;padding:24px 4px 14px}
.hero h1{font-size:24px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.4}
.hero h1 span{color:#e6c258}
.hero p{font-size:13.5px;color:#8ea0c4;margin:0;line-height:1.9}
.search{margin-top:16px;position:relative}
.search input{width:100%;padding:16px 18px;border-radius:16px;border:1px solid #24395c;background:#162847;color:#e8eef8;font-family:Cairo,sans-serif;font-size:15px;line-height:1.6}
.search input::placeholder{color:#5f7093}
.search input:focus{outline:none;border-color:#e6c258;box-shadow:0 0 0 3px rgba(230,194,88,.12)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.chip{padding:8px 13px;border-radius:20px;border:1px solid #24395c;background:#132444;color:#c8d4e8;font-family:Cairo,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;line-height:1.6}
.chip:hover{border-color:#e6c258;color:#e6c258}
.count{margin-top:16px;font-size:12.5px;color:#8ea0c4}
.count b{color:#e6c258}
.res{margin-top:10px;display:flex;flex-direction:column;gap:16px}
.card{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:18px;padding:16px}
.card h3{font-size:16.5px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.55}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.cat{display:inline-block;font-size:11.5px;font-weight:800;color:#e6c258;background:rgba(230,194,88,.1);border:1px solid rgba(230,194,88,.35);border-radius:20px;padding:2px 10px}
.auth{font-size:11.5px;color:#8ea0c4}
/* خانة أصل / صورة */
.kindbox{background:rgba(230,194,88,.08);border:1px solid rgba(230,194,88,.3);border-radius:14px;padding:10px 12px;margin-bottom:12px}
.kindbox-h{font-size:11.5px;font-weight:900;color:#e6c258;margin-bottom:8px}
.kchips{display:flex;flex-wrap:wrap;gap:7px}
.kc{font-size:11.5px;font-weight:900;border-radius:8px;padding:3px 9px;border:1px solid transparent;line-height:1.7}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}
.fact{background:#0f1e3d;border:1px solid #1e3556;border-radius:12px;padding:9px 11px}
.fact .k{display:block;font-size:10.5px;font-weight:800;color:#8ea0c4;margin-bottom:2px}
.fact .v{display:block;font-size:12.5px;font-weight:800;color:#e8eef8;line-height:1.65}
.fact .v.none{color:#7d8caa;font-weight:700}
.docs-h{font-size:12.5px;font-weight:900;color:#e6c258;margin:0 0 6px}
.lege{font-size:11.5px;color:#8ea0c4;line-height:1.8;margin:0 0 8px}
.dot{display:inline-flex;gap:6px;flex-wrap:wrap}
.doc{display:flex;gap:9px;align-items:flex-start;padding:9px 11px;border:1px solid #1e3556;border-radius:11px;background:#12203c;margin-bottom:7px}
.doc .kind{min-width:66px;text-align:center;font-size:10.5px;font-weight:900;padding:3px 4px;border-radius:8px;flex-shrink:0;margin-top:1px;white-space:nowrap;border:1px solid transparent;line-height:1.6}
.k-orig{background:#e6c258;color:#0F1E3D;border-color:#e6c258}
.k-copy{background:#2f7fbf;color:#fff;border-color:#2f7fbf}
.k-both{background:#7c5cd6;color:#fff;border-color:#7c5cd6}
.k-photo{background:#14807a;color:#fff;border-color:#14807a}
.k-none{background:#1b2f52;color:#a9b8d4;border-color:#2f4a76}
.doc .t{font-size:13.5px;line-height:1.75;color:#e8eef8;flex:1;min-width:0}
.links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.links a{flex:1;min-width:135px;text-align:center;padding:11px 12px;border-radius:12px;font-size:13px;font-weight:800;text-decoration:none;border:1px solid #3a5580;background:#162847;color:#e8eef8}
.links a.primary{background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;border-color:transparent}
.hint{margin-top:10px;font-size:12px;color:#8ea0c4;line-height:1.9}
.empty{margin-top:16px;border:1px dashed #24395c;border-radius:16px;padding:22px 18px;text-align:center;color:#8ea0c4;font-size:13.5px;line-height:2}
.empty b{color:#fff}
.note{margin-top:28px;border-top:1px solid #1e3556;padding-top:16px}
.note h2{font-size:15px;color:#fff;font-weight:900;margin:0 0 8px}
.note p{font-size:12.5px;color:#a9b8d4;line-height:1.95;margin:0 0 8px}
.footer{text-align:center;padding:26px 20px;color:#5a6a8a;font-size:12.5px;line-height:2;border-top:1px solid #16274a;margin-top:26px}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
@media(max-width:430px){.hero h1{font-size:20px}.facts{grid-template-columns:1fr}.doc .kind{min-width:62px}}
"""

JS = r"""
var Q = document.getElementById('q');
var OUT = document.getElementById('res');
var CNT = document.getElementById('count');
var STOP = ['عايز','عاوز','محتاج','ابغي','اطلع','استخرج','اجدد','جدد','اعمل','افتح','اقدم','مقدم','علي','على','من','في','عن','ازاي','ازاى','ايه','الى','رقم','حاجه','كده','خالص','مفيش','مش','انا','عشان','عندي','بس'];
var SYN = {
  'عربيه':['سياره','مركبه'], 'عربيات':['سياره','مركبه'],
  'باسبور':['جواز','سفر'], 'ضريبي':['ضريبه','ضرايب'],
  'ميلاد':['مولود'], 'فقدت':['بدل','فاقد'], 'ضايع':['بدل','فاقد'], 'ضاعت':['بدل','فاقد'], 'اتسرقت':['بدل','فاقد']
};
function norm(s){
  s = (s||'').toLowerCase();
  s = s.replace(/[\u0623\u0625\u0622]/g,'ا').replace(/\u0629/g,'ه').replace(/[\u0649\u0626]/g,'ي').replace(/\u0624/g,'و');
  s = s.replace(/[\u064B-\u0652]/g,'');
  s = s.replace(/[^\u0621-\u064Aa-z0-9\s]/g,' ');
  return s.split(/\s+/).filter(Boolean).map(function(w){
    if(w.length>4 && w.indexOf('لل')===0) return w.slice(2);
    if(w.length>4 && w.indexOf('بال')===0) return w.slice(3);
    if(w.length>3 && w.indexOf('ال')===0) return w.slice(2);
    return w;
  });
}
var IDX = DATA.map(function(s){
  var tt = norm(s.title), bb = norm((s.docs||[]).map(function(d){return d.t}).join(' '));
  var body = {}; bb.forEach(function(w){ body[w]=1; });
  return { s:s, tt:tt, tstr:tt.join(' '), body:body };
});
var DF = {}; IDX.forEach(function(r){
  var seen = {};
  r.tt.forEach(function(w){ seen[w]=1; });
  Object.keys(r.body).forEach(function(w){ seen[w]=1; });
  Object.keys(seen).forEach(function(w){ DF[w]=(DF[w]||0)+1; });
});
var QUAL = ['اطفال','دوليه','ممينه','خارج','اجنبيه'];
var N = IDX.length;
function idf(w){ return Math.log(1 + N/(DF[w]||1)); }
function search(q){
  var raw = norm(q).filter(function(w){ return w.length>1 && STOP.indexOf(w)===-1; });
  if(!raw.length) return [];
  var toks = raw.slice();
  raw.forEach(function(w){ (SYN[w]||[]).forEach(function(x){ if(toks.indexOf(x)<0) toks.push(x); }); });
  var scored = IDX.map(function(r){
    var st = 0, sb = 0, mt = 0;
    toks.forEach(function(t){
      if(r.tt.indexOf(t)>-1){ st += idf(t); mt++; }
      else if(r.body[t]) sb += idf(t);
    });
    if(st + sb === 0) return null;
    var cov = mt / toks.length;
    var sc = (3.2*st + sb) * (0.3 + 0.7*cov) / Math.sqrt(Math.max(2, r.tt.length));
    if(r.tstr.indexOf(toks.join(' '))>-1) sc += 3;
    var extra = r.tt.filter(function(w){ return QUAL.indexOf(w)>-1 && toks.indexOf(w)<0; }).length;
    if(extra) sc *= Math.max(0.45, 0.9 - 0.18*extra);
    return { s:r.s, sc:sc };
  }).filter(Boolean);
  scored.sort(function(a,b){ return b.sc-a.sc; });
  if(!scored.length) return [];
  var top = scored[0].sc;
  return scored.filter(function(x){ return x.sc >= Math.max(0.9, top*0.22); })
               .slice(0,6).map(function(x){ return x.s; });
}

/* ---------- عرض الكارت ---------- */
var KORDER = ['أصل','صورة','أصل وصورة','صور','غير موضّح'];
var KCLS = {'أصل':'k-orig','صورة':'k-copy','أصل وصورة':'k-both','صور':'k-photo','غير موضّح':'k-none'};
var KSHORT = {'أصل':'أصل','صورة':'صورة','أصل وصورة':'أصل+صورة','صور':'صور','غير موضّح':'اتأكد'};
function esc(s){
  return String(s==null?'':s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}
function kindCounts(docs){
  var c = {};
  (docs||[]).forEach(function(d){ var k = d.k || 'غير موضّح'; c[k] = (c[k]||0)+1; });
  return c;
}
function card(s){
  var docs = s.docs || [];
  var c = kindCounts(docs);
  var chips = KORDER.filter(function(k){ return c[k]; }).map(function(k){
    return '<span class="kc ' + KCLS[k] + '">' + KSHORT[k] + ' · ' + c[k] + '</span>';
  }).join('');
  var rows = docs.map(function(d){
    var k = d.k || 'غير موضّح';
    return '<div class="doc"><span class="kind ' + KCLS[k] + '">' + KSHORT[k] + '</span>'
         + '<span class="t">' + esc(d.t) + '</span></div>';
  }).join('');
  var fee = s.fee || '', dur = s.dur || '';
  return '<article class="card">'
    + '<h3>' + esc(s.title) + '</h3>'
    + '<div class="meta"><span class="cat">' + esc(s.cat) + '</span>'
    + (s.auth ? '<span class="auth">' + esc(s.auth) + '</span>' : '') + '</div>'
    + '<div class="kindbox"><div class="kindbox-h">الورق المطلوب: أصل ولا صورة؟</div>'
    + '<div class="kchips">' + chips + '</div></div>'
    + '<div class="facts">'
    + '<div class="fact"><span class="k">الرسوم</span><span class="v' + (fee ? '' : ' none') + '">'
    + esc(fee || 'مش موضّحة في الدليل') + '</span></div>'
    + '<div class="fact"><span class="k">المدة</span><span class="v' + (dur ? '' : ' none') + '">'
    + esc(dur || 'مش موضّحة في الدليل') + '</span></div>'
    + '</div>'
    + '<div class="docs-h">الأوراق المطلوبة (' + docs.length + ')</div>'
    + '<p class="lege">«اتأكد» = الدليل مذكرش أصل ولا صورة — خُد الأصل معاك احتياطي.</p>'
    + rows
    + '<div class="links"><a class="primary" href="' + esc(s.link) + '">التفاصيل الكاملة</a>'
    + '<a href="offices.html">أقرب مكتب</a></div>'
    + '</article>';
}

function render(q){
  if(!q){
    OUT.innerHTML = '';
    CNT.innerHTML = '٨٧ خدمة · ٥٠٣ ورقة — اكتب طلبك فوق أو اختار مثال';
    return;
  }
  var list = search(q);
  if(!list.length){
    OUT.innerHTML = '<div class="empty">مفيش خدمة مطابقة لـ«<b>' + esc(q) + '</b>» في الدليل.<br>جرّب كلمة أقصر زي «بطاقة» أو «رخصة» أو «معاش».</div>';
    CNT.innerHTML = '';
    return;
  }
  CNT.innerHTML = 'لقينا <b>' + list.length + '</b> خدمة قريبة من طلبك';
  OUT.innerHTML = list.map(card).join('');
}
Q.addEventListener('input', function(){ render(Q.value.trim()); });
document.querySelectorAll('.chip').forEach(function(c){
  c.addEventListener('click', function(){ Q.value = c.textContent.trim(); render(Q.value); Q.focus(); });
});
render('');
"""

HEAD = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>باحث المستندات — اكتب اللي محتاجه وهات الورق | خِدْمَتي AI</title>
<meta name="description" content="اكتب طلبك بالعامية: «عايز أطلع بطاقة رقم قومي» — باحث المستندات يقولك الأوراق المطلوبة (أصل ولا صورة)، والجهة المسؤولة، والرسوم والمدة لو معلنة رسميًا. ٨٧ خدمة و٥٠٣ ورقة.">
<link rel="canonical" href="https://khidmatyai.com/docs-finder.html">
<meta property="og:title" content="باحث المستندات — اكتب طلبك بالعامية">
<meta property="og:description" content="الأوراق المطلوبة، أصل ولا صورة، الجهة، الرسوم، والمدة — لكل خدمة حكومية.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://khidmatyai.com/docs-finder.html">
<meta property="og:image" content="https://khidmatyai.com/assets/brand-logo.jpeg">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://khidmatyai.com/assets/brand-logo.jpeg">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"باحث المستندات — خِدْمَتي AI","description":"باحث يطلّع المستندات المطلوبة والجهة والرسوم والمدة لأي خدمة حكومية من ٨٧ خدمة","url":"https://khidmatyai.com/docs-finder.html","applicationCategory":"GovernmentService","operatingSystem":"Any","inLanguage":"ar-EG","offers":{"@type":"Offer","price":"0","priceCurrency":"EGP"}}
</script>
<style>__CSS__</style>
</head>
<body>
<div class="header"><a href="index.html">← الرئيسية</a><span style="color:#fff;font-weight:900;font-size:16px">خِدْمَتي <span style="color:#e6c258">AI</span></span></div>
<div class="wrap">
  <div class="hero">
    <h1>باحث <span>المستندات</span></h1>
    <p>اكتب اللي محتاجه بكلامك العادي — نقولك الورق المطلوب، أصل ولا صورة، الجهة، والرسوم والمدة</p>
  </div>

  <div class="search">
    <input id="q" type="search" autocomplete="off" aria-label="اكتب طلبك" placeholder="مثال: عايز أطلع بطاقة رقم قومي">
  </div>
  <div class="chips">
    <button class="chip" type="button">عايز أطلع بطاقة رقم قومي</button>
    <button class="chip" type="button">عايز أفتح ملف ضريبي</button>
    <button class="chip" type="button">عايز أقدم على معاش</button>
    <button class="chip" type="button">عايز أعمل سجل تجاري</button>
    <button class="chip" type="button">عايز أجدد رخصة عربية</button>
  </div>
  <p class="count" id="count"></p>
  <div class="res" id="res" aria-live="polite"></div>

  <div class="note">
    <h2>البيانات دي جاية منين؟</h2>
    <p>كل خدمة هنا مبنية على صفحة الدليل الخاصة بيها في الموقع — الأوراق والرسوم والمدة منقولة منها بالنص. لو خانة مكتوب فيها «مش موضّحة في الدليل» فده معناه إن المصدر مش ناشرها، مش إنها مجانية أو فورية.</p>
    <p>الرسوم المعلّمة بـ«تقديرية» أو «من» مش رقم نهائي — السعر بيتحدد في المكتب حسب الحالة. راجع الجهة قبل ما تدفع.</p>
    <p>شارات الورق: <b style="color:#e6c258">أصل</b> · <b style="color:#7fb3e0">صورة</b> · <b style="color:#b9a6f0">أصل وصورة</b> · <b style="color:#5fd0c8">صور</b> (صور شخصية تجيبها معاك) · <b style="color:#a9b8d4">اتأكد</b> (الدليل مذكرش — خُد الأصل احتياطي). كلها مأخوذة من نص صفحة الخدمة نفسها.</p>
  </div>
</div>
<div class="footer">
  <p>© ٢٠٢٦ خِدْمَتي AI — <a href="docs-checker.html">فاحص المستندات</a> · <a href="offices.html">دليل المكاتب</a> · <a href="services.html">كل الخدمات</a></p>
  <p style="font-size:11.5px;color:#3f4f6b">by m.ismail</p>
</div>
<script>var DATA = __DATA__;</script>
<script>__JS__</script>
</body>
</html>
"""


def main():
    rows = json.loads(DATA.read_text(encoding="utf-8"))["services"]
    html = (
        HEAD.replace("__CSS__", CSS)
        .replace("__DATA__", json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
        .replace("__JS__", JS)
    )
    OUT.write_text(html, encoding="utf-8")
    print("docs-finder.html:", len(html), "حرف |", len(rows), "خدمة")


if __name__ == "__main__":
    main()
