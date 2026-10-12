#!/usr/bin/env python3
"""
خِدْمَتي AI — Site Health Monitor (Saher S2)
يفحص صحة الموقع: uptime, response time, broken links, SSL
Usage: python3 tools/site-health-monitor.py
"""
import json, os, sys, re, time, ssl
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_URL = "https://khidmatyai.com"
ALERT_FILE = os.path.join(ROOT, 'ideas', 'site-alerts.json')
HEALTH_FILE = os.path.join(ROOT, 'ideas', 'site-health.json')
REPORT_FILE = os.path.join(ROOT, 'ideas', 'site-health-report.md')

# Critical pages to monitor
CRITICAL_PAGES = [
    ('الصفحة الرئيسية', '/index.html'),
    ('دليل الخدمات', '/services/traffic.html'),
    ('حاسبة الرسوم', '/calc.html'),
    ('مستكشف الخدمات', '/service-finder.html'),
    ('خريطة المكاتب', '/offices.html'),
    ('المقالات', '/articles.html'),
    ('قصص النجاح', '/success-stories.html'),
    ('الأسئلة الشائعة', '/faq.html'),
    ('لوحة القيادة', '/dashboard.html'),
    ('من نحن', '/about.html'),
    ('تواصل معنا', '/contact.html'),
]

# Thresholds
RESPONSE_TIME_WARN = 3.0   # seconds
RESPONSE_TIME_CRIT = 10.0   # seconds
TIMEOUT = 15

def fetch_page(url, timeout=15):
    """Fetch URL and return (status, response_time, content)"""
    start = time.time()
    try:
        req = Request(url, headers={
            'User-Agent': 'KhidmatyAI-HealthMonitor/1.0'
        })
        resp = urlopen(req, timeout=timeout)
        content = resp.read().decode('utf-8', errors='ignore')
        elapsed = time.time() - start
        return resp.getcode(), elapsed, content
    except HTTPError as e:
        elapsed = time.time() - start
        return e.code, elapsed, ''
    except URLError as e:
        elapsed = time.time() - start
        return 0, elapsed, str(e.reason)
    except Exception as e:
        elapsed = time.time() - start
        return -1, elapsed, str(e)

def check_page(name, path):
    """Check a single page"""
    url = SITE_URL + path
    status, elapsed, content = fetch_page(url)
    
    result = {
        'name': name,
        'url': url,
        'path': path,
        'status': status,
        'response_time': round(elapsed, 2),
        'accessible': status == 200,
        'page_size': len(content) if content else 0,
        'alerts': [],
        'severity': 'OK'
    }
    
    # Check status
    if status != 200:
        result['alerts'].append(f'HTTP {status} — غير قابل للوصول')
        result['severity'] = 'CRITICAL'
    
    # Check response time
    if elapsed >= RESPONSE_TIME_CRIT:
        result['alerts'].append(f'زمن استجابة حرج: {elapsed:.1f}s')
        result['severity'] = 'CRITICAL' if status != 200 else 'WARNING'
    elif elapsed >= RESPONSE_TIME_WARN:
        result['alerts'].append(f'زمن استجابة بطيء: {elapsed:.1f}s')
        if result['severity'] == 'OK':
            result['severity'] = 'WARNING'
    
    # Check for broken images
    if content:
        img_tags = re.findall(r'<img[^>]+src="([^"]+)"', content)
        for img_url in img_tags[:5]:  # Check first 5 images
            if not img_url.startswith('http') and not img_url.startswith('data:'):
                img_full = SITE_URL + '/' + img_url.lstrip('/')
                img_status, _, _ = fetch_page(img_full, timeout=5)
                if img_status != 200:
                    result['alerts'].append(f'صورة مكسورة: {img_url} ({img_status})')
                    if result['severity'] == 'OK':
                        result['severity'] = 'WARNING'
    
    # Check for empty content
    if content and len(content) < 100:
        result['alerts'].append(f'محتوى قليل جدًا: {len(content)} بايت')
        result['severity'] = 'WARNING'
    
    return result

