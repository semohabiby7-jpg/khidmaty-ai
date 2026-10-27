# -*- coding: utf-8 -*-
"""
articles_build.py — يبني صفحة مقال من ملف JSON، ويحدّث صفحة المقالات + sitemap.

الاستخدام:
    python3 tools/articles_build.py tools/article-specs/<slug>.json
    python3 tools/articles_build.py --rebuild          # يعيد بناء الفهرس من السجل

بنية ملف المقال (JSON):
{
  "slug": "renew-national-id",
  "emoji": "🪪",
  "category": "الأحوال المدنية",
  "title": "...",
  "dek": "...",
  "minutes": "٦",
  "updated": "أكتوبر ٢٠٢٦",
  "blocks": [
     {"p": "..."},
     {"h2": "١. العنوان"},
     {"ul": ["...", "..."]},
     {"ol": ["...", "..."]},
     {"note": "..."},
     {"faq": {"q": "...", "a": "..."}}
  ],
  "related": [{"href": "../services/...html", "label": "..."}],
  "sources": ["..."]
}
"""
import json, os, re, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG_PATH = os.path.join(ROOT, 'tools', 'articles-published.json')
HUB = os.path.join(ROOT, 'articles', 'index.html')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, 'sitemap.xml')
BASE = 'https://khidmatyai.com/'
AUTHOR = 'Mohamed Ismail'


def load_reg():
    if os.path.exists(REG_PATH):
        return json.load(open(REG_PATH, encoding='utf-8'))
    return []


def save_reg(reg):
    reg.sort(key=lambda x: (x['date'], x['slug']))
    json.dump(reg, open(REG_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def inline(t):
    """يحوّل **نص** إلى <strong> ويبقي بقية النص كما هو."""
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)


def render_blocks(blocks):
    out = []
    for b in blocks:
        if 'p' in b:
            out.append(f'  <p>{inline(b["p"])}</p>')
        elif 'h2' in b:
            out.append(f'\n  <h2>{inline(b["h2"])}</h2>')
        elif 'ul' in b:
            out.append('  <ul>\n' + '\n'.join(f'   <li>{inline(x)}</li>' for x in b['ul']) + '\n  </ul>')
        elif 'ol' in b:
            out.append('  <ol>\n' + '\n'.join(f'   <li>{inline(x)}</li>' for x in b['ol']) + '\n  </ol>')
        elif 'note' in b:
            out.append(f'  <div class="note">{inline(b["note"])}</div>')
        elif 'faq' in b:
            out.append(f'  <div class="faq"><h3>{inline(b["faq"]["q"])}</h3><p>{inline(b["faq"]["a"])}</p></div>')
    return '\n'.join(out)


def faq_ld(blocks, title, url):
    qs = [b['faq'] for b in blocks if 'faq' in b]
    if not qs:
        return None
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q['q'], "acceptedAnswer": {"@type": "Answer", "text": re.sub(r'\*\*', '', q['a'])}} for q in qs]}


def article_ld(spec):
    url = f'{BASE}articles/{spec["slug"]}.html'
    return {"@context": "https://schema.org", "@type": "Article",
            "headline": spec['title'], "description": spec['dek'], "inLanguage": "ar",
            "author": {"@type": "Person", "name": AUTHOR},
            "publisher": {"@type": "Organization", "name": "خِدْمَتي AI", "url": BASE},
            "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            "datePublished": spec.get('date', '2026-10-27'),
            "dateModified": spec.get('date', '2026-10-27')}


def build_page(spec):
    css = open(os.path.join(ROOT, 'articles', 'health-insurance-card.html'), encoding='utf-8').read()
    style = re.search(r'<style>.*?</style>', css, re.S).group(0)
    url = f'{BASE}articles/{spec["slug"]}.html'
    related = '\n'.join(f'    <a href="{r["href"]}" class="rel-card">{r["label"]}</a>' for r in spec.get('related', []))
    sources = ''
    if spec.get('sources'):
        items = ''.join(f'<li>{s}</li>' for s in spec['sources'])
        sources = f'\n  <h2>المصادر</h2>\n  <ul>{items}</ul>'
    blocks = render_blocks(spec['blocks'])
    lds = [article_ld(spec)]
    f = faq_ld(spec['blocks'], spec['title'], url)
    if f:
        lds.append(f)
    ld_html = '\n'.join('<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>' for d in lds)
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE},
        {"@type": "ListItem", "position": 2, "name": "المقالات", "item": BASE + "articles/"},
        {"@type": "ListItem", "position": 3, "name": spec['title'], "item": url}]}
    ld_html += '\n<script type="application/ld+json">' + json.dumps(crumbs, ensure_ascii=False) + '</script>'
    page = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<script src="../auth-guard.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{esc(spec['title'])} | خِدْمَتي AI</title>
