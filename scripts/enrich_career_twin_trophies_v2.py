#!/usr/bin/env python3
import json,re,time,threading,unicodedata
from pathlib import Path
from datetime import datetime,timezone
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
BASE='https://transfermarkt-api.fly.dev/players/{}/achievements'
LIMIT=360
TIMEOUT=25
REQUEST_INTERVAL=1.65
UA={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/6.0','Accept':'application/json'}
PRIORITY_IDS=[418560,342229,581678,132098,861410,68863,28396,28003,8198,149577]

INDIVIDUAL_WORDS=('top scorer','top goalscorer','goalscorer','player of','footballer of','most valuable player','golden boot','golden ball','best player','young player','player of the season','player of the tournament','footballer of the year','assist leader','striker of the year','midfielder of the year','defender of the year','goalkeeper of the year','talent of the year','torschutzenkonig','weltfussballer','fussballer des jahres','gol krali','yilin futbolcusu','sezonun oyuncusu','turnuvanin oyuncusu','altin ayakkabi','golden boy','ballon d or','uefa best player','most assists','assist king')
NON_WIN_WORDS=('participant','participation','finalist','runner up','runners up','second place','vice champion','vice-champion','katilimci','katilimcisi','ikincisi','finalisti','teilnehmer','vizemeister','finalteilnahme','subcampeon','subcampeón','finaliste','runners-up')
YOUTH_WORDS=('u15','u16','u17','u18','u19','u20','u21','u23','under 15','under 16','under 17','under 18','under 19','under 20','under 21','under 23','youth','jugend','academy','juvenil','primavera','altyapi','gencler')
_lock=threading.Lock();_next_allowed=0.0


def norm_text(s):
    s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
    return ' '.join(re.sub(r'[^a-z0-9]+',' ',s).split())


def throttled_get(url):
    global _next_allowed
    for attempt in range(4):
        with _lock:
            now=time.monotonic();wait=max(0.0,_next_allowed-now)
            if wait:time.sleep(wait)
            _next_allowed=time.monotonic()+REQUEST_INTERVAL
        try:
            r=requests.get(url,headers=UA,timeout=TIMEOUT)
            if r.status_code==200:return r.json()
            if r.status_code==429:time.sleep(4+attempt*3);continue
            if r.status_code in (500,502,503,504):time.sleep(2+attempt*2);continue
            return None
        except Exception:time.sleep(2+attempt*2)
    return None


def is_team_trophy(item):
    title=norm_text(item.get('title'))
    if not title:return False
    if any(norm_text(w) in title for w in INDIVIDUAL_WORDS):return False
    if any(norm_text(w) in title for w in NON_WIN_WORDS):return False
    if any(norm_text(w) in title for w in YOUTH_WORDS):return False
    details=item.get('details') or []
    return isinstance(details,list) and any(isinstance(d,dict) and d.get('season') and (d.get('club') or d.get('competition')) for d in details)


def trophy_total(payload):
    achievements=(payload or {}).get('achievements')
    if not isinstance(achievements,list):return None
    total=0;titles=[]
    for item in achievements:
        if not isinstance(item,dict) or not is_team_trophy(item):continue
        valid=[d for d in (item.get('details') or []) if isinstance(d,dict) and d.get('season') and (d.get('club') or d.get('competition'))]
        if not valid:continue
        total+=len(valid);titles.append({'title':item.get('title'),'count':len(valid)})
    return total,titles


def main():
    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    byid={int(p['id']):p for p in players+candidates};records=list(byid.values())
    priority={pid:i for i,pid in enumerate(PRIORITY_IDS)}
    req=['height_cm','weight_kg','birth_date','club_count','career_goals','career_assists','peak_market_value_eur','career_appearances']
    eligible=[]
    for p in records:
        if p.get('trophies') is not None:continue
        if not all(p.get(k) is not None for k in req):continue
        career=str((p.get('sources') or {}).get('career_stats') or '').lower()
        if 'transfermarkt' not in career:continue
        eligible.append(p)
    eligible.sort(key=lambda p:(
        0 if int(p['id']) in priority else 1,
        priority.get(int(p['id']),9999),
        0 if p.get('turkish_familiar') else 1,
        0 if p.get('focus_history') else 1,
        -float(p.get('recognition_score') or 0)
    ))
    targets=eligible[:LIMIT]
    verified=failed=0
    for i,p in enumerate(targets,1):
        result=trophy_total(throttled_get(BASE.format(int(p['id']))))
        if result is None:
            failed+=1
        else:
            total,titles=result;p['trophies']=int(total)
            p.setdefault('sources',{})['trophies']='transfermarkt-api.fly.dev achievements (Transfermarkt)'
            p['verified_team_trophy_titles']=titles;p['tm_trophies_verified_at']=datetime.now(timezone.utc).isoformat();verified+=1
        if i%20==0:print(f'trophies {i}/{len(targets)} verified={verified} failed={failed}',flush=True)

    records=list(byid.values());records.sort(key=lambda p:(not bool(p.get('turkish_familiar')),not bool(p.get('focus_history')),-float(p.get('recognition_score') or 0)))
    (DATA/'players.json').write_text('[]',encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({'generated_at':datetime.now(timezone.utc).isoformat(),'playable_count':0,'candidate_count':len(records),'tm_achievement_targets':len(targets),'tm_achievement_verified':verified,'tm_achievement_failed':failed,'trophy_definition':'Senior team trophies only; individual awards, youth titles, finalist/runner-up and participation excluded.'})
    meta.setdefault('sources',{})['transfermarkt_achievements_proxy']='https://transfermarkt-api.fly.dev/'
    (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'targets':len(targets),'verified':verified,'failed':failed},ensure_ascii=False))

if __name__=='__main__':main()
