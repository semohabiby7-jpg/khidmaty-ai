import json
from google.analytics.data import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.oauth2 import service_account
creds=service_account.Credentials.from_service_account_file('/home/user/workspace/khidmaty-vault/ga-service-account.json',scopes=['https://www.googleapis.com/auth/analytics.readonly'])
c=BetaAnalyticsDataClient(credentials=creds); PID='554298401'
def rep(s,e,dims,mets):
    r=RunReportRequest(property=f'properties/{PID}',date_ranges=[DateRange(start_date=s,end_date=e)],
        dimensions=[Dimension(name=d) for d in dims],metrics=[Metric(name=m) for m in mets])
    return [{**{d:v.value for d,v in zip(dims,row.dimension_values)},**{m:row.metric_values[i].value for i,m in enumerate(mets)}} for row in c.run_report(r).rows]
out={}
out['src_week']=rep('7daysAgo','yesterday',['sessionSource','sessionMedium'],['sessions','totalUsers'])
out['pages_week']=rep('7daysAgo','yesterday',['pagePath'],['screenPageViews','totalUsers'])
d=rep('7daysAgo','yesterday',['date'],['totalUsers'])
day7=[x for x in d if x['date']=='20261107']
out['src_7nov']=rep('2026-11-07','2026-11-07',['sessionSource','sessionMedium'],['sessions','totalUsers'])
json.dump(out,open('ideas/ga-weekly2.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('SOURCES WEEK:',json.dumps(out['src_week'],ensure_ascii=False))
print('PAGES WEEK:',json.dumps(out['pages_week'][:12],ensure_ascii=False))
print('7NOV SOURCES:',json.dumps(out['src_7nov'],ensure_ascii=False))