def check_ssl():
    """Check SSL certificate"""
    import socket
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection(('khidmatyai.com', 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname='khidmatyai.com') as ssock:
                cert = ssock.getpeercert()
                expiry = cert.get('notAfter', 'unknown')
        return {'valid': True, 'message': f'SSL valid — expires {expiry}'}
    except Exception as e:
        return {'valid': False, 'message': str(e)}

def check_sitemap():
    """Check sitemap.xml is accessible and valid"""
    status, elapsed, content = fetch_page(SITE_URL + '/sitemap.xml')
    if status == 200 and content:
        url_count = content.count('<url>')
        return {
            'accessible': True,
            'url_count': url_count,
            'response_time': round(elapsed, 2)
        }
    return {'accessible': False, 'url_count': 0, 'response_time': 0}

def check_robots():
    """Check robots.txt"""
    status, elapsed, content = fetch_page(SITE_URL + '/robots.txt')
    return {
        'accessible': status == 200,
        'content_size': len(content) if content else 0
    }

def generate_alerts(results, ssl_info, sitemap_info, robots_info):
    """Generate alerts list"""
    alerts = []
    for r in results:
        for alert in r['alerts']:
            alerts.append({
                'page': r['name'],
                'url': r['url'],
                'alert': alert,
                'severity': r['severity'],
                'timestamp': datetime.now().isoformat()
            })
    
    if not ssl_info['valid']:
        alerts.append({
            'page': 'SSL',
            'url': SITE_URL,
            'alert': f'SSL: {ssl_info["message"]}',
            'severity': 'CRITICAL',
            'timestamp': datetime.now().isoformat()
        })
    
    if not sitemap_info['accessible']:
        alerts.append({
            'page': 'sitemap.xml',
            'url': SITE_URL + '/sitemap.xml',
            'alert': 'sitemap.xml غير قابل للوصول',
            'severity': 'WARNING',
            'timestamp': datetime.now().isoformat()
        })
    
    if not robots_info['accessible']:
        alerts.append({
            'page': 'robots.txt',
            'url': SITE_URL + '/robots.txt',
            'alert': 'robots.txt غير قابل للوصول',
            'severity': 'WARNING',
            'timestamp': datetime.now().isoformat()
        })
    
    return alerts

def main():
    print("=" * 55)
    print("🚨 خِدْمَتي AI — فحص صحة الموقع (ساهر #2)")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 55)
    
    # Check critical pages
    results = []
    for name, path in CRITICAL_PAGES:
        print(f"  Checking {name}...", end=' ')
        r = check_page(name, path)
        results.append(r)
        emoji = '✅' if r['severity'] == 'OK' else ('⚠️' if r['severity'] == 'WARNING' else '❌')
        print(f"{emoji} {r['status']} — {r['response_time']}s")
    
    # Check SSL
    print(f"\n  Checking SSL...", end=' ')
    ssl_info = check_ssl()
    print(f"{'✅' if ssl_info['valid'] else '❌'} {ssl_info['message']}")
    
    # Check sitemap
    print(f"  Checking sitemap.xml...", end=' ')
    sitemap_info = check_sitemap()
    print(f"{'✅' if sitemap_info['accessible'] else '❌'} {sitemap_info['url_count']} URLs")
    
    # Check robots.txt
    print(f"  Checking robots.txt...", end=' ')
    robots_info = check_robots()
    print(f"{'✅' if robots_info['accessible'] else '❌'}")
    
    # Generate alerts
    alerts = generate_alerts(results, ssl_info, sitemap_info, robots_info)
    
    # Summary
    ok_count = sum(1 for r in results if r['severity'] == 'OK')
    warn_count = sum(1 for r in results if r['severity'] == 'WARNING')
    crit_count = sum(1 for r in results if r['severity'] == 'CRITICAL')
    avg_time = sum(r['response_time'] for r in results) / len(results)
    
    print(f"\n{'=' * 55}")
    print(f"📊 ملخص:")
    print(f"  ✅ OK: {ok_count} | ⚠️ Warning: {warn_count} | ❌ Critical: {crit_count}")
    print(f"  ⏱️ متوسط زمن الاستجابة: {avg_time:.2f}s")
    print(f"  🚨 تنبيهات: {len(alerts)}")
    
    # Save health data
    health_data = {
        'timestamp': datetime.now().isoformat(),
        'site_url': SITE_URL,
        'summary': {
            'ok': ok_count,
            'warnings': warn_count,
            'critical': crit_count,
            'avg_response_time': round(avg_time, 2),
            'total_alerts': len(alerts)
        },
        'ssl': ssl_info,
        'sitemap': sitemap_info,
        'robots': robots_info,
        'pages': results
    }
    
    with open(HEALTH_FILE, 'w', encoding='utf-8') as f:
        json.dump(health_data, f, ensure_ascii=False, indent=2)
    
    # Save alerts
    with open(ALERT_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'alerts': alerts
        }, f, ensure_ascii=False, indent=2)
    
    # Generate markdown report
    report = f"""# 🚨 تقرير صحة الموقع — خِدْمَتي AI

**التاريخ:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**المولّد بواسطة:** `tools/site-health-monitor.py` (ساهر #2)

---

## 📊 ملخص الحالة

| المؤشر | القيمة |
|---|---|
| الحالة العامة | {'🟢 سليم' if crit_count == 0 and warn_count == 0 else ('🟡 تحذيرات' if crit_count == 0 else '🔴 مشاكل حرجة')} |
| صفحات OK | {ok_count} |
| صفحات بتحذيرات | {warn_count} |
| صفحات بمشاكل حرجة | {crit_count} |
| متوسط زمن الاستجابة | {avg_time:.2f}s |
| إجمالي التنبيهات | {len(alerts)} |
| SSL | {'✅ سليم' if ssl_info['valid'] else '❌ مشكلة'} |
| sitemap.xml | {'✅ ' + str(sitemap_info['url_count']) + ' URLs' if sitemap_info['accessible'] else '❌ غير متاح'} |
| robots.txt | {'✅' if robots_info['accessible'] else '❌'} |

---

## 📄 تفاصيل الصفحات

| الصفحة | الحالة | زمن الاستجابة | الحجم | Severity |
|---|---|---|---|---|
"""
    for r in results:
        emoji = '✅' if r['severity'] == 'OK' else ('⚠️' if r['severity'] == 'WARNING' else '❌')
        report += f"| {r['name']} | {emoji} {r['status']} | {r['response_time']}s | {r['page_size']:,} | {r['severity']} |\n"
    
    if alerts:
        report += f"\n---\n\n## 🚨 التنبيهات ({len(alerts)})\n\n"
        for a in alerts:
            emoji = '❌' if a['severity'] == 'CRITICAL' else '⚠️'
            report += f"- {emoji} **{a['page']}**: {a['alert']}\n"
    else:
        report += "\n---\n\n## ✅ لا توجد تنبيهات — كل شيء سليم!\n"
    
    report += f"\n---\n\n*تم توليد هذا التقرير تلقائيًا — ساهر #2*\n"
    
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n📄 تقرير: {REPORT_FILE}")
    print(f"📄 بيانات: {HEALTH_FILE}")
    print(f"📄 تنبيهات: {ALERT_FILE}")
    
    if crit_count > 0:
        print(f"\n🚨 تنبيه: فيه {crit_count} مشكلة حرجة تحتاج إصلاح فوري!")
        sys.exit(1)
    
    print(f"\n✅ تم الفحص!")

if __name__ == '__main__':
    main()
