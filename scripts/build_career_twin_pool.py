#!/usr/bin/env python3
import csv, io, json, math, os, re, unicodedata, zipfile
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'side-games' / 'career-twin' / 'data'
OUT.mkdir(parents=True, exist_ok=True)
TM_DB = ROOT / '.tmp-transfermarkt.duckdb'
TM_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb'
FC_URL = 'https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv'
ZENODO_RECORD = 'https://zenodo.org/api/records/19396819'
TARGET_CANDIDATES = 6500


def norm(s):
    s = '' if s is None else str(s)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii').lower()
    return re.sub(r'[^a-z0-9]+', '', s)


def safe_int(v):
    if v is None or (isinstance(v, float) and math.isnan(v)): return None
    if isinstance(v, (int, float)) and not isinstance(v, bool): return int(round(v))
    s = str(v).strip().replace(',', '')
    m = re.search(r'-?\d+(?:\.\d+)?', s)
    return int(round(float(m.group()))) if m else None


def money(v):
    if v is None or (isinstance(v, float) and math.isnan(v)): return None
    if isinstance(v, (int, float)) and not isinstance(v, bool): return int(round(v))
    s = str(v).lower().replace('€','').replace('$','').replace(',','').strip()
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    if not m: return None
    x = float(m.group(1))
    if 'bn' in s or re.search(r'\bb\b', s): x *= 1_000_000_000
    elif 'm' in s: x *= 1_000_000
    elif 'k' in s: x *= 1_000
    return int(round(x))


def download(url, path):
    with requests.get(url, stream=True, timeout=90, headers={'User-Agent':'NEON-XI-Career-Twin/1.0'}) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(1024*1024):
                if chunk: f.write(chunk)


def column(df, *hints):
    cols = {norm(c): c for c in df.columns}
    for h in hints:
        nh = norm(h)
        if nh in cols: return cols[nh]
    for h in hints:
        nh = norm(h)
        for k,c in cols.items():
            if nh and (nh in k or k in nh): return c
    return None


def read_zenodo_frames():
    frames=[]; meta={}
    try:
        rec=requests.get(ZENODO_RECORD,timeout=45,headers={'User-Agent':'NEON-XI-Career-Twin/1.0'}); rec.raise_for_status(); meta=rec.json()
        for f in meta.get('files',[]):
            key=f.get('key',''); url=(f.get('links') or {}).get('content')
            if not url: continue
            low=key.lower()
            if not any(low.endswith(x) for x in ('.csv','.xlsx','.xls','.json','.zip')): continue
            raw=requests.get(url,timeout=90,headers={'User-Agent':'NEON-XI-Career-Twin/1.0'}); raw.raise_for_status(); b=raw.content
            try:
                if low.endswith('.csv'): frames.append((key,pd.read_csv(io.BytesIO(b),low_memory=False)))
                elif low.endswith(('.xlsx','.xls')): frames.append((key,pd.read_excel(io.BytesIO(b))))
                elif low.endswith('.json'):
                    obj=json.loads(b.decode('utf-8')); frames.append((key,pd.json_normalize(obj if isinstance(obj,list) else obj.get('data',obj))))
                elif low.endswith('.zip'):
                    with zipfile.ZipFile(io.BytesIO(b)) as z:
                        for n in z.namelist():
                            nl=n.lower()
                            try:
                                data=z.read(n)
                                if nl.endswith('.csv'): frames.append((key+'::'+n,pd.read_csv(io.BytesIO(data),low_memory=False)))
                                elif nl.endswith('.xlsx'): frames.append((key+'::'+n,pd.read_excel(io.BytesIO(data))))
                            except Exception: pass
            except Exception: pass
    except Exception as e:
        meta={'error':str(e)}
    return frames,meta


def best_uoc_frame(frames):
    scored=[]
    for name,df in frames:
        if df is None or df.empty: continue
        needed=[column(df,'player_name','name','player'), column(df,'trophies','number_of_trophies','titles'), column(df,'matches','appearances','games'), column(df,'goals'), column(df,'assists')]
        score=sum(x is not None for x in needed)*100000+len(df)
        scored.append((score,name,df))
    return max(scored,key=lambda x:x[0])[1:] if scored else (None,None)


