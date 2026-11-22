#!/usr/bin/env python3
"""Draft XI — savunma düzeltmeleri, StatsBomb açık verisinden (Euro 2024, Copa América 2024, Bundesliga 2023/24,
AFCON 2023, Ligue 1 2022/23, Dünya Kupası 2022).

Kaynak: StatsBomb Open Data (https://github.com/statsbomb/open-data). Kullanım şartları: ticari olmayan kullanım,
kaynak olarak StatsBomb gösterilir. Ham veri repoya girmez: bu betik yerelde özetlenmiş maç olaylarını
(sb_agg.py çıktısı) okur ve her oyuncu için yalnızca küçük, yuvarlanmış düzeltmeleri yazar:
  draft-xi/data/statsbomb-duzeltme.json → { tm_id: [savunma, kafa] }  (puan, ±4 / ±3 sınırında)

  python3 scripts/build_draft_xi_statsbomb.py <agg.json> [--database .tmp-transfermarkt.duckdb]
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

import duckdb
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
POOL = ROOT / 'draft-xi/data/kaynak-havuz.json'
OUT = ROOT / 'draft-xi/data/statsbomb-duzeltme.json'
KIND = {'CB': 'CB', 'LB': 'FB', 'RB': 'FB', 'LWB': 'FB', 'RWB': 'FB', 'DM': 'DM', 'CM': 'CM', 'AM': 'AM',
        'LM': 'W', 'RM': 'W', 'LW': 'W', 'RW': 'W', 'ST': 'ST'}
MIN_MINUTES = 450


def toks(s: str | None) -> list[str]:
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s).split()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('agg', type=Path)
    ap.add_argument('--database', type=Path, default=ROOT / '.tmp-transfermarkt.duckdb')
    a = ap.parse_args()
    agg = json.loads(a.agg.read_text())['p']
    pool = json.loads(POOL.read_text())['players']
    db = duckdb.connect(str(a.database), read_only=True)
    nation_en = dict(db.execute('select player_id, country_of_citizenship from players where player_id in (select unnest(?::int[]))',
                                [[p['tm_id'] for p in pool]]).fetchall())

    # index StatsBomb players by nickname and by full name; match on name + nationality
    by_name: dict[str, list[dict]] = {}
    for sid, p in agg.items():
        p['sid'] = sid
        for nm in {p.get('nick'), p['name']}:
            if nm:
                by_name.setdefault(' '.join(toks(nm)), []).append(p)

    def find(x):
        country = ' '.join(toks(nation_en.get(x['tm_id'])))
        name = ' '.join(toks(x['name']))
        cands = by_name.get(name, [])
        if not cands:  # one name contains the other ("Rodri" / "Rodrigo Hernández Cascante" via nickname, "Gabriel" …)
            t = set(toks(x['name']))
            cands = [p for p in agg.values() if t and (t <= set(toks(p.get('nick') or '')) or t <= set(toks(p['name'])))]
        cands = [p for p in cands if not country or ' '.join(toks(p.get('country'))) == country] or []
        uniq = {p['sid']: p for p in cands}
        return next(iter(uniq.values())) if len(uniq) == 1 else None

    rows = []
    for x in pool:
        if x['pos'] == 'GK':
            continue
        p = find(x)
        if not p or p['min'] < MIN_MINUTES:
            continue
        m90 = p['min'] / 90
        g = lambda k: p.get(k, 0)
        win = (g('tackle_won') + g('intercept')) / m90                                   # ball winning per 90
        duel = (g('tackle_won') + 2) / (g('tackle') + g('dribbled_past') + 4)             # 1v1 defending, smoothed
        cover = (g('block') + g('clearance')) / m90                                       # blocks + clearances per 90
        air = (g('aerial_won') + 3) / (g('aerial_won') + g('aerial_lost') + 6)            # aerial win share, smoothed
        rows.append({'x': x, 'kind': KIND.get(x['pos'], 'CM'), 'min': p['min'], 'win': win, 'duel': duel, 'cover': cover, 'air': air})

    out = {}
    for kind in set(r['kind'] for r in rows):
        rs = [r for r in rows if r['kind'] == kind]
        if len(rs) < 8:
            continue
        stat = {k: (np.mean([r[k] for r in rs]), np.std([r[k] for r in rs]) + 1e-9) for k in ('win', 'duel', 'cover', 'air')}
        for r in rs:
            z = {k: (r[k] - mu) / sd for k, (mu, sd) in stat.items()}
            trust = r['min'] / (r['min'] + 900)  # little data → small nudge
            if kind in ('CB', 'FB', 'DM'):
                d = 0.45 * z['win'] + 0.35 * z['duel'] + 0.20 * z['cover']
            else:
                d = 0.6 * z['win'] + 0.4 * z['duel']
            defend = int(np.clip(round(d * 2.5 * trust * 2), -4, 4))
            head = int(np.clip(round(z['air'] * 2.0 * trust * 2), -3, 3))
            if defend or head:
                out[str(r['x']['tm_id'])] = [defend, head]
    OUT.write_text(json.dumps({
        '_aciklama': 'Draft XI savunma (top kapma/markaj) ve kafa düzeltmeleri. Kaynak: StatsBomb Open Data '
                     '(Euro 2024, Copa América 2024, Bundesliga 2023/24, AFCON 2023, Ligue 1 2022/23, Dünya Kupası 2022). '
                     'Ticari olmayan kullanım; ham veri yok, yalnızca yuvarlanmış düzeltmeler. Üretici: scripts/build_draft_xi_statsbomb.py',
        'kaynak': 'StatsBomb', 'duzeltmeler': out}, ensure_ascii=False, indent=0) + '\n')
    print(f'{len(rows)} oyuncu eşleşti (≥{MIN_MINUTES} dk), {len(out)} oyuncuya düzeltme → {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
