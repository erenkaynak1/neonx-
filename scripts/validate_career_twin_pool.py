#!/usr/bin/env python3
import json,re,unicodedata
from datetime import datetime,date,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
REQ=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
KNOWN_IDS={418560:'Erling Haaland',342229:'Kylian Mbappé',581678:'Jude Bellingham',132098:'Harry Kane',861410:'Arda Güler',68863:'Mauro Icardi',28396:'Edin Dzeko'}
MIN_VERIFIED_PLAYERS=1000


def norm(s):
 s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
 return re.sub(r'[^a-z0-9]+','',s)
def parse_birth(s):
 try:return datetime.strptime(str(s)[:10],'%Y-%m-%d').date()
 except:return None

def valid_record(p):
 reasons=[]
 for k in REQ:
  if p.get(k) is None:reasons.append('missing:'+k)
 if reasons:return False,reasons
 try:
  h=int(p['height_cm']);w=int(p['weight_kg']);clubs=int(p['club_count']);t=int(p['trophies']);g=int(p['career_goals']);a=int(p['career_assists']);apps=int(p['career_appearances']);mv=int(p['peak_market_value_eur'])
 except:return False,['non_numeric']
 b=parse_birth(p['birth_date'])
 if not b:reasons.append('birth_date')
 elif b<date(1940,1,1) or b>date(2011,12,31):reasons.append('birth_range')
 if not 155<=h<=210:reasons.append('height_range')
 if not 48<=w<=125:reasons.append('weight_range')
 if not 1<=clubs<=25:reasons.append('club_count_range')
 if not 0<=t<=70:reasons.append('trophy_range')
 if not 1<=apps<=1400:reasons.append('appearance_range')
 if not 0<=g<=1100:reasons.append('goal_range')
 if not 0<=a<=700:reasons.append('assist_range')
 if g>apps*1.5:reasons.append('goals_vs_apps')
 if a>apps*1.5:reasons.append('assists_vs_apps')
 if not 1_000<=mv<=300_000_000:reasons.append('market_value_range')
 src=p.get('sources') or {}
 trophy_src=str(src.get('trophies') or '')
 if not (trophy_src.startswith('UOC-Transfermarkt-2026') or trophy_src.startswith('transfermarkt-api.fly.dev')):
  reasons.append('trophy_not_directly_verified')
 career_src=str(src.get('career_stats') or '')
 if 'Transfermarkt' not in career_src and 'transfermarkt' not in career_src:
  reasons.append('career_source')
 weight_src=str(src.get('weight') or '')
 if not weight_src:reasons.append('weight_source')
 return not reasons,reasons

def main():
 players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
 cand=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
 all_rows={int(p['id']):p for p in players+cand}
 accepted=[];rejected=[];names=set();duplicates=0
 for p in sorted(all_rows.values(),key=lambda x:(not bool(x.get('turkish_familiar')),-float(x.get('recognition_score') or 0))):
  ok,reasons=valid_record(p)
  nk=norm(p.get('name'))
  if ok and nk in names:
   ok=False;reasons=['duplicate_name'];duplicates+=1
  if ok:
   names.add(nk);p['playable']=True;accepted.append(p)
  else:
   p['playable']=False;p['validation_reasons']=reasons;rejected.append(p)

 refs=exact=monotonic=close=0
 for p in accepted+rejected:
  um=p.get('uoc_matches');ug=p.get('uoc_goals');ua=p.get('uoc_assists')
  if None in (um,ug,ua) or p.get('career_appearances') is None:continue
  refs+=1
  dm=int(p['career_appearances'])-int(um);dg=int(p['career_goals'])-int(ug);da=int(p['career_assists'])-int(ua)
  if dm==0 and dg==0 and da==0:exact+=1
  if dm>=0 and dg>=0 and da>=0:monotonic+=1
  if abs(dm)<=45 and abs(dg)<=30 and abs(da)<=25:close+=1

 audit={}
 for pid,label in KNOWN_IDS.items():
  p=all_rows.get(pid)
  if p:
   audit[str(pid)]={k:p.get(k) for k in ['name','height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances','sources','validation_reasons']}

 (DATA/'players.json').write_text(json.dumps(accepted,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (DATA/'candidates.json').write_text(json.dumps(rejected,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 audit_doc={'generated_at':datetime.now(timezone.utc).isoformat(),'accepted':len(accepted),'rejected':len(rejected),'duplicate_names_removed':duplicates,
            'minimum_required':MIN_VERIFIED_PLAYERS,'uoc_crosscheck':{'records':refs,'exact':exact,'archive_greater_or_equal':monotonic,'within_tolerance':close},'known_players':audit}
 (DATA/'audit.json').write_text(json.dumps(audit_doc,ensure_ascii=False,indent=2),encoding='utf-8')
 meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
 meta.update({'generated_at':audit_doc['generated_at'],'playable_count':len(accepted),'candidate_count':len(rejected),'validation_gate':'strict-v2',
              'minimum_verified_players':MIN_VERIFIED_PLAYERS,'uoc_crosscheck_records':refs,'uoc_crosscheck_exact':exact,'uoc_crosscheck_monotonic':monotonic,'uoc_crosscheck_close':close,'duplicate_names_removed':duplicates})
 (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(audit_doc,ensure_ascii=False))
 if len(accepted)<MIN_VERIFIED_PLAYERS:
  raise SystemExit(f'quality gate left only {len(accepted)} players; minimum is {MIN_VERIFIED_PLAYERS}, refusing to publish')

if __name__=='__main__':main()
