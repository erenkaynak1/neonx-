#!/usr/bin/env python3
import json, re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'side-games' / 'career-twin' / 'data'
TMP = ROOT / '.tmp-career-twin-player-performances.csv'
TM_DB = ROOT / '.tmp-transfermarkt.duckdb'
ARCHIVE_URL = 'https://media.githubusercontent.com/media/salimt/football-datasets/refs/heads/main/datalake/transfermarkt/player_performances/player_performances.csv'
CHUNK = 180_000
YOUTH_RE = re.compile(r'(\bu[- ]?(?:15|16|17|18|19|20|21|23)\b|under[- ]?(?:15|16|17|18|19|20|21|23)|youth|junioren|juniors|juvenil|primavera|academy|akademi|reserve|reserves)', re.I)
RESERVE_TEAM_RE = re.compile(r'(?:\s|[-–])(?:ii|iii|b|c)$', re.I)


def download_archive():
    if TMP.exists() and TMP.stat().st_size > 100_000_000:
        return
    with requests.get(ARCHIVE_URL, stream=True, timeout=(30, 300), headers={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/4.5'}) as r:
        r.raise_for_status()
        with TMP.open('wb') as f:
            for part in r.iter_content(1024 * 1024):
                if part:
                    f.write(part)
    if TMP.stat().st_size < 100_000_000:
        raise RuntimeError('career archive download incomplete')


def num(series):
    return pd.to_numeric(series.replace({'-':0, '':0, 'None':0, 'nan':0}), errors='coerce').fillna(0)


def senior_mask(df):
    team = df['team_name'].fillna('').astype(str).str.strip()
    comp = df['competition_name'].fillna('').astype(str).str.strip()
    return ~(team.str.contains(YOUTH_RE, na=False) | comp.str.contains(YOUTH_RE, na=False) | team.str.contains(RESERVE_TEAM_RE, na=False))


def season_start(value):
    s = str(value or '').strip()
    m = re.match(r'^(\d{2,4})', s)
    if not m:
        return None
    y = int(m.group(1))
    if y < 100:
        y += 2000 if y < 50 else 1900
    return y


def load_full_archive(wanted):
    download_archive()
    seasons = defaultdict(lambda: defaultdict(lambda: {'apps':0, 'goals':0, 'assists':0}))
    clubs = defaultdict(set)
    read_rows = matched_rows = 0
    usecols = ['player_id','season_name','competition_name','team_id','team_name','nb_on_pitch','goals','assists']

    for chunk in pd.read_csv(TMP, usecols=usecols, chunksize=CHUNK, low_memory=False):
        read_rows += len(chunk)
        chunk['player_id'] = pd.to_numeric(chunk['player_id'], errors='coerce')
        chunk = chunk[chunk['player_id'].isin(wanted)]
        if chunk.empty:
            continue
        chunk = chunk[senior_mask(chunk)]
        if chunk.empty:
            continue
        chunk['apps'] = num(chunk['nb_on_pitch'])
        chunk['g'] = num(chunk['goals'])
        chunk['a'] = num(chunk['assists'])
        chunk = chunk[chunk['apps'] > 0]
        matched_rows += len(chunk)
        for r in chunk.itertuples(index=False):
            pid = int(r.player_id)
            sy = season_start(r.season_name)
            if sy is None:
                continue
            x = seasons[pid][sy]
            x['apps'] += int(r.apps)
            x['goals'] += int(r.g)
            x['assists'] += int(r.a)
            if pd.notna(r.team_id):
                clubs[pid].add('id:' + str(int(r.team_id)))
            elif str(r.team_name or '').strip():
                clubs[pid].add('name:' + str(r.team_name).strip().lower())
    return seasons, clubs, read_rows, matched_rows


def load_weekly_transfermarkt(wanted):
    if not TM_DB.exists():
        raise RuntimeError('weekly Transfermarkt DuckDB was not created by build step')
    con = duckdb.connect(str(TM_DB), read_only=True)
    ids = ','.join(str(int(x)) for x in sorted(wanted))
    df = con.execute(f'''
        SELECT a.player_id,
               g.season AS season,
               count(*) AS apps,
               coalesce(sum(a.goals),0) AS goals,
               coalesce(sum(a.assists),0) AS assists
        FROM appearances a
        JOIN games g USING(game_id)
        JOIN clubs home_club ON home_club.club_id = g.home_club_id
        JOIN clubs away_club ON away_club.club_id = g.away_club_id
        WHERE a.player_id IN ({ids})
          AND a.player_club_id IS NOT NULL
          AND a.player_club_id > 0
        GROUP BY a.player_id, g.season
    ''').df()
    clubs_df = con.execute(f'''
        SELECT DISTINCT a.player_id, a.player_club_id
        FROM appearances a
        JOIN games g USING(game_id)
        JOIN clubs home_club ON home_club.club_id = g.home_club_id
        JOIN clubs away_club ON away_club.club_id = g.away_club_id
        WHERE a.player_id IN ({ids})
          AND a.player_club_id IS NOT NULL
          AND a.player_club_id > 0
    ''').df()
    con.close()

    seasons = defaultdict(dict)
    for r in df.itertuples(index=False):
        sy = season_start(r.season)
        if sy is None:
            continue
        seasons[int(r.player_id)][sy] = {
            'apps': int(r.apps or 0),
            'goals': int(r.goals or 0),
            'assists': int(r.assists or 0)
        }
    clubs = defaultdict(set)
    for r in clubs_df.itertuples(index=False):
        clubs[int(r.player_id)].add('id:' + str(int(r.player_club_id)))
    return seasons, clubs


def merge_same_season(historical, current):
    if historical and current:
        # Never mix counters from two snapshots. Pick one complete season row so
        # appearances, goals and assists always share the same source/definition.
        # The snapshot with more recorded appearances is treated as more complete;
        # on a tie prefer the weekly Transfermarkt game-level dataset.
        h_apps = int(historical.get('apps') or 0)
        c_apps = int(current.get('apps') or 0)
        if c_apps >= h_apps:
            return {
                'apps': int(current.get('apps') or 0),
                'goals': int(current.get('goals') or 0),
                'assists': int(current.get('assists') or 0)
            }, 'weekly-overlap'
        return {
            'apps': int(historical.get('apps') or 0),
            'goals': int(historical.get('goals') or 0),
            'assists': int(historical.get('assists') or 0)
        }, 'full-overlap'
    if current:
        return current, 'weekly'
    if historical:
        return historical, 'full'
    return None, None


def main():
    players = json.loads((DATA / 'players.json').read_text(encoding='utf-8'))
    candidates = json.loads((DATA / 'candidates.json').read_text(encoding='utf-8'))
    byid = {int(p['id']): p for p in players + candidates}
    wanted = set(byid)
    if not wanted:
        raise RuntimeError('no Career Twin candidates')

    full, full_clubs, read_rows, matched_rows = load_full_archive(wanted)
    weekly, weekly_clubs = load_weekly_transfermarkt(wanted)

    matched_players = full_seasons_used = weekly_seasons_used = overlap_weekly = overlap_full = 0
    for pid, p in byid.items():
        season_keys = set(full.get(pid, {})) | set(weekly.get(pid, {}))
        total_apps = total_goals = total_assists = 0
        used = 0
        for sy in sorted(season_keys):
            chosen, origin = merge_same_season(full.get(pid, {}).get(sy), weekly.get(pid, {}).get(sy))
            if not chosen or chosen['apps'] <= 0:
                continue
            if origin == 'weekly-overlap': overlap_weekly += 1
            elif origin == 'full-overlap': overlap_full += 1
            elif origin == 'weekly': weekly_seasons_used += 1
            else: full_seasons_used += 1
            used += 1
            total_apps += chosen['apps']
            total_goals += chosen['goals']
            total_assists += chosen['assists']

        if total_apps <= 0:
            continue
        matched_players += 1
        p['career_appearances'] = total_apps
        p['career_goals'] = total_goals
        p['career_assists'] = total_assists
        clubs = set(full_clubs.get(pid, set())) | set(weekly_clubs.get(pid, set()))
        if clubs:
            p['club_count'] = len(clubs)
        src = p.setdefault('sources', {})
        src['career_stats'] = 'Transfermarkt club-only season merge: one complete source row per season; salimt full player_performances + dcaribou weekly appearances'
        src['club_count'] = 'Transfermarkt senior club IDs from full performance archive + weekly club games'
        p['career_seasons_counted'] = used

    req = ['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
    playable, remaining = [], []
    for p in byid.values():
        p['playable'] = all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0) > 0
        (playable if p['playable'] else remaining).append(p)

    key = lambda p: (not bool(p.get('turkish_familiar')), -float(p.get('recognition_score') or 0))
    playable.sort(key=key); remaining.sort(key=key)
    (DATA / 'players.json').write_text(json.dumps(playable, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (DATA / 'candidates.json').write_text(json.dumps(remaining, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    meta = json.loads((DATA / 'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'playable_count': len(playable),
        'candidate_count': len(remaining),
        'open_archive_rows_read': read_rows,
        'open_archive_rows_matched': matched_rows,
        'career_players_matched': matched_players,
        'full_archive_seasons_used': full_seasons_used,
        'weekly_transfermarkt_seasons_used': weekly_seasons_used,
        'overlap_seasons_weekly_selected': overlap_weekly,
        'overlap_seasons_full_selected': overlap_full,
        'career_stats_source': 'Transfermarkt club-only season merge. One source row is selected per season by appearance completeness; counters are never mixed across sources; national teams excluded.',
        'zero_appearance_records_playable': False
    })
    meta.setdefault('sources', {})['career_performance_archive'] = ARCHIVE_URL
    meta['sources']['weekly_transfermarkt_appearances'] = 'dcaribou/transfermarkt-datasets DuckDB appearances + games, restricted to games whose home/away IDs resolve in clubs'
    (DATA / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'playable_before_weight_recovery':len(playable),'remaining':len(remaining),'career_players':matched_players,'full_seasons':full_seasons_used,'weekly_seasons':weekly_seasons_used,'overlap_weekly':overlap_weekly,'overlap_full':overlap_full}, ensure_ascii=False))


if __name__ == '__main__':
    main()
