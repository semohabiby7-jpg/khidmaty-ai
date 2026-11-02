#!/usr/bin/env python3
"""بناء كارت لكل محافظة: offices/<gov>.html

كل كارت فيه تقسيمة المحافظة على الأقسام (أحوال · مرور · تأمينات · شهر عقاري)
بالمراكز الرئيسية، مع عدّادات وروابط لكل مكتب ولكل قسم.
البيانات بتتقرا من صفحات الأقسام الموجودة، مفيش رقم بيتكتب بالإيد.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://khidmatyai.com"
DATA = json.loads((ROOT / "tools/seo/offices-data.json").read_text(encoding="utf-8"))

CATS = [
    ("civil", "🪪", "السجل المدني والأحوال", "بطاقات، شهادات ميلاد ووفاة، وتصحيح بيانات"),
    ("traffic", "🚗", "المرور والرخص", "رخص، نقل ملكية، فحص فني، ومخالفات"),
    ("insurance", "👷", "التأمينات والمعاشات", "فترات تأمينية، معاشات، وتعويضات"),
    ("notary", "⚖️", "الشهر العقاري", "تسجيل ملكية، توكيلات، وإقرارات"),
]

PENDING = [
    ("🏛️", "الغرف التجارية"),
    ("⚖️", "المحاكم"),
    ("🏤", "مكاتب البريد"),
    ("🏥", "مكاتب الصحة"),
    ("👷", "مكاتب العمل"),
]

NAMES = {}
for p in sorted((ROOT / "offices/civil").glob("*.html")):
    t = re.search(r"<title>(.*?)</title>", p.read_text(encoding="utf-8"), re.S)
    m = re.search(r"في\s+(.+?)\s*—", t.group(1)) if t else None
    NAMES[p.stem] = m.group(1).strip() if m else p.stem


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def centre_name(item: dict) -> str:
    tail = item["meta"].split("|")[-1].strip() if "|" in item["meta"] else ""
    return tail or item["name"].split("-")[-1].strip()


def office_row(cat: str, gov: str, item: dict) -> str:
    href = f'{cat}/{item["link"]}'
    label = re.sub(r"^[^\w\u0600-\u06FF]+", "", item["name"]).strip()
    addr = item["addr"].replace("📍", "").strip()
    return (
        f'<a class="row" href="{esc(href)}">'
        f'<span class="row-name">{esc(label)}</span>'
        f'<span class="row-addr">{esc(addr[:78])}</span>'
        "</a>"
    )


def build(gov: str) -> str:
    name = NAMES.get(gov, gov)
    d = DATA[gov]
    totals = {c: len(d.get(c, [])) for c, *_ in CATS}
    total = sum(totals.values())

    stats = "".join(
        f'<div class="stat"><div class="stat-num">{totals[c]}</div><div class="stat-lab">{title}</div></div>'
        for c, emo, title, _ in CATS
    )

    sections = []
    for cat, emo, title, sub in CATS:
        items = d.get(cat, [])
        if not items:
            continue
        rows = "".join(office_row(cat, gov, it) for it in items)
        sections.append(
            f'<section class="card">'
            f'<div class="card-head">'
            f'<span class="card-emo">{emo}</span>'
            f"<div><h2>{title}</h2><p>{sub}</p></div>"
            f'<span class="count">{len(items)}</span>'
            f"</div>"
            f'<div class="rows">{rows}</div>'
            f'<a class="more" href="{cat}/{gov}.html">كل تفاصيل {title} في {name} ←</a>'
            f"</section>"
        )

    pending = "".join(
        f'<div class="pend"><span>{emo}</span><span>{label}</span><em>قيد التجميع</em></div>'
        for emo, label in PENDING
    )

    desc = (
        f"دليل مكاتب {name}: {totals['civil']} سجل مدني · {totals['traffic']} مرور · "
        f"{totals['insurance']} تأمينات · {totals['notary']} شهر عقاري — العناوين والمواعيد في المراكز الرئيسية."
    )
    url = f"{BASE}/offices/{gov}.html"

    ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": f"دليل مكاتب {name}",
        "description": desc,
        "url": url,
        "inLanguage": "ar-EG",
        "isPartOf": {"@type": "WebSite", "name": "خِدْمَتي AI", "url": f"{BASE}/"},
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": f"{BASE}/"},
                {"@type": "ListItem", "position": 2, "name": "المكاتب", "item": f"{BASE}/offices.html"},
                {"@type": "ListItem", "position": 3, "name": name, "item": url},
            ],
        },
    }

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>مكاتب {name} — الدليل الكامل | خِدْمَتي AI</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="مكاتب {name} — الدليل الكامل">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/assets/brand-logo.jpeg">
<meta property="og:site_name" content="خِدْمَتي AI">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="مكاتب {name} — الدليل الكامل">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{BASE}/assets/brand-logo.jpeg">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
*{{box-sizing:border-box}}
body{{font-family:Cairo,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;padding:0}}
.header{{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.3)}}
.header a{{color:#e6c258;text-decoration:none;font-weight:800;font-size:15px}}
.wrap{{max-width:820px;margin:0 auto;padding:0 16px 40px}}
.crumb{{font-size:12.5px;color:#5a6a8a;padding:14px 0 0}}
.crumb a{{color:#e6c258;text-decoration:none}}
.hero{{text-align:center;padding:22px 4px 6px}}
.hero h1{{font-size:24px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.4}}
.hero h1 span{{color:#e6c258}}
.hero p{{font-size:14px;color:#8ea0c4;margin:0;line-height:1.8}}
.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0 4px}}
.stat{{background:#162847;border:1px solid #1e3556;border-radius:12px;padding:10px 4px;text-align:center}}
.stat-num{{font-size:19px;font-weight:900;color:#e6c258}}
.stat-lab{{font-size:10.5px;color:#8ea0c4;margin-top:2px;line-height:1.4}}
.card{{background:linear-gradient(145deg,#162847,#0d1a33);border:1px solid #1e3556;border-radius:16px;padding:16px;margin-top:14px}}
.card-head{{display:flex;align-items:center;gap:10px;margin-bottom:6px}}
.card-emo{{font-size:22px}}
.card-head h2{{font-size:16px;font-weight:800;color:#fff;margin:0}}
.card-head p{{font-size:12px;color:#8ea0c4;margin:2px 0 0}}
.count{{margin-inline-start:auto;background:rgba(230,194,88,.14);color:#e6c258;font-size:12px;font-weight:800;border-radius:20px;padding:3px 10px}}
.rows{{display:flex;flex-direction:column;gap:2px;margin-top:8px}}
.row{{display:flex;flex-direction:column;gap:2px;padding:9px 10px;border-radius:10px;text-decoration:none;border:1px solid transparent}}
.row:hover{{background:#12203c;border-color:#1e3556}}
.row-name{{font-size:13.5px;font-weight:700;color:#e8eef8;line-height:1.6}}
.row-addr{{font-size:11.5px;color:#7e8fb0;line-height:1.6}}
.more{{display:inline-block;margin-top:10px;font-size:12.5px;font-weight:800;color:#e6c258;text-decoration:none}}
.pend-box{{margin-top:14px;border:1px dashed #2b4468;border-radius:16px;padding:14px 16px;background:rgba(22,40,71,.4)}}
.pend-box h2{{font-size:14px;color:#fff;font-weight:800;margin:0 0 4px}}
.pend-box p{{font-size:12px;color:#8ea0c4;margin:0 0 10px;line-height:1.7}}
.pend{{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#a9b8d4;padding:6px 0}}
.pend em{{margin-inline-start:auto;font-style:normal;font-size:11px;color:#5a6a8a}}
.cta{{margin-top:20px;background:linear-gradient(135deg,#1a2d5a,#0F1E3D);border:1px solid #e6c258;border-radius:16px;padding:20px;text-align:center}}
.cta h2{{font-size:16px;font-weight:800;color:#fff;margin:0 0 6px}}
.cta p{{font-size:13px;color:#8ea0c4;margin:0 0 14px}}
.cta a{{display:inline-block;background:linear-gradient(135deg,#e6c258,#d4a843);color:#0F1E3D;padding:11px 26px;border-radius:30px;font-weight:800;font-size:14px;text-decoration:none}}
.footer{{text-align:center;padding:26px 20px;color:#5a6a8a;font-size:12.5px;line-height:2}}
.footer a{{color:#e6c258;text-decoration:none;font-weight:700}}
@media(max-width:430px){{.stats{{grid-template-columns:repeat(2,1fr)}}.hero h1{{font-size:21px}}}}
</style>
</head>
<body>
<div class="header"><a href="../index.html">← الرئيسية</a><span style="color:#fff;font-weight:900;font-size:16px">خِدْمَتي <span style="color:#e6c258">AI</span></span></div>
<div class="wrap">
  <div class="crumb"><a href="../index.html">الرئيسية</a> › <a href="../offices.html">المكاتب</a> › {name}</div>
  <div class="hero">
    <h1>دليل مكاتب <span>{name}</span></h1>
    <p>{total} مكتب في {len([c for c, *_ in CATS if d.get(c)])} أقسام — العناوين والمواعيد في المراكز الرئيسية</p>
  </div>
  <div class="stats">{stats}</div>
  {"".join(sections)}
  <div class="pend-box">
    <h2>أقسام بنجمّعها لـ{name}</h2>
    <p>الأرقام اللي فوق كلها مكاتب متأكدة. الخمسة دول لسه بنجمع بياناتهم الرسمية — مش هنكتب عنوان مش متأكدين منه.</p>
    {pending}
  </div>
  <div class="cta">
    <h2>مش عارف تروح فين؟</h2>
    <p>اسأل خِدْمَتي — قول له الحاجة اللي محتاجها وهو يقولك المكتب الأقرب ليك وإيه الورق اللي تاخده.</p>
    <a href="../index.html#ask-ai">اسأل دلوقتي ←</a>
  </div>
  <div class="footer">
    <p>© 2026 خِدْمَتي AI — دليل الخدمات الحكومية في مصر</p>
    <p><a href="../services.html">الخدمات</a> · <a href="../offices.html">كل المكاتب</a> · <a href="../calc.html">حاسبة الرسوم</a> · <a href="../store.html">الكتب</a></p>
  </div>
</div>
</body>
</html>
"""


def main() -> int:
    made = 0
    for gov in sorted(DATA):
        (ROOT / "offices" / f"{gov}.html").write_text(build(gov), encoding="utf-8")
        made += 1
    print(f"اتبنى: {made} كارت محافظة")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