def build():
    now=datetime.now(timezone.utc).isoformat()
    if not TM_DB.exists(): download(TM_URL,TM_DB)
    con=duckdb.connect(str(TM_DB),read_only=True)

    base=con.execute('''
      WITH clubstats AS (
        SELECT player_id, count(*) club_apps, coalesce(sum(goals),0) club_goals, coalesce(sum(assists),0) club_assists,
               max(date) last_appearance
        FROM appearances GROUP BY player_id
      ), clubs AS (
        SELECT player_id, count(DISTINCT club_id) club_count FROM (
          SELECT player_id, from_club_id club_id FROM transfers WHERE from_club_id IS NOT NULL AND from_club_id > 0
          UNION ALL SELECT player_id, to_club_id FROM transfers WHERE to_club_id IS NOT NULL AND to_club_id > 0
        ) t GROUP BY player_id
      ), peaks AS (
        SELECT player_id, max(market_value_in_eur) peak_value FROM player_valuations GROUP BY player_id
      )
      SELECT p.player_id,p.name,p.player_code,p.date_of_birth,p.height_in_cm,p.position,p.current_club_name,
             p.country_of_citizenship,p.market_value_in_eur,p.highest_market_value_in_eur,p.last_season,
             coalesce(p.international_caps,0) international_caps,coalesce(p.international_goals,0) international_goals,
             coalesce(s.club_apps,0) tracked_club_apps,coalesce(s.club_goals,0) tracked_club_goals,
             coalesce(s.club_assists,0) tracked_club_assists,s.last_appearance,
             coalesce(c.club_count,1) club_count,coalesce(pk.peak_value,p.highest_market_value_in_eur) peak_value
      FROM players p
      LEFT JOIN clubstats s USING(player_id) LEFT JOIN clubs c USING(player_id) LEFT JOIN peaks pk USING(player_id)
      WHERE p.date_of_birth IS NOT NULL AND p.height_in_cm IS NOT NULL
    ''').df()
    con.close()

    # Recognition-first: active players first, then recognizable recent retirees.
    base['mv']=pd.to_numeric(base.market_value_in_eur,errors='coerce').fillna(0)
    base['peak']=pd.to_numeric(base.peak_value,errors='coerce').fillna(0)
    base['caps']=pd.to_numeric(base.international_caps,errors='coerce').fillna(0)
    base['season']=pd.to_numeric(base.last_season,errors='coerce').fillna(0)
    base['recognition_score']=(base.mv/1_000_000)*2+(base.peak/1_000_000)*0.45+base.caps*0.6+(base.season>=2025)*90+(base.season==2024)*55+(base.season>=2021)*20
    active=base[base.season>=2024].sort_values('recognition_score',ascending=False)
    recent=base[(base.season>=2020)&(base.season<2024)].sort_values('recognition_score',ascending=False)
    selected=pd.concat([active.head(5600),recent.head(900)]).drop_duplicates('player_id').head(TARGET_CANDIDATES).copy()

    # EA FC 26 current physical data (weight is the key enrichment here).
    fc=pd.read_csv(FC_URL,low_memory=False,usecols=lambda c: c in {'short_name','long_name','club_name','height_cm','weight_kg','overall','international_reputation','age'})
    fc['nshort']=fc.get('short_name','').map(norm); fc['nlong']=fc.get('long_name','').map(norm)
    fc['score']=pd.to_numeric(fc.get('overall'),errors='coerce').fillna(0)*10+pd.to_numeric(fc.get('international_reputation'),errors='coerce').fillna(0)
    fc=fc.sort_values('score',ascending=False)
    by_name={}
    for _,r in fc.iterrows():
        for k in {r.nshort,r.nlong}:
            if k and k not in by_name: by_name[k]=r

    # UOC 2026 top-leagues set supplies trophy + career stat fields where present.
    frames,zmeta=read_zenodo_frames(); zname,uoc=best_uoc_frame(frames)
    uoc_map={}; uoc_columns=[]
    if uoc is not None:
        uoc_columns=[str(c) for c in uoc.columns]
        nc=column(uoc,'player_name','name','player'); tc=column(uoc,'number_of_trophies','trophies','titles')
        mc=column(uoc,'matches_played','matches','appearances','games'); gc=column(uoc,'goals'); ac=column(uoc,'assists')
        pc=column(uoc,'peak_market_value','highest_market_value','max_market_value')
        hc=column(uoc,'height','height_cm'); dc=column(uoc,'date_of_birth','birth_date','dob')
        if nc:
            for _,r in uoc.iterrows():
                k=norm(r.get(nc));
                if not k: continue
                uoc_map[k]={
                    'trophies':safe_int(r.get(tc)) if tc else None,
                    'career_appearances':safe_int(r.get(mc)) if mc else None,
                    'career_goals':safe_int(r.get(gc)) if gc else None,
                    'career_assists':safe_int(r.get(ac)) if ac else None,
                    'peak_market_value_eur':money(r.get(pc)) if pc else None,
                    'height_cm':safe_int(r.get(hc)) if hc else None,
                    'birth_date':str(r.get(dc))[:10] if dc and pd.notna(r.get(dc)) else None,
                }

    records=[]
    for _,r in selected.iterrows():
        k=norm(r['name']); f=by_name.get(k); u=uoc_map.get(k,{})
        weight=safe_int(f.get('weight_kg')) if f is not None else None
        height=safe_int(u.get('height_cm')) or safe_int(r.height_in_cm)
        birth=u.get('birth_date') or (str(r.date_of_birth)[:10] if pd.notna(r.date_of_birth) else None)
        peak=u.get('peak_market_value_eur') or safe_int(r.peak_value)
        # UOC career totals are accepted only when all three career stat fields are present.
        ca=u.get('career_appearances'); cg=u.get('career_goals'); cas=u.get('career_assists'); trophies=u.get('trophies')
        complete=all(v is not None for v in [height,weight,birth,safe_int(r.club_count),trophies,cg,cas,peak,ca])
        status='active' if safe_int(r.last_season) and safe_int(r.last_season)>=2025 else 'recent'
        rec={
          'id':int(r.player_id),'name':str(r['name']),'slug':str(r.player_code),'status':status,
          'recognition_score':round(float(r.recognition_score),2),'club':None if pd.isna(r.current_club_name) else str(r.current_club_name),
          'country':None if pd.isna(r.country_of_citizenship) else str(r.country_of_citizenship),'position':str(r.position),
          'height_cm':height,'weight_kg':weight,'birth_date':birth,'club_count':safe_int(r.club_count),'trophies':trophies,
          'career_goals':cg,'career_assists':cas,'peak_market_value_eur':peak,'career_appearances':ca,
          'playable':bool(complete),
          'sources':{'profile':'transfermarkt-datasets','weight':'EAFC26/SoFIFA' if weight is not None else None,
                     'career_stats':'UOC-Transfermarkt-2026' if ca is not None and cg is not None and cas is not None else None,
                     'trophies':'UOC-Transfermarkt-2026' if trophies is not None else None,'peak_value':'UOC-Transfermarkt-2026' if u.get('peak_market_value_eur') else 'transfermarkt-datasets'},
          'updated_at':now
        }
        records.append(rec)

    records.sort(key=lambda x:(not x['playable'],-x['recognition_score']))
    playable=[x for x in records if x['playable']]
    candidates=[x for x in records if not x['playable']]
    (OUT/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (OUT/'candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta={
      'generated_at':now,'playable_count':len(playable),'candidate_count':len(candidates),'total_selected':len(records),
      'required_fields':['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances'],
      'policy':'Only 9/9 complete records are playable. Missing data is never invented.',
      'uoc_file':zname,'uoc_columns':uoc_columns,'zenodo_title':(zmeta.get('metadata') or {}).get('title') if isinstance(zmeta,dict) else None,
      'sources':{
        'transfermarkt_datasets':TM_URL,'eafc26':FC_URL,'uoc_2026':ZENODO_RECORD
      }
    }
    (OUT/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False,indent=2))

if __name__=='__main__': build()
