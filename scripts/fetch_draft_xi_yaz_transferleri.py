#!/usr/bin/env python3
"""Draft XI — yaz 2026 transferlerini Wikidata'dan (CC0) çeker.

İki liste üretir (draft-xi/data/yaz-2026-transferleri.json):
  * transferler: havuzdaki oyunculardan yeni bir kulübe geçenler (başlangıç tarihi ≥ 2026-06-01; kullanıcının
                 gördüğü liste korunur)
  * gelenler:    havuzdaki 55 kulübe havuz dışından katılan oyuncular (Transfermarkt numarasıyla)
Sonra: python3 scripts/build_draft_xi_havuz_v2.py  (gelenleri Transfermarkt verisiyle havuza ekler)

  python3 scripts/fetch_draft_xi_yaz_transferleri.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POOL = ROOT / 'draft-xi/data/kaynak-havuz.json'
OUT = ROOT / 'draft-xi/data/yaz-2026-transferleri.json'
SINCE = '2026-06-01'
UA = {'User-Agent': 'neonxi-draft-data/1.0 (football game data; contact via repository)'}


def sparql(q: str) -> list[dict]:
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return json.load(r)['results']['bindings']
        except Exception as e:  # noqa: BLE001 — retry with backoff on network/rate-limit errors
            print('tekrar:', e, file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise SystemExit('Wikidata sorgusu başarısız')


def main() -> None:
    pool = json.loads(POOL.read_text())['players']
    # 1) the transfer list the user already reviewed is kept as it is (regenerate it by deleting the file)
    transfers = json.loads(OUT.read_text())['transferler'] if OUT.exists() else []
    by_tm = {str(p['tm_id']): p for p in pool}

    # 2) players who joined one of our clubs since SINCE and are not in the pool (club matched by Transfermarkt team id)
    from duckdb import connect  # club ids of our clubs come from the Transfermarkt dataset
    db = connect(str(ROOT / '.tmp-transfermarkt.duckdb') if len(sys.argv) < 2 else sys.argv[1], read_only=True)
    sys.path.insert(0, str(ROOT / 'scripts'))
    from build_draft_xi_havuz_v2 import TEAMS  # noqa: E402
    club_ids = []
    for lg, names in TEAMS.items():
        for nm in names:
            club_ids += [str(r[0]) for r in db.execute("select club_id from clubs where name = ? and domestic_competition_id = ?", [nm, lg]).fetchall()]
    vals = ' '.join(f'"{c}"' for c in club_ids)
    rows = sparql(f"""SELECT ?ptm ?p ?pLabel ?ctm ?start WHERE {{
      VALUES ?ctm {{ {vals} }} ?club wdt:P7223 ?ctm . ?p p:P54 ?st . ?st ps:P54 ?club ; pq:P580 ?start .
      FILTER NOT EXISTS {{ ?st pq:P582 ?end }} FILTER (?start >= "{SINCE}T00:00:00Z"^^xsd:dateTime)
      ?p wdt:P2446 ?ptm .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}""")
    in_pool = set(by_tm)
    arrivals, seen = [], set()
    for b in rows:
        t = b['ptm']['value']
        if t in in_pool or t in seen:
            continue
        seen.add(t)
        arrivals.append({'tm_id': int(t), 'ad': b['pLabel']['value'], 'kulup_tm_id': int(b['ctm']['value']), 'tarih': b['start']['value'][:10],
                         'wikidata': b['p']['value'].rsplit('/', 1)[1]})
    arrivals.sort(key=lambda r: (r['kulup_tm_id'], r['ad']))
    OUT.write_text(json.dumps({
        '_aciklama': "Yaz 2026 transferleri Wikidata'dan (CC0): kulüp kaydının başlangıç tarihi 2026-06-01 veya sonrası. "
                     "transferler = havuzdaki oyuncuların yeni kulübü; gelenler = havuzdaki kulüplere havuz dışından katılanlar. "
                     "Yanlış satır silinir ya da düzeltilir; üretici: scripts/fetch_draft_xi_yaz_transferleri.py",
        'kaynak': 'Wikidata (query.wikidata.org)', 'transferler': transfers, 'gelenler': arrivals}, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(transfers)} transfer, {len(arrivals)} gelen → {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
