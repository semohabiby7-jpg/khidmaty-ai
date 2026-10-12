#!/usr/bin/env python3
"""
خِدْمَتي AI — Competitor Monitor (Saher S3)
يراقب مواقع المنافسين ويقارن المحتوى والخدمات
Usage: python3 tools/competitor-monitor.py
"""
import json, os, sys, re
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Competitors to monitor
COMPETITORS = [
    {
        'name': 'مصر الرقمية',
        'url': 'https://digital.gov.eg',
        'type': 'حكومي رسمي',
        'notes': 'البوابة الرسمية للحكومة المصرية'
    },
    {
        'name': 'مصراوي',
        'url': 'https://www.masrawy.com',
        'type': 'بوابة إخبارية',
        'notes': 'محتوى خدمات حكومية ضمن بوابة إخبارية'
    },
    {
        'name': 'اليوم السابع',
        'url': 'https://www.youm7.com',
        'type': 'بوابة إخبارية',
        'notes': 'قسم خدمات حكومية شامل'
    },
    {
        'name': 'في الفقر والغفران (خدمات)',
        'url': 'https://www.elfagr.org',
        'type': 'بوابة إخبارية',
        'notes': 'مقالات عن الخدمات الحكومية'
    },
]

# Our services to compare
OUR_SERVICES = [
    'شهادة ميلاد', 'بطاقة رقم قومي', 'جواز سفر', 'رخصة قيادة',
    'فحص سيارة', 'نقل ملكية', 'توكيل رسمي', 'عقد زواج',
    'شهادة وفاة', 'معاش', 'تقرير طبي', 'تطعيم'
]

def fetch_page(url, timeout=15):
    """Fetch a URL and return (status, content)"""
    try:
        req = Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        resp = urlopen(req, timeout=timeout)
        content = resp.read().decode('utf-8', errors='ignore')
        return resp.getcode(), content
    except HTTPError as e:
        return e.code, ''
    except URLError as e:
        return 0, str(e.reason)
    except Exception as e:
        return -1, str(e)

def check_service_coverage(content, service_name):
    """Check if a service is mentioned on a page"""
    if not content:
        return False
    return service_name in content

def monitor_competitor(comp):
    """Monitor a single competitor"""
    print(f"  Checking {comp['name']}...", end=' ')
    status, content = fetch_page(comp['url'])

    result = {
        'name': comp['name'],
        'url': comp['url'],
        'type': comp['type'],
        'status': status,
        'accessible': status == 200,
        'page_size': len(content) if content else 0,
        'services_found': [],
        'services_missing': [],
        'checked_at': datetime.now().isoformat()
    }

    # Check service coverage
    for service in OUR_SERVICES:
        if check_service_coverage(content, service):
            result['services_found'].append(service)
        else:
            result['services_missing'].append(service)

    coverage = len(result['services_found']) / len(OUR_SERVICES) * 100
    result['coverage_pct'] = round(coverage, 1)

    if status == 200:
        print(f"✅ {status} — {len(result['services_found'])}/{len(OUR_SERVICES)} خدمات ({coverage:.0f}%)")
    elif status > 0:
        print(f"⚠️ {status}")
    else:
        print(f"❌ {content[:60] if content else 'Unreachable'}")

    return result

