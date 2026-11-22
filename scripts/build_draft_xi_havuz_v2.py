#!/usr/bin/env python3
"""Draft XI v2 — oyuncu havuzu (yaklaşık 1000 aktif oyuncu).

Seçim (kullanıcı kararı, 2026-11-22):
  * Süper Lig: Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor, Başakşehir
  * 5 büyük ligden 10'ar takım (aşağıdaki TEAMS)
  * her takımdan 2025-26 sezonunda en çok dakika alan 18 oyuncu (en az 2 kaleci)
  * onaylı yıldızlar listesi (STARS): takımında 18'e giremeyen büyük isimler + bu liglerin dışındaki yıldızlar

Gerçek bilgiler (doğum tarihi, mevki, ayak, boy, kulüp, ülke, eski kulüpler, dakika/gol/asist)
dcaribou/transfermarkt-datasets'ten gelir. Yetenek değerleri:
  * mevcut havuzdaki oyuncular (draft-xi/data/kaynak-havuz.json) değerlerini korur — FMInside kaynaklı değerler hariç:
    onlar da yeni oyuncular gibi formülle yeniden hesaplanır (FM verisi havuzda kalıcı tutulmaz);
  * yeni oyuncular, mevcut havuzdan öğrenilen bir formülle (mevki grubuna göre ridge regresyon:
    piyasa değeri, en yüksek piyasa değeri, yaş, dakika payı, gol/asist, boy, millî maç) hesaplanır
    ve ratingSource = "NEON XI formül" olarak işaretlenir.
Hiçbir dış oyunun (FM, EA FC) değeri kullanılmaz.

  python3 scripts/build_draft_xi_havuz_v2.py [--database .tmp-transfermarkt.duckdb]
  sonra: node scripts/build_draft_xi_pool.mjs
"""
from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

import duckdb
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'draft-xi/data/kaynak-havuz.json'          # output (read by scripts/build_draft_xi_pool.mjs)
WEIGHTS = ROOT / 'draft-xi/data/formul-agirliklari.json'  # learned rule (scripts/train_draft_xi_formul.py); optional
OLD = ROOT / 'draft-xi/data/kaynak-havuz-v1.json'       # frozen first pool: our own values are taught from here
CLUB_NAMES = json.loads((ROOT / 'draft-xi/data/kulup-adlari.json').read_text())['adlar']
_YAZ = json.loads((ROOT / 'draft-xi/data/yaz-2026-transferleri.json').read_text())
SUMMER, ARRIVALS = _YAZ['transferler'], _YAZ.get('gelenler', [])
COUNTRY_TR = json.loads((ROOT / 'side-games/data/master/country-tr.json').read_text())
TODAY = date(2026, 11, 22)
SEASON = ('2025-07-01', '2026-06-30')

TEAMS = {
    'GB1': ['Manchester City', 'Arsenal FC', 'Chelsea FC', 'Liverpool FC', 'Manchester United', 'Tottenham Hotspur',
            'Newcastle United', 'Aston Villa', 'Brighton & Hove Albion', 'Nottingham Forest'],
    'ES1': ['Real Madrid', 'FC Barcelona', 'Atlético de Madrid', 'Athletic Bilbao', 'Villarreal CF', 'Real Sociedad',
            'Real Betis Balompié', 'Sevilla FC', 'Valencia CF', 'Girona FC'],
    'IT1': ['Inter Milan', 'Juventus FC', 'AC Milan', 'SSC Napoli', 'Associazione Sportiva Roma', 'Atalanta BC',
            'Società Sportiva Lazio S.p.A.', 'ACF Fiorentina', 'Bologna Football Club 1909', 'Como 1907'],
    'L1': ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer 04 Leverkusen', 'VfB Stuttgart', 'Eintracht Frankfurt',
           'SC Freiburg', 'TSG 1899 Hoffenheim', 'VfL Wolfsburg', 'Borussia Mönchengladbach'],
    'FR1': ['Paris Saint-Germain', 'Olympique Marseille', 'AS Monaco', 'Olympique Lyon', 'LOSC Lille', 'RC Lens',
            'Stade Rennais FC', 'OGC Nice', 'RC Strasbourg Alsace', 'FC Toulouse'],
    'TR1': ['Galatasaray', 'Fenerbahce', 'Beşiktaş Jimnastik Kulübü', 'Trabzonspor', 'Basaksehir FK'],
}
# Kullanıcının onayladığı yıldızlar (ad, kulüp ipucu). Kulüp ipucu aynı adlı oyuncuları ayırmak içindir.
STARS = [
    ('Jamal Musiala', 'Bayern'), ('Rodrygo', 'Real Madrid'), ('Kai Havertz', 'Arsenal'), ('Gavi', 'Barcelona'),
    ('Alphonso Davies', 'Bayern'), ('Marc-André ter Stegen', 'Barcelona'), ('Endrick', 'Real Madrid'),
    ('Franco Mastantuono', 'Real Madrid'), ('Xavi Simons', 'Leipzig'), ('Omar Marmoush', 'Manchester City'),
    ('Gabriel Jesus', 'Arsenal'), ('James Maddison', 'Tottenham'), ('Federico Chiesa', 'Liverpool'),
    ('Ademola Lookman', 'Atalanta'), ('Gonçalo Ramos', 'Paris'), ('Romelu Lukaku', 'Napoli'),
    ('Lionel Messi', 'Miami'), ('Cristiano Ronaldo', 'Al-Nassr'), ('Neymar', 'Santos'), ('Sadio Mané', 'Al-Nassr'),
    ('Heung-min Son', 'Los Angeles'), ('João Félix', 'Al-Nassr'), ('Sergej Milinković-Savić', 'Al-Hilal'),
    ('Kalidou Koulibaly', 'Al-Hilal'), ('João Cancelo', 'Al-Hilal'), ('Darwin Núñez', 'Al-Hilal'),
    ('Karim Benzema', ''), ('Thomas Müller', 'Vancouver'), ('Luis Suárez', 'Miami'),
    ('Diogo Costa', 'Porto'), ('Morten Hjulmand', 'Sporting'), ('Samu Aghehowa', 'Porto'),
    ('Francisco Trincão', 'Sporting'), ('Gonçalo Inácio', 'Sporting'),
    ('Adam Wharton', 'Crystal Palace'), ('Jack Grealish', 'Everton'), ('Jarrod Bowen', 'West Ham'),
    ('Lucas Paquetá', 'West Ham'), ('Jean-Philippe Mateta', 'Crystal Palace'), ('Igor Thiago', 'Brentford'),
    ('Junior Kroupi', 'Bournemouth'),
]
# Veri setinde aktif görünse de havuza girmeyecekler (hayatını kaybetmiş oyuncular).
EXCLUDE = {'Diogo Jota'}

