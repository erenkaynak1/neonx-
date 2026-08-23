#!/usr/bin/env python3
import json,re,unicodedata
from datetime import date,datetime
from pathlib import Path
import pandas as pd
from rapidfuzz.fuzz import WRatio
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'side-games'/'career-twin'/'data'
FC='https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv'
def norm(s):
 s='' if s is None else str(s); s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]+','',s)
def age_from_birth(s):
 try:
  d=datetime.strptime(str(s)[:10],'%Y-%m-%d').date(); t=date(2026,7,1); return t.year-d.year-((t.month,t.day)<(d.month,d.day))
 except:return None

def main():
 players=json.loads((DATA/'players.json').read_text()); cand=json.loads((DATA/'candidates.json').read_text())
 fc=pd.read_csv(FC,low_memory=False,usecols=lambda c:c in {'short_name','long_name','club_name','height_cm','weight_kg','age','overall'})
 fc=fc.dropna(subset=['weight_kg','height_cm']); fc['nclub']=fc.club_name.map(norm); fc['nshort']=fc.short_name.map(norm); fc['nlong']=fc.long_name.map(norm)
 filled=0
 for p in cand:
  if p.get('weight_kg') is not None: continue
  h=p.get('height_cm'); club=norm(p.get('club')); age=age_from_birth(p.get('birth_date')); name=p.get('name','')
  q=fc[(fc.height_cm.between(h-2,h+2))] if h else fc
  if age is not None:q=q[q.age.between(age-2,age+2)]
  qc=q[q.nclub==club] if club else q.iloc[0:0]
  if len(qc):q=qc
  if len(q)>80:continue
  scored=[]
  for idx,r in q.iterrows():
   score=max(WRatio(norm(name),r.nshort),WRatio(norm(name),r.nlong))
   if club and r.nclub==club:score+=8
   if h and abs(float(r.height_cm)-float(h))<0.1:score+=4
   scored.append((score,idx))
  scored.sort(reverse=True)
  if not scored:continue
  best=scored[0]; second=scored[1][0] if len(scored)>1 else 0
  if best[0]>=88 and best[0]-second>=5:
   row=fc.loc[best[1]]; p['weight_kg']=int(round(float(row.weight_kg))); p.setdefault('sources',{})['weight']='EAFC26/SoFIFA-fuzzy-verified'; filled+=1
 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
 moved=[]; remain=[]
 for p in cand:
  p['playable']=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0; (moved if p['playable'] else remain).append(p)
 byid={p['id']:p for p in players+moved}; playable=sorted(byid.values(),key=lambda p:(not bool(p.get('turkish_familiar')),-p.get('recognition_score',0))); remain.sort(key=lambda p:(not bool(p.get('turkish_familiar')),-p.get('recognition_score',0)))
 (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':'))); (DATA/'candidates.json').write_text(json.dumps(remain,ensure_ascii=False,separators=(',',':')))
 meta=json.loads((DATA/'meta.json').read_text()); meta.update({'playable_count':len(playable),'candidate_count':len(remain),'fuzzy_weights_added':filled}); (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 print(json.dumps({'weights_added':filled,'new_playable':len(moved),'playable_total':len(playable)},ensure_ascii=False))
if __name__=='__main__':main()
