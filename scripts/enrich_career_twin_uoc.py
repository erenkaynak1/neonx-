#!/usr/bin/env python3
import io,json,math,re,unicodedata,zipfile
from pathlib import Path
import pandas as pd, requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
API='https://zenodo.org/api/records/19396819'
UA={'User-Agent':'NEON-XI-Career-Twin/1.1'}

def norm(s):
 s='' if s is None else str(s); s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]+','',s)
def intval(v):
 if v is None or (isinstance(v,float) and math.isnan(v)): return None
 if isinstance(v,(int,float)) and not isinstance(v,bool): return int(round(v))
 s=str(v).replace(',','').strip(); m=re.search(r'-?\d+(?:\.\d+)?',s); return int(round(float(m.group()))) if m else None
def money(v):
 if v is None or (isinstance(v,float) and math.isnan(v)): return None
 if isinstance(v,(int,float)) and not isinstance(v,bool): return int(round(v))
 s=str(v).lower().replace('€','').replace('$','').replace(',',''); m=re.search(r'(\d+(?:\.\d+)?)',s)
 if not m:return None
 x=float(m.group(1)); x*=1_000_000_000 if 'bn' in s else 1_000_000 if 'm' in s else 1_000 if 'k' in s else 1; return int(round(x))
def col(df,*hints):
 cs={norm(c):c for c in df.columns}
 for h in hints:
  if norm(h) in cs:return cs[norm(h)]
 for h in hints:
  nh=norm(h)
  for k,c in cs.items():
   if nh and (nh in k or k in nh):return c
 return None

def file_entries():
 r=requests.get(API+'/files',headers=UA,timeout=45); r.raise_for_status(); j=r.json()
 if isinstance(j,list): return j
 for key in ('entries','files','items'):
  if isinstance(j.get(key),list):return j[key]
 hits=j.get('hits',{}) if isinstance(j,dict) else {}
 return hits.get('hits',[]) if isinstance(hits,dict) else []
def frames():
 out=[]; debug=[]
 for f in file_entries():
  key=f.get('key') or f.get('name') or f.get('id') or ''
  links=f.get('links') or {}; url=links.get('content') or links.get('self')
  debug.append({'key':key,'links':links})
  if not url or not str(key).lower().endswith(('.csv','.xlsx','.xls','.json','.zip')): continue
  try:
   r=requests.get(url,headers=UA,timeout=120); r.raise_for_status(); b=r.content; low=str(key).lower()
   if low.endswith('.csv'): out.append((key,pd.read_csv(io.BytesIO(b),low_memory=False)))
   elif low.endswith(('.xlsx','.xls')): out.append((key,pd.read_excel(io.BytesIO(b))))
   elif low.endswith('.json'):
    o=r.json(); out.append((key,pd.json_normalize(o if isinstance(o,list) else o.get('data',o))))
   else:
    with zipfile.ZipFile(io.BytesIO(b)) as z:
     for n in z.namelist():
      try:
       bb=z.read(n); nl=n.lower()
       if nl.endswith('.csv'):out.append((key+'::'+n,pd.read_csv(io.BytesIO(bb),low_memory=False)))
       elif nl.endswith(('.xlsx','.xls')):out.append((key+'::'+n,pd.read_excel(io.BytesIO(bb))))
      except Exception:pass
  except Exception as e: debug[-1]['error']=str(e)
 return out,debug

def main():
 players=json.loads((DATA/'players.json').read_text()) if (DATA/'players.json').exists() else []
 cand=json.loads((DATA/'candidates.json').read_text())
 fs,dbg=frames(); diagnostics={'files':dbg,'tables':[]}
 best=None
 for name,df in fs:
  diagnostics['tables'].append({'name':name,'rows':len(df),'columns':[str(c) for c in df.columns]})
  nc=col(df,'player_name','name','player'); tc=col(df,'number_of_trophies','trophies','titles','achievements'); mc=col(df,'matches_played','matches','appearances','games'); gc=col(df,'goals'); ac=col(df,'assists')
  score=sum(x is not None for x in (nc,tc,mc,gc,ac))*100000+len(df)
  if best is None or score>best[0]:best=(score,name,df,nc,tc,mc,gc,ac)
 if not best or not best[3]:
  (DATA/'uoc-diagnostics.json').write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2)); print('No usable UOC table'); return
 _,name,df,nc,tc,mc,gc,ac=best
 pc=col(df,'peak_market_value','highest_market_value','max_market_value'); hc=col(df,'height_cm','height'); dc=col(df,'date_of_birth','birth_date','dob')
 mp={}
 for _,r in df.iterrows():
  k=norm(r.get(nc));
  if k:mp[k]={'trophies':intval(r.get(tc)) if tc else None,'career_appearances':intval(r.get(mc)) if mc else None,'career_goals':intval(r.get(gc)) if gc else None,'career_assists':intval(r.get(ac)) if ac else None,'peak_market_value_eur':money(r.get(pc)) if pc else None,'height_cm':intval(r.get(hc)) if hc else None,'birth_date':str(r.get(dc))[:10] if dc and pd.notna(r.get(dc)) else None}
 moved=[]; remain=[]
 req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
 for p in cand:
  u=mp.get(norm(p['name']))
  if u:
   for k,v in u.items():
    if v is not None:p[k]=v
   p['sources']['career_stats']='UOC-Transfermarkt-2026' if all(p.get(x) is not None for x in ('career_appearances','career_goals','career_assists')) else p['sources'].get('career_stats')
   p['sources']['trophies']='UOC-Transfermarkt-2026' if p.get('trophies') is not None else p['sources'].get('trophies')
  p['playable']=all(p.get(x) is not None for x in req)
  (moved if p['playable'] else remain).append(p)
 players.extend(moved); players={p['id']:p for p in players}.values(); players=sorted(players,key=lambda p:-p.get('recognition_score',0)); remain=sorted(remain,key=lambda p:-p.get('recognition_score',0))
 (DATA/'players.json').write_text(json.dumps(list(players),ensure_ascii=False,separators=(',',':')))
 (DATA/'candidates.json').write_text(json.dumps(remain,ensure_ascii=False,separators=(',',':')))
 meta=json.loads((DATA/'meta.json').read_text()); meta.update({'playable_count':len(list(players)),'candidate_count':len(remain),'uoc_file':name,'uoc_columns':[str(c) for c in df.columns]}); (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 diagnostics['selected_table']=name; diagnostics['matched_names']=sum(1 for p in cand if norm(p['name']) in mp); diagnostics['new_playable']=len(moved); (DATA/'uoc-diagnostics.json').write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2))
 print(json.dumps({'selected_table':name,'matched':diagnostics['matched_names'],'new_playable':len(moved),'playable_total':meta['playable_count']},ensure_ascii=False))
if __name__=='__main__':main()
