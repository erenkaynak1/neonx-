#!/usr/bin/env python3
import io,json,math,re,unicodedata
from pathlib import Path
import pandas as pd,requests
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'side-games'/'career-twin'/'data'; UA={'User-Agent':'NEON-XI-Career-Twin/1.2'}
URL='https://zenodo.org/api/records/19396819/files/jugadors.csv/content'
def norm(s):
 s='' if s is None else str(s); s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]+','',s)
def iv(v):
 if v is None or (isinstance(v,float) and math.isnan(v)):return None
 if isinstance(v,(int,float)) and not isinstance(v,bool):return int(round(v))
 m=re.search(r'-?\d+(?:[.,]\d+)?',str(v).replace(' ','').replace('.','').replace(',','.')); return int(round(float(m.group()))) if m else None

def main():
 r=requests.get(URL,headers=UA,timeout=90); r.raise_for_status(); df=pd.read_csv(io.BytesIO(r.content),low_memory=False)
 mp={}
 for _,x in df.iterrows():
  k=norm(x.get('nom'))
  if k: mp[k]={'trophies':iv(x.get('trofeus')),'career_appearances':iv(x.get('partits')),'career_goals':iv(x.get('gols')),'career_assists':iv(x.get('assistencies'))}
 players=json.loads((DATA/'players.json').read_text()); cand=json.loads((DATA/'candidates.json').read_text()); moved=[]; remain=[]; matched=0
 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
 for p in cand:
  u=mp.get(norm(p['name']))
  if u:
   matched+=1
   for k,v in u.items():
    if v is not None:p[k]=v
   if all(p.get(k) is not None for k in ('career_appearances','career_goals','career_assists')):p['sources']['career_stats']='UOC-Transfermarkt-2026'
   if p.get('trophies') is not None:p['sources']['trophies']='UOC-Transfermarkt-2026'
  p['playable']=all(p.get(k) is not None for k in req)
  (moved if p['playable'] else remain).append(p)
 byid={p['id']:p for p in players+moved}; playable=sorted(byid.values(),key=lambda p:-p.get('recognition_score',0)); remain.sort(key=lambda p:-p.get('recognition_score',0))
 (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':'))); (DATA/'candidates.json').write_text(json.dumps(remain,ensure_ascii=False,separators=(',',':')))
 meta=json.loads((DATA/'meta.json').read_text()); meta.update({'playable_count':len(playable),'candidate_count':len(remain),'uoc_file':'jugadors.csv','uoc_columns':[str(c) for c in df.columns],'uoc_matched_names':matched}); (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 print(json.dumps({'uoc_rows':len(df),'matched':matched,'new_playable':len(moved),'playable_total':len(playable)},ensure_ascii=False))
if __name__=='__main__':main()