<meta name="description" content="{esc(spec['dek'])}">
{style}
<link rel="canonical" href="{url}">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta property="og:title" content="{esc(spec['title'])} | خِدْمَتي AI">
<meta property="og:description" content="{esc(spec['dek'])}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:image" content="{BASE}assets/og-banner.png">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
{ld_html}
</head>
<body>
<div class="header"><div class="header-logo"><span>خِدْمَتي <span class="ai">AI</span></span></div><nav class="hd-nav" aria-label="التنقل الرئيسي"><a href="../index.html">الرئيسية</a><a href="../services.html">الخدمات</a><a href="../articles.html">الدليل</a><a href="index.html" class="on">المقالات</a><a href="../offices.html">المكاتب</a></nav></div>
<div class="breadcrumb"><a href="../index.html">الرئيسية</a> › <a href="index.html">المقالات</a> › {esc(spec['category'])}</div>

<div class="wrap">
 <div class="hero">
  <div class="hero-emoji">{spec['emoji']}</div>
  <h1>{esc(spec['title'])}</h1>
  <p>{esc(spec['dek'])}</p>
  <div class="meta">بقلم {AUTHOR} · خِدْمَتي AI · تحديث {spec.get('updated', 'أكتوبر ٢٠٢٦')} · قراءة {spec.get('minutes', '٦')} دقائق</div>
 </div>

 <div class="article">
{blocks}
{sources}

  <div class="note">📌 المعلومات استرشادية وللتنظيم، وقد تتغير الإجراءات والرسوم بقرارات الجهات المختصة. المرجع النهائي هو الجهة الرسمية المختصة.</div>

  <div class="rel" style="margin-top:26px">
   <h2>🔗 دلائل تكمّل الموضوع</h2>
   <div class="rel-grid">
{related}
   </div>
  </div>
 </div>
</div>

<div class="footer"><p>© 2026 خِدْمَتي AI | <a href="index.html">كل المقالات</a> · <a href="../index.html">الرئيسية</a></p></div>
</body>
</html>'''
    path = os.path.join(ROOT, 'articles', spec['slug'] + '.html')
    open(path, 'w', encoding='utf-8').write(page)
    return path


def rebuild_hub():
    import articles_hub
    _, n, bar = articles_hub.render()
    return n


def sitemap_add(slug):
    sm = open(SITEMAP, encoding='utf-8').read()
    if slug in sm:
        return False
    url = f'{BASE}articles/{slug}.html'
    entry = f'  <url><loc>{url}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
    sm = sm.replace('</urlset>', entry + '</urlset>', 1)
    open(SITEMAP, 'w', encoding='utf-8').write(sm)
    return True


def main():
    if '--rebuild' in sys.argv:
        print('articles in hub:', rebuild_hub())
        return
    spec_path = sys.argv[1]
    spec = json.load(open(spec_path, encoding='utf-8'))
    build_page(spec)
    reg = load_reg()
    reg = [r for r in reg if r['slug'] != spec['slug']]
    reg.append({'slug': spec['slug'], 'emoji': spec['emoji'], 'category': spec['category'],
                'title': spec['title'], 'dek': spec['dek'], 'minutes': spec.get('minutes', '٦'),
                'date': spec.get('date', '2026-10-27')})
    save_reg(reg)
    n = rebuild_hub()
    added = sitemap_add(spec['slug'])
    print(f"✓ {spec['slug']} | sitemap:{'أضيف' if added else 'موجود'} | إجمالي المقالات: {n}")


if __name__ == '__main__':
    main()
