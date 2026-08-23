#!/usr/bin/env python3
import io, json, math, re, unicodedata
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'side-games' / 'career-twin' / 'data'
UA = {'User-Agent': 'Mozilla/5.0 NEON-XI-Career-Twin/4.0'}
URL = 'https://zenodo.org/api/records/19396819/files/jugadors.csv/content'
REFERENCE_DATE = date(2026, 4, 3)


def norm(s):
    s = '' if s is None else str(s)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', s)


def iv(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(round(v))
    m = re.search(r'-?\d+(?:[.,]\d+)?', str(v).strip().replace(' ', ''))
    return int(round(float(m.group().replace(',', '.')))) if m else None


def age_at(birth):
    try:
        d = datetime.strptime(str(birth)[:10], '%Y-%m-%d').date()
        return REFERENCE_DATE.year - d.year - ((REFERENCE_DATE.month, REFERENCE_DATE.day) < (d.month, d.day))
    except Exception:
        return None


def choose_safe(rows, player):
    if not rows:
        return None
    expected_age = age_at(player.get('birth_date'))
    club = norm(player.get('club'))

    age_ok = [r for r in rows if r.get('uoc_age') is not None and expected_age is not None and abs(r['uoc_age'] - expected_age) <= 1]
    team_ok = [r for r in rows if club and norm(r.get('uoc_team')) == club]
    both = [r for r in rows if r in age_ok and r in team_ok]

    if len(both) == 1:
        return both[0]
    if len(age_ok) == 1:
        return age_ok[0]
    if len(team_ok) == 1:
        r = team_ok[0]
        if expected_age is None or r.get('uoc_age') is None or abs(r['uoc_age'] - expected_age) <= 1:
            return r
    if len(rows) == 1:
        r = rows[0]
        age_matches = expected_age is not None and r.get('uoc_age') is not None and abs(r['uoc_age'] - expected_age) <= 1
        team_matches = bool(club and norm(r.get('uoc_team')) == club)
        if age_matches or team_matches:
            return r
    return None


def main():
    response = requests.get(URL, headers=UA, timeout=(30, 180))
    response.raise_for_status()
    df = pd.read_csv(io.BytesIO(response.content), low_memory=False)

    required_cols = {'nom', 'trofeus', 'partits', 'gols', 'assistencies', 'equip', 'edat'}
    missing = sorted(required_cols - set(df.columns))
    if missing:
        raise RuntimeError('Unexpected UOC schema, missing: ' + ','.join(missing))

    by_name = {}
    for _, x in df.iterrows():
        key = norm(x.get('nom'))
        if not key:
            continue
        by_name.setdefault(key, []).append({
            'trophies': iv(x.get('trofeus')),
            'matches': iv(x.get('partits')),
            'goals': iv(x.get('gols')),
            'assists': iv(x.get('assistencies')),
            'uoc_team': None if pd.isna(x.get('equip')) else str(x.get('equip')),
            'uoc_age': iv(x.get('edat'))
        })

    players = json.loads((DATA / 'players.json').read_text(encoding='utf-8'))
    candidates = json.loads((DATA / 'candidates.json').read_text(encoding='utf-8'))
    all_records = {int(p['id']): p for p in players + candidates}

    matched = ambiguous = stats_reference = 0
    for p in all_records.values():
        p['career_appearances'] = None
        p['career_goals'] = None
        p['career_assists'] = None
        p['trophies'] = None
        p['playable'] = False
        src = p.setdefault('sources', {})
        src['career_stats'] = None
        src['trophies'] = None

        rows = by_name.get(norm(p.get('name')), [])
        if not rows:
            continue
        u = choose_safe(rows, p)
        if not u:
            ambiguous += 1
            continue

        matched += 1
        p['uoc_matches'] = u.get('matches')
        p['uoc_goals'] = u.get('goals')
        p['uoc_assists'] = u.get('assists')
        p['uoc_trophies'] = u.get('trophies')
        p['uoc_team'] = u.get('uoc_team')
        p['uoc_age'] = u.get('uoc_age')
        p['uoc_match_safe'] = True

        if all(u.get(k) is not None for k in ('matches', 'goals', 'assists')):
            stats_reference += 1
        if u.get('trophies') is not None:
            p['trophies'] = u['trophies']
            src['trophies'] = 'UOC-Transfermarkt-2026-safe-name-age-team'

    records = sorted(all_records.values(), key=lambda p: (not p.get('turkish_familiar', False), -float(p.get('recognition_score') or 0)))
    (DATA / 'players.json').write_text('[]', encoding='utf-8')
    (DATA / 'candidates.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    meta = json.loads((DATA / 'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'playable_count': 0,
        'candidate_count': len(records),
        'uoc_file': 'jugadors.csv',
        'uoc_columns': list(df.columns),
        'uoc_matched_safe': matched,
        'uoc_ambiguous_rejected': ambiguous,
        'uoc_stats_reference_count': stats_reference,
        'uoc_career_totals_used_as_primary': False,
        'uoc_trophy_match_policy': 'exact normalized name plus age/team disambiguation; ambiguous names rejected',
        'uoc_reference_source': URL
    })
    meta.setdefault('sources', {})['uoc_2026_transfermarkt'] = URL
    (DATA / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'safe_matches': matched, 'ambiguous_rejected': ambiguous, 'stats_reference': stats_reference, 'records': len(records)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