LEAGUE_SLUG = {'GB1': 'premier-league', 'ES1': 'laliga', 'IT1': 'serie-a', 'L1': 'bundesliga', 'FR1': 'ligue-1',
               'TR1': 'super-lig', 'SA1': 'saudi-pro-league', 'MLS1': 'major-league-soccer', 'BRA1': 'BRA1',
               'PO1': 'liga-portugal', 'NL1': 'eredivisie'}
SUB_POS = {'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB', 'Defensive Midfield': 'DM',
           'Central Midfield': 'CM', 'Attacking Midfield': 'AM', 'Left Midfield': 'LM', 'Right Midfield': 'RM',
           'Left Winger': 'LW', 'Right Winger': 'RW', 'Centre-Forward': 'ST', 'Second Striker': 'ST'}
GROUP = {'GK': 'GK', 'CB': 'DEF', 'LB': 'DEF', 'RB': 'DEF', 'LWB': 'DEF', 'RWB': 'DEF', 'DM': 'MID', 'CM': 'MID',
         'AM': 'MID', 'LM': 'ATT', 'RM': 'ATT', 'LW': 'ATT', 'RW': 'ATT', 'ST': 'ATT'}


def norm(s: str | None) -> str:
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]+', ' ', s).strip()


_LEGAL = re.compile(r"(\b(Football Club|Futbol Club|Fußballclub|Fútbol Club|Futebol Clube|Calcio|S\.p\.A\.|A\.F\.C\.|F\.C\.|S\.K\.|J\.K\.|FC|CF|AFC|SC|SK|FK|AC|SV|CD|UD|SD|SFC)\b\.?)", re.I)


def kisa(name: str | None) -> str:
    """Short display name for a club: explicit list first, then a generic clean-up of legal suffixes."""
    if not name:
        return ''
    if name in CLUB_NAMES:
        return CLUB_NAMES[name]
    clean = re.sub(r'\s+', ' ', _LEGAL.sub('', name)).strip(' .-') or name
    return CLUB_NAMES.get(clean, clean)


def nation_tr(en: str | None) -> str:
    return COUNTRY_TR.get(re.sub(r'[^a-z]', '', (en or '').lower()), en or '')


