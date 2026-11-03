# -*- coding: utf-8 -*-
"""يبني en/index.html — English index for the 87 government services.

الأسماء الإنجليزية مكتوبة هنا بالإيد (مش ترجمة آلية)، وكل خدمة بتوصل لصفحتها العربية
لأن الشرح التفصيلي عربي. لو اتضافت خدمة جديدة في data/docs-finder.json ومفيش لها اسم
إنجليزي هنا، السكربت بينبّه عليها بدل ما يخترع اسم.

التشغيل: python3 tools/seo/build_en_index.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data/docs-finder.json"
OUT = ROOT / "en/index.html"

TITLES = {
    "alimony-custody": "Alimony & Child Custody (Family Court)",
    "bank-pension": "Changing Your Pension Payment Point",
    "bankruptcy": "Bankruptcy & Collective Procedures (Law 11/2018)",
    "birth-certificate": "Computerised Birth Certificate",
    "car-inspection": "Vehicle Technical Inspection",
    "car-ownership-inquiry": "Vehicle Ownership & Registration Inquiry",
    "car-ownership-transfer": "Vehicle Ownership Transfer",
    "certify-certificates": "Certifying Educational Certificates",
    "child-national-id": "National ID for Children (Age 15)",
    "company-formation": "Setting Up a Company or Sole Proprietorship",
    "consumer-complaint": "Consumer Protection Complaint",
    "correct-name-data": "Correcting Data in Civil Registry Documents",
    "court-ruling-copy": "Official Copy of a Court Ruling",
    "credit-inquiry": "Credit Report (i-Score)",
    "criminal-record": "Criminal Record Certificate (Police Clearance)",
    "customs-clearance": "Customs Clearance (Import & Export)",
    "death-certificate": "Computerised Death Certificate",
    "disability-card": "Integrated Services Card (Disability)",
    "duplicate-document": "Replacement Document (Lost or Damaged)",
    "e-invoice": "Joining the E-Invoice System",
    "edit-tax-data": "Amending Tax Registration Data",
    "egyptian-citizenship": "Proof of Egyptian Citizenship",
    "egyptians-abroad": "Services for Egyptians Abroad",
    "electricity": "Electricity Connection or Bill Payment",
    "exam-results": "School Exam Results Inquiry",
    "exit-return-visa": "Exit & Re-entry Visa for Foreigners",
    "external-attestation": "Ministry of Foreign Affairs Attestation",
    "family-record": "Family Record (Computerised)",
    "file-lawsuit": "Filing a Civil Lawsuit",
    "foreign-birth-registration": "Registering a Birth Abroad",
    "gas-bill-payment": "Natural Gas Bill Payment",
    "health-insurance-card": "Health Insurance Card",
    "health-insurance": "Family Enrolment in Universal Health Insurance",
    "import-card": "Importers Register (Import Card)",
    "inheritance-declaration": "Inheritance Declaration (Heirs & Estate)",
    "inheritance-distribution": "Inheritance Division & Property Allocation",
    "insurance-number-inquiry": "Social Insurance Number Inquiry",
    "insurance-periods-inquiry": "Contribution Periods Inquiry",
    "international-license": "International Driving Permit",
    "labor-card": "Employment Certificate (Labour Card)",
    "lost-national-id": "Replacement National ID (Lost)",
    "lost-passport": "Replacement Passport (Lost)",
    "marriage-divorce-certificate": "Marriage or Divorce Certificate",
    "marriage-grant": "Marriage Grant (Social Insurance)",
    "military-exemption-medical": "Medical Exemption from Military Service",
    "military-service": "Military Service Status & Certificate",
    "mortgage-registration": "Registering a Property Mortgage",
    "national-id-card": "National ID Card",
    "natural-gas-connection": "Natural Gas Connection",
    "new-driving-license": "New Driving Licence",
    "new-passport": "New Passport (First Time)",
    "new-student-registration": "New School Student Registration",
    "notary": "Notarisation at the Real Estate Registry",
    "ownership-chain-certificate": "Property Ownership Chain Certificate",
    "pension-extraction": "Pension Extraction",
    "pension-postal-payment": "Collecting a Pension at the Post Office",
    "postal-savings-account": "Opening a Postal Savings Account",
    "postal-services": "Postal Services",
    "power-of-attorney": "Power of Attorney",
    "profession-license": "Professional Practice Licence",
    "property-sale-registration": "Registering a Property Sale Contract",
    "ration-card": "Ration Card (Inquiry & Management)",
    "real-estate-tax": "Real Estate Tax",
    "renew-car-license": "Vehicle Licence Renewal",
    "renew-commercial-register": "Commercial Register Renewal",
    "renew-driving-license": "Driving Licence Renewal",
    "renew-national-id": "National ID Renewal",
    "renew-passport": "Passport Renewal",
    "rent-contract-registration": "Registering a Rent Contract",
    "replace-plates": "Replacing Vehicle Number Plates",
    "social-housing": "Social Housing (Housing for All Egyptians)",
    "takafol-karama": "Takaful & Karama Cash Support",
    "tax-clearance": "Tax Clearance Certificate",
    "tax-objection": "Objecting to a Tax Assessment",
    "tax-registration": "Tax Registration",
    "tax-return": "Filing a Tax Return",
    "trademark-registration": "Trademark Registration",
    "traffic-violations": "Traffic Violations Inquiry",
    "unemployment-allowance": "Unemployment Allowance",
    "update-company-data": "Updating Company Data (Commercial Register)",
    "update-insured-data": "Amending Insured Person Data",
    "vaccination-certificate": "International Vaccination Certificate",
    "water-bill-payment": "Water Bill Payment",
    "water-connection": "Drinking Water Connection",
    "work-certificate": "Employment Certificate (Work Card)",
    "work-injury-pension": "Work Injury Pension",
    "work-permit-foreigners": "Work Permit for Foreigners",
}

CATS = {
    "أحوال مدنية": "Civil Registry",
    "المرور": "Traffic",
    "مرور": "Traffic",
    "تأمينات": "Social Insurance",
    "التأمينات": "Social Insurance",
    "الضرائب": "Taxes",
    "ضرائب": "Taxes",
    "الشهر العقاري": "Real Estate Registry",
    "شهر عقاري": "Real Estate Registry",
    "المحاكم": "Courts",
    "محكمة": "Courts",
    "قضاء": "Family & Civil Courts",
    "تجاري": "Commercial",
    "تجارة": "Commercial",
    "الشركات": "Companies",
    "البريد": "Post",
    "السفر والهجرة": "Passports & Emigration",
    "سفر وهجرة": "Passports & Emigration",
    "سفر": "Travel Documents",
    "قنصلية": "Consular",
    "الصحة": "Health",
    "صحة": "Health",
    "تعليم": "Education",
    "المرافق": "Utilities",
    "مرافق": "Utilities",
    "إسكان": "Housing",
    "تضامن اجتماعي": "Social Solidarity",
    "تجنيد": "Military Service",
    "ملكية فكرية": "Intellectual Property",
    "حكومي": "Government",
    "تعرف البصمات": "Criminal Records",
    "مدني": "Civil Documents",
    "إعفاء طبي": "Medical Exemption",
    "مالية": "Finance",
}

# الخدمات اللي صفحتها العربية من غير تصنيف — بنحط تصنيفها هنا صريح
CAT_OVERRIDE = {
    "certify-certificates": "Education",
    "consumer-complaint": "Consumer Protection",
    "exam-results": "Education",
    "gas-bill-payment": "Utilities",
    "international-license": "Traffic",
    "new-driving-license": "Traffic",
    "renew-commercial-register": "Commercial",
    "takafol-karama": "Social Solidarity",
    "work-certificate": "Civil Documents",
}

PAGE = """<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Egypt Government Services in English — 87 Services | Khidmaty AI</title>
<meta name="description" content="English index of 87 Egyptian government services: national ID, passports, driving licences, taxes, pensions, property registration, utilities and more. Each service links to a detailed Arabic guide with required documents, fees and processing time.">
<link rel="canonical" href="https://khidmatyai.com/en/">
<meta property="og:type" content="website">
<meta property="og:title" content="Egypt Government Services in English — Khidmaty AI">
<meta property="og:description" content="87 Egyptian government services in English: what it is, where to go, and a link to the full guide.">
<meta property="og:url" content="https://khidmatyai.com/en/">
<meta property="og:site_name" content="Khidmaty AI">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0F1E3D">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Egypt Government Services in English","url":"https://khidmatyai.com/en/","inLanguage":"en","isPartOf":{"@type":"WebSite","name":"Khidmaty AI","url":"https://khidmatyai.com/"}}</script>
<style>
*{box-sizing:border-box}
body{font-family:Cairo,system-ui,sans-serif;background:#0F1E3D;color:#e8eef8;margin:0;line-height:1.65}
.header{background:linear-gradient(135deg,#0F1E3D,#1a2d5a);padding:13px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.header a{color:#e6c258;text-decoration:none;font-weight:800;font-size:14px}
.brand{color:#fff;font-weight:900;font-size:16px}
.brand span{color:#e6c258}
.wrap{max-width:820px;margin:0 auto;padding:0 16px 60px}
.hero{padding:26px 2px 10px}
.hero h1{font-size:26px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.3}
.hero p{font-size:14px;color:#8ea0c4;margin:0;max-width:620px}
.search{margin-top:16px}
.search input{width:100%;padding:14px 16px;border-radius:14px;border:1px solid #24395c;background:#162847;color:#e8eef8;font-family:inherit;font-size:15px}
.search input:focus{outline:none;border-color:#e6c258;box-shadow:0 0 0 3px rgba(230,194,88,.12)}
.count{margin-top:14px;font-size:13px;color:#8ea0c4}
.group{margin-top:22px}
.group h2{font-size:13px;font-weight:900;color:#e6c258;letter-spacing:.04em;text-transform:uppercase;margin:0 0 8px}
.item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #1e3556;border-radius:12px;background:#12203c;margin-bottom:7px;text-decoration:none;color:#e8eef8}
.item:hover,.item:focus-visible{border-color:#e6c258;background:rgba(230,194,88,.07);outline:none}
.item .txt{flex:1;min-width:0}
.item .en{font-size:14.5px;font-weight:800;display:block}
.item .ar{font-size:12px;color:#8ea0c4;direction:rtl;unicode-bidi:isolate;display:block;margin-top:2px}
.item .go{font-size:11px;font-weight:800;color:#0F1E3D;background:#e6c258;border-radius:8px;padding:3px 8px;white-space:nowrap;flex-shrink:0}
.note{margin-top:26px;border-top:1px solid #1e3556;padding-top:14px;font-size:12.5px;color:#a9b8d4}
.note p{margin:0 0 8px}
.footer{text-align:center;padding:24px 20px;color:#5a6a8a;font-size:12.5px;border-top:1px solid #16274a;margin-top:24px}
.footer a{color:#e6c258;text-decoration:none;font-weight:700}
/* ===== Sections (same pattern as the Arabic site) ===== */
.cat-block{margin:0 0 26px}
.cat-block-head{display:flex;align-items:center;gap:11px;width:100%;margin:0 0 12px;padding:0 0 9px;background:none;border:0;border-bottom:1px solid #1e3556;font-family:inherit;color:inherit;text-align:left;cursor:pointer}
.cat-block-ico{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#16274a;font-size:19px;flex-shrink:0}
.cat-block-txt{flex:1;min-width:0}
.cat-block-name{display:block;font-size:16px;font-weight:800;color:#fff;margin:0}
.cat-block-count{font-size:11px;font-weight:700;color:#0F1E3D;background:#e6c258;border-radius:50px;padding:3px 9px;white-space:nowrap;flex-shrink:0}
.cat-block-chev{font-size:12px;color:#8ea0c4;transition:transform .25s;flex-shrink:0}
.cat-block.collapsed .cat-block-chev{transform:rotate(-90deg)}
.cat-block.collapsed .cat-block-body{display:none}
.cat-block.collapsed .cat-block-head{margin-bottom:0;border-bottom-color:transparent}
.cat-block-body{display:flex;flex-direction:column;gap:8px}
@media(max-width:430px){.hero h1{font-size:21px}.cat-block-name{font-size:15px}}
</style>
</head>
<body>
<div class="header"><a href="../index.html">← Arabic site</a><span class="brand">Khidmaty <span>AI</span></span></div>
<div class="wrap">
  <div class="hero">
    <h1>Egyptian government services, in English</h1>
    <p>87 services — national ID, passports, licences, taxes, pensions, property and utilities. Each entry opens the full guide: required documents, authority, fees and processing time.</p>
  </div>
  <div class="search"><input id="q" type="search" placeholder="Search: passport, national ID, taxes…" aria-label="Search services"></div>
  <p class="count" id="count"></p>
  <div id="list"></div>

  <div class="note">
    <p><strong>Language note:</strong> the detailed guides are written in Arabic, because that is the language of the documents and the staff you will deal with. This page is the English index.</p>
    <p><strong>Data note:</strong> fees and processing times are copied from the published source page. Where a field says “not stated in the guide”, the source does not publish it — it does not mean free or instant.</p>
  </div>
</div>
<div class="footer"><p>© 2026 Khidmaty AI — <a href="../docs-finder.html">Documents finder</a> · <a href="../offices.html">Office directory</a> · <a href="../services.html">All services (AR)</a></p><p style="font-size:11.5px;color:#3f4f6b">by m.ismail</p></div>
<script>var DATA = __DATA__;</script>
<script>__JS__</script>
</body>
</html>
"""

JS = r"""
var Q = document.getElementById('q');
var LIST = document.getElementById('list');
var CNT = document.getElementById('count');
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
var ICONS = {
  'Traffic':'🚗','Civil Registry':'🪪','Civil Documents':'📄','Real Estate Registry':'🏘️',
  'Taxes':'💰','Utilities':'🏠','Social Insurance':'👴','Passports & Emigration':'✈️',
  'Travel Documents':'🛂','Health':'🏥','Post':'📮','Education':'🎓','Courts':'⚖️',
  'Family & Civil Courts':'👨‍👩‍👧','Companies':'🏢','Commercial':'🏭','Social Solidarity':'🤝',
  'Housing':'🏡','Finance':'💳','Government':'🏛️','Consumer Protection':'🛡️',
  'Criminal Records':'👮','Military Service':'🎖️','Medical Exemption':'🩺',
  'Consular':'🌍','Intellectual Property':'™️'
};
function toggleBlock(btn){
  var sec = btn.parentNode;
  var closed = sec.className.indexOf('collapsed') > -1;
  sec.className = closed ? 'cat-block' : 'cat-block collapsed';
  btn.setAttribute('aria-expanded', closed ? 'true' : 'false');
}
function render(q){
  var term = (q||'').trim().toLowerCase();
  var rows = DATA.filter(function(s){
    if(!term) return true;
    return (s.en + ' ' + s.cat + ' ' + s.ar).toLowerCase().indexOf(term) > -1;
  });
  var groups = grouped(rows);
  var keys = Object.keys(groups);
  CNT.innerHTML = term
    ? rows.length + ' service' + (rows.length === 1 ? '' : 's') + ' matching “' + esc(q.trim()) + '”'
    : DATA.length + ' services in ' + keys.length + ' categories';
  LIST.innerHTML = keys.map(function(cat){
    return '<section class="cat-block">'
      + '<button class="cat-block-head" onclick="toggleBlock(this)" aria-expanded="true">'
      +   '<span class="cat-block-ico">' + (ICONS[cat] || '📌') + '</span>'
      +   '<span class="cat-block-txt"><span class="cat-block-name">' + esc(cat) + '</span></span>'
      +   '<span class="cat-block-count">' + groups[cat].length + '</span>'
      +   '<span class="cat-block-chev" aria-hidden="true">▾</span>'
      + '</button>'
      + '<div class="cat-block-body">' + groups[cat].map(function(s){
            return '<a class="item" href="../' + esc(s.link) + '">'
              + '<span class="txt"><span class="en">' + esc(s.en) + '</span>'
              + '<span class="ar">' + esc(s.ar) + '</span></span>'
              + '<span class="go">Guide</span></a>';
          }).join('') + '</div>'
      + '</section>';
  }).join('');
  if(!rows.length){
    LIST.innerHTML = '<p style="color:#8ea0c4;font-size:13.5px">No service matches that word. Try “passport”, “tax” or “licence”.</p>';
  }
}
function grouped(rows){
  var g = {};
  rows.slice().sort(function(a,b){ return a.en.localeCompare(b.en); }).forEach(function(s){
    (g[s.cat] = g[s.cat] || []).push(s);
  });
  return g;
}
Q.addEventListener('input', function(){ render(Q.value); });
render('');
"""


def main():
    rows = json.loads(DATA.read_text(encoding="utf-8"))["services"]
    missing = [r["slug"] for r in rows if r["slug"] not in TITLES]
    if missing:
        print("⚠️ خدمات من غير اسم إنجليزي:", ", ".join(missing))
    out = []
    for r in rows:
        if r["slug"] not in TITLES:
            continue
        out.append(
            {
                "slug": r["slug"],
                "en": TITLES[r["slug"]],
                "ar": r["title"],
                "cat": CAT_OVERRIDE.get(r["slug"]) or CATS.get(r["cat"], "Other services"),
                "link": r["link"],
            }
        )
    html = (
        PAGE.replace("__DATA__", json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        .replace("__JS__", JS)
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print("en/index.html:", len(html), "حرف |", len(out), "خدمة |", len({o['cat'] for o in out}), "تصنيف")


if __name__ == "__main__":
    main()
