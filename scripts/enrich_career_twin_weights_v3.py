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
 fc=fc.dropna(subset=['weight_kg','height_cm']); fc['nclub']=fc.club_name.fillna('').map(norm); fc['nshort']=fc.short_name.fillna('').map(norm); fc['nlong']=fc.long_name.fillna('').map(norm)
 filled=0; exact_context=0
 for p in cand:
  if p.get('weight_kg') is not None: continue
  h=p.get('height_cm'); age=p.get('uoc_age') or age_from_birth(p.get('birth_date')); club=norm(p.get('uoc_team') or p.get('club')); pname=norm(p.get('name'))
  q=fc.copy()
  if h is not None:q=q[q.height_cm.between(float(h)-3,float(h)+3)]
  if age is not None:q=q[q.age.between(float(age)-2,float(age)+2)]
  if q.empty or len(q)>160:continue
  scored=[]
  for idx,r in q.iterrows():
   ns=max(WRatio(pname,r.nshort),WRatio(pname,r.nlong)); cs=WRatio(club,r.nclub) if club and r.nclub else 0
   hd=abs(float(r.height_cm)-float(h)) if h is not None else 99; ad=abs(float(r.age)-float(age)) if age is not None else 99
   score=ns + (12 if cs>=92 else 8 if cs>=80 else 3 if cs>=65 else 0) + (5 if hd<0.1 else 3 if hd<=1 else 1 if hd<=2 else 0) + (3 if ad<0.1 else 1 if ad<=1 else 0)
   scored.append((score,ns,cs,hd,ad,idx))
  scored.sort(reverse=True); best=scored[0]; second=scored[1][0] if len(scored)>1 else 0
  strong_name=best[1]>=88 and best[0]-second>=4
  strong_context=best[1]>=76 and best[2]>=84 and best[3]<=1 and best[4]<=1 and best[0]-second>=5
  if strong_name or strong_context:
   row=fc.loc[best[5]]; p['weight_kg']=int(round(float(row.weight_kg))); p.setdefault('sources',{})['weight']='EAFC26/SoFIFA-context-verified'; filled+=1
   if strong_context and not strong_name:exact_context+=1
 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
 moved=[];remain=[]
 for p in cand:
  p['playable']=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0; (moved if p['playable'] else remain).append(p)
 byid={p['id']:p for p in players+moved}; playable=sorted(byid.values(),key=lambda p:(not bool(p.get('turkish_familiar')),-p.get('recognition_score',0))); remain.sort(key=lambda p:(not bool(p.get('turkish_familiar')),-p.get('recognition_score',0)))
 (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')));(DATA/'candidates.json').write_text(json.dumps(remain,ensure_ascii=False,separators=(',',':')))
 meta=json.loads((DATA/'meta.json').read_text());meta.update({'playable_count':len(playable),'candidate_count':len(remain),'context_weights_added':filled,'context_only_matches':exact_context});(DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 print(json.dumps({'weights_added':filled,'context_only':exact_context,'new_playable':len(moved),'playable_total':len(playable)},ensure_ascii=False))
if __name__=='__main__':main()
