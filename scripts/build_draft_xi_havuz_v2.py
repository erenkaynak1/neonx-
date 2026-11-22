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
OLD = ROOT / 'draft-xi/data/kaynak-havuz-v1.json'       # frozen first pool: our own values are taught from here
CLUB_NAMES = json.loads((ROOT / 'draft-xi/data/kulup-adlari.json').read_text())['adlar']
SUMMER = json.loads((ROOT / 'draft-xi/data/yaz-2026-transferleri.json').read_text())['transferler']
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
    args = ap.parse_args()
    c = duckdb.connect(str(args.database), read_only=True)

    stats_sql = """
      select p.player_id, p.name, p.sub_position, p.date_of_birth, p.foot, p.height_in_cm, p.country_of_citizenship,
             p.market_value_in_eur, p.highest_market_value_in_eur, p.international_caps, p.current_club_id,
             p.current_club_name, p.current_club_domestic_competition_id,
             coalesce(sum(a.minutes_played), 0) mins, coalesce(sum(a.goals), 0) goals, coalesce(sum(a.assists), 0) assists
      from players p left join appearances a on a.player_id = p.player_id and a.date between ? and ?
      where p.last_season = '2025' and {where}
      group by all"""
    cols = ['tm_id', 'name', 'sub', 'dob', 'foot', 'height', 'nation', 'mv', 'hmv', 'caps', 'club_id', 'club', 'lg',
            'mins', 'goals', 'assists']

    picked: dict[int, dict] = {}
    for lg, names in TEAMS.items():
        for nm in names:
            rows = c.execute(stats_sql.format(where='p.current_club_name = ? and p.current_club_domestic_competition_id = ?'),
                             [*SEASON, nm, lg]).fetchall()
            rows = [dict(zip(cols, r)) for r in rows if r[1] not in EXCLUDE]
            if not rows:
                raise SystemExit(f'kulüp bulunamadı: {nm}')
            # club minutes only (appearances for this club this season)
            club_mins = dict(c.execute("""select player_id, sum(minutes_played) from appearances
                where player_club_id = ? and date between ? and ? group by 1""", [int(rows[0]['club_id']), *SEASON]).fetchall())
            for r in rows:
                r['club_mins'] = int(club_mins.get(r['tm_id'], 0))
            rows.sort(key=lambda r: (-r['club_mins'], -(r['mv'] or 0)))
            pick = rows[:18]
            gks = [r for r in rows if r['sub'] == 'Goalkeeper']
            while sum(r['sub'] == 'Goalkeeper' for r in pick) < 2 and len(gks) >= 2:
                extra = next(g for g in gks if g not in pick)
                drop = max((i for i, r in enumerate(pick) if r['sub'] != 'Goalkeeper'))
                pick[drop] = extra
            for r in pick:
                picked[r['tm_id']] = r
    for nm, hint in STARS:
        rows = [dict(zip(cols, r)) for r in c.execute(stats_sql.format(where='p.name = ?'), [*SEASON, nm]).fetchall()]
        rows = [r for r in rows if hint.lower() in (r['club'] or '').lower()] or rows
        if not rows:
            raise SystemExit(f'yıldız bulunamadı: {nm}')
        r = max(rows, key=lambda r: r['hmv'] or 0)
        r['club_mins'] = r['mins']
        picked.setdefault(r['tm_id'], r)

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
        career[pid] = [k for k, _ in sorted(best.items(), key=lambda kv: kv[1], reverse=True)]

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
        ordered = sorted(st.items(), key=lambda kv: -kv[1])
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
        club_max[r['club']] = max(club_max.get(r['club'], 1), r['club_mins'])

    POS_KIND = {'CB': 0, 'LB': 1, 'RB': 1, 'LWB': 1, 'RWB': 1, 'DM': 2, 'CM': 3, 'AM': 4, 'LM': 5, 'RM': 5, 'LW': 5, 'RW': 5, 'ST': 6}

    def feats(r, pos):
        a = age_of(r['dob']) or 26
        kind = [1.0 if POS_KIND.get(pos) == k else 0.0 for k in range(7)]  # lets the model learn e.g. AM ≠ DM
        m90 = max(r['mins'], 1) / 90
        return [1.0, math.log10((r['mv'] or 2e5) + 1e5), math.log10((r['hmv'] or r['mv'] or 2e5) + 1e5), a, a * a / 100,
                r['club_mins'] / club_max[r['club']], min(r['goals'] / m90, 1.2) if r['mins'] > 450 else 0,
                min(r['assists'] / m90, 0.8) if r['mins'] > 450 else 0, (r['height'] or 182) / 10,
                math.log10((r['caps'] or 0) + 1), 1.0 if r['lg'] in TEAMS else 0.0, *kind]

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
        x['_f'] = feats(r, x['pos'])
        x['_g'] = GROUP.get(x['pos'], 'MID')
        if o and not is_fm(o) and (o.get('main') or o.get('gk')):
            tgt = o['gk'] if x['_g'] == 'GK' else (o['main'] + [o.get('crossing') if o.get('crossing') is not None else float('nan')])
            if (x['_g'] == 'GK') == bool(o.get('gk')):
                train[x['_g']][0].append(x['_f']); train[x['_g']][1].append(tgt)
        players.append(x)

    # Value model (our own pool is the only teacher):
    #   level   = one number per player (mean of its values), ridge regression on the facts above, per group;
    #   profile = average (value − level) of our own players of the same position kind;
    #   tweaks  = small personal adjustments from the player's own numbers (goals, assists, height, age).
    # Main value order: [pace, passing, shooting, dribbling, defending, heading, iq] (+ crossing); keeper: 4 values.
    KIND_OF = lambda pos: POS_KIND.get(pos, 7)  # 7 = goalkeeper
    models, profiles, ref = {}, {}, {}
    for g, (X, Y) in train.items():
        X, Y = np.array(X, float), np.array(Y, float)
        lvl = np.nanmean(Y[:, :7] if g != 'GK' else Y, axis=1)
        mu, sd = X[:, 1:].mean(0), X[:, 1:].std(0)
        mu[sd < 1e-6], sd[sd < 1e-6] = 0.0, 1.0
        Xs = np.hstack([X[:, :1], (X[:, 1:] - mu) / sd])
        lam = np.eye(Xs.shape[1]) * 3.0; lam[0, 0] = 0
        w = np.linalg.solve(Xs.T @ Xs + lam, Xs.T @ lvl)
        models[g] = (mu, sd, w, lvl.min(), lvl.max())
        print(f'{g}: {len(X)} oyuncuyla öğrenildi, genel seviye hatası ±{np.sqrt(np.mean((Xs @ w - lvl) ** 2)):.1f}')
    for g, (X, Y) in train.items():
        X, Y = np.array(X, float), np.array(Y, float)
        lvl = np.nanmean(Y[:, :7] if g != 'GK' else Y, axis=1)
        kinds = [int(np.argmax(r[-7:])) if g != 'GK' else 7 for r in X]
        for k in set(kinds) | {None}:
            rows = [i for i, kk in enumerate(kinds) if k is None or kk == k]
            if len(rows) >= 4 or k is None:
                key = (g, k)
                profiles[key] = np.nanmean(Y[rows] - lvl[rows, None], axis=0)
                ref[key] = (np.mean([X[i][6] for i in rows]), np.mean([X[i][7] for i in rows]), np.mean([X[i][8] for i in rows]))

    def predict(x):
        g, k = x['_g'], (KIND_OF(x['pos']) if x['_g'] != 'GK' else 7)
        mu, sd, w, lo, hi = models[g]
        f = np.array(x['_f'], float)
        level = float(np.clip(w @ np.concatenate([[1.0], (f[1:] - mu) / sd]), lo, hi))
        key = (g, k) if (g, k) in profiles else (g, None)
        prof = profiles[key]
        if k == 4 and (g, 4) not in profiles and ('MID', 3) in profiles and ('ATT', 5) in profiles:
            # our pool has no own-valued AM: a playmaker sits between a central midfielder and a winger
            prof, key = (profiles[('MID', 3)] + profiles[('ATT', 5)]) / 2, ('MID', 3)
        v = level + prof
        if g != 'GK':
            g90, a90, h = f[6], f[7], f[8]
            rg, ra, rh = ref[key]
            v[2] += float(np.clip((g90 - rg) * 20, -6, 6))       # shooting  ← goals per 90
            v[1] += float(np.clip((a90 - ra) * 25, -5, 5))       # passing   ← assists per 90
            v[6] += float(np.clip((a90 - ra) * 15, -3, 3))       # iq/vision ← assists per 90
            v[5] += float(np.clip((h - rh) * 6, -8, 8))          # heading   ← height (f[8] is cm/10)
            if (x['age'] or 0) > 31:
                v[0] -= 2.0 * (x['age'] - 31)                    # pace drops with age
        return [int(max(1, min(99, round(t)))) for t in v]

    new = 0
    for x in players:
        if x['main'] is None and x['gk'] is None:
            v = predict(x)
            if x['_g'] == 'GK':
                x['gk'] = v[:4]
            else:
                x['main'], x['crossing'] = v[:7], v[7]
            x['ratingSource'] = 'NEON XI formül'
            new += 1
        del x['_f'], x['_g']

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

    players.sort(key=lambda x: (x['league'], x['club'], x['name']))
    out = {'extractedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'count': len(players),
           'source': 'dcaribou/transfermarkt-datasets (2025-26 sonu); değerler: mevcut havuz + NEON XI formül',
           'players': players}
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=0) + '\n')
    kept = len(players) - new
    print(f'{len(players)} oyuncu → {SRC.relative_to(ROOT)} (mevcut değerini koruyan {kept}, formülle yeni {new})')
    print(f'yaz 2026 transferi uygulanan: {sum(1 for x in players if x.get("transfer"))}')
    dropped = [x['name'] for x in old['players'] if x['id'] not in {p['id'] for p in players}]
    print(f'eski havuzdan çıkan {len(dropped)}:', ', '.join(dropped[:60]))


if __name__ == '__main__':
    main()
