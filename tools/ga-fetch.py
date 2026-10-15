#!/usr/bin/env python3
"""
خِدْمَتي AI — GA Quick Fetch
يطبع JSON ببيانات Google Analytics لاستخدامها في الـWorker
Usage: python3 tools/ga-fetch.py
"""
import json, sys
from datetime import datetime, timedelta
from google.analytics.data import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange, Dimension, Metric, RunReportRequest
)
from google.oauth2 import service_account

VAULT = '/home/user/workspace/khidmaty-vault/ga-service-account.json'
GA_PROPERTY_ID = '554298401'

def get_client():
    credentials = service_account.Credentials.from_service_account_file(
        VAULT, scopes=['https://www.googleapis.com/auth/analytics.readonly']
    )
    return BetaAnalyticsDataClient(credentials=credentials)

def run_report(client, start, end, dimensions=None, metrics=None):
    req = RunReportRequest(
        property=f'properties/{GA_PROPERTY_ID}',
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[Dimension(name=d) for d in (dimensions or [])],
        metrics=[Metric(name=m) for m in (metrics or ['sessions','totalUsers','screenPageViews'])],
    )
    resp = client.run_report(req)
    rows = []
    for row in resp.rows:
        data = {}
        for i, dim in enumerate(resp.dimension_headers):
            data[dim.name] = row.dimension_values[i].value
        for i, metric in enumerate(resp.metric_headers):
            data[metric.name] = row.metric_values[i].value
        rows.append(data)
    return rows

def main():
    client = get_client()
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    last_7 = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    last_30 = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    # Today
    t = run_report(client, today, today)
    today_data = t[0] if t else {}

    # Yesterday
    y = run_report(client, yesterday, yesterday)
    yest_data = y[0] if y else {}

    # Last 30 days totals
    m = run_report(client, last_30, today)
    month_data = m[0] if m else {}

    # Top pages (30 days)
    pages = run_report(client, last_30, today,
                       dimensions=['pagePath'],
                       metrics=['screenPageViews','totalUsers'])

    # Sources (30 days)
    sources = run_report(client, last_30, today,
                         dimensions=['sessionSource'],
                         metrics=['sessions','totalUsers'])

    # Daily (7 days)
    daily = run_report(client, last_7, today,
                       dimensions=['date'],
                       metrics=['totalUsers','sessions','screenPageViews'])

    result = {
        'generated': datetime.now().isoformat(),
        'today': {
            'users': today_data.get('totalUsers', 0),
            'sessions': today_data.get('sessions', 0),
            'pageViews': today_data.get('screenPageViews', 0),
        },
        'yesterday': {
            'users': yest_data.get('totalUsers', 0),
            'sessions': yest_data.get('sessions', 0),
            'pageViews': yest_data.get('screenPageViews', 0),
        },
        'last30days': {
            'users': month_data.get('totalUsers', 0),
            'sessions': month_data.get('sessions', 0),
            'pageViews': month_data.get('screenPageViews', 0),
        },
        'topPages': [{'path': p.get('pagePath',''), 'views': p.get('screenPageViews',0), 'users': p.get('totalUsers',0)} for p in pages[:10]],
        'sources': [{'source': s.get('sessionSource',''), 'sessions': s.get('sessions',0), 'users': s.get('totalUsers',0)} for s in sources[:10]],
        'daily': [{'date': d.get('date',''), 'users': d.get('totalUsers',0), 'sessions': d.get('sessions',0), 'views': d.get('screenPageViews',0)} for d in daily],
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
