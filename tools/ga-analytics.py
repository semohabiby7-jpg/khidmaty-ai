#!/usr/bin/env python3
"""
خِدْمَتي AI — Google Analytics Report (Saher S4 + S5)
يسحب بيانات الزيارات من Google Analytics API
Usage: python3 tools/ga-analytics.py
"""
import json, os, sys
from datetime import datetime, timedelta

# Google Analytics
from google.analytics.data import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange, Dimension, Metric, RunReportRequest, GetMetadataRequest
)
from google.oauth2 import service_account

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT = '/home/user/workspace/khidmaty-vault/ga-service-account.json'
GA_PROPERTY_ID = 0  # هتتحدد تلقائيًا

def get_client():
    """Create GA client with service account credentials"""
    credentials = service_account.Credentials.from_service_account_file(
        VAULT,
        scopes=['https://www.googleapis.com/auth/analytics.readonly']
    )
    return BetaAnalyticsDataClient(credentials=credentials)

def list_properties():
    """List available GA4 properties"""
    from google.analytics.admin_v1beta import AnalyticsAdminServiceClient
    from google.analytics.admin_v1beta.types import ListAccountSummariesRequest
    
    credentials = service_account.Credentials.from_service_account_file(
        VAULT,
        scopes=['https://www.googleapis.com/auth/analytics.readonly']
    )
    admin_client = AnalyticsAdminServiceClient(credentials=credentials)
    
    request = ListAccountSummariesRequest(page_size=100)
    response = admin_client.list_account_summaries(request=request)
    
    properties = []
    for account in response.account_summaries:
        for prop in account.property_summaries:
            properties.append({
                'display_name': prop.display_name,
                'property': prop.property
            })
    return properties

def run_report(client, property_id, start_date, end_date, dimensions=None, metrics=None):
    """Run a GA4 report"""
    request = RunReportRequest(
        property=f'properties/{property_id}',
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimensions=[Dimension(name=d) for d in (dimensions or [])],
        metrics=[Metric(name=m) for m in (metrics or ['sessions', 'totalUsers', 'screenPageViews'])],
    )
    response = client.run_report(request)
    
    # Parse results
    results = []
    for row in response.rows:
        data = {}
        for i, dim in enumerate(response.dimension_headers):
            data[dim.name] = row.dimension_values[i].value
        for i, metric in enumerate(response.metric_headers):
            data[metric.name] = row.metric_values[i].value
        results.append(data)
    
    return results

