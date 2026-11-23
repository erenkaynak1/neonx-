"""FM özellikleri → Draft XI v2 ölçeği (1–99): ortak dönüşüm (çevirici ve düzeltme betiği bunu kullanır).

Yöntem: mevki grubuna göre eşit yüzdelik eşleme (equipercentile). Her özellik için önce FM alt özelliklerinden bir
bileşik değer kurulur (MAP / GMAP / GK_OUT). Sonra iki havuzda da bulunan oyuncular üzerinden, AYNI MEVKİ GRUBU içinde,
FM bileşiğinin yüzdeliği eski açık veri havuzunun aynı yüzdelikteki değerine eşlenir:
  - Grup (stoper, bek, orta saha, hücum, forvet, kaleci) ayrı ayrı: stoperin bitiriciliği stoperlerle, forvetinki
    forvetlerle karşılaştırılır. Tek havuzlu eşlemede düşük FM bitiriciliği bütün oyunculara göre yorumlandığı için
    stoperlerde şişiyor, top kapma ezilip "top kapma ≤ bitiricilik" çelişkileri çıkıyordu.
  - Uçlar kırpılmaz: eşleme aralığının dışındaki değerler son %15'lik dilimin eğimiyle devam eder (yıldız forvetin
    bitiriciliği 95'te kesilmez).
  - Grupta yeterli ortak oyuncu yoksa (<25) bütün grupların birleşik eşlemesi kullanılır.
5 katlı çapraz doğrulamada eski havuza ortalama fark: tek havuzlu kırpmalı eşleme 5,87 → mevki gruplu 4,94 puan.
"""
import numpy as np

K = ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str']
GKK = ['ref', 'gpos', 'ghd', 'one']
GKO = ['ft', 'sp', 'lp', 'vis', 'pac', 'str']
MAP = {'fin': [('Finishing', 1)], 'lon': [('Long Shots', 1)], 'hed': [('Heading', .6), ('Jumping Reach', .4)],
       'posn': [('Off the Ball', .7), ('Anticipation', .3)], 'dri': [('Dribbling', .8), ('Agility', .2)], 'ft': [('First Touch', 1)],
       'sp': [('Passing', .7), ('Technique', .3)], 'lp': [('Passing', .5), ('Vision', .3), ('Technique', .2)], 'cro': [('Crossing', 1)],
       'vis': [('Vision', .7), ('Decisions', .3)], 'tac': [('Tackling', 1)], 'mar': [('Marking', .7), ('Positioning', .3)],
       'pac': [('Pace', .6), ('Acceleration', .4)], 'str': [('Strength', 1)]}
GMAP = {'ref': [('Reflexes', 1)], 'gpos': [('Positioning', .6), ('Concentration', .2), ('Anticipation', .2)],
        'ghd': [('Aerial Reach', .5), ('Command of Area', .3), ('Handling', .2)], 'one': [('One on Ones', .7), ('Rushing Out (Tendency)', .3)]}
GK_OUT = {'ft': [('First Touch', 1)], 'sp': [('Passing', .7), ('Technique', .3)], 'lp': [('Kicking', .6), ('Passing', .4)],
          'vis': [('Vision', .7), ('Decisions', .3)], 'pac': [('Pace', .6), ('Acceleration', .4)], 'str': [('Strength', 1)]}
GRP = {'GK': 'GK', 'CB': 'CB', 'LB': 'FB', 'RB': 'FB', 'LWB': 'FB', 'RWB': 'FB', 'DM': 'M', 'CM': 'M', 'AM': 'A', 'LM': 'A', 'RM': 'A',
       'LW': 'A', 'RW': 'A', 'ST': 'ST'}
MIN_GROUP = 25


def mix(attrs, ws):
    got = [(attrs[k]['v'], w) for k, w in ws if attrs.get(k, {}).get('v') is not None]
    return sum(v * w for v, w in got) / sum(w for _, w in got) if got else None


def bilesik(fm_attrs, gk):
    """FM composite per v2 key (None when the FM row has none of the inputs). Keepers: 4 keeping keys + 6 outfield."""
    if gk:
        return {**{k: mix(fm_attrs, GMAP[k]) for k in GKK}, **{'g_' + k: mix(fm_attrs, GK_OUT[k]) for k in GKO}}
    return {k: mix(fm_attrs, MAP[k]) for k in K}


class Olcek:
    """Fit on (group, composites, v2 values) of players in both pools; convert(group, key, composite) → 1–99."""

    def __init__(self, train):
        by = {}
        for g, x, y in train:
            for k, v in x.items():
                if v is None or y.get(k) is None:
                    continue
                for gg in ((g, 'ALL') if g != 'GK' else ('GK',)):
                    by.setdefault((gg, k), ([], []))
                    by[(gg, k)][0].append(v)
                    by[(gg, k)][1].append(y[k])
        self.m = {key: (np.sort(np.array(a, float)), np.sort(np.array(b, float))) for key, (a, b) in by.items()}

    def convert(self, g, k, x):
        if x is None:
            return None
        g = GRP.get(g, g)
        m = self.m.get((g, k))
        if m is None or len(m[0]) < MIN_GROUP:
            m = self.m.get(('ALL', k)) if g != 'GK' else m
        if m is None:
            return None
        a, b = m
        lo, hi = np.searchsorted(a, x, 'left'), np.searchsorted(a, x, 'right')
        q = (lo + hi) / 2 / len(a)
        if 0 < q < 1:
            j = q * (len(b) - 1)
            i0 = int(j)
            f = j - i0
            v = b[i0] * (1 - f) + b[min(i0 + 1, len(b) - 1)] * f
        else:  # outside the overlap range: continue with the slope of the top / bottom 15 %
            n = max(3, len(a) // 7)
            if q >= 1:
                v = b[-1] + (b[-1] - b[-n]) / max(a[-1] - a[-n], 1e-6) * (x - a[-1])
            else:
                v = b[0] + (b[n - 1] - b[0]) / max(a[n - 1] - a[0], 1e-6) * (x - a[0])
        return int(max(1, min(99, round(v))))
