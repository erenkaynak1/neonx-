#!/usr/bin/env python3
import json, re, unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'side-games' / 'career-twin' / 'data'
REQ = ['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
KNOWN_IDS = {418560:'Erling Haaland',342229:'Kylian Mbappé',581678:'Jude Bellingham',132098:'Harry Kane',861410:'Arda Güler',68863:'Mauro Icardi',28396:'Edin Dzeko',88755:'Kevin De Bruyne',28003:'Lionel Messi',8198:'Cristiano Ronaldo'}
MIN_VERIFIED_PLAYERS = 100


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', s)


def parse_birth(s):
    try:
        return datetime.strptime(str(s)[:10], '%Y-%m-%d').date()
    except Exception:
        return None


def valid_record(p):
    reasons = []
    for k in REQ:
        if p.get(k) is None:
            reasons.append('missing:' + k)
    if reasons:
        return False, reasons

    try:
        h = int(p['height_cm']); w = int(p['weight_kg']); clubs = int(p['club_count'])
        trophies = int(p['trophies']); goals = int(p['career_goals']); assists = int(p['career_assists'])
        apps = int(p['career_appearances']); peak = int(p['peak_market_value_eur'])
    except Exception:
        return False, ['non_numeric']

    birth = parse_birth(p['birth_date'])
    if not birth:
        reasons.append('birth_date')
    elif birth < date(1940,1,1) or birth > date(2011,12,31):
        reasons.append('birth_range')
    if not 155 <= h <= 210: reasons.append('height_range')
    if not 48 <= w <= 125: reasons.append('weight_range')
    if not 1 <= clubs <= 25: reasons.append('club_count_range')
    if not 0 <= trophies <= 70: reasons.append('trophy_range')
    if not 1 <= apps <= 1400: reasons.append('appearance_range')
    if not 0 <= goals <= 1100: reasons.append('goal_range')
    if not 0 <= assists <= 700: reasons.append('assist_range')
    if goals > apps * 1.5: reasons.append('goals_vs_apps')
    if assists > apps * 1.5: reasons.append('assists_vs_apps')
    if not 1_000 <= peak <= 300_000_000: reasons.append('market_value_range')

    # UOC is a Transfermarkt-derived reference snapshot. A current career total
    # should not be lower than a safely matched historical reference counter.
    for field, ref_field in [('career_appearances','uoc_matches'),('career_goals','uoc_goals'),('career_assists','uoc_assists')]:
        if p.get(ref_field) is not None and int(p[field]) < int(p[ref_field]):
            reasons.append('career_below_reference:' + field)

    src = p.get('sources') or {}
    trophy_src = str(src.get('trophies') or '')
    trophy_ok = (
        trophy_src.startswith('transfermarkt-api.fly.dev achievements') or
        trophy_src.startswith('UOC-Transfermarkt-2026-safe-name-age-team')
    )
    if not trophy_ok:
        reasons.append('trophy_source_not_verified')

    career_src = str(src.get('career_stats') or '')
    career_ok = (
        'Transfermarkt' in career_src or
        'transfermarkt' in career_src or
        career_src.startswith('Mackolik official senior club career fallback')
    )
    if not career_ok:
        reasons.append('career_source_not_verified')

    club_src = str(src.get('club_count') or '')
    if 'Transfermarkt' not in club_src and 'transfermarkt' not in club_src:
        reasons.append('club_count_source')

    weight_src = str(src.get('weight') or '')
    if not weight_src:
        reasons.append('weight_source')

    return not reasons, reasons


def main():
    players = json.loads((DATA / 'players.json').read_text(encoding='utf-8'))
    candidates = json.loads((DATA / 'candidates.json').read_text(encoding='utf-8'))
    all_rows = {int(p['id']): p for p in players + candidates}

    accepted, rejected, names = [], [], set()
    duplicates = 0
    for p in sorted(all_rows.values(), key=lambda x: (not bool(x.get('turkish_familiar')), not bool(x.get('focus_history')), -float(x.get('recognition_score') or 0))):
        ok, reasons = valid_record(p)
        nk = norm(p.get('name'))
        if ok and nk in names:
            ok = False; reasons = ['duplicate_name']; duplicates += 1
        if ok:
            names.add(nk); p['playable'] = True; p.pop('validation_reasons', None); accepted.append(p)
        else:
            p['playable'] = False; p['validation_reasons'] = reasons; rejected.append(p)

    audit = {}
    for pid, label in KNOWN_IDS.items():
        p = all_rows.get(pid)
        if p:
            audit[str(pid)] = {k: p.get(k) for k in ['name','height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances','sources','secondary_checks','validation_reasons']}

    generated = datetime.now(timezone.utc).isoformat()
    (DATA / 'players.json').write_text(json.dumps(accepted, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (DATA / 'candidates.json').write_text(json.dumps(rejected, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    audit_doc = {
        'generated_at': generated,
        'accepted': len(accepted),
        'rejected': len(rejected),
        'minimum_required_for_first_release': MIN_VERIFIED_PLAYERS,
        'duplicate_names_removed': duplicates,
        'career_stats_definition': 'Senior official club appearances/goals/assists. Transfermarkt ID-based data is primary; Mackolik official club-career totals are secondary verification/fallback. Youth/reserve and national-team rows excluded.',
        'trophy_definition': 'Senior team trophies from Transfermarkt-derived sources; individual awards, youth titles, finalist/runner-up and participation excluded.',
        'secondary_source_policy': 'Mackolik fills genuinely missing fields and records definition differences for audit. Existing sourced Transfermarkt values remain primary when both providers disagree.',
        'known_players': audit
    }
    (DATA / 'audit.json').write_text(json.dumps(audit_doc, ensure_ascii=False, indent=2), encoding='utf-8')

    meta = json.loads((DATA / 'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'generated_at': generated,
        'playable_count': len(accepted),
        'candidate_count': len(rejected),
        'validation_gate': 'strict-transfermarkt-primary-mackolik-secondary-v7',
        'minimum_verified_players': MIN_VERIFIED_PLAYERS,
        'duplicate_names_removed': duplicates,
        'publication_policy': 'Only 9/9 sourced records are published. Transfermarkt is primary; Mackolik is used to fill missing fields and as secondary audit evidence.'
    })
    (DATA / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(audit_doc, ensure_ascii=False))

    if len(accepted) < MIN_VERIFIED_PLAYERS:
        raise SystemExit(f'quality gate left only {len(accepted)} players; minimum is {MIN_VERIFIED_PLAYERS}, refusing to publish')


if __name__ == '__main__':
    main()
