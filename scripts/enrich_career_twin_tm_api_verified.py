#!/usr/bin/env python3
import json,re,time,threading
from pathlib import Path
from datetime import datetime,timezone
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
BASE='https://transfermarkt-api.fly.dev/players/{}/{}'
LIMIT=320
WORKERS=6
TIMEOUT=15
UA={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/2.6','Accept':'application/json'}
_tls=threading.local()
INDIVIDUAL_WORDS=(
 'top scorer','top goalscorer','player of','footballer of','most valuable player','golden boot','golden ball',
 'best player','young player','player of the season','player of the tournament','footballer of the year',
 'striker of the year','midfielder of the year','defender of the year','goalkeeper of the year','talent of the year',
 'torschutzenkonig','torschützenkönig','weltfussballer','weltfußballer','fussballer des jahres','fußballer des jahres',
 'gol krali','gol kralı','yilin futbolcusu','yılın futbolcusu','sezonun oyuncusu','turnuvanin oyuncusu','turnuvanın oyuncusu'
)
YOUTH_WORDS=('u17','u18','u19','u20','u21','u23','youth','jugend','academy','juvenil','primavera')


def session():
 if not hasattr(_tls,'s'):
  s=requests.Session();s.headers.update(UA);_tls.s=s
 return _tls.s

def norm_title(s):
 s=' '.join(str(s or '').lower().split())
 return s.replace('ş','s').replace('ı','i').replace('ğ','g').replace('ü','u').replace('ö','o').replace('ç','c')

def get_json(player_id,kind):
 url=BASE.format(player_id,kind)
 for attempt in range(2):
  try:
   r=session().get(url,timeout=TIMEOUT)
   if r.status_code==200:return r.json()
   if r.status_code in (429,500,502,503,504):time.sleep(1.2*(attempt+1))
   else:return None
  except Exception:
   if attempt==0:time.sleep(.8)
 return None

def trophy_total(payload):
 ach=(payload or {}).get('achievements')
 if not isinstance(ach,list):return None
 total=0
 for item in ach:
  title=norm_title(item.get('title'))
  if any(norm_title(w) in title for w in INDIVIDUAL_WORDS):continue
  if any(w in title for w in YOUTH_WORDS):continue
  details=item.get('details') or []
  has_team_context=any(isinstance(d,dict) and (d.get('club') or d.get('competition')) for d in details)
  if not has_team_context and details:continue
  try:count=int(item.get('count') or len(details) or 0)
  except:count=len(details)
  if count>0:total+=count
 return total

def stats_total(payload):
 rows=(payload or {}).get('stats')
 if not isinstance(rows,list) or not rows:return None
 apps=goals=assists=0
 for r in rows:
  comp=norm_title(r.get('competitionName') or r.get('competition_name'))
  if any(w in comp for w in YOUTH_WORDS):continue
  try:a=int(r.get('appearances') or 0);g=int(r.get('goals') or 0);s=int(r.get('assists') or 0)
  except:continue
  if a<=0:continue
  apps+=a;goals+=max(0,g);assists+=max(0,s)
 return {'apps':apps,'goals':goals,'assists':assists} if apps>0 else None

def verify(p):
 tv=trophy_total(get_json(p['id'],'achievements'))
 sv=stats_total(get_json(p['id'],'stats'))
 return p,tv,sv

def main():
 players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
 cand=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
 byid={int(p['id']):p for p in players+cand};records=list(byid.values())
 records.sort(key=lambda p:(not bool(p.get('turkish_familiar')),p.get('trophies') is not None,-float(p.get('recognition_score') or 0)))
 targets=[p for p in records if p.get('trophies') is None][:LIMIT]
 trophy_ok=stats_ok=stats_agree=0
 with ThreadPoolExecutor(max_workers=WORKERS) as ex:
  futures=[ex.submit(verify,p) for p in targets]
  for i,f in enumerate(as_completed(futures),1):
   try:p,tv,sv=f.result()
   except Exception:continue
   if tv is not None:
    p['trophies']=tv;p.setdefault('sources',{})['trophies']='transfermarkt-api.fly.dev achievements';trophy_ok+=1
   if sv:
    stats_ok+=1
    local=(int(p.get('career_appearances') or 0),int(p.get('career_goals') or 0),int(p.get('career_assists') or 0))
    remote=(sv['apps'],sv['goals'],sv['assists'])
    da=remote[0]-local[0];dg=remote[1]-local[1];ds=remote[2]-local[2]
    agree=(local[0]>0 and da>=-3 and da<=45 and dg>=-3 and dg<=30 and ds>=-3 and ds<=25)
    if agree:
     stats_agree+=1;p.setdefault('sources',{})['career_stats_crosscheck']='transfermarkt-api.fly.dev stats'
     p['tm_api_stats_crosscheck']={'archive':local,'api':remote,'agree':True}
    else:p['tm_api_stats_disagreement']={'archive':local,'api':remote}
   if i%25==0:print(f'tm-api {i}/{len(targets)} trophies={trophy_ok} stats={stats_ok} agree={stats_agree}',flush=True)

 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
 playable=[];remaining=[]
 for p in records:
  complete=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0
  p['playable']=bool(complete);(playable if complete else remaining).append(p)
 key=lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0))
 playable.sort(key=key);remaining.sort(key=key)
 (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (DATA/'candidates.json').write_text(json.dumps(remaining,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
 meta.update({'generated_at':datetime.now(timezone.utc).isoformat(),'playable_count':len(playable),'candidate_count':len(remaining),
              'tm_api_targets':len(targets),'tm_api_trophies_verified':trophy_ok,'tm_api_stats_received':stats_ok,'tm_api_stats_agreed':stats_agree,
              'tm_api_stats_policy':'cross-check only; never overwrites filtered archive career totals','tm_api_workers':WORKERS})
 meta.setdefault('sources',{})['transfermarkt_verification_api']='https://transfermarkt-api.fly.dev/'
 (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'playable':len(playable),'remaining':len(remaining),'trophies':trophy_ok,'stats':stats_ok,'agree':stats_agree},ensure_ascii=False))

if __name__=='__main__':main()
