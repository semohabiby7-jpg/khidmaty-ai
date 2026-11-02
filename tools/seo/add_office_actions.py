#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يضيف على صفحات المكاتب (888) : زر «افتح الاتجاهات» + «دوّر بالعنوان» + «بلّغ عن تصحيح»
+ سطر «آخر تحديث للبيانات».
ويضيف على صفحات المحافظات (27) : زر «أقرب مكتب ليا» بالـGPS (أقرب ٣ مكاتب).

كل السكربت idempotent: لو الوسم موجود مش بيكرّره.
"""
import re, json, glob, os, urllib.parse, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

DATA_DATE = "٢٠ أكتوبر ٢٠٢٦"   # تاريخ آخر تحديث لملف بيانات المكاتب (git log data/offices.js)

CSS = """
/* --- أزرار المكتب (اتجاهات / بلاغ / آخر تحديث) --- */
.office-actions{max-width:800px;margin:0 auto 22px;padding:0 20px}
.oa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.oa-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:14px;font-weight:800;font-size:13.5px;text-decoration:none;font-family:Cairo,sans-serif;border:1px solid #1e3556;background:#162847;color:#e8eef8;text-align:center;line-height:1.5}
.oa-btn.primary{background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;border-color:transparent}
.oa-btn:hover{border-color:#e6c258;color:#e6c258}
.oa-btn.primary:hover{color:#0F1E3D;border-color:transparent}
.oa-note{margin:10px 0 0;font-size:12px;color:#8ea0c4;line-height:1.9;text-align:center}
.oa-note b{color:#c8d4e8;font-weight:700}
"""

NEARME_CSS = """
/* --- أقرب مكتب ليا (GPS) --- */
.nearme{max-width:800px;margin:0 auto 18px;padding:0 20px}
.nm-box{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:16px}
.nm-btn{width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;font-family:Cairo,sans-serif;font-weight:900;font-size:15px;cursor:pointer}
.nm-btn:disabled{opacity:.6;cursor:default}
.nm-hint{font-size:12px;color:#8ea0c4;margin:8px 0 0;line-height:1.8;text-align:center}
.nm-out{margin-top:12px;display:none}
.nm-out.on{display:block}
.nm-item{display:block;background:#0f1e3d;border:1px solid #1e3556;border-radius:12px;padding:12px 14px;margin-top:8px;text-decoration:none;color:#e8eef8}
.nm-item:hover{border-color:#e6c258}
.nm-item .nm-name{font-size:14px;font-weight:800;color:#fff;display:block;line-height:1.5}
.nm-item .nm-meta{font-size:12px;color:#8ea0c4;margin-top:4px;display:block}
.nm-item .nm-dist{color:#e6c258;font-weight:800}
.nm-err{font-size:13px;color:#ffb4b4;margin-top:10px;line-height:1.8}
"""


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def add_css(html, css, marker):
    if marker in html:
        return html
    return html.replace("</style>", css + "\n</style>", 1)


# ---------------------------- صفحات المكاتب ----------------------------
def patch_office_page(path, stats):
    html = read(path)
    if 'class="oa-grid"' in html:
        stats["office_skipped"] += 1
        return
    m = re.search(r'"latitude":\s*([\d.]+),\s*"longitude":\s*([\d.]+)', html)
    if not m:
        stats["office_no_geo"] += 1
        return
    lat, lng = m.group(1), m.group(2)
    name = re.search(r"<h1>(.*?)</h1>", html, re.S)
    name = re.sub(r"<[^>]+>", "", name.group(1)).strip() if name else ""
    gov = re.search(r'"addressRegion":\s*"([^"]+)"', html)
    gov = gov.group(1) if gov else ""
    addr = re.search(r'<span class="label">العنوان</span><span class="value">(.*?)</span>', html, re.S)
    addr = re.sub(r"<[^>]+>", "", addr.group(1)).strip() if addr else ""

    q = urllib.parse.quote(f"{name} {gov} مصر".strip())
    subj = urllib.parse.quote(f"تصحيح بيانات مكتب: {name}")
    gmaps_dir = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"
    gmaps_q = f"https://www.google.com/maps/search/?api=1&query={q}"

    block = f"""
<div class="office-actions">
  <div class="oa-grid">
    <a class="oa-btn primary" href="{gmaps_dir}" target="_blank" rel="noopener">📍 افتح الاتجاهات</a>
    <a class="oa-btn" href="{gmaps_q}" target="_blank" rel="noopener">🔎 دوّر بالاسم والعنوان</a>
    <a class="oa-btn" href="../../../contact.html?subject={subj}">✏️ بلّغ عن تصحيح</a>
  </div>
  <p class="oa-note">🗓️ <b>آخر تحديث للبيانات: {DATA_DATE}</b> — الدليل مبني على بيانات رسمية منقولة، ومش بيتحدّث تلقائيًا.<br>
  📍 الإحداثيات تقريبية على مستوى الحي، فالاتجاهات نقطة بداية مش عنوان نهائي — اتأكد بالعنوان قبل ما تروح.</p>
</div>
"""

    # نحط البلوك بعد خريطة المكتب
    mm = re.search(r'<div class="map-embed">.*?</div>', html, re.S)
    if mm:
        html = html[: mm.end()] + block + html[mm.end():]
        placed = "map"
    else:
        stats["office_no_anchor"] += 1
        return
    html = add_css(html, CSS, "أزرار المكتب")
    write(path, html)
    stats["office_patched"] += 1
    stats.setdefault("_placed", set()).add(placed)


# ---------------------------- صفحات المحافظات ----------------------------
def office_lookup():
    idx = {}
    for f in glob.glob("offices/*/*/*.html"):
        rel = os.path.relpath(f, "offices")  # civil/qahra/ayn-shms.html
        html = read(f)
        m = re.search(r'"latitude":\s*([\d.]+),\s*"longitude":\s*([\d.]+)', html)
        if not m:
            continue
        nm = re.search(r"<h1>(.*?)</h1>", html, re.S)
        idx[rel] = {
            "n": re.sub(r"<[^>]+>", "", nm.group(1)).strip() if nm else rel,
            "lat": float(m.group(1)),
            "lng": float(m.group(2)),
        }
    return idx


def patch_gov_page(path, idx, stats):
    html = read(path)
    if 'id="nmBtn"' in html:
        stats["gov_skipped"] += 1
        return
    hrefs = re.findall(r'<a class="row" href="([^"]+)"', html)
    items, seen = [], set()
    for h in hrefs:
        if h in seen:
            continue
        seen.add(h)
        o = idx.get(h)
        if not o:
            continue
        items.append({"n": o["n"], "u": h, "lat": o["lat"], "lng": o["lng"]})
    if not items:
        stats["gov_empty"] += 1
        return

    payload = json.dumps(items, ensure_ascii=False, separators=(",", ":"))

    block = f"""
<div class="nearme">
  <div class="nm-box">
    <button class="nm-btn" id="nmBtn" type="button">📍 أقرب مكتب ليا</button>
    <p class="nm-hint">بنستخدم موقعك من المتصفح — مش بنخزّنه ولا بنبعته. المسافات على الهواء (خط مستقيم) والإحداثيات تقريبية على مستوى الحي.</p>
    <div class="nm-out" id="nmOut" aria-live="polite"></div>
  </div>
</div>
<script>
(function(){{
  var LIST = {payload};
  var btn = document.getElementById('nmBtn');
  var out = document.getElementById('nmOut');
  function km(a,b,c,d){{
    var R=6371, p=Math.PI/180;
    var dLat=(c-a)*p, dLng=(d-b)*p;
    var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 2*R*Math.asin(Math.sqrt(x));
  }}
  function show(msg){{ out.className='nm-out on'; out.innerHTML=msg; }}
  btn.addEventListener('click', function(){{
    if(!navigator.geolocation){{ show('<p class="nm-err">متصفحك مش بيدعم تحديد الموقع. جرّب تفتح الصفحة من موبايل حديث.</p>'); return; }}
    btn.disabled = true; btn.textContent = '📍 بنحدد موقعك...';
    navigator.geolocation.getCurrentPosition(function(pos){{
      var la=pos.coords.latitude, ln=pos.coords.longitude;
      var res = LIST.map(function(o){{ return {{o:o, d:km(la,ln,o.lat,o.lng)}}; }})
                    .sort(function(a,b){{ return a.d-b.d; }}).slice(0,3);
      var html = '<p class="nm-hint" style="margin:0 0 4px">أقرب ٣ مكاتب لموقعك الحالي:</p>';
      res.forEach(function(r){{
        html += '<a class="nm-item" href="'+r.o.u+'"><span class="nm-name">'+r.o.n+'</span>'+
                '<span class="nm-meta"><span class="nm-dist">~'+r.d.toFixed(1)+' كم</span> · اضغط للتفاصيل والاتجاهات</span></a>';
      }});
      html += '<p class="nm-hint">المسافة خط مستقيم — الطريق الفعلي أطول شوية.</p>';
      show(html);
      btn.disabled = false; btn.textContent = '📍 حدّث أقرب مكتب';
    }}, function(err){{
      var m = err && err.code === 1 ? 'لازم تسمح للموقع إنه يقرا مكانك من إعدادات المتصفح.' : 'ما قدرناش نحدد موقعك — جرّب تاني في مكان مفتوح.';
      show('<p class="nm-err">'+m+'</p>');
      btn.disabled = false; btn.textContent = '📍 جرّب تاني';
    }}, {{enableHighAccuracy:true, timeout:10000, maximumAge:60000}});
  }});
}})();
</script>
"""

    # قبل أول كارت قسم (بعد بلوك الإحصائيات)
    m = re.search(r'<section class="card">', html)
    if m:
        html = html[: m.start()] + block + html[m.start():]
    else:
        stats["gov_no_anchor"] += 1
        return
    html = add_css(html, NEARME_CSS, "أقرب مكتب ليا (GPS)")
    write(path, html)
    stats["gov_patched"] += 1


def main():
    stats = {"office_patched": 0, "office_skipped": 0, "office_no_geo": 0,
             "office_no_anchor": 0, "gov_patched": 0, "gov_skipped": 0,
             "gov_empty": 0, "gov_no_anchor": 0}

    for f in sorted(glob.glob("offices/*/*/*.html")):
        patch_office_page(f, stats)

    idx = office_lookup()
    print(f"مكاتب مفهرسة: {len(idx)}")

    gov_pages = [p for p in sorted(glob.glob("offices/*.html"))
                 if "دليل مكاتب" in read(p)]
    for p in gov_pages:
        patch_gov_page(p, idx, stats)

    stats.pop("_placed", None)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print("صفحات محافظات: ", len(gov_pages))


if __name__ == "__main__":
    main()
