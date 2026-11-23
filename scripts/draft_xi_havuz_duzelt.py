#!/usr/bin/env python3
"""Draft XI Excel havuzundaki mantık hatalarını açık verilerle ve kurallarla düzeltir; her değişikliği kaydeder.

Kullanım: python3 scripts/draft_xi_havuz_duzelt.py --database tm.duckdb [--dry]
  --database  Transfermarkt açık veri seti (dcaribou/transfermarkt-datasets, duckdb)
  --dry       hiçbir dosyaya yazmaz, yalnızca özet

Sıra: havuz-fm.mjs (Excel'in birebir kopyası) okunur → düzeltilir → havuz-fm.mjs yazılır → Excel yeniden üretilir
(scripts/draft_xi_havuz_excel.py, "Düzeltmeler" sayfası dahil) → Excel tekrar okunur (draft_xi_havuz_excel_oku.py).
Kayıt: draft-xi/data/fm-kaynak/duzeltmeler.json (birikimli; aynı oyuncu + alan için son değişiklik tutulur).

Düzeltmeler (kaynak, kural):
 1. Yaş, boy, ayak: Transfermarkt kaydı (doğum tarihi → bugünkü yaş; boy 2 cm'den fazla farklıysa).
 2. Mevki: son iki sezonun ilk 11'lerinden (en sık mevki + başlangıçların ≥%15'i ve ≥4 maç). 3'lü / 5'li savunmalı
    dizilişte "sol / sağ orta saha" ve 5'li savunmada "sol / sağ bek" → kanat bek (LWB / RWB).
 3. Kulüp ve lig: eski havuzda olmayan oyuncularda 2025-26 sezonunu bitirdiği kulüp (son kulüp maçı, araya giren
    kış transferi) ya da Wikidata yaz 2026 listesi. Veri setindeki 30 Haziran kiralık dönüşleri sayılmaz.
 4. Zayıf ayak: iki ayakla attığı goller (≥8 ayak golü; zayıf ayak payı <%8 → 2, <%18 → 3, <%35 → 4, üstü → 5).
 5. Özellik çelişkisi: her özellik, aynı mevki grubundaki oyunculardan öğrenilen modelle oyuncunun diğer 13
    özelliğinden tahmin edilir. Sapma ≥3,5 σ ise ikinci kaynağa (eski açık veri havuzu) bakılır: o da tahmini
    destekliyorsa değer ikisinin ortalaması olur; FM değerini destekliyorsa dokunulmaz; ikinci kaynak yoksa
    sapma ≥4 σ ise değer tahmine çekilir (%70 tahmin + %30 eski değer).
 0. Kimliksiz oyuncular: FM listesinde olup kimliği bulunamadığı için dışarıda kalanlardan adı açıkça eşleşenler
    (ALIAS listesi, elle doğrulandı) Transfermarkt kimliğiyle havuza geri alınır; değerleri FM dönüştürücüsünden gelir.
 6. Kaleci derinliği: havuzda ≥11 oyuncusu olup 2'den az kalecisi olan kulübe, Transfermarkt'ta o kulübün sıradaki
    kalecisi (2025-26 dakikası, sonra piyasa değeri) eklenir; değerleri havuzdaki kalecilerden öğrenilen piyasa
    değeri / yaş modeliyle tahmin edilir ve "tahmini" işaretlenir.
"""
import argparse, collections, datetime, json, math, pathlib, re, subprocess, sys, unicodedata
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
MJS = ROOT / 'draft-xi/data/havuz-fm.mjs'
LOG = ROOT / 'draft-xi/data/fm-kaynak/duzeltmeler.json'
TODAY = datetime.date(2026, 11, 23)
SEASON = ('2025-07-01', '2026-06-30')
K = ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str']
GKK = ['ref', 'gpos', 'ghd', 'one']
LABEL = {'fin': 'Bitiricilik', 'lon': 'Uzaktan Şut', 'hed': 'Kafa', 'posn': 'Pozisyon Alma', 'dri': 'Çalım', 'ft': 'İlk Dokunuş',
         'sp': 'Kısa Pas', 'lp': 'Uzun Pas', 'cro': 'Orta', 'vis': 'Vizyon', 'tac': 'Top Kapma', 'mar': 'Markaj', 'pac': 'Hız',
         'str': 'Güç', 'ref': 'Refleks', 'gpos': 'Kaleci Pozisyonu', 'ghd': 'Hava Hakimiyeti', 'one': 'Bire Bir'}
