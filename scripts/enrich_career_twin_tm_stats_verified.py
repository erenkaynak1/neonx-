#!/usr/bin/env python3
import json, re, time, threading
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone

import duckdb
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'side-games' / 'career-twin' / 'data'
TMP = ROOT / '.tmp-career-twin-player-performances.csv'
TM_DB = ROOT / '.tmp-transfermarkt.duckdb'
BASE = 'https://transfermarkt-api.fly.dev/players/{}/stats'
LIMIT = 260
TIMEOUT = 25
REQUEST_INTERVAL = 1.65
UA = {'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/5.0','Accept':'application/json'}
PRIORITY_IDS = [28003,8198,418560,342229,581678,132098,861410,68863,28396,149577]
YOUTH_RE = re.compile(r'(\bu[- ]?(?:15|16|17|18|19|20|21|23)\b|under[- ]?(?:15|16|17|18|19|20|21|23)|youth|junioren|juniors|juvenil|primavera|academy|akademi|reserve|reserves)', re.I)
RESERVE_TEAM_RE = re.compile(r'(?:\s|[-–])(?:ii|iii|b|c)$', re.I)
TEAM_ID_RE = re.compile(r'/verein/(\d+)')

_lock = threading.Lock()
_next_allowed = 0.0


def iv(v):
    if v is None:
        return 0
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(v)
    s = str(v).strip().replace('.', '').replace(',', '')
    m = re.search(r'-?\d+', s)
    return int(m.group()) if m else 0


def throttled_get(url):
    global _next_allowed
    for attempt in range(4):
        with _lock:
            now = time.monotonic()
            wait = max(0.0, _next_allowed - now)
            if wait:
                time.sleep(wait)
            _next_allowed = time.monotonic() + REQUEST_INTERVAL
        try:
            r = requests.get(url, headers=UA, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 429:
                time.sleep(4 + attempt * 3)
                continue
            if r.status_code in (500, 502, 503, 504):
                time.sleep(2 + attempt * 2)
                continue
            return None
        except Exception:
            time.sleep(2 + attempt * 2)
    return None


def senior_mask(df):
    team = df['team_name'].fillna('').astype(str).str.strip()
    comp = df['competition_name'].fillna('').astype(str).str.strip()
    return ~(team.str.contains(YOUTH_RE, na=False) | comp.str.contains(YOUTH_RE, na=False) | team.str.contains(RESERVE_TEAM_RE, na=False))


def collect_senior_club_ids(wanted):
    clubs = defaultdict(set)
    if TMP.exists():
        usecols = ['player_id','competition_name','team_url','team_name','nb_on_pitch']
        for chunk in pd.read_csv(TMP, usecols=usecols, chunksize=180000, low_memory=False):
            chunk['player_id'] = pd.to_numeric(chunk['player_id'], errors='coerce')
            chunk = chunk[chunk['player_id'].isin(wanted)]
            if chunk.empty:
                continue
            chunk = chunk[senior_mask(chunk)]
            if chunk.empty:
                continue
            apps = pd.to_numeric(chunk['nb_on_pitch'].replace({'-':0,'':0}), errors='coerce').fillna(0)
            chunk = chunk[apps > 0]
            for r in chunk.itertuples(index=False):
                m = TEAM_ID_RE.search(str(r.team_url or ''))
                if m:
                    clubs[int(r.player_id)].add(m.group(1))

    if TM_DB.exists() and wanted:
        con = duckdb.connect(str(TM_DB), read_only=True)
        ids = ','.join(str(int(x)) for x in sorted(wanted))
        try:
            df = con.execute(f'''
                SELECT DISTINCT a.player_id, a.player_club_id
                FROM appearances a
                JOIN games g USING(game_id)
                JOIN clubs hc ON hc.club_id = g.home_club_id
                JOIN clubs ac ON ac.club_id = g.away_club_id
                WHERE a.player_id IN ({ids})
                  AND a.player_club_id IS NOT NULL
                  AND a.player_club_id > 0
            ''').df()
            for r in df.itertuples(index=False):
                clubs[int(r.player_id)].add(str(int(r.player_club_id)))
        finally:
            con.close()
    return clubs


def main():
    players = json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates = json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    byid = {int(p['id']): p for p in players + candidates}
    priority_rank = {pid:i for i,pid in enumerate(PRIORITY_IDS)}

    other_req = ['height_cm','weight_kg','birth_date','peak_market_value_eur']
    records = list(byid.values())
    records.sort(key=lambda p: (
        0 if int(p['id']) in priority_rank else 1,
        priority_rank.get(int(p['id']), 9999),
        0 if all(p.get(k) is not None for k in other_req) else 1,
        0 if p.get('turkish_familiar') else 1,
        -float(p.get('recognition_score') or 0)
    ))
    targets = [p for p in records if all(p.get(k) is not None for k in other_req)][:LIMIT]
    target_ids = {int(p['id']) for p in targets}
    senior_clubs = collect_senior_club_ids(target_ids)

    verified = failed = zero_after_filter = 0
    for i, p in enumerate(targets, 1):
        pid = int(p['id'])
        payload = throttled_get(BASE.format(pid))
        rows = (payload or {}).get('stats') if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            failed += 1
            continue
        allowed = senior_clubs.get(pid, set())
        apps = goals = assists = 0
        clubs_used = set()
        for row in rows:
            if not isinstance(row, dict):
                continue
            club_id = str(row.get('clubId') or row.get('club_id') or '').strip()
            if not club_id or (allowed and club_id not in allowed):
                continue
            comp = str(row.get('competitionName') or row.get('competition_name') or '')
            if YOUTH_RE.search(comp):
                continue
            a = iv(row.get('appearances'))
            if a <= 0:
                continue
            apps += a
            goals += iv(row.get('goals'))
            assists += iv(row.get('assists'))
            clubs_used.add(club_id)
        if apps <= 0:
            zero_after_filter += 1
            continue
        p['career_appearances'] = apps
        p['career_goals'] = goals
        p['career_assists'] = assists
        if clubs_used:
            p['club_count'] = len(clubs_used)
        src = p.setdefault('sources', {})
        src['career_stats'] = 'transfermarkt-api.fly.dev stats (live Transfermarkt; senior club IDs only)'
        src['club_count'] = 'transfermarkt-api.fly.dev stats + Transfermarkt senior club ID allowlist'
        p['tm_stats_verified_at'] = datetime.now(timezone.utc).isoformat()
        verified += 1
        if i % 20 == 0:
            print(f'transfermarkt live stats {i}/{len(targets)} verified={verified} failed={failed} zero={zero_after_filter}', flush=True)

    records = list(byid.values())
    key = lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0))
    records.sort(key=key)
    (DATA/'players.json').write_text('[]', encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    meta = json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'generated_at':datetime.now(timezone.utc).isoformat(),
        'playable_count':0,
        'candidate_count':len(records),
        'tm_live_stats_targets':len(targets),
        'tm_live_stats_verified':verified,
        'tm_live_stats_failed':failed,
        'tm_live_stats_zero_after_senior_filter':zero_after_filter,
        'career_stats_primary_for_first_release':'Live Transfermarkt stats endpoint filtered to known senior club IDs'
    })
    meta.setdefault('sources', {})['transfermarkt_live_stats_api'] = 'https://transfermarkt-api.fly.dev/players/{id}/stats'
    (DATA/'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'targets':len(targets),'verified':verified,'failed':failed,'zero_after_filter':zero_after_filter}, ensure_ascii=False))


if __name__ == '__main__':
    main()
