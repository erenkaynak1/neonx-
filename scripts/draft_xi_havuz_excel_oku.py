#!/usr/bin/env python3
"""Draft XI oyuncu havuzu Excel dosyasını oyunun veri dosyasına çevirir.

Kullanım: python3 scripts/draft_xi_havuz_excel_oku.py [excel] [--check]
  excel    varsayılan draft-xi/data/draft-xi-oyuncu-havuzu.xlsx
  --check  dosya yazmaz; havuz-fm.mjs Excel ile aynı değilse hata verir

Çıktı: draft-xi/data/havuz-fm.mjs (oyunun okuduğu havuz) ve draft-xi/data/fm-kaynak/havuz-fm.csv
"""
import csv, datetime, json, pathlib, re, sys
from openpyxl import load_workbook

ROOT = pathlib.Path(__file__).resolve().parents[1]
args = [a for a in sys.argv[1:] if not a.startswith('--')]
CHECK = '--check' in sys.argv
SRC = pathlib.Path(args[0]) if args else ROOT / 'draft-xi/data/draft-xi-oyuncu-havuzu.xlsx'
MJS = ROOT / 'draft-xi/data/havuz-fm.mjs'
CSV = ROOT / 'draft-xi/data/fm-kaynak/havuz-fm.csv'

K = ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str']
GK = ['ref', 'gpos', 'ghd', 'one']
LABEL = {'fin': 'Bitiricilik', 'lon': 'Uzaktan Şut', 'hed': 'Kafa', 'posn': 'Pozisyon Alma', 'dri': 'Çalım',
         'ft': 'İlk Dokunuş', 'sp': 'Kısa Pas', 'lp': 'Uzun Pas', 'cro': 'Orta', 'vis': 'Vizyon', 'tac': 'Top Kapma',
         'mar': 'Markaj', 'pac': 'Hız', 'str': 'Güç', 'ref': 'Refleks', 'gpos': 'Kaleci Pozisyonu',
         'ghd': 'Hava Hakimiyeti', 'one': 'Bire Bir'}
# goalkeepers' outfield values that the sheet does not show (game uses them only as fallbacks)
GK_DEFAULT = {'fin': 20, 'lon': 20, 'hed': 30, 'posn': 20, 'dri': 25, 'cro': 20, 'tac': 25, 'mar': 25}
POS = {'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST'}
AYAK = {'sağ': 'R', 'sag': 'R', 'r': 'R', 'sol': 'L', 'l': 'L', 'iki ayak': 'B', 'ikisi': 'B', 'b': 'B'}
KAYNAK = 'FM (kullanıcı verisi, v2 ölçeğine kalibre)'

wb = load_workbook(SRC, data_only=True)
errors, rows, seen_id, seen_name = [], [], {}, {}


def num(v, lo, hi, where, required=True):
    if v in (None, ''):
        if required:
            errors.append(f'{where}: boş')
        return None
    try:
        f = float(str(v).replace(',', '.'))
    except ValueError:
        errors.append(f'{where}: sayı değil ({v!r})'); return None
    if f != int(f) or not lo <= f <= hi:
        errors.append(f'{where}: {lo}–{hi} arası tam sayı olmalı ({v!r})'); return None
    return int(f)