SUB_POS = {'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB', 'Defensive Midfield': 'DM',
           'Central Midfield': 'CM', 'Attacking Midfield': 'AM', 'Left Midfield': 'LM', 'Right Midfield': 'RM',
           'Left Winger': 'LW', 'Right Winger': 'RW', 'Centre-Forward': 'ST', 'Second Striker': 'ST'}
GRP = {'CB': 'CB', 'LB': 'FB', 'RB': 'FB', 'LWB': 'FB', 'RWB': 'FB', 'DM': 'M', 'CM': 'M', 'AM': 'A', 'LM': 'A', 'RM': 'A',
       'LW': 'A', 'RW': 'A', 'ST': 'ST'}
CLUB_NAMES = json.loads((ROOT / 'draft-xi/data/kulup-adlari.json').read_text())['adlar']
_LEGAL = re.compile(r"(\b(Football Club|Futbol Club|Fußballclub|Fútbol Club|Futebol Clube|Calcio|S\.p\.A\.|A\.F\.C\.|F\.C\.|S\.K\.|J\.K\.|FC|CF|AFC|SC|SK|FK|AC|SV|CD|UD|SD|SFC)\b\.?)", re.I)


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.sub(r'[^a-z ]+', ' ', s).split())


def kisa(name):
    if not name:
        return ''
    if name in CLUB_NAMES:
        return CLUB_NAMES[name]
    clean = re.sub(r'\s+', ' ', _LEGAL.sub('', name)).strip(' .-') or name
    return CLUB_NAMES.get(clean, clean)


def age_of(dob):
    if not dob:
        return None
    d = dob if isinstance(dob, datetime.date) else datetime.date.fromisoformat(str(dob)[:10])
    if isinstance(d, datetime.datetime):
        d = d.date()
    return TODAY.year - d.year - ((TODAY.month, TODAY.day) < (d.month, d.day))


# FM name → Transfermarkt id, checked by hand (same player: club, age, position). Ambiguous names (Igor, Rafa, Ruan,
# Nacho, Joaquín, Pedro Mendes) and players missing from the data set (young Süper Lig players) stay out.
ALIAS = {"Evan N'Dicka": 371149, 'Albert Guðmundsson': 305947, 'Juanlu': 676042, 'Yehor Yarmoliuk': 717411, 'Pepê': 520662,
         'Pote': 426620, 'Ez Abde': 724520, 'Nəriman Axundzadə': 865793, 'Husniddin Aliqulov': 581429,
         'Mortadha Ben Ouannes': 230921, 'Abbosbek Fayzullayev': 754037, 'Arsenii Batahov': 665048,
         'Sinclair Armstrong': 724532, 'Chuchu Ramírez': 419936}


def fm_rows_for(names):
    """Converted 14+4 values of FM players (runs the merge + converter up to its identity filter, writes nothing)."""
    subprocess.check_call([sys.executable, str(ROOT / 'scripts/fm_havuz_birlestir.py')], cwd=ROOT / 'draft-xi/data/fm-kaynak',
                          stdout=subprocess.DEVNULL)
    path = ROOT / 'scripts/build_draft_xi_havuz_fm.py'
    src = path.read_text(encoding='utf-8')
    ns = {'__file__': str(path), '__name__': 'fm_conv'}
    exec(compile(src[:src.index('eksik=[q for q in rows')], str(path), 'exec'), ns)
    return {q['name']: q for q in ns['rows'] if q['name'] in names}


