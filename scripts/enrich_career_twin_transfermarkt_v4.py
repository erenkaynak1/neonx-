#!/usr/bin/env python3
import json, re, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
PERF='https://www.transfermarkt.com.tr/ceapi/player/{}/performance'
ACH='https://www.transfermarkt.com.tr/-/erfolge/spieler/{}'
MAX_PERFORMANCE=5000
MAX_ACHIEVEMENTS=1800
WORKERS=7
_tls=threading.local()

INDIVIDUAL_WORDS=(
    'top scorer','top goalscorer','player of','footballer of','most valuable player','golden boot','golden ball',
    'best player','young player','player of the season','player of the tournament','torschutzenkonig','torschützenkönig',
    'weltfussballer','weltfußballer','fussballer des jahres','fußballer des jahres','gol krali','gol kralı',
    'yilin futbolcusu','yılın futbolcusu','sezonun oyuncusu','turnuvanin oyuncusu','turnuvanın oyuncusu','futbolcusu'
)
YOUTH_WORDS=('u17','u18','u19','u20','u21','u23','youth','jugend','academy','rezerv','reserve')


def session():
    if not hasattr(_tls,'s'):
        s=requests.Session()
        s.headers.update({
            'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
            'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.7',
            'Referer':'https://www.transfermarkt.com.tr/'
        })
        _tls.s=s
    return _tls.s


def geti(v):
    if v is None: return None
    if isinstance(v,bool): return int(v)
    if isinstance(v,(int,float)): return int(v)
    m=re.search(r'-?\d+',str(v).replace('.','').replace(',',''))
    return int(m.group()) if m else None


def get_json(url,retries=2):
    for attempt in range(retries+1):
        try:
            r=session().get(url,timeout=18)
            if r.status_code==200: return r.json()
            if r.status_code in (403,429): time.sleep(1.2*(attempt+1))
        except Exception:
            if attempt<retries: time.sleep(.7*(attempt+1))
    return None


def get_html(url,retries=2):
    for attempt in range(retries+1):
        try:
            r=session().get(url,timeout=18)
            if r.status_code==200 and len(r.text)>1000: return r.text
            if r.status_code in (403,429): time.sleep(1.2*(attempt+1))
        except Exception:
            if attempt<retries: time.sleep(.7*(attempt+1))
    return None


def is_senior_club(name):
    n=str(name or '').lower().strip()
    if not n: return False
    if any(w in n for w in YOUTH_WORDS): return False
    if re.search(r'\bii\b$',n) or re.search(r'\bb\b$',n): return False
    return True


def performance(player):
    payload=get_json(PERF.format(player['id']))
    rows=(payload or {}).get('additionalData')
    if not isinstance(rows,list) or not rows: return None
    apps=goals=assists=0; clubs=set(); valid=0; assists_known=False
    for row in rows:
        ent=row.get('entity') or {}
        et=str(ent.get('type') or '').lower()
        name=ent.get('name') or ''
        # The performance endpoint is club based. Ignore youth/reserve entities if they occur.
        if et and et not in ('club','verein'): continue
        if not is_senior_club(name): continue
        g=geti(row.get('gamesPlayed')); gl=geti(row.get('goalsScored')); a=geti(row.get('assists'))
        if g is None or g<=0: continue
        valid+=1; apps+=g; goals+=0 if gl is None else gl
        if a is not None: assists+=a; assists_known=True
        cid=ent.get('id')
        clubs.add(str(cid) if cid is not None else str(name).strip().lower())
    if valid==0 or apps<=0 or not assists_known: return None
    return {'career_appearances':apps,'career_goals':goals,'career_assists':assists,'club_count':len(clubs)}


def normalize_title(s):
    return ' '.join(str(s or '').lower().split())


def team_trophies(player):
    html=get_html(ACH.format(player['id']))
    if not html: return None
    soup=BeautifulSoup(html,'html.parser')
    total=0; found=False
    for box in soup.select('div.box'):
        table=box.select_one('table.auflistung')
        if not table: continue
        h=box.find('h2'); title=normalize_title(h.get_text(' ',strip=True) if h else '')
        ascii_title=title.replace('ş','s').replace('ı','i').replace('ğ','g').replace('ü','u').replace('ö','o').replace('ç','c')
        if any(w in title or w in ascii_title for w in INDIVIDUAL_WORDS): continue
        rows=table.select('tr')
        count=0
        for tr in rows:
            if tr.find('th'): continue
            season=tr.select_one('.erfolg_table_saison')
            comp=tr.select_one('a[href*="/wettbewerb/"],a[href*="/pokalwettbewerb/"]')
            club=tr.select_one('a[href*="/verein/"]')
            if season or comp or club: count+=1
        if count:
            found=True; total+=count
    return total if found else 0


def main():
    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    byid={int(p['id']):p for p in players+candidates}
    records=list(byid.values())
    records.sort(key=lambda p:(not bool(p.get('turkish_familiar')), -float(p.get('recognition_score') or 0)))

    # Remove every legacy total before writing fresh career aggregates.
    for p in records:
        p['career_appearances']=None;p['career_goals']=None;p['career_assists']=None;p['playable']=False
        p.setdefault('sources',{})['career_stats']=None

    perf_targets=records[:MAX_PERFORMANCE]
    perf_ok=0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fut={ex.submit(performance,p):p for p in perf_targets}
        for i,f in enumerate(as_completed(fut),1):
            p=fut[f]
            try: data=f.result()
            except Exception: data=None
            if data:
                p.update(data);p['sources']['career_stats']='Transfermarkt-CEAPI-career-performance';perf_ok+=1
            if i%250==0: print(f'performance {i}/{len(perf_targets)} ok={perf_ok}',flush=True)

    trophy_targets=[p for p in records if p.get('trophies') is None][:MAX_ACHIEVEMENTS]
    trophy_ok=0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fut={ex.submit(team_trophies,p):p for p in trophy_targets}
        for i,f in enumerate(as_completed(fut),1):
            p=fut[f]
            try: value=f.result()
            except Exception: value=None
            if value is not None:
                p['trophies']=value;p['sources']['trophies']='Transfermarkt-achievements-team-only';trophy_ok+=1
            if i%200==0: print(f'trophies {i}/{len(trophy_targets)} ok={trophy_ok}',flush=True)

    req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
    playable=[]; remaining=[]
    for p in records:
        complete=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0
        p['playable']=bool(complete)
        (playable if complete else remaining).append(p)
    playable.sort(key=lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0)))
    remaining.sort(key=lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0)))
    (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(remaining,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'generated_at':datetime.now(timezone.utc).isoformat(),
        'playable_count':len(playable),'candidate_count':len(remaining),
        'transfermarkt_performance_attempted':len(perf_targets),'transfermarkt_performance_matched':perf_ok,
        'transfermarkt_achievements_attempted':len(trophy_targets),'transfermarkt_achievements_matched':trophy_ok,
        'career_stats_source':'Transfermarkt CEAPI player performance; senior club rows summed',
        'zero_appearance_records_playable':False
    })
    meta.setdefault('sources',{})['transfermarkt_career_performance']='https://www.transfermarkt.com.tr/ceapi/player/{id}/performance'
    meta['sources']['transfermarkt_achievements']='https://www.transfermarkt.com.tr/-/erfolge/spieler/{id}'
    (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'playable':len(playable),'remaining':len(remaining),'performance_ok':perf_ok,'trophy_ok':trophy_ok},ensure_ascii=False),flush=True)

if __name__=='__main__': main()
