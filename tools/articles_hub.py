# -*- coding: utf-8 -*-
"""articles_hub.py — يبني صفحة فهرس المقالات (articles/index.html) من سجل المقالات + خطة المكتبة."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://khidmatyai.com/'


def _queue():
    p = os.path.join(ROOT, 'tools', 'articles-queue.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {'categories': [], 'target': 100}


def render(reg=None):
    if reg is None:
        reg = json.load(open(os.path.join(ROOT, 'tools', 'articles-published.json'), encoding='utf-8'))
    q = _queue()
    target = q.get('target', 100)
    src = open(os.path.join(ROOT, 'articles', 'health-insurance-card.html'), encoding='utf-8').read()
    style = re.search(r'<style>.*?</style>', src, re.S).group(0)

    cards = '\n'.join(f'''<a class="article-card" href="{a['slug']}.html">
   <div class="article-emoji">{a['emoji']}</div>
   <div class="article-body">
    <span class="article-cat">{a['category']}</span>
    <h3 class="article-title">{a['title']}</h3>
    <p class="article-dek">{a['dek']}</p>
    <div class="article-readtime">قراءة {a['minutes']} دقائق ←</div>
   </div>
  </a>''' for a in sorted(reg, key=lambda x: x['date'], reverse=True))

    # عدّاد لكل محور: المنشور فعليًا + المتبقي من الخطة
    published_cats = {}
    for a in reg:
        published_cats[a['category']] = published_cats.get(a['category'], 0) + 1
    chips = ''
    for c in q.get('categories', []):
        live = published_cats.get(c['name'], 0)
        chips += f'<span class="q-chip"><b>{c["emoji"]}</b> {c["name"]} <i dir="ltr">{live}/{len(c["titles"])}</i></span>'

    n = len(reg)
    bar = min(100, round(n / target * 100))
    itemlist = [{"@type": "ListItem", "position": i + 1, "name": a['title'],
                 "url": f"{BASE}articles/{a['slug']}.html"} for i, a in enumerate(reg)]
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "مقالات خِدْمَتي AI",
          "description": "مقالات عملية عن الخدمات الحكومية المصرية: الأوراق، الرسوم، الخطوات، وأخطاء شائعة.",
          "url": BASE + "articles/", "inLanguage": "ar-EG",
          "isPartOf": {"@type": "WebSite", "name": "خِدْمَتي AI", "url": BASE},
          "mainEntity": {"@type": "ItemList", "numberOfItems": n, "itemListElement": itemlist}}
    crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE},
        {"@type": "ListItem", "position": 2, "name": "المقالات", "item": BASE + "articles/"}]}
    DESC = "مقالات عملية عن الخدمات الحكومية في مصر: الأوراق المطلوبة، الرسوم، الخطوات، والأخطاء الشائعة — بلغة واضحة ومربوطة بالأدلة التفاعلية."

    page = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="../auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>مقالات الخدمات الحكومية | خِدْمَتي AI</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{BASE}articles/">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta property="og:title" content="مقالات الخدمات الحكومية | خِدْمَتي AI">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{BASE}articles/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:image" content="{BASE}assets/og-banner.png">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
{style}
<style>
.hub-hero{{text-align:center;padding:44px 20px 8px}}
.hub-hero h1{{font-size:26px;font-weight:900;color:#fff;margin:0 0 8px}}
.hub-hero p{{font-size:14.5px;color:#8ea0c4;margin:0 auto;max-width:600px;line-height:1.8}}
.hub-progress{{max-width:620px;margin:20px auto 0;padding:0 20px}}
.hub-bar{{height:8px;background:#162847;border:1px solid #1e3556;border-radius:99px;overflow:hidden}}
.hub-bar i{{display:block;height:100%;background:linear-gradient(90deg,#e6c258,#f0d98a);border-radius:99px}}
.hub-pstat{{display:flex;justify-content:space-between;font-size:12px;color:#8ea0c4;margin-top:6px}}
.hub-pstat b{{color:#e6c258}}
.hub-wrap{{max-width:960px;margin:0 auto;padding:0 20px 50px}}
.hub-sec{{font-size:16px;font-weight:800;color:#e6c258;margin:30px 0 14px}}
.articles-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}}
.article-card{{display:flex;gap:12px;background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:16px;text-decoration:none;transition:border-color .2s}}
.article-card:hover{{border-color:#e6c258}}
.article-emoji{{font-size:26px;line-height:1}}
.article-cat{{display:inline-block;font-size:11px;font-weight:700;color:#e6c258;background:rgba(230,194,88,.1);border:1px solid rgba(230,194,88,.3);border-radius:99px;padding:2px 9px;margin-bottom:6px}}
.article-title{{font-size:14.5px;font-weight:800;color:#fff;margin:0 0 6px;line-height:1.6}}
.article-dek{{font-size:12.5px;color:#8ea0c4;line-height:1.8;margin:0}}
.article-readtime{{font-size:11.5px;color:#5a6a8a;margin-top:8px}}
.q-grid{{display:flex;flex-wrap:wrap;gap:8px}}
.q-chip{{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#c0cee0;background:#162847;border:1px solid #1e3556;border-radius:12px;padding:7px 11px}}
.q-chip i{{font-style:normal;color:#5a6a8a;font-size:11px}}
.hub-cta{{margin-top:26px;background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:18px 20px;font-size:13px;color:#c0cee0;line-height:1.9;text-align:center}}
.hub-cta a{{color:#e6c258;font-weight:800;text-decoration:none}}
.footer{{text-align:center;padding:26px 20px;color:#5a6a8a;font-size:13px}}
.footer a{{color:#e6c258;text-decoration:none;font-weight:700}}
@media(max-width:700px){{.articles-grid{{grid-template-columns:1fr}}}}
</style>
<script type="application/ld+json">
{json.dumps(crumb, ensure_ascii=False)}
</script>
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False)}
</script>
</head>
<body>
<div class="header"><div class="header-logo"><span>خِدْمَتي <span class="ai">AI</span></span></div><nav class="hd-nav" aria-label="التنقل الرئيسي"><a href="../index.html">الرئيسية</a><a href="../services.html">الخدمات</a><a href="../articles.html">الدليل</a><a href="../offices.html">المكاتب</a><a href="../store.html">المتجر</a></nav></div>

<div class="hub-hero">
  <h1>المقالات</h1>
  <p>مقالات عملية عن الخدمات الحكومية المصرية — الأوراق، الرسوم، الخطوات، والأخطاء اللي بتطوّل المشوار.</p>
</div>
<div class="hub-progress">
  <div class="hub-bar"><i style="width:{bar}%"></i></div>
  <div class="hub-pstat"><span>خطة المكتبة: <b>{target}</b> مقال</span><span>منشور: <b>{n}</b></span></div>
</div>

<div class="hub-wrap">
  <h2 class="hub-sec">📖 منشور الآن</h2>
  <div class="articles-grid">
  {cards}
  </div>

  <h2 class="hub-sec">🗂️ محاور المكتبة القادمة</h2>
  <div class="q-grid">{chips}</div>

  <div class="hub-cta">محتاج خطوات خدمة معيّنة دلوقتي؟ الأدلة التفاعلية فيها الحاسبة والخطوات كاملة → <a href="../services.html">الخدمات</a> · أو اسأل المساعد في <a href="../index.html#ask">الرئيسية</a></div>
</div>

<div class="footer"><p>© 2026 خِدْمَتي AI | <a href="../index.html">العودة للرئيسية</a></p></div>
</body>
</html>'''
    out = os.path.join(ROOT, 'articles', 'index.html')
    open(out, 'w', encoding='utf-8').write(page)
    return out, n, bar


if __name__ == '__main__':
    print(render())
