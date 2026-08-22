#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
REQ=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']

def main():
    cand=json.loads((DATA/'candidates.json').read_text())
    counts=Counter(); combos=Counter(); uoc_counts=Counter(); uoc_total=0
    for p in cand:
        missing=tuple(k for k in REQ if p.get(k) is None)
        combos[missing]+=1
        for k in missing: counts[k]+=1
        if p.get('sources',{}).get('trophies')=='UOC-Transfermarkt-2026':
            uoc_total+=1
            for k in missing: uoc_counts[k]+=1
    out={
      'candidate_count':len(cand),
      'missing_by_field':dict(counts),
      'top_missing_combinations':[{'fields':list(k),'count':v} for k,v in combos.most_common(20)],
      'uoc_enriched_remaining':uoc_total,
      'uoc_missing_by_field':dict(uoc_counts)
    }
    (DATA/'missing-diagnostics.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
    print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
