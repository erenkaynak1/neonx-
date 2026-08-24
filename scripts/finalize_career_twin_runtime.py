#!/usr/bin/env python3
import json, math, statistics
from datetime import date, datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
REQ=(
    'height_cm','weight_kg','birth_date','club_count','trophies',
    'career_goals','career_assists','peak_market_value_eur','career_appearances'
)
KEEP=(
    'id','name','status','recognition_score','height_cm','weight_kg','birth_date',
    'club_count','trophies','career_goals','career_assists','peak_market_value_eur',
    'career_appearances','data_confidence','estimated_fields'
)
TODAY=date(2026,8,24)


def pos_group(p):
    s=str(p.get('position') or '').lower()
    if 'goalkeeper' in s or 'keeper' in s: return 'GK'
    if 'defender' in s or 'back' in s: return 'DEF'
    if 'midfield' in s: return 'MID'
    if 'attack' in s or 'winger' in s or 'forward' in s or 'striker' in s: return 'ATT'
    return 'UNK'


def age_of(p):
    try:
        d=datetime.strptime(str(p.get('birth_date'))[:10],'%Y-%m-%d').date()
        return TODAY.year-d.year-((TODAY.month,TODAY.day)<(d.month,d.day))
    except Exception:
        return None


def med(vals, default=0):
    vals=[float(v) for v in vals if v is not None and math.isfinite(float(v))]
    return statistics.median(vals) if vals else default


def clamp(v, lo, hi):
    return max(lo,min(hi,v))


def peer_score(target, peer, use_career=True):
    score=0.0
    ta,pa=age_of(target),age_of(peer)
    if ta is not None and pa is not None: score += abs(ta-pa)*0.20
    score += abs(float(target.get('recognition_score') or 0)-float(peer.get('recognition_score') or 0))/120.0
    score += abs(float(target.get('club_count') or 1)-float(peer.get('club_count') or 1))*0.35
    if pos_group(target)!=pos_group(peer): score += 2.5
    if str(target.get('status'))!=str(peer.get('status')): score += 0.8
    if use_career and target.get('career_appearances') is not None and peer.get('career_appearances') is not None:
        score += abs(math.log1p(float(target['career_appearances']))-math.log1p(float(peer['career_appearances'])))*1.2
    return score


def nearest(target, pool, n=25, use_career=True):
    ranked=sorted(pool,key=lambda p:(peer_score(target,p,use_career),int(p.get('id') or 0)))
    return ranked[:min(n,len(ranked))]


def main():
    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    byid={int(p['id']):p for p in players+candidates}
    rows=list(byid.values())

    # Source-backed reference pools. Fallbacks are derived only from records that
    # already have real values, never from previously estimated rows.
    weight_refs=[p for p in rows if p.get('height_cm') and p.get('weight_kg') and 155<=float(p['height_cm'])<=210 and 48<=float(p['weight_kg'])<=125]
    trophy_refs=[p for p in rows if p.get('trophies') is not None]
    career_refs=[p for p in rows if all(p.get(k) is not None for k in ('career_appearances','career_goals','career_assists')) and float(p.get('career_appearances') or 0)>0]

    bmi_global=med([float(p['weight_kg'])/((float(p['height_cm'])/100.0)**2) for p in weight_refs],22.5)
    bmi_by_pos={}
    for g in ('GK','DEF','MID','ATT','UNK'):
        vals=[float(p['weight_kg'])/((float(p['height_cm'])/100.0)**2) for p in weight_refs if pos_group(p)==g]
        bmi_by_pos[g]=med(vals,bmi_global)

    counts={'weight':0,'trophies':0,'career':0,'total_promoted':0}
    for p in rows:
        estimated=[]

        if p.get('weight_kg') is None:
            h=float(p.get('height_cm') or 180)
            bmi=bmi_by_pos.get(pos_group(p),bmi_global)
            p['weight_kg']=int(round(clamp(bmi*((h/100.0)**2),48,125)))
            estimated.append('weight_kg'); counts['weight']+=1

        missing_career=[k for k in ('career_appearances','career_goals','career_assists') if p.get(k) is None]
        if missing_career:
            peers=nearest(p,career_refs,n=31,use_career=False)
            apps=int(round(med([x.get('career_appearances') for x in peers],1)))
            goals=int(round(med([x.get('career_goals') for x in peers],0)))
            assists=int(round(med([x.get('career_assists') for x in peers],0)))
            apps=max(1,apps); goals=max(0,min(goals,int(apps*1.5))); assists=max(0,min(assists,int(apps*1.5)))
            if p.get('career_appearances') is None: p['career_appearances']=apps
            if p.get('career_goals') is None: p['career_goals']=goals
            if p.get('career_assists') is None: p['career_assists']=assists
            estimated.extend(missing_career); counts['career']+=1

        if p.get('trophies') is None:
            peers=nearest(p,trophy_refs,n=31,use_career=True)
            p['trophies']=int(round(clamp(med([x.get('trophies') for x in peers],0),0,70)))
            estimated.append('trophies'); counts['trophies']+=1

        # Defensive last-mile defaults only for structurally required fields that
        # should already exist in the Transfermarkt profile layer.
        if p.get('height_cm') is None:
            p['height_cm']=180; estimated.append('height_cm')
        if p.get('birth_date') is None:
            p['birth_date']='1998-01-01'; estimated.append('birth_date')
        if p.get('club_count') is None:
            p['club_count']=1; estimated.append('club_count')
        if p.get('peak_market_value_eur') is None:
            p['peak_market_value_eur']=100000; estimated.append('peak_market_value_eur')

        p['estimated_fields']=sorted(set(estimated))
        p['data_confidence']='verified' if not p['estimated_fields'] else 'mixed_fallback'

    clean=[];seen=set()
    for p in rows:
        pid=int(p['id'])
        if pid in seen: continue
        seen.add(pid)
        # At this stage every candidate is intentionally promoted. Any fallback is
        # explicitly marked so a future source refresh can replace it.
        clean.append({k:p.get(k) for k in KEEP})
    clean.sort(key=lambda p:-float(p.get('recognition_score') or 0))
    counts['total_promoted']=len(clean)

    (DATA/'players.json').write_text(json.dumps(clean,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (DATA/'candidates.json').write_text('[]',encoding='utf-8')

    meta_path=DATA/'meta.json'
    meta=json.loads(meta_path.read_text(encoding='utf-8'))
    meta['playable_count']=len(clean)
    meta['candidate_count']=0
    meta['runtime_fields']=list(KEEP)
    meta['runtime_removed_fields']=['club','country','position','slug','sources','uoc_team','uoc_age','updated_at','turkish_familiar','playable']
    meta['full_pool_integration']='all selected candidates promoted to runtime; source-backed values retained, unresolved values filled by deterministic peer-median fallback'
    meta['fallback_counts']={'weight_kg':counts['weight'],'trophies':counts['trophies'],'career_triplet_records':counts['career']}
    meta['fallback_policy']='Fallback values are estimates from source-backed peer medians by position, age, club count, recognition and status; estimated_fields marks every estimated metric.'
    meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'runtime_players':len(clean),'fallback_counts':meta['fallback_counts']},ensure_ascii=False))

if __name__=='__main__': main()
