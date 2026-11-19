"""Calculate provincial hourly IODA medians for storm comparisons and the recent week."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date,datetime,timedelta,timezone
import json, math
from pathlib import Path
from statistics import median
from time import sleep
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/region/'
def midnight(day,zone):
    return int(datetime.combine(date.fromisoformat(day),datetime.min.time(),ZoneInfo(zone)).timestamp())
def retrieve(url):
    for attempt in range(4):
        try:
            with urlopen(Request(url,headers={'User-Agent':'CoolCode Grid Dark public research'}),timeout=35) as r:return json.load(r)
        except OSError:
            if attempt==3:raise
            sleep(2**attempt)
def summarize(series,start,end,baseline_start):
    step=series['step']
    if step!=series['nativeStep'] or not 60<=step<=3600:raise ValueError('Unsupported or downsampled IODA signal')
    hourly={}
    for index,value in enumerate(series['values']):
        ts=series['from']+step*index
        if isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value):
            hourly.setdefault(ts-ts%3600,[]).append(value)
    # A partial hour requires at least half its expected samples.
    required=math.ceil(1800/step)
    valid={t:median(v) for t,v in hourly.items() if len(v)>=required}
    baseline=[v for t,v in valid.items() if baseline_start<=t<start]
    if len(baseline)<84 or median(baseline)<=0:raise ValueError('Fewer than half the reference week’s hours have usable readings')
    ref=median(baseline)
    points=[[t,round(valid[t]/ref*100,1) if t in valid else None,len(hourly.get(t,[]))] for t in range(start,end,3600)]
    if not any(p[1] is not None for p in points):raise ValueError('No usable hours in the requested interval')
    return {'baseline':ref,'baselineHours':len(baseline),'nativeMinutes':step/60,'points':points}
def calculate(case,metric):
    start=midnight(case['start'],case['zone'])
    end=midnight(case['end'],case['zone'])
    before=start-7*86400
    url=BASE+case['region']+'?'+urlencode(dict(datasource=metric,**{'from':before,'until':end,'maxPoints':20000}))
    response=retrieve(url)
    series=[s for group in response['data'] for s in group if s['entityCode']==case['region'] and s['datasource']==metric]
    if len(series)!=1:raise ValueError('Unexpected IODA series count '+str(len(series)))
    return {**summarize(series[0],start,end,before),'source':url}
def archive_days(cases,captured,target):
    """Keep each complete local day's first validated summary for later comparison."""
    saved=json.loads(target.read_text()) if target.exists() else {}
    for case_id,case in cases.items():
        if not case_id.startswith('recent-'):continue
        station=saved.setdefault(case['region'],{})
        zone=ZoneInfo(case['zone'])
        merged={}
        for metric,series in case['signals'].items():
            hourly={}
            for t,v,n in series['points']:
                if v is not None:
                    day=datetime.fromtimestamp(t,zone).date().isoformat()
                    hourly.setdefault(day,[]).append(v)
            for day,values in hourly.items():
                merged.setdefault(day,{})[metric]={'minimum':min(values),'median':round(median(values),1),'hours':len(values),'baseline':series['baseline']}
        for day,metrics in merged.items():
            following=(date.fromisoformat(day)+timedelta(days=1)).isoformat()
            expected=(midnight(following,case['zone'])-midnight(day,case['zone']))//3600
            if len(metrics)==2 and all(m['hours']==expected for m in metrics.values()):
                station.setdefault(day,{'captured':captured,'baselineStart':case['start'],'signals':metrics})
    return saved
def main():
    all_cases=json.loads((ROOT/'sources/bulletins.json').read_text())
    now=datetime.now(timezone.utc)
    for key,base in list(all_cases.items()):
        today=now.astimezone(ZoneInfo(base['zone'])).date()
        all_cases['recent-'+key]={**base,'name':'Recent week','start':(today-timedelta(days=8)).isoformat(),
            'end':(today-timedelta(days=1)).isoformat(),'bulletins':[],
            'context':'This rolling view shows the most recent seven complete local dates with a one-day reporting allowance. Current electricity reports are available from the utility.'}
    jobs=[(k,m) for k in all_cases for m in ['ping-slash24','bgp']]
    def task(pair):
        key,metric=pair
        return key,metric,calculate(all_cases[key],metric)
    with ThreadPoolExecutor(4) as pool:
        for k,m,series in pool.map(task,jobs):all_cases[k].setdefault('signals',{})[m]=series
    payload={'powerReviewed':'2026-11-19','retrieved':now.date().isoformat(),'bulletins':sum(len(v['bulletins']) for v in all_cases.values()),'cases':all_cases}
    days_file=ROOT/'web'/'daily.json'
    days=archive_days(all_cases,payload['retrieved'],days_file)
    days_file.with_suffix('.tmp').write_text(json.dumps(days,separators=(',',':'))+'\n')
    days_file.with_suffix('.tmp').replace(days_file)
    target=ROOT/'web'/'events.json'
    target.with_suffix('.tmp').write_text(json.dumps(payload,separators=(',',':'))+'\n')
    target.with_suffix('.tmp').replace(target)
    (ROOT/'web'/'status.json').write_text(json.dumps({'retrieved':payload['retrieved'],'bulletins':payload['bulletins'],'cases':2})+'\n')
    for k,c in all_cases.items():print(k,{m:min(p[1] for p in s['points'] if p[1] is not None) for m,s in c['signals'].items()})
if __name__=='__main__':main()
