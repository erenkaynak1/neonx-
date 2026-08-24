#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
FALLBACK=ROOT/'side-games'/'data'/'master'/'mackolik-secondary.json'

# Transfermarkt remains primary. Mackolik is a secondary verifier/fallback.
TOL={'career_appearances':3,'career_goals':2,'career_assists':3}


def main():
    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    refs=json.loads(FALLBACK.read_text(encoding='utf-8'))
    byid={int(p['id']):p for p in players+candidates}
    filled=corroborated=disagreements=0

    for rid,ref in refs.get('players',{}).items():
        p=byid.get(int(rid))
        if not p:
            continue
        check={'url':ref.get('url'),'checked_at':ref.get('checked_at')}
        p.setdefault('secondary_checks',{})['mackolik']=check

        # Weight is fallback only. Never overwrite an already sourced primary value.
        if p.get('weight_kg') is None and ref.get('weight_kg') is not None:
            p['weight_kg']=int(ref['weight_kg'])
            p.setdefault('sources',{})['weight']='Mackolik fallback'
            filled+=1

        differences=[]
        for field in ('career_appearances','career_goals','career_assists'):
            rv=ref.get(field)
            if rv is None:
                continue
            pv=p.get(field)

            # If Transfermarkt-derived career data is genuinely missing, Mackolik can
            # supply the official senior-club counter as a fallback.
            if pv is None:
                p[field]=int(rv)
                p.setdefault('sources',{})['career_stats']='Mackolik official senior club career fallback'
                filled+=1
                continue

            delta=abs(int(pv)-int(rv))
            if delta<=TOL[field]:
                corroborated+=1
                check.setdefault('close_matches',[]).append({
                    'field':field,
                    'transfermarkt_value':int(pv),
                    'mackolik_value':int(rv),
                    'delta':delta
                })
            else:
                # Different providers can use different historical assist definitions.
                # Record the disagreement for audit, but keep Transfermarkt primary.
                disagreements+=1
                differences.append({
                    'field':field,
                    'transfermarkt_value':int(pv),
                    'mackolik_value':int(rv),
                    'delta':delta
                })

        if differences:
            check['definition_disagreements']=differences
            check['policy']='Transfermarkt kept as primary; Mackolik retained as secondary audit evidence.'
        else:
            check['corroborated']=True

    rows=list(byid.values())
    req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
    playable=[];remaining=[]
    for p in rows:
        p.pop('secondary_conflict',None)
        p['playable']=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0
        (playable if p['playable'] else remaining).append(p)

    key=lambda p:(not bool(p.get('turkish_familiar')),not bool(p.get('focus_history')),-float(p.get('recognition_score') or 0))
    playable.sort(key=key);remaining.sort(key=key)
    (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(remaining,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

    meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'playable_count':len(playable),
        'candidate_count':len(remaining),
        'mackolik_fallback_filled':filled,
        'mackolik_values_corroborated':corroborated,
        'mackolik_definition_disagreements':disagreements,
        'mackolik_secondary_checked_at':datetime.now(timezone.utc).isoformat(),
        'mackolik_policy':'Secondary fallback/audit only. Transfermarkt remains primary when both sources have values.'
    })
    meta.setdefault('sources',{})['mackolik_secondary']='Mackolik individual player pages; official senior club career totals'
    (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'playable':len(playable),'filled':filled,'corroborated':corroborated,'definition_disagreements':disagreements},ensure_ascii=False))


if __name__=='__main__':
    main()
