#!/usr/bin/env python3
import json, math
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'side-games' / 'career-twin' / 'data'
OUT.mkdir(parents=True, exist_ok=True)
TM_DB = ROOT / '.tmp-transfermarkt.duckdb'
TM_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb'
TARGET_CANDIDATES = 8000
BIG3_IDS = (36, 141, 114)  # Fenerbahce, Galatasaray, Besiktas Transfermarkt ids


def safe_int(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    try:
        return int(round(float(v)))
    except Exception:
        return None


def download(url, path):
    with requests.get(url, stream=True, timeout=(30, 300), headers={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/4.0'}) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(1024 * 1024):
                if chunk:
                    f.write(chunk)


def build():
    now = datetime.now(timezone.utc).isoformat()
    if not TM_DB.exists():
        download(TM_URL, TM_DB)

    con = duckdb.connect(str(TM_DB), read_only=True)
    base = con.execute(f'''
      WITH transfer_clubs AS (
        SELECT player_id, count(DISTINCT club_id) club_count FROM (
          SELECT player_id, from_club_id club_id FROM transfers WHERE from_club_id IS NOT NULL AND from_club_id > 0
          UNION ALL
          SELECT player_id, to_club_id club_id FROM transfers WHERE to_club_id IS NOT NULL AND to_club_id > 0
        ) t GROUP BY player_id
      ), peaks AS (
        SELECT player_id, max(market_value_in_eur) peak_value
        FROM player_valuations
        GROUP BY player_id
      ), big3 AS (
        SELECT DISTINCT player_id FROM (
          SELECT player_id, from_club_id club_id FROM transfers
          UNION ALL
          SELECT player_id, to_club_id club_id FROM transfers
        ) x WHERE club_id IN ({','.join(str(x) for x in BIG3_IDS)})
      )
      SELECT p.player_id,p.name,p.player_code,p.date_of_birth,p.height_in_cm,p.position,
             p.current_club_name,p.country_of_citizenship,p.market_value_in_eur,
             p.highest_market_value_in_eur,p.last_season,
             coalesce(p.international_caps,0) international_caps,
             coalesce(tc.club_count,1) transfer_club_count,
             coalesce(pk.peak_value,p.highest_market_value_in_eur) peak_value,
             CASE WHEN b.player_id IS NULL THEN 0 ELSE 1 END big3_history
      FROM players p
      LEFT JOIN transfer_clubs tc USING(player_id)
      LEFT JOIN peaks pk USING(player_id)
      LEFT JOIN big3 b USING(player_id)
      WHERE p.date_of_birth IS NOT NULL
        AND p.height_in_cm IS NOT NULL
        AND coalesce(pk.peak_value,p.highest_market_value_in_eur) IS NOT NULL
    ''').df()
    con.close()

    base['mv'] = pd.to_numeric(base.market_value_in_eur, errors='coerce').fillna(0)
    base['peak'] = pd.to_numeric(base.peak_value, errors='coerce').fillna(0)
    base['caps'] = pd.to_numeric(base.international_caps, errors='coerce').fillna(0)
    base['season'] = pd.to_numeric(base.last_season, errors='coerce').fillna(0)
    base['big3_history'] = pd.to_numeric(base.big3_history, errors='coerce').fillna(0)
    base['recognition_score'] = (
        (base.mv / 1_000_000) * 2
        + (base.peak / 1_000_000) * .45
        + base.caps * .65
        + (base.season >= 2025) * 90
        + (base.season == 2024) * 55
        + (base.season >= 2021) * 20
        + base.big3_history * 260
    )

    active = base[base.season >= 2024].sort_values('recognition_score', ascending=False)
    recent = base[(base.season >= 2015) & (base.season < 2024)].sort_values('recognition_score', ascending=False)
    big3 = base[(base.big3_history == 1) & (base.season >= 2010)].sort_values('recognition_score', ascending=False)
    legends = base[(base.season < 2015) & ((base.peak >= 25_000_000) | (base.caps >= 60))].sort_values('recognition_score', ascending=False)

    selected = pd.concat([big3.head(1400), active.head(6000), recent.head(1800), legends.head(350)])
    selected = selected.drop_duplicates('player_id').sort_values('recognition_score', ascending=False).head(TARGET_CANDIDATES)

    records = []
    for _, r in selected.iterrows():
        birth = str(r.date_of_birth)[:10] if pd.notna(r.date_of_birth) else None
        records.append({
            'id': int(r.player_id),
            'name': str(r['name']),
            'slug': None if pd.isna(r.player_code) else str(r.player_code),
            'status': 'active' if safe_int(r.last_season) and safe_int(r.last_season) >= 2025 else 'recent',
            'recognition_score': round(float(r.recognition_score), 2),
            'club': None if pd.isna(r.current_club_name) else str(r.current_club_name),
            'country': None if pd.isna(r.country_of_citizenship) else str(r.country_of_citizenship),
            'position': None if pd.isna(r.position) else str(r.position),
            'turkish_familiar': bool(r.big3_history),
            'height_cm': safe_int(r.height_in_cm),
            'weight_kg': None,
            'birth_date': birth,
            # This provisional transfer count is replaced by the performance archive count.
            'club_count': safe_int(r.transfer_club_count),
            'trophies': None,
            'career_goals': None,
            'career_assists': None,
            'career_appearances': None,
            'peak_market_value_eur': safe_int(r.peak_value),
            'playable': False,
            'sources': {
                'profile': 'dcaribou/transfermarkt-datasets',
                'weight': None,
                'career_stats': None,
                'club_count': 'transfer history provisional; replaced by performance archive',
                'trophies': None,
                'peak_value': 'dcaribou/transfermarkt-datasets player_valuations'
            },
            'updated_at': now
        })

    records.sort(key=lambda x: (not x.get('turkish_familiar', False), -x['recognition_score']))
    (OUT / 'players.json').write_text('[]', encoding='utf-8')
    (OUT / 'candidates.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    meta = {
        'generated_at': now,
        'playable_count': 0,
        'candidate_count': len(records),
        'total_selected': len(records),
        'identity_policy': 'Transfermarkt player_id is the canonical identity. No name join is used for profile, market value, transfer or career-performance data.',
        'required_fields': ['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances'],
        'career_stats_definition': 'Senior official club appearances, goals and assists summed across Transfermarkt performance rows. Youth/reserve rows excluded.',
        'policy': 'Only 9/9 complete records with positive career appearances are playable. Missing data is never invented.',
        'turkish_familiar_policy': 'Players with Fenerbahce, Galatasaray or Besiktas transfer history receive a strong inclusion boost.',
        'sources': {'transfermarkt_datasets': TM_URL}
    }
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