def get_totals(client, property_id, start_date, end_date):
    """Get total metrics for date range"""
    return run_report(client, property_id, start_date, end_date,
                      metrics=['totalUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'bounceRate'])

def get_by_page(client, property_id, start_date, end_date):
    """Get metrics broken down by page path"""
    return run_report(client, property_id, start_date, end_date,
                      dimensions=['pagePath'],
                      metrics=['screenPageViews', 'totalUsers', 'averageSessionDuration'])

def get_by_source(client, property_id, start_date, end_date):
    """Get metrics broken down by traffic source"""
    return run_report(client, property_id, start_date, end_date,
                      dimensions=['sessionSource'],
                      metrics=['sessions', 'totalUsers'])

def get_by_device(client, property_id, start_date, end_date):
    """Get metrics broken down by device"""
    return run_report(client, property_id, start_date, end_date,
                      dimensions=['deviceCategory'],
                      metrics=['sessions', 'totalUsers'])

def get_daily(client, property_id, start_date, end_date):
    """Get daily metrics"""
    return run_report(client, property_id, start_date, end_date,
                      dimensions=['date'],
                      metrics=['totalUsers', 'sessions', 'screenPageViews'])

def main():
    print("=" * 55)
    print("📊 خِدْمَتي AI — تقرير Google Analytics")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 55)
    
    # Check if credentials file exists
    if not os.path.exists(VAULT):
        print(f"❌ ملف الاعتماد مش موجود: {VAULT}")
        sys.exit(1)
    
    # List properties to find the right one
    print("\n🔍 البحث عن خصائص Analytics...")
    try:
        properties = list_properties()
        if not properties:
            print("❌ مفيش خصائص GA4 مرتبطة بالـ Service Account")
            print("\n⚠️ لازم تضيف email الـ Service Account في Google Analytics:")
            print("   khidmaty-analytics@gen-lang-client-0276369253.iam.gserviceaccount.com")
            print("\n   analytics.google.com → Admin → Property Access Management → Add User")
            sys.exit(1)
        
        print(f"\n✅ لقينا {len(properties)} خاصية:")
        for p in properties:
            print(f"  📊 {p['display_name']} — {p['property']}")
        
        # Use first property
        prop_str = properties[0]['property']
        property_id = prop_str.split('/')[-1]
        print(f"\n📌 نستخدم: {properties[0]['display_name']} (ID: {property_id})")
    except Exception as e:
        print(f"❌ خطأ في جلب الخصائص: {e}")
        print("\n⚠️ تأكد إنك ضفت email الـ Service Account في Google Analytics:")
        print("   khidmaty-analytics@gen-lang-client-0276369253.iam.gserviceaccount.com")
        print("   analytics.google.com → Admin → Property Access Management → Add User → Viewer")
        sys.exit(1)
    
    # Create client
    client = get_client()
    
    # Date ranges
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    last_7_days = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    last_30_days = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    # 1. Totals
    print(f"\n📊 إجمالي آخر 30 يوم ({last_30_days} → {today}):")
    totals = get_totals(client, property_id, last_30_days, today)
    if totals:
        t = totals[0]
        print(f"  👥 المستخدمين: {t.get('totalUsers', 0)}")
        print(f"  🌐 الجلسات: {t.get('sessions', 0)}")
        print(f"  📄 مشاهدات الصفحات: {t.get('screenPageViews', 0)}")
        print(f"  ⏱️ متوسط مدة الجلسة: {float(t.get('averageSessionDuration', 0)):.0f}s")
        print(f"  📊 معدل الارتداد: {float(t.get('bounceRate', 0)):.1f}%")
    else:
        print("  مفيش بيانات")
    
    # 2. Yesterday
    print(f"\n📅 أمس ({yesterday}):")
    yest = get_totals(client, property_id, yesterday, yesterday)
    if yest:
        t = yest[0]
        print(f"  👥 المستخدمين: {t.get('totalUsers', 0)}")
        print(f"  🌐 الجلسات: {t.get('sessions', 0)}")
        print(f"  📄 مشاهدات: {t.get('screenPageViews', 0)}")
    else:
        print("  مفيش بيانات")
    
    # 3. Top pages
    print(f"\n📄 أعلى الصفحات زيارة (آخر 30 يوم):")
    pages = get_by_page(client, property_id, last_30_days, today)
    for p in pages[:10]:
        print(f"  {p.get('pagePath', '?')}: {p.get('screenPageViews', 0)} مشاهدة، {p.get('totalUsers', 0)} مستخدم")
    
    # 4. Traffic sources
    print(f"\n🌐 مصادر الزيارات:")
    sources = get_by_source(client, property_id, last_30_days, today)
    for s in sources[:10]:
        print(f"  {s.get('sessionSource', '?')}: {s.get('sessions', 0)} جلسة، {s.get('totalUsers', 0)} مستخدم")
    
    # 5. Device breakdown
    print(f"\n📱 الأجهزة:")
    devices = get_by_device(client, property_id, last_30_days, today)
    for d in devices:
        print(f"  {d.get('deviceCategory', '?')}: {d.get('sessions', 0)} جلسة")
    
    # 6. Daily trend
    print(f"\n📈 الزيارات اليومية (آخر 7 أيام):")
    daily = get_daily(client, property_id, last_7_days, today)
    daily.sort(key=lambda x: x.get('date', ''), reverse=True)  # الأحدث أول — أمس فوق (مش حسب الزوار)
    for d in daily:
        date = d.get('date', '')
        if date:
            date_fmt = f"{date[6:8]}/{date[4:6]}"
        else:
            date_fmt = '?'
        print(f"  {date_fmt}: {d.get('totalUsers', 0)} مستخدم، {d.get('sessions', 0)} جلسة، {d.get('screenPageViews', 0)} مشاهدة")
    
    # Save report
    report_data = {
        'timestamp': datetime.now().isoformat(),
        'property_id': property_id,
        'totals_30d': totals,
        'yesterday': yest,
        'top_pages': pages[:20],
        'traffic_sources': sources[:20],
        'devices': devices,
        'daily_7d': daily
    }
    
    report_path = os.path.join(ROOT, 'ideas', 'ga-analytics-report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    
    # Generate markdown report
    md = f"""# 📊 تقرير Google Analytics — خِدْمَتي AI

**التاريخ:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Property ID:** {property_id}

---

## 📈 إجمالي آخر 30 يوم

"""
    if totals:
        t = totals[0]
        md += f"| المؤشر | القيمة |\n|---|---|\n"
        md += f"| 👥 المستخدمين | {t.get('totalUsers', 0)} |\n"
        md += f"| 🌐 الجلسات | {t.get('sessions', 0)} |\n"
        md += f"| 📄 مشاهدات الصفحات | {t.get('screenPageViews', 0)} |\n"
        md += f"| ⏱️ متوسط مدة الجلسة | {float(t.get('averageSessionDuration', 0)):.0f}s |\n"
        md += f"| 📊 معدل الارتداد | {float(t.get('bounceRate', 0)):.1f}% |\n"
    
    if pages:
        md += f"\n---\n\n## 📄 أعلى الصفحات زيارة\n\n| الصفحة | المشاهدات | المستخدمين |\n|---|---|---|\n"
        for p in pages[:15]:
            md += f"| {p.get('pagePath', '?')} | {p.get('screenPageViews', 0)} | {p.get('totalUsers', 0)} |\n"
    
    if sources:
        md += f"\n---\n\n## 🌐 مصادر الزيارات\n\n| المصدر | الجلسات | المستخدمين |\n|---|---|---|\n"
        for s in sources[:10]:
            md += f"| {s.get('sessionSource', '?')} | {s.get('sessions', 0)} | {s.get('totalUsers', 0)} |\n"
    
    md += f"\n---\n\n*تم توليد هذا التقرير بواسطة tools/ga-analytics.py*\n"
    
    md_path = os.path.join(ROOT, 'ideas', 'ga-analytics-report.md')
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"\n✅ تم!")
    print(f"📄 تقرير JSON: {report_path}")
    print(f"📄 تقرير MD: {md_path}")

if __name__ == '__main__':
    main()