def age_of(dob) -> int | None:
    if not dob:
        return None
    d = dob.date() if isinstance(dob, datetime) else dob
    return TODAY.year - d.year - ((TODAY.month, TODAY.day) < (d.month, d.day))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--database', type=Path, default=ROOT / '.tmp-transfermarkt.duckdb')
    ap.add_argument('--features-out', type=Path, help='write every player\'s fact card (for scripts/train_draft_xi_formul.py)')
    args = ap.parse_args()
    c = duckdb.connect(str(args.database), read_only=True)

    # The dataset's "current club" lags behind loans and mid-season moves (Ederson, Guendouzi, Gündoğan, Lammens …).
    # A player's club is therefore the club of his last 2025-26 club appearance (national-team tournaments such as
    # the 2026 World Cup do not count); players without appearances keep the recorded current club.
    c.execute("""create temp table eff as
        select p.player_id, coalesce(l.club, try_cast(p.current_club_id as int)) club_id
        from players p left join (select player_id, arg_max(player_club_id, date) club from appearances
                                  where date between ? and ? and competition_id not in
                                    (select competition_id from competitions where type = 'national_team_competition')
                                  group by 1) l using (player_id)""", list(SEASON))
    stats_sql = """
      select p.player_id, p.name, p.sub_position, p.date_of_birth, p.foot, p.height_in_cm, p.country_of_citizenship,
             p.market_value_in_eur, p.highest_market_value_in_eur, p.international_caps,
             case when cl.name is null then try_cast(p.current_club_id as int) else e.club_id end,
             coalesce(cl.name, p.current_club_name), coalesce(cl.domestic_competition_id, p.current_club_domestic_competition_id),
             coalesce(sum(a.minutes_played), 0) mins, coalesce(sum(a.goals), 0) goals, coalesce(sum(a.assists), 0) assists
      from players p join eff e using (player_id) left join clubs cl on try_cast(cl.club_id as int) = e.club_id
      left join appearances a on a.player_id = p.player_id and a.date between ? and ?
      where p.last_season = '2025' and {where}
      group by all"""
    cols = ['tm_id', 'name', 'sub', 'dob', 'foot', 'height', 'nation', 'mv', 'hmv', 'caps', 'club_id', 'club', 'lg',
            'mins', 'goals', 'assists']

    picked: dict[int, dict] = {}
    club_rows: dict[str, list[dict]] = {}  # every candidate of a club, best first (used to refill keepers)
    for lg, names in TEAMS.items():
        for nm in names:
            rows = c.execute(stats_sql.format(where='cl.name = ? and cl.domestic_competition_id = ?'),
                             [*SEASON, nm, lg]).fetchall()
            rows = [dict(zip(cols, r)) for r in rows if r[1] not in EXCLUDE]
            if not rows:
                raise SystemExit(f'kulüp bulunamadı: {nm}')
            # club minutes only (appearances for this club this season)
            club_mins = dict(c.execute("""select player_id, sum(minutes_played) from appearances
                where player_club_id = ? and date between ? and ? group by 1""", [int(rows[0]['club_id']), *SEASON]).fetchall())
            for r in rows:
                r['club_mins'] = int(club_mins.get(r['tm_id'], 0))
            rows.sort(key=lambda r: (-r['club_mins'], -(r['mv'] or 0), r['tm_id']))  # tm_id: same result every run
            pick = rows[:18]
            gks = [r for r in rows if r['sub'] == 'Goalkeeper']
            while sum(r['sub'] == 'Goalkeeper' for r in pick) < 2 and len(gks) >= 2:
                extra = next(g for g in gks if g not in pick)
                drop = max((i for i, r in enumerate(pick) if r['sub'] != 'Goalkeeper'))
                pick[drop] = extra
            for r in pick:
                picked[r['tm_id']] = r
            club_rows[nm] = rows
    for nm, hint in STARS:
        rows = [dict(zip(cols, r)) for r in c.execute(stats_sql.format(where='p.name = ?'), [*SEASON, nm]).fetchall()]
        rows = [r for r in rows if hint.lower() in (r['club'] or '').lower()] or rows
        if not rows:
            raise SystemExit(f'yıldız bulunamadı: {nm}')
        r = max(rows, key=lambda r: r['hmv'] or 0)
        r['club_mins'] = r['mins']
        picked.setdefault(r['tm_id'], r)

    # summer 2026 arrivals from outside the pool (Wikidata list): kept when they played in 2025-26 and are at
    # least rotation level (market value ≥ €4M or a peak value ≥ €15M); the old club becomes a former club
    our_club = {}
    for lg, names in TEAMS.items():
        for nm in names:
            for (cid,) in c.execute("select club_id from clubs where name = ? and domestic_competition_id = ?", [nm, lg]).fetchall():
                our_club[int(cid)] = (nm, lg)
    for a in ARRIVALS:
        if a['tm_id'] in picked or a['kulup_tm_id'] not in our_club:
            continue
        rows = [dict(zip(cols, r)) for r in c.execute(stats_sql.format(where='p.player_id = ?'), [*SEASON, a['tm_id']]).fetchall()]
        if not rows or rows[0]['name'] in EXCLUDE:
            continue
        r = rows[0]
        new_club, new_lg = our_club[a['kulup_tm_id']]
        if r['club'] == new_club or not ((r['mv'] or 0) >= 4e6 or (r['hmv'] or 0) >= 1.5e7):
            continue
        r['club_mins'] = r['mins']
        r['_arrival'] = (new_club, new_lg, a['tarih'])
        picked[r['tm_id']] = r

    # every club keeps at least two keepers after the summer: if departures (and arrivals) leave fewer, the club's
    # next keeper by 2025-26 minutes joins the pool
    leaving = {t['tm_id'] for t in SUMMER}
    for nm, rows in club_rows.items():
        def keepers():
            stay = [r for r in picked.values() if r['club'] == nm and not r.get('_arrival') and r['tm_id'] not in leaving]
            come = [r for r in picked.values() if r.get('_arrival') and r['_arrival'][0] == nm]
            return sum(r['sub'] == 'Goalkeeper' for r in stay + come)
        for r in rows:
            if keepers() >= 2:
                break
            if r['sub'] == 'Goalkeeper' and r['tm_id'] not in picked and r['tm_id'] not in leaving:
                picked[r['tm_id']] = r

    # career clubs (for chemistry and trivia): senior clubs from the transfer history plus clubs the player
    # appeared for, most recent first, excluding the current one. Names use the clubs table spelling when known.
    ids = list(picked)
    club_name = {int(k): v for k, v in c.execute("select club_id, name from clubs").fetchall()}  # club_id is text
    youth = re.compile(r"(\bYth\b|\bYouth\b|\bU-?\d\d\b|\bSub-?\d\d\b|\bII\b|\bB$|\bJuniors?\b|\bReserves?\b|Without Club|Retired|Career break|Unknown|\bAcademy\b|Castilla|Atl[eè]tic\b|\bAtl\.|Next Gen|Deportivo$|Jugend|\b[CY]$|Basconia|Madrile[ñn]o|Bilbao Athletic|Liefering)", re.I)
    career: dict[int, list[tuple[str, str]]] = {}
    for pid, cid, nm, d in c.execute("""select player_id, to_club_id, to_club_name, transfer_date from transfers
            where player_id in (select unnest(?::int[])) and transfer_date <= date '2026-06-30'""", [ids]).fetchall():
        name = club_name.get(cid) or nm
        if name and not youth.search(nm or ''):
            career.setdefault(pid, []).append((name, str(d)))
    for pid, club, last in c.execute("""select a.player_id, cl.name, max(a.date) d from appearances a join clubs cl on cl.club_id = a.player_club_id
            where a.player_id in (select unnest(?::int[])) group by 1, 2""", [ids]).fetchall():
        career.setdefault(pid, []).append((club, str(last)))
    for pid, lst in career.items():
        best = {}
        for name, d in lst:
            best[name] = max(best.get(name, ''), d)
        career[pid] = [k for k, _ in sorted(best.items(), key=lambda kv: (kv[1], kv[0]), reverse=True)]

    # positions from starting line-ups, last two seasons: the most frequent one first, plus every position that
    # holds ≥15 % of the starts and at least 4 starts (user decision: secondary positions from match data)
    starts: dict[int, dict[str, int]] = {}
    for pid, posn, n in c.execute("""select player_id, position, count(*) from game_lineups
            where type = 'starting_lineup' and date >= date '2024-07-01' and player_id in (select unnest(?::int[]))
            group by 1, 2""", [ids]).fetchall():
        code = SUB_POS.get(posn)
        if code:
            starts.setdefault(pid, {})
            starts[pid][code] = starts[pid].get(code, 0) + n

    def lineup_positions(pid):
        st = starts.get(pid, {})
        total = sum(st.values())
        if total < 8:
            return None
        ordered = sorted(st.items(), key=lambda kv: (-kv[1], kv[0]))
        return [k for i, (k, n) in enumerate(ordered) if i == 0 or (n >= 4 and n / total >= 0.15)]

    # --- match the existing pool (values are kept) ---
    old = json.loads(OLD.read_text())
    old_by_key: dict[str, list[dict]] = {}
    for x in old['players']:
        old_by_key.setdefault(norm(x['name']), []).append(x)

    all_old = old['players']
    is_fm = lambda x: str(x.get('ratingSource') or '').startswith('FMInside')

    def find_old(r):
        a = age_of(r['dob']) or 0
        near = lambda x, d=2: abs((x.get('age') or 0) - a) <= d
        toks = set(norm(r['name']).split())
        fallback = None
        # 1) same name; 2) same words in another order ("Son Heung-min" / "Heung-min Son");
        # 3) same club and age, one name contains the other ("Gabriel" / "Gabriel Magalhães")
        for test in (lambda x: norm(x['name']) == norm(r['name']) and near(x),
                     lambda x: set(norm(x['name']).split()) == toks and near(x),
                     lambda x: near(x, 1) and norm(x.get('club'))[:6] == norm(r['club'])[:6]
                     and (toks <= set(norm(x['name']).split()) or set(norm(x['name']).split()) <= toks)):
            cands = [x for x in all_old if test(x)]
            if len(cands) > 1:
                cands = [x for x in cands if not is_fm(x)] or cands
            if len(cands) > 1:
                cands = [x for x in cands if near(x, 0)]
            if len(cands) == 1:
                if not is_fm(cands[0]):
                    return cands[0]
                fallback = fallback or cands[0]  # an FMInside entry: keep looking for our own entry of the same player
        return fallback

    # --- features for the value model ---
    club_max = {}
    for r in picked.values():
        if not r.get('_arrival'):  # arrivals: their old club is not in the pool, so no minutes share
            club_max[r['club']] = max(club_max.get(r['club'], 1), r['club_mins'])

    POS_KIND = {'CB': 0, 'LB': 1, 'RB': 1, 'LWB': 1, 'RWB': 1, 'DM': 2, 'CM': 3, 'AM': 4, 'LM': 5, 'RM': 5, 'LW': 5, 'RW': 5, 'ST': 6}

    def feats(r, pos):
        a = min(max(age_of(r['dob']) or 26, 19), 33)  # clamped: no wild extrapolation for very young/old players
        kind = [1.0 if POS_KIND.get(pos) == k else 0.0 for k in range(7)]  # lets the model learn e.g. AM ≠ DM
        m90 = max(r['mins'], 1) / 90
        return [1.0, math.log10((r['mv'] or 2e5) + 1e5), math.log10((r['hmv'] or r['mv'] or 2e5) + 1e5), a, a * a / 100,
                (r['club_mins'] / club_max[r['club']] if r['club'] in club_max and not r.get('_arrival') else 0.5), min(r['goals'] / m90, 1.2) if r['mins'] > 450 else 0,
                min(r['assists'] / m90, 0.8) if r['mins'] > 450 else 0, (r['height'] or 182) / 10,
                math.log10((r['caps'] or 0) + 1), 1.0 if r['lg'] in ('GB1', 'ES1', 'IT1', 'L1', 'FR1') else 0.0,
                1.0 if r['lg'] == 'TR1' else 0.0, *kind]

    players, train = [], {'GK': ([], []), 'DEF': ([], []), 'MID': ([], []), 'ATT': ([], [])}
    for r in picked.values():
        pos = SUB_POS.get(r['sub'] or '', 'CM')
        o = find_old(r)
        x = {
            'id': o['id'] if o else f"tm{r['tm_id']}", 'tm_id': r['tm_id'], 'name': o['name'] if o else r['name'],
            'pos': (lineup_positions(r['tm_id']) or [None])[0] or (o['pos'] if o and o.get('pos') else pos),
            'positions': lineup_positions(r['tm_id']) or (o.get('positions') if o else None) or [pos],
            'age': age_of(r['dob']), 'birth': str(r['dob'])[:10] if r['dob'] else None,
            'foot': {'right': 'R', 'left': 'L', 'both': 'B'}.get(r['foot'] or '', None), 'height': r['height'],
            'nation': nation_tr(r['nation']), 'club': r['club'], 'league': LEAGUE_SLUG.get(r['lg'], r['lg']),
            'former': [k for k in career.get(r['tm_id'], []) if k != r['club']][:10],
            'mins': r['mins'], 'goals': r['goals'], 'assists': r['assists'],
            # FMInside-derived values are not kept: those players get formula values like new players
            'main': o.get('main') if o and not is_fm(o) else None, 'gk': o.get('gk') if o and not is_fm(o) else None,
            'crossing': o.get('crossing') if o and not is_fm(o) else None,
            'ratingSource': (o.get('ratingSource') if o and not is_fm(o) else None),
        }
        if r.get('_arrival'):
            new_club, new_lg, when = r['_arrival']
            x['former'] = [r['club']] + [k for k in x['former'] if k != new_club]
            x['club'], x['league'], x['transfer'] = new_club, LEAGUE_SLUG.get(new_lg, new_lg), when
        x['_f'] = feats(r, x['pos'])
        x['_g'] = GROUP.get(x['pos'], 'MID')
        x['_r'] = r
        if o and not is_fm(o) and (o.get('main') or o.get('gk')):
            tgt = o['gk'] if x['_g'] == 'GK' else (o['main'] + [o.get('crossing') if o.get('crossing') is not None else float('nan')])
            if (x['_g'] == 'GK') == bool(o.get('gk')):
                train[x['_g']][0].append(x['_f']); train[x['_g']][1].append(tgt)
        players.append(x)

    # ── Match-event profile (last four seasons) ─────────────────────────────────────────────────────────
    # How goals were scored and what kind of assists a player gives, per 90 minutes. Rates of players with few
    # minutes are pulled towards their position average (shrinkage with 900 virtual minutes).
    EV_FROM = '2022-07-01'
    ev = {pid: dict(zip(('npg', 'head', 'left', 'right', 'long'), rest)) for pid, *rest in c.execute("""
        select player_id,
               count(*) filter (where description not ilike '%Penalty%' and description not ilike '%Own-goal%'),
               count(*) filter (where description ilike ', Header%'),
               count(*) filter (where description ilike ', Left-footed shot%'),
               count(*) filter (where description ilike ', Right-footed shot%'),
               count(*) filter (where description ilike ', Long distance kick%' or description ilike ', Direct free kick%')
        from game_events where type = 'Goals' and date >= ? and player_id in (select unnest(?::int[])) group by 1""",
        [EV_FROM, ids]).fetchall()}
    for pid, a_pass, a_cross, a_all in c.execute("""
        select player_assist_id,
               count(*) filter (where description ilike '%Assist: , Pass%'),
               count(*) filter (where description ilike '%Assist: , Cross%' or description ilike '%Assist: , Corner%'
                                or description ilike '%Assist: , Free kick%'),
               count(*)
        from game_events where type = 'Goals' and date >= ? and player_assist_id in (select unnest(?::int[])) group by 1""",
        [EV_FROM, ids]).fetchall():
        ev.setdefault(pid, {}).update({'a_pass': a_pass, 'a_cross': a_cross, 'a_all': a_all})
    for pid, mins in c.execute("""select player_id, sum(minutes_played) from appearances where date >= ?
            and player_id in (select unnest(?::int[])) group by 1""", [EV_FROM, ids]).fetchall():
        ev.setdefault(pid, {})['mins'] = int(mins or 0)
    RATES = ('npg', 'head', 'long', 'a_pass', 'a_cross', 'a_all')

    def ev_rates(pid):
        e = ev.get(pid, {})
        m = e.get('mins', 0)
        return m, {k: e.get(k, 0) for k in RATES}

    def weak_foot(x):
        """Weak foot from goals scored with each foot (≥ 8 foot goals); None when there is not enough data."""
        e = ev.get(x['tm_id'], {})
        left, right = e.get('left', 0), e.get('right', 0)
        if left + right < 8:
            return None
        weak = min(left, right) / (left + right)
        return 2 if weak < 0.08 else 3 if weak < 0.18 else 4 if weak < 0.30 else 5

    # ── Fact card: the only inputs of the learned rule (all from open data) ─────────────────────────────
    WIDE_L, WIDE_R = {'LW', 'LB', 'LM', 'LWB'}, {'RW', 'RB', 'RM', 'RWB'}

    def fact_card(x):
        r = x['_r']
        e = ev.get(x['tm_id'], {})
        m = max(e.get('mins', 0), 1)
        per90 = lambda k, prior: (e.get(k, 0) * 90 + prior * 10) / (m + 900)  # shrunk per-90 rate
        left, right = e.get('left', 0), e.get('right', 0)
        weak = min(left, right) if x['foot'] in (None, 'B') else (left if x['foot'] == 'R' else right)
        st = starts.get(x['tm_id'], {})
        tot = max(1, sum(st.values()))
        opp = sum(n for k, n in st.items() if (k in WIDE_L and x['foot'] == 'R') or (k in WIDE_R and x['foot'] == 'L')) / tot
        age = age_of(r['dob']) or 26
        card = {
            'mv': math.log10((r['mv'] or 3e5) + 2e5), 'peak': math.log10((r['hmv'] or r['mv'] or 3e5) + 2e5),
            'share': r['club_mins'] / club_max[r['club']] if r['club'] in club_max and not r.get('_arrival') else 0.5,
            'caps': math.log10((r['caps'] or 0) + 1), 'age': min(max(age, 18), 36), 'age2': (min(max(age, 18), 36) - 27) ** 2,
            'top5': 1.0 if r['lg'] in ('GB1', 'ES1', 'IT1', 'L1', 'FR1') else 0.0, 'tr': 1.0 if r['lg'] == 'TR1' else 0.0,
            'height': (r['height'] or 182) / 10, 'npg': per90('npg', 0.15), 'head': per90('head', 0.03), 'long': per90('long', 0.01),
            'apass': per90('a_pass', 0.06), 'across': per90('a_cross', 0.03), 'aall': per90('a_all', 0.1),
            'weakshare': (weak + 0.8) / (left + right + 6), 'footgoals': math.log10(left + right + 1),
            'both': 1.0 if x['foot'] == 'B' else 0.0, 'left': 1.0 if x['foot'] == 'L' else 0.0, 'opp': opp,
        }
        for k in ('CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST', 'GK'):
            card['k_' + k] = 0.0
        kind = {'LB': 'FB', 'RB': 'FB', 'LWB': 'FB', 'RWB': 'FB', 'LM': 'W', 'RM': 'W', 'LW': 'W', 'RW': 'W'}.get(x['pos'], x['pos'])
        card['k_' + (kind if 'k_' + kind in card else 'CM')] = 1.0
        return card

    for x in players:
        x['_card'] = fact_card(x)
    if args.features_out:
        args.features_out.write_text(json.dumps({str(x['tm_id']): {'name': x['name'], 'birth': x['birth'], 'pos': x['pos'],
                                                                    'card': x['_card']} for x in players}, ensure_ascii=False))
        print(f'özellik kartları → {args.features_out}')
    learned = json.loads(WEIGHTS.read_text()) if WEIGHTS.exists() else None

    def predict(x, target):
        t = learned['targets'][target]
        names = learned['features']
        v = np.array([x['_card'][n] for n in names], float)
        return float(t['b'] + np.dot((v - np.array(learned['mu'])) / np.array(learned['sd']), np.array(t['w'])))

    # ── Value model ─────────────────────────────────────────────────────────────────────────────────────
    # LEVEL (one number per player) comes from an explicit rule on objective facts, not from old values:
    #   current market value (main weight), peak market value, share of the club's minutes, caps, league;
    #   young players lose part of the "potential premium" in their market value, veterans get part of the
    #   age discount back. The result is mapped to the game scale per position group.
    # SHAPE (how the level spreads over the attributes): players with our own old values keep their own shape
    #   (only their level moves); everyone else gets the average shape of our players of the same position kind,
    #   plus small personal tweaks (goals → shooting, assists → passing/vision, height → heading, age → pace).
    # Main value order: [pace, passing, shooting, dribbling, defending, heading, iq] (+ crossing); keeper: 4 values.
    TOP5 = ('GB1', 'ES1', 'IT1', 'L1', 'FR1')

    def quality_raw(x):
        r = x['_r']
        age = age_of(r['dob']) or 26
        mv = math.log10((r['mv'] or 3e5) + 2e5)
        peak = math.log10((r['hmv'] or r['mv'] or 3e5) + 2e5)
        share = r['club_mins'] / club_max[r['club']] if r['club'] in club_max and not r.get('_arrival') else 0.5
        caps = math.log10((r['caps'] or 0) + 1)
        league = 0.0 if r['lg'] in TOP5 else -0.03  # small: market value already carries most of the league level
        youth = -0.06 * max(0, 23 - age)          # market value runs ahead of today's level for young players
        veteran = 0.05 * min(4, max(0, age - 30))  # and behind it for players past 30
        return 0.62 * mv + 0.18 * peak + 0.22 * share + 0.10 * caps + league + youth + veteran

    for x in players:
        x['_q'] = predict(x, 'ovr') if learned else quality_raw(x)  # learned rule when available
    # map to the game scale per group. The ORDER comes from the rule above; the NUMBERS keep the scale our match
    # engine was tuned on: the top 70 % of the new pool follows the distribution of our first pool in that group
    # (quantile mapping), and the weaker 30 % (bench players the first pool did not have) reaches up to 8 points
    # (keepers 4) below that pool's lowest value. Group means differ by nature (a defender's mean includes low shooting).
    first = {g: [] for g in ('GK', 'DEF', 'MID', 'ATT')}
    for o in all_old:
        if is_fm(o):
            continue
        g = 'GK' if o.get('gk') else GROUP.get(o.get('pos'), 'MID')
        v = o.get('gk') or o.get('main')
        if v:
            first[g].append(float(np.mean(v)))
    # small balance shift: with full club squads (not only stars) defences need a little help so that club-vs-club
    # matches stay near real football goal totals (checked with best XIs of every club, see the PR notes)
    BALANCE = {'GK': 2.0, 'DEF': 1.5}
    for g in ('GK', 'DEF', 'MID', 'ATT'):
        xs = sorted((x for x in players if x['_g'] == g), key=lambda x: (x['_q'], x['tm_id']))
        scale = np.sort(np.array(first[g]))
        for i, x in enumerate(xs):
            pct = i / max(1, len(xs) - 1)
            tail = 4 if g == 'GK' else 8  # keepers: a shorter tail (goal totals stay football-like)
            shift = BALANCE.get(g, 0.0)
            x['_lvl'] = shift + (float(np.quantile(scale, (pct - 0.3) / 0.7)) if pct >= 0.3
                                 else float(scale[0]) - tail * (0.3 - pct) / 0.3)

    # shapes of our own players (value − own mean) → average shape per position kind
    KIND_OF = lambda pos: POS_KIND.get(pos, 7)
    shapes: dict[tuple, list] = {}
    own = lambda x: (x['gk'] if x['_g'] == 'GK' else x['main']) if (x['gk'] if x['_g'] == 'GK' else x['main']) else None
    for x in players:
        v = own(x)
        if v and x['ratingSource'] != 'NEON XI formül':
            vec = list(v) + ([] if x['_g'] == 'GK' else [x['crossing'] if x['crossing'] is not None else float('nan')])
            base = float(np.mean(v))
            k = (x['_g'], KIND_OF(x['pos']) if x['_g'] != 'GK' else 7)
            shapes.setdefault(k, []).append(np.array(vec, float) - base)
            shapes.setdefault((x['_g'], None), []).append(np.array(vec, float) - base)
    profile = {k: np.nanmean(np.array(v), axis=0) for k, v in shapes.items() if len(v) >= 4 or k[1] is None}
    ref = {}
    for g in ('GK', 'DEF', 'MID', 'ATT'):
        xs = [x for x in players if x['_g'] == g]
        ref[g] = tuple(float(np.mean([x['_f'][i] for x in xs])) for i in (6, 7, 8))

    def shape_for(x):
        g, k = x['_g'], (KIND_OF(x['pos']) if x['_g'] != 'GK' else 7)
        if (g, k) in profile:
            return profile[(g, k)].copy()
        if k == 4 and ('MID', 3) in profile and ('ATT', 5) in profile:  # no own-valued AM: between a CM and a winger
            return (profile[('MID', 3)] + profile[('ATT', 5)]) / 2
        return profile[(g, None)].copy()

    # per-kind averages of the event rates (players with ≥ 900 minutes), then shrunk personal z-scores
    kind_stats: dict[int, dict[str, tuple[float, float]]] = {}
    for k in set(KIND_OF(x['pos']) for x in players if x['_g'] != 'GK'):
        rows = [ev_rates(x['tm_id']) for x in players if x['_g'] != 'GK' and KIND_OF(x['pos']) == k]
        rows = [(m, r) for m, r in rows if m >= 900]
        kind_stats[k] = {key: (float(np.mean([r[key] / m * 90 for m, r in rows])) if rows else 0.0,
                               float(np.std([r[key] / m * 90 for m, r in rows])) + 1e-6 if rows else 1.0) for key in RATES}

    def ev_z(x):
        k = KIND_OF(x['pos'])
        m, r = ev_rates(x['tm_id'])
        z = {}
        for key in RATES:
            mean, sd = kind_stats[k][key]
            rate = (r[key] * 90 + mean * 10) / (m + 900)  # shrunk per-90 rate (900 virtual minutes at the average)
            z[key] = (rate - mean) / sd
        return z

    def ev_tweak(vec, x, weight=1.0):
        """Personal adjustments from match events (main value order: pace, passing, shooting, dribbling, defending,
        heading, iq, crossing)."""
        z = ev_z(x)
        vec[2] += weight * float(np.clip(z['npg'] * 1.6 + z['long'] * 0.5, -4, 4))   # shooting ← open-play goals, long shots
        vec[5] += weight * float(np.clip(z['head'] * 2.0, -4, 4))                    # heading  ← headed goals
        vec[1] += weight * float(np.clip(z['a_pass'] * 1.2, -3, 3))                  # passing  ← assists from passes
        vec[6] += weight * float(np.clip(z['a_all'] * 0.8, -2, 2))                   # iq       ← all assists
        if len(vec) > 7 and not np.isnan(vec[7]):
            vec[7] += weight * float(np.clip(z['a_cross'] * 2.5, -5, 5))             # crossing ← crosses, corners, free kicks
        return vec

    # learned rule: personal deviations (from the player's own facts) around the position profile of our scale
    OUT_T = ['pace', 'passing', 'shooting', 'dribbling', 'defending', 'heading', 'iq', 'crossing']
    GK_T = ['g_ref', 'g_pos', 'g_hand', 'g_div']
    kind_key = lambda x: next(k for k, v in x['_card'].items() if k.startswith('k_') and v == 1.0)
    if learned:
        for x in players:
            x['_rel'] = np.array([predict(x, t) for t in (GK_T if x['_g'] == 'GK' else OUT_T)])
        kind_mean = {}
        for x in players:
            kind_mean.setdefault(kind_key(x), []).append(x['_rel'])
        kind_mean = {k: np.mean(v, axis=0) for k, v in kind_mean.items()}

        # weak foot: players ordered by the learned rule, then given out in the shares the reference shows
        # (rounding alone would make nearly everyone a 3)
        outfield = sorted((x for x in players if x['_g'] != 'GK'), key=lambda x: (predict(x, 'weakfoot'), x['tm_id']))
        shares = learned['weakfoot_payi']
        cuts = np.cumsum([shares[str(k)] for k in range(1, 6)])
        for i, x in enumerate(outfield):
            q = (i + 0.5) / len(outfield)
            x['weakFoot'] = int(1 + np.searchsorted(cuts, q))
        for x in players:
            if x['_g'] == 'GK':
                x['weakFoot'] = 3 if x['foot'] != 'B' else 4

    new = 0
    for x in players if learned else []:
        g, lvl = x['_g'], x['_lvl']
        dev = x['_rel'] - kind_mean[kind_key(x)]
        if g == 'GK':
            vec = lvl + shape_for(x) + dev
            x['gk'], x['main'], x['crossing'] = [int(max(1, min(99, round(t)))) for t in vec[:4]], None, None
        else:
            vec = np.nan_to_num(lvl + shape_for(x), nan=lvl - 10) + dev
            x['main'], x['crossing'] = [int(max(1, min(99, round(t)))) for t in vec[:7]], int(max(1, min(99, round(vec[7]))))
            x['gk'] = None
        x['ratingSource'] = 'NEON XI formül'
        new += 1
    for x in [] if learned else players:
        wf = weak_foot(x)
        if wf:
            x['weakFoot'] = wf
        g, lvl = x['_g'], x['_lvl']
        v = own(x)
        if v and x['ratingSource'] != 'NEON XI formül' and ((g == 'GK') == bool(x['gk'])):
            base = float(np.mean(v))
            vals = [t - base + lvl for t in v]
            if g == 'GK':
                x['gk'] = [int(max(1, min(99, round(t)))) for t in vals]
            else:
                cro = x['crossing'] - base + lvl if x['crossing'] is not None else float('nan')
                vals = ev_tweak(np.array(vals + [cro], float), x, weight=0.5)  # own shape stays, events nudge it
                x['main'] = [int(max(1, min(99, round(t)))) for t in vals[:7]]
                if x['crossing'] is not None:
                    x['crossing'] = int(max(1, min(99, round(vals[7]))))
            x['ratingSource'] = 'NEON XI'
        else:
            vec = lvl + shape_for(x)
            if g != 'GK':
                f = x['_f']; rg, ra, rh = ref[g]
                vec = ev_tweak(vec, x)                               # goals and assists from match events
                vec[5] += float(np.clip((f[8] - rh) * 8, -8, 8))    # heading   ← height (8 points per 10 cm)
                age = x['age'] or 26
                vec[0] += float(np.clip((26 - age) * 0.6, -4, 3))   # pace: young players a little quicker
                if age > 31:
                    vec[0] -= 2.0 * (age - 31)                      # and a clear drop past 31
                vec = np.nan_to_num(vec, nan=lvl - 10)
                x['main'], x['crossing'] = [int(max(1, min(99, round(t)))) for t in vec[:7]], int(max(1, min(99, round(vec[7]))))
                x['gk'] = None
            else:
                x['gk'], x['main'], x['crossing'] = [int(max(1, min(99, round(t)))) for t in vec[:4]], None, None
            x['ratingSource'] = 'NEON XI formül'
            new += 1
    for x in players:
        for k in ('_f', '_g', '_r', '_q', '_lvl', '_card', '_rel'):
            x.pop(k, None)

    # summer 2026 transfers (Wikidata list the user reviewed); the league follows the new club when we know it
    league_of = {}
    for cid, nm, comp in c.execute("select club_id, name, domestic_competition_id from clubs").fetchall():
        league_of[kisa(nm)] = LEAGUE_SLUG.get(comp, comp)
    league_of.update({kisa(x['club']): x['league'] for x in players})
    league_of.update({'Al-Hilal': 'saudi-pro-league', 'Al-Nassr': 'saudi-pro-league', 'Al-Ittihad': 'saudi-pro-league',
                      'Al-Qadsiah': 'saudi-pro-league', 'Neom': 'saudi-pro-league', 'Al-Diriyah': 'saudi-pro-league',
                      'Inter Miami': 'major-league-soccer', 'LAFC': 'major-league-soccer', 'Chicago Fire': 'major-league-soccer',
                      'Atlanta United': 'major-league-soccer', 'Montréal': 'major-league-soccer', 'Vancouver Whitecaps': 'major-league-soccer',
                      'Atlético Mineiro': 'BRA1', 'Çorum FK': 'tff-1-lig', 'Al-Sadd': 'QSL', 'Al-Jazira': 'UAE1'})
    moved = {t['tm_id']: t for t in SUMMER}
    for x in players:
        t = moved.get(x['tm_id'])
        if t:
            x['former'] = [x['club']] + x['former']
            x['club'] = t['yeni']
            x['league'] = league_of.get(kisa(t['yeni']), x['league'])
            x['transfer'] = t['tarih']
        x['club'] = kisa(x['club'])
        seen, former = {x['club']}, []
        for k in map(kisa, x['former']):
            if k and k not in seen:
                seen.add(k); former.append(k)
        x['former'] = former[:10]

    players.sort(key=lambda x: (x['league'], x['club'], x['name'], x['tm_id']))
    out = {'extractedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'count': len(players),
           'source': 'dcaribou/transfermarkt-datasets (2025-26 sonu); değerler: mevcut havuz + NEON XI formül',
           'players': players}
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=0) + '\n')
    kept = len(players) - new
    print(f'{len(players)} oyuncu → {SRC.relative_to(ROOT)} (mevcut değerini koruyan {kept}, formülle yeni {new})')
    print(f'yaz 2026 transferi uygulanan: {sum(1 for x in players if x.get("transfer"))} '
          f'(havuz dışından gelen {sum(1 for r in picked.values() if r.get("_arrival"))})')
    dropped = [x['name'] for x in old['players'] if x['id'] not in {p['id'] for p in players}]
    print(f'eski havuzdan çıkan {len(dropped)}:', ', '.join(dropped[:60]))


if __name__ == '__main__':
    main()