def main():
    print("=" * 50)
    print("📊 خِدْمَتي AI — مراقبة المنافسين (ساهر #3)")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    results = []
    for comp in COMPETITORS:
        result = monitor_competitor(comp)
        results.append(result)

    # Our coverage (check multiple pages — homepage + services index + calc)
    print(f"\n  Checking khidmaty.ai...", end=' ')
    our_pages = [
        'https://khidmaty.ai/index.html',
        'https://khidmaty.ai/services/traffic.html',
        'https://khidmaty.ai/services/civil.html',
        'https://khidmaty.ai/services/notary.html',
        'https://khidmaty.ai/services/insurance.html',
        'https://khidmaty.ai/services/travel.html',
        'https://khidmaty.ai/services/health.html',
        'https://khidmaty.ai/calc.html',
    ]
    our_content = ''
    for url in our_pages:
        s, c = fetch_page(url, timeout=10)
        if c:
            our_content += c + ' '
    our_services = [s for s in OUR_SERVICES if s in our_content] if our_content else []
    our_coverage = len(our_services) / len(OUR_SERVICES) * 100
    print(f"✅ — {len(our_services)}/{len(OUR_SERVICES)} ({our_coverage:.0f}%)")

    # Comparison
    print("\n" + "=" * 50)
    print("📈 مقارنة التغطية:")
    print(f"  خِدْمَتي AI: {our_coverage:.0f}%")
    for r in results:
        emoji = '🟢' if r['accessible'] else '🔴'
        print(f"  {emoji} {r['name']}: {r['coverage_pct']}%")
    print("=" * 50)

    # Generate report
    report = f"""# 📊 تقرير مراقبة المنافسين — خِدْمَتي AI

**التاريخ:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**المولّد بواسطة:** `tools/competitor-monitor.py` (ساهر #3)

---

## 📈 مقارنة التغطية

| المنصة | الحالة | تغطية الخدمات | خدمات مذكورة | ناقصة |
|---|---|---|---|---|
| **خِدْمَتي AI** | ✅ | {our_coverage:.0f}% | {len(our_services)}/{len(OUR_SERVICES)} | {len(OUR_SERVICES) - len(our_services)} |
"""

    for r in results:
        emoji = '✅' if r['accessible'] else '❌'
        report += f"| {r['name']} | {emoji} {r['status']} | {r['coverage_pct']}% | {len(r['services_found'])}/{len(OUR_SERVICES)} | {len(r['services_missing'])} |\n"

    report += f"\n---\n\n## 🔍 تفاصيل المنافسين\n\n"
    for r in results:
        report += f"### {r['name']}\n"
        report += f"- **URL:** {r['url']}\n"
        report += f"- **النوع:** {r['type']}\n"
        report += f"- **الحالة:** {r['status']}\n"
        report += f"- **حجم الصفحة:** {r['page_size']:,} بايت\n"
        report += f"- **التغطية:** {r['coverage_pct']}%\n"
        if r['services_found']:
            report += f"- **خدمات مذكورة:** {', '.join(r['services_found'])}\n"
        if r['services_missing']:
            report += f"- **خدمات ناقصة:** {', '.join(r['services_missing'])}\n"
        report += "\n"

    # Strategic insights
    report += """---\n\n## 💡 رؤى استراتيجية

"""
    # Find our advantages
    our_advantages = []
    for r in results:
        if our_coverage > r['coverage_pct']:
            our_advantages.append(f"تغطية أعلى من {r['name']} ({our_coverage:.0f}% مقابل {r['coverage_pct']}%)")

    if our_advantages:
        report += "### نقاط قوتنا:\n"
        for a in our_advantages:
            report += f"- ✅ {a}\n"

    # Find gaps
    gaps = []
    for s in OUR_SERVICES:
        if s not in our_services:
            gaps.append(s)

    if gaps:
        report += "\n### خدمات ناقصة عندنا:\n"
        for g in gaps:
            report += f"- ⚠️ {g}\n"
    else:
        report += "\n### ✅ كل الخدمات الرئيسية موجودة عندنا!\n"

    report += f"\n---\n\n*تم توليد هذا التقرير تلقائيًا — ساهر #3*\n"

    # Save report
    report_path = os.path.join(ROOT, 'ideas', 'competitor-report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    # Save JSON
    json_path = os.path.join(ROOT, 'ideas', 'competitor-data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': datetime.now().isoformat(),
            'our_coverage': round(our_coverage, 1),
            'our_services': our_services,
            'competitors': results
        }, f, ensure_ascii=False, indent=2)

    print(f"\n📄 تقرير: {report_path}")
    print(f"📄 بيانات: {json_path}")
    print(f"\n✅ تم! تغطيتنا {our_coverage:.0f}% مقابل متوسط المنافسين {sum(r['coverage_pct'] for r in results)/len(results):.0f}%")

if __name__ == '__main__':
    main()