for sheet, is_gk in (('Saha Oyuncuları', False), ('Kaleciler', True)):
    ws = wb[sheet]
    head = {str(c.value).strip(): i for i, c in enumerate(ws[2]) if c.value is not None}
    need = ['Oyuncu', 'Mevki', 'Kulüp', 'Lig', 'Ülke', 'Yaş', 'Boy', 'Ayak', 'Zayıf Ayak', 'Eski Kulüpler', 'ID', 'Sıra', 'Tahmini Alanlar']
    keys = (GK + ['ft', 'sp', 'lp', 'vis', 'pac', 'str']) if is_gk else K
    miss = [h for h in need + [LABEL[k] for k in keys] if h not in head]
    if miss:
        sys.exit(f'{sheet}: başlık bulunamadı: {miss}')
    for r in ws.iter_rows(min_row=3, values_only=True):
        g = lambda h: r[head[h]] if head[h] < len(r) else None
        name = (str(g('Oyuncu') or '')).strip()
        if not name:
            continue
        where = f'{sheet} · {name}'
        pos = [x.strip().upper() for x in re.split(r'[/,]', str(g('Mevki') or '')) if x.strip()]
        bad = [x for x in pos if x not in POS]
        if not pos or bad:
            errors.append(f'{where}: geçersiz mevki {g("Mevki")!r}')
        if is_gk != (pos == ['GK']):
            errors.append(f'{where}: {"kaleci sayfasında kaleci olmayan" if is_gk else "saha sayfasında kaleci"} mevki ({g("Mevki")})')
        foot = AYAK.get(str(g('Ayak') or '').strip().lower())
        if not foot:
            errors.append(f'{where}: ayak Sağ / Sol / İki ayak olmalı ({g("Ayak")!r})')
        attrs = {k: num(g(LABEL[k]), 1, 99, f'{where} · {LABEL[k]}') for k in keys}
        if is_gk:
            for k in GK_DEFAULT:
                col = f'_{k}'
                attrs[k] = num(g(col), 1, 99, f'{where} · {col}', False) if col in head else None
                if attrs[k] is None:
                    attrs[k] = GK_DEFAULT[k]
        pid = str(g('ID') or '').strip()
        if not pid:
            base = 'xl-' + re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
            pid, n = base, 2
            while pid in seen_id:
                pid, n = f'{base}-{n}', n + 1
        if pid in seen_id:
            errors.append(f'{where}: ID {pid} iki kez ({seen_id[pid]})')
        seen_id[pid] = name
        if name.lower() in seen_name:
            errors.append(f'{where}: aynı isim iki kez')
        seen_name[name.lower()] = 1
        sira = g('Sıra')
        rows.append(dict(
            sira=sira if isinstance(sira, (int, float)) else 10 ** 9 + len(rows),
            id=pid, name=name, positions=pos, foot=foot or 'R',
            wf=num(g('Zayıf Ayak'), 1, 5, f'{where} · Zayıf Ayak'),
            h=num(g('Boy'), 140, 215, f'{where} · Boy', False),
            nation=str(g('Ülke') or '').strip(), club=str(g('Kulüp') or '').strip(), league=str(g('Lig') or '').strip(),
            former=[x.strip() for x in str(g('Eski Kulüpler') or '').split(',') if x.strip()],
            age=num(g('Yaş'), 15, 45, f'{where} · Yaş'),
            a=[attrs[k] for k in K], g=[attrs[k] for k in GK] if is_gk else None,
            tah=sorted(str(g('Tahmini Alanlar') or '').split())))
        if not rows[-1]['club']:
            errors.append(f'{where}: kulüp boş')

if errors:
    print(f'{len(errors)} hata, havuz yazılmadı:')
    print('\n'.join('  ' + e for e in errors[:60]))
    sys.exit(1)
rows.sort(key=lambda q: q['sira'])
lines = ['  ' + json.dumps([q['id'], q['name'], q['positions'], q['foot'], q['wf'], q['h'], q['nation'], q['club'], q['league'],
                            q['former'], q['age'], q['a'], q['g'], KAYNAK, q['tah']], ensure_ascii=False) for q in rows]
today = datetime.date.today().isoformat()
out = f"""// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: draft-xi/data/draft-xi-oyuncu-havuzu.xlsx ({len(rows)} oyuncu).
// Üretici: scripts/draft_xi_havuz_excel_oku.py. Excel'i düzenleyip betiği çalıştır.
// Değerler kullanıcının FM özellik listelerinden v2 ölçeğine (1–99) kalibre edildi.
// Sırası: [id, ad, mevkiler, ayak, zayıf ayak, boy, ülke, kulüp, lig, eski kulüpler, yaş, özellikler[14], kaleci[4]|null, değer kaynağı, tahmini alanlar]
export const KEYS = {json.dumps(K)};
export const GK_KEYS = {json.dumps(GK)};
const RAW = [
{(',' + chr(10)).join(lines)}
];
export const HAVUZ = RAW.map(([id, name, positions, foot, weakFoot, height, nation, club, league, former, age, a, g, kaynak, tahmini]) => {{
  const attrs = Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
  if (g) GK_KEYS.forEach((k, i) => {{ attrs[k] = g[i]; }});
  return {{ id, name, positions, foot, weakFoot, height, nation, club, league, former, age, attrs, kaynak, tahmini }};
}});
export const HAVUZ_BY_ID = Object.fromEntries(HAVUZ.map((p) => [p.id, p]));
"""
body = lambda t: t[t.index('export const KEYS'):]
if CHECK:
    if body(MJS.read_text(encoding='utf-8')) != body(out):
        sys.exit('havuz-fm.mjs Excel ile aynı değil: python3 scripts/draft_xi_havuz_excel_oku.py çalıştır')
    print(f'Draft XI havuzu Excel ile aynı ✓ ({len(rows)} oyuncu)')
    sys.exit(0)
MJS.write_text(out, encoding='utf-8')
with open(CSV, 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'ad', 'mevkiler', 'ayak', 'zayif_ayak', 'boy', 'ulke', 'kulup', 'lig', 'yas'] + K + GK + ['tahmini'])
    for q in rows:
        w.writerow([q['id'], q['name'], '/'.join(q['positions']), q['foot'], q['wf'], q['h'], q['nation'], q['club'], q['league'], q['age']]
                   + q['a'] + (q['g'] or [''] * 4) + [' '.join(q['tah'])])
print(f'havuz-fm.mjs yazıldı: {len(rows)} oyuncu ({sum(1 for q in rows if q["g"])} kaleci)')
