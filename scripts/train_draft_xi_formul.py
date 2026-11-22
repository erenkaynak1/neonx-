#!/usr/bin/env python3
"""Draft XI — değer kuralını öğrenir (toplu ayarlama).

Her oyuncunun açık verilerden çıkan "özellik kartı" (build_draft_xi_havuz_v2.py --features-out) ile bir başvuru
listesinin puanları eşleştirilir; her hedef için tek bir doğrusal kural (ridge regresyon) öğrenilir. Başvuru
listesindeki hiçbir oyuncu değeri repoya yazılmaz: çıktı yalnızca kuralın ağırlıklarıdır
(draft-xi/data/formul-agirliklari.json). Oyunun değerleri bu ağırlıklarla, her oyuncunun kendi açık verilerinden
hesaplanır. Kopyalama değil öğrenme olduğunu göstermek için 5 katlı çapraz doğrulama yapılır: kural, görmediği
oyuncularda ne kadar tutuyor?

  python3 scripts/train_draft_xi_formul.py <kartlar.json> <başvuru-listesi.json> [ikinci-öğretmen.csv ...]

İkinci öğretmen (isteğe bağlı): ad + yetenek metni olan CSV'ler (kullanıcının sağladığı FM listesi). Bunlar da
yalnızca kuralı öğretir; hiçbir oyuncu değeri saklanmaz ve dosyalar repoya girmez. Her hedef için ikinci öğretmen,
yalnızca görmediği oyunculardaki başarıyı artırıyorsa kullanılır.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'draft-xi/data/formul-agirliklari.json'
LAMBDA = 25.0  # strong shrinkage: a rule, not a memory


def toks(s):
    return re.sub(r'[^a-z ]', ' ', unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()).split()


def spear(a, b):
    a, b = np.asarray(a), np.asarray(b)
    return float(np.corrcoef(np.argsort(np.argsort(a)), np.argsort(np.argsort(b)))[0, 1])


def ridge(X, y, lam=LAMBDA):
    A = np.hstack([np.ones((len(X), 1)), X])
    reg = np.eye(A.shape[1]) * lam
    reg[0, 0] = 0
    w = np.linalg.solve(A.T @ A + reg, A.T @ y)
    return float(w[0]), w[1:]


FM_MAP = {  # second teacher's attributes → our targets
    'pace': lambda a: (a['Acceleration'] + a['Pace']) / 2, 'passing': lambda a: a['Passing'], 'shooting': lambda a: a['Finishing'],
    'dribbling': lambda a: a['Dribbling'], 'defending': lambda a: (a['Tackling'] + a['Marking']) / 2, 'heading': lambda a: a['Heading'],
    'iq': lambda a: a['Vision'], 'crossing': lambda a: a['Crossing'],
}


def read_teacher(paths):
    out = {}
    for path in paths:
        for row in csv.DictReader(open(path, encoding='utf-8')):
            lines = [l.strip() for l in (row.get('skills') or '').split('\n') if l.strip()]
            attrs = {}
            for i in range(0, len(lines) - 1, 2):
                try:
                    attrs[re.sub(r'\s*\(.*\)', '', lines[i])] = float(lines[i + 1])
                except ValueError:
                    pass
            if all(k in attrs for k in ('Acceleration', 'Pace', 'Passing', 'Finishing', 'Dribbling', 'Tackling', 'Marking', 'Heading', 'Vision', 'Crossing')):
                out[' '.join(toks(row['name']))] = attrs
    return out


def main():
    cards = json.loads(Path(sys.argv[1]).read_text())
    ref = json.loads(Path(sys.argv[2]).read_text())
    idx = {}
    for r in ref:
        for k in {' '.join(toks(f"{r['firstName']} {r['lastName']}")), ' '.join(toks(r['commonName'])), ' '.join(toks(r['lastName']))}:
            if k:
                idx.setdefault(k, []).append(r)
    rows = []
    for tm, c in cards.items():
        by = int(c['birth'][:4]) if c.get('birth') else None
        nm = toks(c['name'])
        cand = [r for k in {' '.join(nm), nm[-1] if nm else ''} for r in idx.get(k, [])
                if by and abs(int(r['birthdate'].split(' ')[0].split('/')[2]) - by) <= 1 and (r['pos'] == 'GK') == (c['pos'] == 'GK')]
        uniq = {r['id']: r for r in cand}
        if len(uniq) == 1:
            rows.append((c, next(iter(uniq.values()))))
    names = sorted(next(iter(cards.values()))['card'])
    X_all = np.array([[c['card'][n] for n in names] for c, _ in rows], float)
    mu, sd = X_all.mean(0), X_all.std(0)
    sd[sd < 1e-9] = 1.0
    Z = (X_all - mu) / sd
    st = lambda r, k: r['stats'][k]
    pace = lambda r: (st(r, 'acceleration') + st(r, 'sprintSpeed')) / 2
    TARGETS = {
        'ovr': (None, lambda r: r['overallRating']),
        'weakfoot': ('out', lambda r: r['weakFootAbility']),
        'pace': ('out', lambda r: pace(r) - r['overallRating']), 'passing': ('out', lambda r: st(r, 'shortPassing') - r['overallRating']),
        'shooting': ('out', lambda r: st(r, 'finishing') - r['overallRating']), 'dribbling': ('out', lambda r: st(r, 'dribbling') - r['overallRating']),
        'defending': ('out', lambda r: (st(r, 'standingTackle') + st(r, 'defensiveAwareness')) / 2 - r['overallRating']),
        'heading': ('out', lambda r: st(r, 'headingAccuracy') - r['overallRating']), 'iq': ('out', lambda r: st(r, 'vision') - r['overallRating']),
        'crossing': ('out', lambda r: st(r, 'crossing') - r['overallRating']),
        'g_ref': ('gk', lambda r: st(r, 'gkReflexes') - r['overallRating']), 'g_pos': ('gk', lambda r: st(r, 'gkPositioning') - r['overallRating']),
        'g_hand': ('gk', lambda r: st(r, 'gkHandling') - r['overallRating']), 'g_div': ('gk', lambda r: st(r, 'gkDiving') - r['overallRating']),
    }
    is_gk = np.array([c['pos'] == 'GK' for c, _ in rows])
    out = {'_aciklama': 'Draft XI değer kuralının ağırlıkları (özellik kartı → hedef). Toplu ayarlama ile öğrenildi; '
                        'hiçbir oyuncunun başvuru puanı burada yok. Üretici: scripts/train_draft_xi_formul.py',
           'features': names, 'mu': mu.round(6).tolist(), 'sd': sd.round(6).tolist(), 'targets': {}, 'dogrulama': {}}
    rng = np.random.default_rng(7)
    fold = rng.integers(0, 5, len(rows))
    print(f'eşleşen oyuncu: {len(rows)} (kaleci {int(is_gk.sum())})')
    # second teacher: matched to fact cards by name (unique), outfield only
    teacher = read_teacher(sys.argv[3:])
    by_name = {}
    for tm, c in cards.items():
        by_name.setdefault(' '.join(toks(c['name'])), []).append(tm)
    t_rows = [(by_name[n][0], a) for n, a in teacher.items() if len(by_name.get(n, [])) == 1 and cards[by_name[n][0]]['pos'] != 'GK']
    tm_by_id = {id(c): tm for tm, c in cards.items()}
    row_tm = [tm_by_id[id(c)] for c, _ in rows]
    Zt = np.array([[(cards[tm]['card'][n] - mu[i]) / sd[i] for i, n in enumerate(names)] for tm, _ in t_rows], float) if t_rows else None
    if teacher:
        print(f'ikinci öğretmen: {len(teacher)} oyuncu, kartla eşleşen {len(t_rows)}')
    out['ogretmen'] = {}
    for t, (grp, f) in TARGETS.items():
        mask = np.ones(len(rows), bool) if grp is None else (is_gk if grp == 'gk' else ~is_gk)
        y = np.array([f(r) for _, r in rows], float)
        pred = np.zeros(len(rows))
        for k in range(5):  # out-of-sample check: learn on 4 parts, test on the 5th
            tr, te = mask & (fold != k), mask & (fold == k)
            b, w = ridge(Z[tr], y[tr])
            pred[te] = b + Z[te] @ w
        cv = spear(pred[mask], y[mask])
        b, w = ridge(Z[mask], y[mask])
        used = 'EA'
        if t in FM_MAP and t_rows:
            # both teachers on a common scale (z within each), test only on reference players the rule never saw
            m_e, s_e = y[mask].mean(), y[mask].std() + 1e-9
            yt = np.array([FM_MAP[t](a) - np.mean([FM_MAP[k](a) for k in FM_MAP]) for _, a in t_rows])
            zt = (yt - yt.mean()) / (yt.std() + 1e-9)
            ze = (y - m_e) / s_e
            pred2 = np.zeros(len(rows))
            for k in range(5):
                tr, te = mask & (fold != k), mask & (fold == k)
                held = {row_tm[i] for i in np.where(te)[0]}
                keep = np.array([tm not in held for tm, _ in t_rows])
                bb, ww = ridge(np.vstack([Z[tr], Zt[keep]]), np.concatenate([ze[tr], zt[keep]]))
                pred2[te] = m_e + s_e * (bb + Z[te] @ ww)
            cv2 = spear(pred2[mask], y[mask])
            print(f'{t:10} görmediği oyuncularda sıra uyumu {cv:.2f} → iki öğretmenle {cv2:.2f}')
            if cv2 > cv + 0.005:
                bb, ww = ridge(np.vstack([Z[mask], Zt]), np.concatenate([ze[mask], zt]))
                b, w, cv, used = float(m_e + s_e * bb), s_e * ww, cv2, 'EA+FM'
        else:
            print(f'{t:10} görmediği oyuncularda sıra uyumu {cv:.2f}')
        out['targets'][t] = {'b': round(b, 5), 'w': np.asarray(w).round(5).tolist()}
        out['dogrulama'][t] = round(cv, 3)
        out['ogretmen'][t] = used
    wfs = np.array([r['weakFootAbility'] for c, r in rows if c['pos'] != 'GK'])
    out['weakfoot_payi'] = {str(k): round(float((wfs == k).mean()), 4) for k in range(1, 6)}  # aggregate shares only
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0) + '\n')
    print(f'ağırlıklar → {OUT.relative_to(ROOT)}')

    # weak foot: what the reference list looks like (aggregate only, for the user)
    wf = np.array([r['weakFootAbility'] for c, r in rows if c['pos'] != 'GK'])
    print('\nZAYIF AYAK (başvuru listesi, yalnızca toplu bilgi):')
    print('  dağılım:', {k: int((wf == k).sum()) for k in range(1, 6)})
    cs = [(c['card'], r['weakFootAbility']) for c, r in rows if c['pos'] != 'GK']
    for lab, cond in [('iki ayaklı (TM)', lambda c: c['both'] == 1), ('sol ayaklı', lambda c: c['left'] == 1 and c['both'] == 0),
                      ('sağ ayaklı', lambda c: c['left'] == 0 and c['both'] == 0)]:
        v = [w for c, w in cs if cond(c)]
        print(f'  {lab:16} n={len(v):4} ortalama {np.mean(v):.2f}')
    for lab, lo, hi in [('zayıf ayak golü payı <%10', 0, 0.10), ('%10–20', 0.10, 0.20), ('%20–30', 0.20, 0.30), ('≥%30', 0.30, 1)]:
        v = [w for c, w in cs if c['footgoals'] >= np.log10(9) and lo <= c['weakshare'] < hi]
        if v:
            print(f'  {lab:26} n={len(v):4} ortalama {np.mean(v):.2f}')
    for lab, k in [('stoper', 'k_CB'), ('bek', 'k_FB'), ('ön libero', 'k_DM'), ('orta saha', 'k_CM'), ('10 numara', 'k_AM'), ('kanat', 'k_W'), ('forvet', 'k_ST')]:
        v = [w for c, w in cs if c[k] == 1]
        print(f'  {lab:10} ortalama {np.mean(v):.2f}')


if __name__ == '__main__':
    main()
