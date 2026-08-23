#!/usr/bin/env python3
import json, math, re, unicodedata
from datetime import datetime, timezone, date
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'side-games'/'career-twin'/'data'
OUT.mkdir(parents=True,exist_ok=True)
TM_DB=ROOT/'.tmp-transfermarkt.duckdb'
TM_URL='https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb'
FC_URL='https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv'
TARGET_CANDIDATES=12000

BIG3_IDS=(36,141,114)
FOCUS_CLUB_IDS=(
    36,141,114,
    418,131,13,
    985,281,31,11,631,148,
    506,46,5,6195,12,
    27,16,15,23826,
    583,244,1041
)


def norm(s):
    s='' if s is None else str(s)
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','',s)


def iv(v):
    if v is None or (isinstance(v,float) and math.isnan(v)):return None
    try:return int(round(float(v)))
    except:return None


def download(url,path):
    if path.exists() and path.stat().st_size>10_000_000:return
    with requests.get(url,stream=True,timeout=(30,240),headers={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/4.0'}) as r:
        r.raise_for_status()
        with path.open('wb') as f:
            for chunk in r.iter_content(1024*1024):
                if chunk:f.write(chunk)


def age_on_2026_07_01(birth):
    try:
        d=pd.to_datetime(birth).date();t=date(2026,7,1)
        return t.year-d.year-((t.month,t.day)<(d.month,d.day))
    except:return None


def main():
    now=datetime.now(timezone.utc).isoformat()
    download(TM_URL,TM_DB)
    con=duckdb.connect(str(TM_DB),read_only=True)
    focus_csv=','.join(str(x) for x in FOCUS_CLUB_IDS)
    big3_csv=','.join(str(x) for x in BIG3_IDS)
    base=con.execute(f'''
      WITH clubs AS (
        SELECT player_id,count(DISTINCT club_id) club_count FROM (
          SELECT player_id,from_club_id club_id FROM transfers WHERE from_club_id IS NOT NULL AND from_club_id>0
          UNION ALL
          SELECT player_id,to_club_id club_id FROM transfers WHERE to_club_id IS NOT NULL AND to_club_id>0
        ) x GROUP BY player_id
      ), peaks AS (
        SELECT player_id,max(market_value_in_eur) peak_value FROM player_valuations GROUP BY player_id
      ), big3 AS (
        SELECT DISTINCT player_id FROM (
          SELECT player_id,from_club_id club_id FROM transfers
          UNION ALL SELECT player_id,to_club_id club_id FROM transfers
        ) x WHERE club_id IN ({big3_csv})
      ), focus AS (
        SELECT DISTINCT player_id FROM (
          SELECT player_id,from_club_id club_id FROM transfers
          UNION ALL SELECT player_id,to_club_id club_id FROM transfers
        ) x WHERE club_id IN ({focus_csv})
      )
      SELECT p.player_id,p.name,p.player_code,p.date_of_birth,p.height_in_cm,p.position,p.current_club_name,
             p.country_of_citizenship,p.market_value_in_eur,p.highest_market_value_in_eur,p.last_season,
             coalesce(p.international_caps,0) international_caps,coalesce(c.club_count,1) club_count,
             coalesce(pk.peak_value,p.highest_market_value_in_eur) peak_value,
             CASE WHEN b.player_id IS NULL THEN 0 ELSE 1 END big3_history,
             CASE WHEN f.player_id IS NULL THEN 0 ELSE 1 END focus_history
      FROM players p
      LEFT JOIN clubs c USING(player_id)
      LEFT JOIN peaks pk USING(player_id)
      LEFT JOIN big3 b USING(player_id)
      LEFT JOIN focus f USING(player_id)
      WHERE p.date_of_birth IS NOT NULL AND p.height_in_cm IS NOT NULL
    ''').df()
    con.close()

    for c in ('market_value_in_eur','peak_value','international_caps','last_season','big3_history','focus_history'):
        base[c]=pd.to_numeric(base[c],errors='coerce').fillna(0)
    base['recognition_score']=(
        (base.market_value_in_eur/1_000_000)*2.1+
        (base.peak_value/1_000_000)*.62+
        base.international_caps*.72+
        (base.last_season>=2025)*115+
        (base.last_season==2024)*68+
        (base.last_season>=2021)*25+
        base.focus_history*230+
        base.big3_history*420
    )

    big3=base[(base.big3_history==1)&(base.last_season>=2008)].sort_values('recognition_score',ascending=False)
    focus=base[(base.focus_history==1)&(base.last_season>=2005)].sort_values('recognition_score',ascending=False)
    active=base[base.last_season>=2024].sort_values('recognition_score',ascending=False)
    recent=base[(base.last_season>=2014)&(base.last_season<2024)].sort_values('recognition_score',ascending=False)
    legends=base[(base.last_season<2014)&((base.peak_value>=20_000_000)|(base.international_caps>=50)|(base.focus_history==1))].sort_values('recognition_score',ascending=False)
    selected=pd.concat([
        big3.head(2400),focus.head(6000),active.head(8000),recent.head(3600),legends.head(900)
    ]).drop_duplicates('player_id').sort_values('recognition_score',ascending=False).head(TARGET_CANDIDATES).copy()

    fc=pd.read_csv(FC_URL,low_memory=False,usecols=lambda c:c in {'short_name','long_name','club_name','height_cm','weight_kg','overall','international_reputation','age'})
    fc=fc.dropna(subset=['weight_kg','height_cm']).copy()
    fc['nshort']=fc.short_name.fillna('').map(norm);fc['nlong']=fc.long_name.fillna('').map(norm)
    exact={}
    for idx,r in fc.iterrows():
        for k in {r.nshort,r.nlong}:
            if not k:continue
            exact.setdefault(k,[]).append(idx)

    records=[];weights=0
    for _,r in selected.iterrows():
        birth=str(r.date_of_birth)[:10] if pd.notna(r.date_of_birth) else None
        age=age_on_2026_07_01(birth)
        h=iv(r.height_in_cm);weight=None;weight_source=None
        choices=[]
        for idx in set(exact.get(norm(r['name']),[])):
            q=fc.loc[idx]
            hd=abs(float(q.height_cm)-float(h)) if h is not None else 99
            ad=abs(float(q.age)-float(age)) if age is not None and pd.notna(q.age) else 99
            if hd<=3 and ad<=2:choices.append((hd+ad*1.5,-float(q.overall or 0),idx))
        choices.sort()
        if len(choices)==1 or (len(choices)>1 and choices[1][0]-choices[0][0]>=1.5):
            q=fc.loc[choices[0][2]];weight=iv(q.weight_kg);weight_source='EAFC26/SoFIFA-exact-multikey';weights+=int(weight is not None)
        records.append({
            'id':int(r.player_id),'name':str(r['name']),'slug':str(r.player_code),
            'status':'active' if iv(r.last_season) and iv(r.last_season)>=2025 else ('recent' if iv(r.last_season) and iv(r.last_season)>=2014 else 'legend'),
            'recognition_score':round(float(r.recognition_score),2),
            'club':None if pd.isna(r.current_club_name) else str(r.current_club_name),
            'country':None if pd.isna(r.country_of_citizenship) else str(r.country_of_citizenship),
            'position':None if pd.isna(r.position) else str(r.position),
            'turkish_familiar':bool(r.big3_history),'focus_history':bool(r.focus_history),
            'height_cm':h,'weight_kg':weight,'birth_date':birth,'club_count':iv(r.club_count),
            'trophies':None,'career_goals':None,'career_assists':None,'career_appearances':None,
            'peak_market_value_eur':iv(r.peak_value),'playable':False,
            'sources':{
                'profile':'transfermarkt-datasets','weight':weight_source,'career_stats':None,
                'trophies':None,'peak_value':'transfermarkt-datasets','club_history':'transfermarkt-datasets'
            },'updated_at':now
        })

    records.sort(key=lambda p:(not p.get('turkish_familiar',False),not p.get('focus_history',False),-float(p.get('recognition_score') or 0)))
    (OUT/'players.json').write_text('[]',encoding='utf-8')
    (OUT/'candidates.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta={
      'generated_at':now,'playable_count':0,'candidate_count':len(records),'total_selected':len(records),
      'candidate_target':TARGET_CANDIDATES,'big3_priority_count':int(sum(bool(p.get('turkish_familiar')) for p in records)),
      'focus_club_priority_count':int(sum(bool(p.get('focus_history')) for p in records)),
      'initial_exact_weights':weights,
      'required_fields':['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances'],
      'policy':'Only 9/9 complete, sourced records with positive senior-club official appearances are playable.',
      'sources':{'transfermarkt_datasets':TM_URL,'eafc26':FC_URL}
    }
    (OUT/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
