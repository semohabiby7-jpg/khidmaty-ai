#!/usr/bin/env python3
"""مقارنة أسبوع/أسبوع + أحداث مدي — GA4"""
import json
from google.analytics.data import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.oauth2 import service_account

VAULT='/home/user/workspace/khidmaty-vault/ga-service-account.json'
PID='554298401'
creds=service_account.Credentials.from_service_account_file(VAULT,scopes=['https://www.googleapis.com/auth/analytics.readonly'])
c=BetaAnalyticsDataClient(credentials=creds)

def rep(start,end,dims=None,mets=None):
    r=RunReportRequest(property=f'properties/{PID}',
        date_ranges=[DateRange(start_date=start,end_date=end)],
        dimensions=[Dimension(name=d) for d in (dims or [])],
        metrics=[Metric(name=m) for m in (mets or ['totalUsers','newUsers','sessions','screenPageViews','averageSessionDuration','engagementRate'])])
    out=[]
    for row in c.run_report(r).rows:
        out.append({**{d: v.value for d,v in zip(dims or [], row.dimension_values)},
                    **{m: row.metric_values[i].value for i,m in enumerate(mets or ['totalUsers','newUsers','sessions','screenPageViews','averageSessionDuration','engagementRate'])}})
    return out

res={}
res['this_week']=rep('7daysAgo','yesterday')
res['last_week']=rep('14daysAgo','8daysAgo')
res['events']=rep('7daysAgo','yesterday',['eventName'],['eventCount'])
res['last_events']=rep('14daysAgo','8daysAgo',['eventName'],['eventCount'])
res['daily']=rep('7daysAgo','today',['date'],['totalUsers','sessions','screenPageViews'])
json.dump(res,open('ideas/ga-weekly.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(json.dumps({k:res[k] for k in ('this_week','last_week')},ensure_ascii=False,indent=1))
print('EVENTS THIS WEEK:',json.dumps(res['events'],ensure_ascii=False))
print('EVENTS LAST WEEK:',json.dumps(res['last_events'],ensure_ascii=False))
