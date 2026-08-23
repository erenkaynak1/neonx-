#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
KEEP=(
    'id','name','status','recognition_score','height_cm','weight_kg','birth_date',
    'club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances'
)


def main():
    path=DATA/'players.json'
    rows=json.loads(path.read_text(encoding='utf-8'))
    clean=[]
    seen=set()
    for p in rows:
        pid=int(p['id'])
        if pid in seen: continue
        seen.add(pid)
        if int(p.get('career_appearances') or 0)<=0: continue
        clean.append({k:p.get(k) for k in KEEP})
    clean.sort(key=lambda p:-float(p.get('recognition_score') or 0))
    path.write_text(json.dumps(clean,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta_path=DATA/'meta.json'
    meta=json.loads(meta_path.read_text(encoding='utf-8'))
    meta['playable_count']=len(clean)
    meta['runtime_fields']=list(KEEP)
    meta['runtime_removed_fields']=['club','country','position','slug','sources','uoc_team','uoc_age','updated_at','turkish_familiar','playable']
    meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'runtime_players':len(clean),'runtime_fields':list(KEEP)},ensure_ascii=False))

if __name__=='__main__': main()
