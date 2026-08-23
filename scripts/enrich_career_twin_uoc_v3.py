#!/usr/bin/env python3
import io,json,math,re,unicodedata
from pathlib import Path
import pandas as pd,requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
UA={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/1.4'}
URL='https://zenodo.org/api/records/19396819/files/jugadors.csv/content'


def norm(s):
    s='' if s is None else str(s)
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','',s)


def iv(v):
    if v is None or (isinstance(v,float) and math.isnan(v)): return None
    if isinstance(v,(int,float)) and not isinstance(v,bool): return int(round(v))
    s=str(v).strip().replace(' ','')
    m=re.search(r'-?\d+(?:[.,]\d+)?',s)
    return int(round(float(m.group().replace(',','.')))) if m else None


def main():
    r=requests.get(URL,headers=UA,timeout=90);r.raise_for_status()
    df=pd.read_csv(io.BytesIO(r.content),low_memory=False)
    mp={}
    for _,x in df.iterrows():
        k=norm(x.get('nom'))
        if k:
            mp[k]={
                'trophies':iv(x.get('trofeus')),
                'uoc_team':None if pd.isna(x.get('equip')) else str(x.get('equip')),
                'uoc_age':iv(x.get('edat'))
            }

    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    cand=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    all_records={int(p['id']):p for p in players+cand}
    matched=0
    for p in all_records.values():
        # Never allow the previous UOC partits/gols/assistencies mapping to survive.
        p['career_appearances']=None
        p['career_goals']=None
        p['career_assists']=None
        p['playable']=False
        p.setdefault('sources',{})['career_stats']=None
        u=mp.get(norm(p.get('name')))
        if not u: continue
        matched+=1
        if u.get('trophies') is not None:
            p['trophies']=u['trophies']
            p['sources']['trophies']='UOC-Transfermarkt-2026'
        if u.get('uoc_team') is not None: p['uoc_team']=u['uoc_team']
        if u.get('uoc_age') is not None: p['uoc_age']=u['uoc_age']

    records=sorted(all_records.values(),key=lambda p:(not p.get('turkish_familiar',False),-p.get('recognition_score',0)))
    (DATA/'players.json').write_text('[]',encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({'playable_count':0,'candidate_count':len(records),'uoc_file':'jugadors.csv','uoc_matched_names':matched,'uoc_career_totals_disabled':True})
    (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'matched':matched,'records':len(records),'career_totals_from_uoc':False},ensure_ascii=False))

if __name__=='__main__': main()