def load_pool():
    txt = MJS.read_text(encoding='utf-8')
    body = txt[txt.index('const RAW = [') + len('const RAW = '):]
    return json.loads(body[:body.index('\n];') + 3].rstrip(';\n'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--database', type=pathlib.Path, required=True)
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--log-out', type=pathlib.Path, help='with --dry: write this run\'s changes to a JSON file')
    args = ap.parse_args()
    import duckdb
    c = duckdb.connect(str(args.database), read_only=True)
    RAW = load_pool()  # [id, ad, mevkiler, ayak, zf, boy, ülke, kulüp, lig, eski, yaş, a[14], g[4]|null, kaynak, tahmini]
    log = []

    def note(row, field, old, new, why, src):
        for x in log:  # the same field changed twice in one run (attribute rounds): keep the original value
            if x['id'] == row[0] and x['alan'] == field:
                x.update(yeni=new, neden=why, kaynak=src)
                return
        log.append({'id': row[0], 'oyuncu': row[1], 'alan': field, 'eski': old, 'yeni': new, 'neden': why, 'kaynak': src})

    # old open-data pool (second opinion for attributes, curated identity)
    txt = (ROOT / 'draft-xi/data/havuz.mjs').read_text(encoding='utf-8')
    body = txt[txt.index('const RAW = [') + len('const RAW = '):]
    OLD = {r[0]: r for r in json.loads(body[:body.index('];') + 1])}

    # ── match every player to a Transfermarkt id ──
    tm_rows = c.execute("""select player_id, name, sub_position, date_of_birth, foot, height_in_cm, try_cast(last_season as int),
                                  coalesce(market_value_in_eur, 0), coalesce(highest_market_value_in_eur, 0)
                           from players""").fetchall()
    TM = {r[0]: r for r in tm_rows}
    by_name = collections.defaultdict(list)
    for r in tm_rows:
        by_name[norm(r[1])].append(r)
    tmid = {}
    for row in RAW:
        m = re.fullmatch(r'tm(\d+)(?:-\d+)?', row[0])
        if m and int(m.group(1)) in TM:
            tmid[row[0]] = int(m.group(1)); continue
        gk = row[2] == ['GK']
        cand = [r for r in by_name.get(norm(row[1]), []) if (r[2] == 'Goalkeeper') == gk and (r[6] or 0) >= 2024]
        if cand:
            tmid[row[0]] = max(cand, key=lambda r: (r[6] or 0, r[7]))[0]
    # ── 0. bring back players left out for missing identity ──
    kim_path = ROOT / 'draft-xi/data/fm-kaynak/kimliksiz.json'
    kimliksiz = json.loads(kim_path.read_text(encoding='utf-8'))
    want = [n for n in kimliksiz if n in ALIAS and ALIAS[n] in TM and f'tm{ALIAS[n]}' not in {r[0] for r in RAW}]
    back = fm_rows_for(set(want)) if want else {}
    ctr = json.loads((ROOT / 'side-games/data/master/country-tr.json').read_text())
    restored = []
    for n in want:
        q, t = back.get(n), TM[ALIAS[n]]
        if not q:
            continue
        cl = c.execute("""select cl.name, cl.domestic_competition_id from appearances a join clubs cl on cl.club_id = a.player_club_id
                where a.player_id = ? and a.date between ? and ? and a.competition_id not in
                  (select competition_id from competitions where type = 'national_team_competition')
                order by a.date desc limit 1""", [t[0], *SEASON]).fetchone()
        if not cl:
            continue
        nat = c.execute("select country_of_citizenship from players where player_id = ?", [t[0]]).fetchone()[0]
        pos = ['GK'] if q['gk'] else [SUB_POS.get(t[2]) or (q['ident']['positions'] or ['CM'])[0]]
        row = [f'tm{t[0]}', n, pos, {'left': 'L'}.get(t[4] or '', 'R'), 4 if t[4] == 'both' else 3, int(t[5] or 180),
               ctr.get(re.sub(r'[^a-z]', '', (nat or '').lower()), nat or ''), kisa(cl[0]), '', [], age_of(t[3]),
               q['a'], q['g'], '', sorted(set(['weakFoot'] + [x for x in q['tah'] if x in K + GKK + ['saha-ozellikleri-kaleci']]))]
        row[8] = cl[1]  # placeholder: turned into the pool's league label below
        RAW.append(row)
        tmid[row[0]] = t[0]
        restored.append(n)
        note(row, 'Yeni oyuncu', '', f'{row[7]} ({"/".join(pos)})', 'FM listesinde vardı, kimliği bulunamadığı için dışarıda kalmıştı; '
             f'Transfermarkt\'ta eşleşti ({t[1]})', 'Transfermarkt + FM listesi')
    ids = list(set(tmid.values()))
    print(f'Transfermarkt eşleşmesi: {len(tmid)}/{len(RAW)} · geri alınan: {len(restored)}')

    # ── 1. age, height, foot ──
    for row in RAW:
        t = TM.get(tmid.get(row[0]))
        if not t:
            continue
        a = age_of(t[3])
        if a and a != row[10]:
            note(row, 'Yaş', row[10], a, 'doğum tarihinden bugünkü yaş', 'Transfermarkt'); row[10] = a
        if t[5] and row[5] and abs(int(t[5]) - row[5]) > 2:
            note(row, 'Boy', row[5], int(t[5]), 'kayıtlı boy', 'Transfermarkt'); row[5] = int(t[5])
            row[14] = [x for x in row[14] if x != 'height']
        f = {'right': 'R', 'left': 'L'}.get(t[4] or '')
        if f and f != row[3] and row[3] != 'B':
            note(row, 'Ayak', row[3], f, 'kayıtlı kullandığı ayak', 'Transfermarkt'); row[3] = f
            row[14] = [x for x in row[14] if x != 'foot']
        if t[4] == 'both' and row[4] < 4 and 'weakFoot' in row[14]:
            note(row, 'Zayıf Ayak', row[4], 4, 'iki ayağını da kullanıyor', 'Transfermarkt'); row[4] = 4

    # ── 2. positions from starting line-ups (formation aware: wing-backs) ──
    starts = collections.defaultdict(collections.Counter)
    for pid, posn, form, n in c.execute("""
            select l.player_id, l.position,
                   case when l.club_id = g.home_club_id then g.home_club_formation else g.away_club_formation end f, count(*)
            from game_lineups l join games g using (game_id)
            where l.type = 'starting_lineup' and l.date >= date '2024-07-01' and l.player_id in (select unnest(?::int[]))
            group by 1, 2, 3""", [ids]).fetchall():
        code = SUB_POS.get(posn)
        if not code:
            continue
        back = (form or '').strip()[:1]
        if code in ('LM', 'RM') and back in ('3', '5'):
            code = 'LWB' if code == 'LM' else 'RWB'
        elif code in ('LB', 'RB') and back == '5':
            code = 'LWB' if code == 'LB' else 'RWB'
        starts[pid][code] += n
    for row in RAW:
        st = starts.get(tmid.get(row[0]))
        if not st or row[2] == ['GK']:
            continue
        total = sum(st.values())
        if total < 8:
            continue
        ordered = sorted(st.items(), key=lambda kv: (-kv[1], kv[0]))
        pos = [k for i, (k, n) in enumerate(ordered) if (i == 0 or (n >= 4 and n / total >= 0.15)) and k != 'GK']
        if pos and pos != row[2]:
            note(row, 'Mevki', '/'.join(row[2]), '/'.join(pos), f'son iki sezon {total} ilk 11: ' +
                 ', '.join(f'{k} {n}' for k, n in ordered[:4]), 'Transfermarkt maç kadroları')
            row[2] = pos
            row[14] = [x for x in row[14] if x != 'positions']

    # ── 3. club and league (players outside the curated old pool) ──
    league_of = collections.Counter()
    for row in RAW:
        league_of[(row[7], row[8])] += 1
    club_league = {}
    for (club, lg), n in league_of.items():
        if n > club_league.get(club, ('', 0))[1]:
            club_league[club] = (lg, n)
    comp_label = collections.Counter()
    club_rows = dict(c.execute("select try_cast(club_id as int), name from clubs").fetchall())
    club_comp = dict(c.execute("select try_cast(club_id as int), domestic_competition_id from clubs").fetchall())
    last_app = {pid: (cid, d) for pid, cid, d in c.execute("""
            select player_id, arg_max(player_club_id, date), max(date) from appearances
            where date between ? and ? and competition_id not in
                  (select competition_id from competitions where type = 'national_team_competition')
              and player_id in (select unnest(?::int[])) group by 1""", [*SEASON, ids]).fetchall()}
    moves = collections.defaultdict(list)
    for pid, d, to_id, to_name in c.execute("""select player_id, transfer_date, to_club_id, to_club_name from transfers
            where player_id in (select unnest(?::int[])) and transfer_date <= ?""", [ids, TODAY]).fetchall():
        moves[pid].append((d, to_id, to_name))
    summer = json.loads((ROOT / 'draft-xi/data/yaz-2026-transferleri.json').read_text())
    summer_new = {t['tm_id']: t for t in summer.get('transferler', [])}
    # league labels used by the pool, learned from clubs already in it
    for row in RAW:
        t = tmid.get(row[0])
        la = last_app.get(t)
        if la and kisa(club_rows.get(la[0])) == row[7]:
            comp_label[(club_comp.get(la[0]), row[8])] += 1
    label = {}
    for (comp, lg), n in comp_label.items():
        if n > label.get(comp, ('', 0))[1]:
            label[comp] = (lg, n)
    LG_FALLBACK = {'GB1': 'Premier League', 'ES1': 'La Liga', 'IT1': 'Serie A', 'L1': 'Bundesliga', 'FR1': 'Ligue 1',
                   'TR1': 'Süper Lig', 'PO1': 'Liga Portugal', 'NL1': 'Eredivisie', 'MLS1': 'MLS', 'SA1': 'Saudi Pro League'}
    for row in RAW:
        if row[1] in restored:
            row[8] = club_league.get(row[7], (None,))[0] or label.get(row[8], (None,))[0] or LG_FALLBACK.get(row[8], 'Diğer')
    for row in RAW:
        t = tmid.get(row[0])
        if not t or row[0] in OLD or row[1] in restored:
            continue
        la = last_app.get(t)
        club_id, since = (la[0], la[1]) if la else (None, datetime.date(2025, 7, 1))
        # moves after the last 2025-26 match but before mid-June (winter loans etc.); the data set's end-of-June loan
        # returns are left out: it was taken in early July and misses the summer market (Wikidata list covers that)
        after = [m for m in moves.get(t, []) if since < m[0] < datetime.date(2026, 6, 15)]
        if after:
            club_id = max(after)[1]
        new = kisa(club_rows.get(club_id)) if club_id in club_rows else None
        if t in summer_new:
            new = kisa(summer_new[t]['yeni'])
        if not new or new == row[7] or 'without' in new.lower() or 'retired' in new.lower():
            continue
        lg = club_league.get(new, (None,))[0] or label.get(club_comp.get(club_id), (None,))[0]
        if not lg:
            continue
        note(row, 'Kulüp', row[7], new, ('yaz 2026 transferi' if t in summer_new else 'oyuncunun 2025-26 sezonunu bitirdiği kulüp') + f' (lig: {lg})', 'Wikidata' if t in summer_new else 'Transfermarkt')
        if row[7] and row[7] != new and row[7] not in row[9]:
            row[9] = [row[7]] + row[9]
        row[7], row[8] = new, lg
        row[9] = [x for x in row[9] if x != new]
        row[14] = [x for x in row[14] if x != 'club']

    # ── 4. weak foot from goals with each foot ──
    feet = collections.defaultdict(lambda: [0, 0])
    for pid, desc in c.execute("""select player_id, description from game_events where type = 'Goals' and date >= date '2019-07-01'
            and player_id in (select unnest(?::int[]))""", [ids]).fetchall():
        d = desc or ''
        if 'Left-footed' in d:
            feet[pid][0] += 1
        elif 'Right-footed' in d:
            feet[pid][1] += 1
    for row in RAW:
        l, r = feet.get(tmid.get(row[0]), (0, 0))
        if l + r < 8 or row[2] == ['GK']:
            continue
        weak = min(l, r) / (l + r)
        wf = 2 if weak < 0.08 else 3 if weak < 0.18 else 4 if weak < 0.35 else 5
        if wf != row[4] and 'weakFoot' in row[14]:
            note(row, 'Zayıf Ayak', row[4], wf, f'goller: sol {l}, sağ {r} (zayıf ayak payı %{round(100 * weak)})', 'Transfermarkt maç olayları')
            row[4] = wf
        if 'weakFoot' in row[14]:
            row[14] = [x for x in row[14] if x != 'weakFoot']

    # ── 5. attribute contradictions (repeated until nothing changes, so a second run finds nothing new) ──
    for _round in range(8):
        n_changed = 0
        for g in ['CB', 'FB', 'M', 'A', 'ST']:
            R = [row for row in RAW if row[2] != ['GK'] and GRP.get(row[2][0]) == g]
            X = np.array([row[11] for row in R], dtype=float)
            changes = []
            for j, k in enumerate(K):
                others = [i for i in range(len(K)) if i != j]
                A = np.c_[X[:, others], np.ones(len(X))]
                y = X[:, j]
                keep = np.ones(len(X), bool)
                for _ in range(3):  # robust fit: drop the outliers and refit
                    w = np.linalg.solve(A[keep].T @ A[keep] + 5 * np.eye(A.shape[1]), A[keep].T @ y[keep])
                    res = y - A @ w
                    s = 1.4826 * np.median(np.abs(res[keep] - np.median(res[keep])))
                    keep = np.abs(res) < 3 * s
                pred = A @ w
                for i, row in enumerate(R):
                    z = (y[i] - pred[i]) / s
                    if abs(z) < 3.5:
                        continue
                    o = OLD.get(row[0])
                    ov = o[11][j] if o and o[2] != ['GK'] else None
                    fm, p = int(y[i]), float(pred[i])
                    if ov is not None:
                        if abs(ov - p) >= abs(ov - fm):
                            continue  # the second source agrees with the FM value
                        new = round((p + ov) / 2)
                        why = f'mevki grubuna göre beklenen {round(p)}, sapma {abs(z):.1f}σ; eski açık veri havuzu {ov} → ortalama'
                        src = 'tutarlılık modeli + eski açık veri havuzu'
                    else:
                        if abs(z) < 4:
                            continue
                        new = round(0.7 * p + 0.3 * fm)
                        why = f'mevki grubuna göre beklenen {round(p)}, sapma {abs(z):.1f}σ (ikinci kaynak yok)'
                        src = 'tutarlılık modeli'
                    new = max(1, min(99, new))
                    if new != fm:
                        changes.append((row, j, k, fm, new, why, src))
            for row, j, k, fm, new, why, src in changes:
                note(row, LABEL[k], fm, new, why, src)
                row[11][j] = new
                n_changed += 1
        if not n_changed:
            break

    # ── 6. goalkeeper depth ──
    clubs = collections.defaultdict(list)
    for row in RAW:
        clubs[row[7]].append(row)
    gks = [row for row in RAW if row[2] == ['GK'] and tmid.get(row[0])]
    feats = lambda t: [1.0, math.log10(max(TM[t][7], 1e5)), math.log10(max(TM[t][8], 1e5)), (age_of(TM[t][3]) or 27) - 27,
                       ((age_of(TM[t][3]) or 27) - 27) ** 2 / 10]
    XG = np.array([feats(tmid[r[0]]) for r in gks])
    YG = np.array([r[12] + [r[11][K.index(k)] for k in ('ft', 'sp', 'lp', 'vis', 'pac', 'str')] for r in gks], dtype=float)
    WG = np.linalg.solve(XG.T @ XG + 0.5 * np.eye(XG.shape[1]), XG.T @ YG)
    have = {tmid[r[0]] for r in RAW if r[0] in tmid}
    eff_club = {}
    for pid, cid in c.execute("select player_id, try_cast(current_club_id as int) from players").fetchall():
        eff_club[pid] = cid  # no 2025-26 club match (back-up keepers): the recorded club
    for pid, cid, d in c.execute("""select player_id, arg_max(player_club_id, date), max(date) from appearances
            where date between ? and ? and competition_id not in
                  (select competition_id from competitions where type = 'national_team_competition') group by 1""", list(SEASON)).fetchall():
        eff_club[pid] = cid
    gk_mins = dict(c.execute("""select a.player_id, sum(a.minutes_played) from appearances a join players p using (player_id)
            where p.sub_position = 'Goalkeeper' and a.date between ? and ? group by 1""", list(SEASON)).fetchall())
    name_to_ids = collections.defaultdict(set)
    for cid, nm in club_rows.items():
        name_to_ids[kisa(nm)].add(cid)
    added = []
    for club, rows in sorted(clubs.items()):
        n_gk = sum(r[2] == ['GK'] for r in rows)
        if len(rows) < 11 or n_gk >= 2:
            continue
        cids = name_to_ids.get(club, set())
        cand = [t for t in TM.values() if t[2] == 'Goalkeeper' and t[0] not in have and (t[6] or 0) >= 2025
                and (t[0] not in summer_new or kisa(summer_new[t[0]]['yeni']) == club)
                and eff_club.get(t[0]) in cids and age_of(t[3]) and 17 <= age_of(t[3]) <= 41]
        cand.sort(key=lambda t: (-(gk_mins.get(t[0]) or 0), -t[7], t[0]))
        lg = club_league.get(club, ('',))[0]
        for t in cand[:2 - n_gk]:
            v = np.clip(np.array(feats(t[0])) @ WG, 35, 88).round().astype(int).tolist()
            o = OLD.get(f'tm{t[0]}')
            known = bool(o and o[2] == ['GK'] and o[12])
            if known:  # the old open-data pool already rated him
                v = o[12] + [o[11][K.index(k)] for k in ('ft', 'sp', 'lp', 'vis', 'pac', 'str')]
            nat = c.execute("select country_of_citizenship from players where player_id = ?", [t[0]]).fetchone()[0]
            ctr = json.loads((ROOT / 'side-games/data/master/country-tr.json').read_text())
            nation = ctr.get(re.sub(r'[^a-z]', '', (nat or '').lower()), nat or '')
            a = [20, 20, 30, 20, 25, v[4], v[5], v[6], 20, v[7], 25, 25, v[8], v[9]]
            new = [f'tm{t[0]}', t[1], ['GK'], {'left': 'L'}.get(t[4] or '', 'R'), 3, int(t[5] or 190), nation, club, lg, [],
                   age_of(t[3]), a, v[:4], '', (['ref', 'gpos', 'ghd', 'one'] if not known else []) + ['saha-ozellikleri-kaleci', 'weakFoot']]
            RAW.append(new)
            have.add(t[0])
            added.append(new)
            note(new, 'Yeni oyuncu', '', f'{club} kalecisi', f'{club} havuzda {n_gk} kaleciyle kalıyordu; 2025-26 dakikası '
                 f'{gk_mins.get(t[0]) or 0}, piyasa değeri €{t[7] / 1e6:.1f}M → ' + ('değerler eski açık veri havuzundan' if known else 'değerler piyasa değeri / yaş modelinden'),
                 'Transfermarkt + ' + ('eski açık veri havuzu' if known else 'tahmin modeli'))
            n_gk += 1

    # ── write ──
    count = collections.Counter(x['alan'] if x['alan'] in ('Yaş', 'Boy', 'Ayak', 'Mevki', 'Kulüp', 'Zayıf Ayak', 'Yeni oyuncu') else 'Özellik'
                                for x in log)
    print('düzeltme:', len(log), dict(count))
    if args.dry:
        if args.log_out:
            args.log_out.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding='utf-8')
        return
    prev = json.loads(LOG.read_text(encoding='utf-8')) if LOG.exists() else []
    keyed = {(x['id'], x['alan']): x for x in prev}
    stamp = TODAY.isoformat()
    for x in log:  # a field corrected again later keeps its very first (FM) value as "eski"
        first = keyed.get((x['id'], x['alan']))
        keyed[(x['id'], x['alan'])] = {**x, 'eski': first['eski'] if first else x['eski'], 'tarih': stamp}
    LOG.write_text(json.dumps(list(keyed.values()), ensure_ascii=False, indent=1), encoding='utf-8')
    kim_path.write_text(json.dumps([n for n in kimliksiz if n not in restored], ensure_ascii=False), encoding='utf-8')
    txt = MJS.read_text(encoding='utf-8')
    head, rest = txt[:txt.index('const RAW = [')], txt[txt.index('\n];'):]
    lines = ['  ' + json.dumps(r, ensure_ascii=False) for r in RAW]
    MJS.write_text(head + 'const RAW = [\n' + ',\n'.join(lines) + rest, encoding='utf-8')
    subprocess.check_call([sys.executable, str(ROOT / 'scripts/draft_xi_havuz_excel.py')], cwd=ROOT)
    subprocess.check_call([sys.executable, str(ROOT / 'scripts/draft_xi_havuz_excel_oku.py')], cwd=ROOT)


if __name__ == '__main__':
    main()
