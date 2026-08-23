#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'side-games' / 'career-twin' / 'data'

# Manually verified from Transfermarkt title/achievement pages.
# Count only senior team trophies. Individual awards, top-scorer awards,
# youth titles, runner-up finishes and participation records are excluded.
OVERRIDES = {
    28003: {
        'name': 'Lionel Messi',
        'trophies': 44,
        'source': 'https://www.transfermarkt.com/lionel-messi/erfolge/spieler/28003'
    },
    8198: {
        'name': 'Cristiano Ronaldo',
        'trophies': 34,
        'source': 'https://www.transfermarkt.com/cristiano-ronaldo/erfolge/spieler/8198'
    },
    68863: {
        'name': 'Mauro Icardi',
        'trophies': 13,
        'source': 'https://www.transfermarkt.com/mauro-icardi/erfolge/spieler/68863'
    },
    28396: {
        'name': 'Edin Dzeko',
        'trophies': 11,
        'source': 'https://www.transfermarkt.com/edin-dzeko/erfolge/spieler/28396'
    }
}


def main():
    players = json.loads((DATA / 'players.json').read_text(encoding='utf-8'))
    candidates = json.loads((DATA / 'candidates.json').read_text(encoding='utf-8'))
    rows = {int(p['id']): p for p in players + candidates}
    applied = []
    for pid, override in OVERRIDES.items():
        p = rows.get(pid)
        if not p:
            continue
        p['trophies'] = int(override['trophies'])
        p.setdefault('sources', {})['trophies'] = 'Transfermarkt-achievements-manual-verified'
        p['sources']['trophies_url'] = override['source']
        applied.append({'id': pid, 'name': p.get('name'), 'trophies': p['trophies']})

    merged = list(rows.values())
    merged.sort(key=lambda p: (not bool(p.get('turkish_familiar')), -float(p.get('recognition_score') or 0)))
    (DATA / 'players.json').write_text('[]', encoding='utf-8')
    (DATA / 'candidates.json').write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    meta_path = DATA / 'meta.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    meta['verified_transfermarkt_trophy_overrides'] = applied
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'applied': applied}, ensure_ascii=False))


if __name__ == '__main__':
    main()
