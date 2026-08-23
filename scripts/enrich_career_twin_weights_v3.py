#!/usr/bin/env python3
import json,re,unicodedata
from datetime import date,datetime
from pathlib import Path
import pandas as pd
from rapidfuzz.fuzz import WRatio

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
FC='https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv'

def norm(s):
 s='' if s is None else str(s)
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
 return re.sub(r'[^a-z0-9]+','',s)

def toks(s):
 s='' if s is None else str(s)
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
 return [x for x in re.split(r'[^a-z0-9]+',s) if x]

def forms(s):
 ts=toks(s);out={norm(s)}
 if len(ts)>=2:out.update((''.join(ts),ts[0]+ts[-1],ts[-1]+ts[0]))
 return {x for x in out if x}

def age_from_birth(s):
 try:
  d=datetime.strptime(str(s)[:10],'%Y-%m-%d').date();t=date(2026,7,1)
  return t.year-d.year-((t.month,t.day)<(d.month,d.day))
 except:return None

def main():
 players=json.loads((DATA/'players.json').read_text(encoding='utf-8'));cand=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
 fc=pd.read_csv(FC,low_memory=False,usecols=lambda c:c in {'short_name','long_name','club_name','height_cm','weight_kg','age','overall'});fc=fc.dropna(subset=['weight_kg','height_cm']).copy()
 fc['nclub']=fc.club_name.fillna('').map(norm);fc['nshort']=fc.short_name.fillna('').map(norm);fc['nlong']=fc.long_name.fillna('').map(norm);fc['forms']=fc.apply(lambda r:forms(r.get('short_name'))|forms(r.get('long_name')),axis=1)
 filled=0;exact_context=0;multikey=0
 for p in cand:
  if p.get('weight_kg') is not None or p.get('trophies') is None:continue
  h=p.get('height_cm');age=age_from_birth(p.get('birth_date'));club=norm(p.get('uoc_team') or p.get('club'));pname=norm(p.get('name'));pforms=forms(p.get('name'))
  q=fc
  if h is not None:q=q[q.height_cm.between(float(h)-4,float(h)+4)]
  if age is not None:q=q[q.age.between(float(age)-3,float(age)+3)]
  if q.empty:continue
  chosen=None;erows=[]
  for idx,r in q.iterrows():
   if pforms & r['forms']:erows.append(idx)
  if len(erows)==1:chosen=erows[0];multikey+=1
  elif len(erows)>1:
   es=[]
   for idx in erows:
    r=fc.loc[idx];cs=WRatio(club,r.nclub) if club and r.nclub else 0;hd=abs(float(r.height_cm)-float(h)) if h is not None else 99;ad=abs(float(r.age)-float(age)) if age is not None else 99;es.append((cs-hd*4-ad*2,idx))
   es.sort(reverse=True)
   if len(es)==1 or es[0][0]-es[1][0]>=4:chosen=es[0][1];multikey+=1
  if chosen is None:
   if len(q)>220:continue
   scored=[]
   for idx,r in q.iterrows():
    ns=max(WRatio(pname,r.nshort),WRatio(pname,r.nlong));cs=WRatio(club,r.nclub) if club and r.nclub else 0;hd=abs(float(r.height_cm)-float(h)) if h is not None else 99;ad=abs(float(r.age)-float(age)) if age is not None else 99;score=ns+(10 if cs>=92 else 6 if cs>=80 else 2 if cs>=65 else 0)+(5 if hd<=1 else 3 if hd<=2 else 1 if hd<=3 else 0)+(3 if ad<=1 else 1 if ad<=2 else 0);scored.append((score,ns,cs,hd,ad,idx))
   scored.sort(reverse=True)
   if scored:
    best=scored[0];second=scored[1][0] if len(scored)>1 else 0;strong_name=best[1]>=91 and best[3]<=3 and best[4]<=2 and best[0]-second>=3;strong_context=best[1]>=82 and best[2]>=90 and best[3]<=2 and best[4]<=1 and best[0]-second>=4
    if strong_name or strong_context:
     chosen=best[5]
     if strong_context and not strong_name:exact_context+=1
  if chosen is not None:
   row=fc.loc[chosen];p['weight_kg']=int(round(float(row.weight_kg)));p.setdefault('sources',{})['weight']='EAFC26/SoFIFA-multikey-verified';filled+=1
 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances'];moved=[];remain=[]
 for p in cand:
  p['playable']=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0;(moved if p['playable'] else remain).append(p)
 byid={int(p['id']):p for p in players+moved};key=lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0));playable=sorted(byid.values(),key=key);remain.sort(key=key)
 (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8');(DATA/'candidates.json').write_text(json.dumps(remain,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'));meta.update({'playable_count':len(playable),'candidate_count':len(remain),'context_weights_added':filled,'context_only_matches':exact_context,'multikey_weight_matches':multikey,'weight_age_policy':'birth_date_only'});(DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'weights_added':filled,'multikey':multikey,'context_only':exact_context,'new_playable':len(moved),'playable_total':len(playable)},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
