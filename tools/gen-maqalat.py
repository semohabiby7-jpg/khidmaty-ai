# -*- coding: utf-8 -*-
"""مولّد مقالات maqalat/ + صفحة الفهرس maqalat.html من ملف بيانات JSON."""
import json, os, sys, re, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = "https://khidmatyai.com/"
BRAND = "خِدْمَتي AI"

TPL = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="../auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} | خِدْمَتي AI</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{B}maqalat/{slug}.html">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../src/styles/main.css">
<meta property="og:title" content="{title} | خِدْمَتي AI">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{B}maqalat/{slug}.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:image" content="{B}assets/og-banner.png">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<style>
body{{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0;line-height:1.9}}
.wrap{{max-width:760px;margin:0 auto;padding:0 20px}}
.top{{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e3556}}
.top a{{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}}
.hero{{padding:34px 0 18px}}
.hero .kicker{{color:#e6c258;font-size:13px;font-weight:800;margin-bottom:8px}}
h1{{font-size:26px;font-weight:900;color:#fff;margin:0 0 12px;line-height:1.45}}
.meta{{color:#5a6a8a;font-size:13px}}
.lead{{color:#c0cee0;font-size:16px;font-weight:600;margin:18px 0 6px;padding-inline-start:14px;border-inline-start:3px solid #e6c258}}
h2{{font-size:19px;font-weight:800;color:#fff;margin:30px 0 10px}}
p{{color:#c8d4e8;font-size:15px;margin:10px 0}}
ul,ol{{color:#c8d4e8;font-size:15px;padding-inline-start:22px;margin:10px 0}}
li{{margin:7px 0}}
.box{{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:14px;padding:16px 18px;margin:18px 0}}
.box h3{{font-size:15px;color:#e6c258;margin:0 0 8px}}
.warn{{border-color:#5c3a1e;background:linear-gradient(145deg,#2a1f12,#171208)}}
.cta{{background:#162847;border:1px solid #1e3556;border-radius:14px;padding:16px;margin:22px 0;text-align:center}}
.cta a{{display:inline-block;margin-top:8px;background:#e6c258;color:#0F1E3D;font-weight:900;padding:10px 22px;border-radius:24px;text-decoration:none;font-size:14px}}
.faq{{border:1px solid #1e3556;border-radius:14px;margin:10px 0;background:#0f1e38}}
.faq summary{{padding:14px 16px;cursor:pointer;font-weight:700;color:#fff;font-size:14.5px;list-style:none}}
.faq summary::-webkit-details-marker{{display:none}}
.faq p{{padding:0 16px 14px;margin:0;color:#a9bad4;font-size:14px}}
.rel{{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 30px}}
.rel a{{background:#162847;border:1px solid #1e3556;color:#e6c258;text-decoration:none;font-size:13px;font-weight:700;padding:8px 14px;border-radius:20px}}
.books-strip{{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:16px 18px;margin:22px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}}
.books-strip b{{color:#e6c258;font-size:14px;display:block;margin-bottom:4px}}
.books-strip span{{color:#8ea0c4;font-size:13px;line-height:1.7}}
.books-strip a{{background:#e6c258;color:#0F1E3D;font-weight:900;padding:9px 20px;border-radius:24px;text-decoration:none;font-size:13.5px;white-space:nowrap;margin-inline-start:auto}}
footer{{text-align:center;color:#5a6a8a;font-size:13px;padding:30px 20px;border-top:1px solid #1e3556;margin-top:20px}}
footer a{{color:#e6c258;text-decoration:none;font-weight:700}}
</style>
<script type="application/ld+json">
{schema}
</script>
</head>
<body>
<div class="top">
  <a href="../index.html">← الرئيسية</a>
  <a href="../maqalat.html" style="font-size:13px">كل المقالات</a>
</div>
<div class="wrap">
  <div class="hero">
    <div class="kicker">{cat}</div>
    <h1>{title}</h1>
    <div class="meta">آخر تحديث: {date} · قراءة ~{mins} دقيقة</div>
    <p class="lead">{lead}</p>
  </div>
{body}
  <div class="books-strip"><div style="flex:1;min-width:180px"><b>📚 من كتبنا</b><span>سلسلة «قوة العقل» — كتب عملية بالعربي.</span></div><a href="../store.html">شوف الكتب ←</a></div>
</div>
<footer>خِدْمَتي AI — مرجعك في الخدمات الحكومية المصرية | <a href="../maqalat.html">مقالات أكتر</a></footer>
</body>
</html>
"""

def render(a, date):
    body = []
    body.append('  <h2>الأساسيات</h2>')
    for p in a['intro']:
        body.append(f'  <p>{p}</p>')
    body.append('  <h2>الخطوات بالترتيب</h2>\n  <ol>')
    for s in a['steps']:
        body.append(f'   <li><b>{s[0]}</b> — {s[1]}</li>')
    body.append('  </ol>')
    if a.get('docs'):
        body.append('  <div class="box"><h3>📄 الأوراق اللي تجهّزها</h3><ul>')
        for d in a['docs']:
            body.append(f'   <li>{d}</li>')
        body.append('  </ul></div>')
    if a.get('mistakes'):
        body.append('  <div class="box warn"><h3>⚠️ أخطاء بتطوّل الموضوع</h3><ul>')
        for m in a['mistakes']:
            body.append(f'   <li>{m}</li>')
        body.append('  </ul></div>')
    if a.get('fees'):
        body.append('  <div class="box"><h3>💳 الرسوم والفئات</h3>')
        for f in a['fees']:
            body.append(f'   <p>{f}</p>')
        body.append('  </div>')
    body.append('  <h2>أسئلة بتتكرر</h2>')
    for q, ans in a['faq']:
        body.append(f'  <details class="faq"><summary>{q}</summary><p>{ans}</p></details>')
    body.append('  <div class="cta"><div>الدليل التفاعلي بيشرح نفس الخدمة خطوة بخطوة وبحاسبة رسوم.</div>'
                f'<a href="../services/{a["service"]}.html">افتح الدليل ←</a></div>')
    if a.get('related'):
        body.append('  <h2>اقرأ كمان</h2>\n  <div class="rel">')
        for t, u in a['related']:
            body.append(f'   <a href="{u}">{t}</a>')
        body.append('  </div>')
    schema = {
        "@context": "https://schema.org", "@type": "Article",
        "headline": a['title'], "description": a['desc'], "inLanguage": "ar",
        "author": {"@type": "Person", "name": "Mohamed Ismail"},
        "publisher": {"@type": "Organization", "name": BRAND, "url": B},
        "mainEntityOfPage": {"@type": "WebPage", "@id": B + "maqalat/" + a['slug'] + ".html"},
        "datePublished": a.get('date', date), "dateModified": date,
        "articleSection": a['cat'],
    }
    return TPL.format(B=B, title=a['title'], desc=a['desc'], slug=a['slug'], cat=a['cat'],
                      lead=a['lead'], body='\n'.join(body), schema=json.dumps(schema, ensure_ascii=False),
                      date=date, mins=max(2, round(sum(len(x.split()) for x in a['intro']) / 180) + 2))

HUB = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>مقالات الخدمات الحكومية | خِدْمَتي AI</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{B}maqalat.html">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="src/styles/main.css">
<style>
body{{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}}
.top{{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e3556}}
.top a{{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}}
.hero{{text-align:center;padding:40px 20px 8px}}
.hero h1{{font-size:26px;font-weight:900;color:#fff;margin:0 0 10px}}
.hero p{{color:#8ea0c4;font-size:15px;margin:0 auto;max-width:560px}}
.prog{{max-width:760px;margin:18px auto 0;padding:0 20px}}
.bar{{height:8px;background:#162847;border:1px solid #1e3556;border-radius:8px;overflow:hidden}}
.bar i{{display:block;height:100%;background:#e6c258}}
.prog span{{display:block;text-align:center;color:#8ea0c4;font-size:12.5px;margin-top:6px}}
.list{{max-width:760px;margin:26px auto 40px;padding:0 20px;display:grid;gap:10px}}
.card{{display:block;background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:14px;padding:16px 18px;text-decoration:none}}
.card:hover{{border-color:#e6c258}}
.card .cat{{color:#e6c258;font-size:12px;font-weight:800}}
.card .t{{color:#fff;font-size:16px;font-weight:800;margin:6px 0 4px;line-height:1.5}}
.card .d{{color:#8ea0c4;font-size:13px;line-height:1.7}}
.soon{{max-width:760px;margin:0 auto 40px;padding:0 20px;color:#5a6a8a;font-size:13px;text-align:center}}
footer{{text-align:center;color:#5a6a8a;font-size:13px;padding:26px 20px;border-top:1px solid #1e3556}}
footer a{{color:#e6c258;text-decoration:none;font-weight:700}}
</style>
<script type="application/ld+json">
{schema}
</script>
</head>
<body>
<div class="top"><a href="index.html">← الرئيسية</a><a href="articles.html" style="font-size:13px">الأدلة التفاعلية</a></div>
<div class="hero">
  <h1>مقالات خِدْمَتي</h1>
  <p>شرح مباشر لأشهر مواقف الخدمات الحكومية في مصر — بالأوراق والخطوات والأخطاء اللي بتطوّل الموضوع.</p>
  <div class="prog"><div class="bar"><i style="width:{pct}%"></i></div><span>{n} من {goal} مقال</span></div>
</div>
<div class="list">
{cards}
</div>
<div class="soon">بنضيف مقالين جديدين كل يوم — التالي في الخطة: {nextup}</div>
<footer>© 2026 خِدْمَتي AI | <a href="index.html">العودة للرئيسية</a></footer>
</body>
</html>
"""

def main(path):
    data = json.load(open(path, encoding='utf-8'))
    out = os.path.join(ROOT, 'maqalat'); os.makedirs(out, exist_ok=True)
    today = datetime.date.today().isoformat()
    for a in data['articles']:
        html = render(a, today)
        open(os.path.join(out, a['slug'] + '.html'), 'w', encoding='utf-8').write(html)
        print('OK', a['slug'])
    # الفهرس: مقالات maqalat/ + المقالات المفصّلة القديمة في articles/
    items = []
    for f in sorted(os.listdir(out)):
        if not f.endswith('.html'): continue
        s = open(os.path.join(out, f), encoding='utf-8').read()
        cat = re.search(r'<div class="kicker">(.*?)</div>', s).group(1)
        t = re.search(r'<h1>(.*?)</h1>', s).group(1)
        d = re.search(r'name="description" content="(.*?)"', s).group(1)
        items.append((cat, t, d, 'maqalat/' + f))
    adir = os.path.join(ROOT, 'articles')
    if os.path.isdir(adir):
        for f in sorted(os.listdir(adir)):
            if not f.endswith('.html'): continue
            s = open(os.path.join(adir, f), encoding='utf-8').read()
            if '"Article"' not in s or 'noindex' in s: continue
            t = re.sub('<[^>]+>', '', re.search(r'<title>(.*?)</title>', s, re.S).group(1)).split('|')[0].strip()
            d = re.search(r'name="description" content="(.*?)"', s, re.S).group(1)
            items.append(('📄 مقال مفصّل', t, d, 'articles/' + f))
    items.sort(key=lambda x: (0 if x[0] == '📄 مقال مفصّل' else 1, x[1]))
    cards = '\n'.join(
        f'  <a class="card" href="{f}"><div class="cat">{c}</div><div class="t">{t}</div><div class="d">{d[:120]}</div></a>'
        for c, t, d, f in items)
    n = len(items); goal = 100
    nxt = "، ".join(data.get('next', [])[:4]) or "دفعة جديدة كل يوم"
    schema = {"@context": "https://schema.org", "@type": "CollectionPage",
              "name": "مقالات خِدْمَتي", "url": B + "maqalat.html", "inLanguage": "ar-EG",
              "publisher": {"@type": "Organization", "name": BRAND, "url": B},
              "mainEntity": {"@type": "ItemList", "numberOfItems": n,
                             "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": B + f, "name": t}
                                                 for i, (c, t, d, f) in enumerate(items)]}}
    open(os.path.join(ROOT, 'maqalat.html'), 'w', encoding='utf-8').write(
        HUB.format(B=B, desc=f"{n} مقال عن الخدمات الحكومية في مصر: الأوراق، الخطوات، الأخطاء الشائعة، وروابط الأدلة التفاعلية.",
                   schema=json.dumps(schema, ensure_ascii=False), cards=cards, n=n, goal=goal,
                   pct=min(100, round(n * 100 / goal)), nextup=nxt))
    print('HUB ok —', n, 'مقال')

if __name__ == '__main__':
    main(sys.argv[1])
