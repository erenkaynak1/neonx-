#!/usr/bin/env python3
"""Draft XI havuzunu (draft-xi/data/havuz-fm.mjs) okunur Excel dosyasına yazar.
Kullanım: python3 scripts/draft_xi_havuz_excel.py   → draft-xi/data/eren-oyuncu-havuzu.xlsx
Excel'de düzeltme yapıldıktan sonra oyuna geri almak için: scripts/draft_xi_havuz_excel_oku.py"""
import json, collections, pathlib, subprocess, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.utils import get_column_letter as L
from openpyxl.comments import Comment

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTFILE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'draft-xi/data/eren-oyuncu-havuzu.xlsx'
P = json.loads(subprocess.check_output(['node', '-e', "import('./draft-xi/data/havuz-fm.mjs').then(m=>process.stdout.write(JSON.stringify(m.HAVUZ)))"], cwd=ROOT))
for i, p in enumerate(P):
    p['_sira'] = i
DIS = json.load(open(ROOT / 'draft-xi/data/fm-kaynak/kimliksiz.json', encoding='utf-8'))
GK_HIDDEN = ['fin', 'lon', 'hed', 'posn', 'dri', 'cro', 'tac', 'mar']  # oyunda kalecinin saha değerleri (sabit, düşük)

FONT = 'Arial'
HDR_FILL = PatternFill('solid', start_color='1F2937')
GRP_FILL = PatternFill('solid', start_color='374151')
EST_FILL = PatternFill('solid', start_color='FFF2CC')
ZEBRA = PatternFill('solid', start_color='F7F7F7')
thin = Side(style='thin', color='D9D9D9')
BORDER = Border(bottom=thin)
F = lambda **k: Font(name=FONT, size=10, **k)

MEVKI = {'GK': 'Kaleci', 'CB': 'Stoper', 'LB': 'Sol bek', 'RB': 'Sağ bek', 'LWB': 'Sol kanat bek', 'RWB': 'Sağ kanat bek',
         'DM': 'Ön libero', 'CM': 'Merkez orta saha', 'AM': '10 numara', 'LM': 'Sol orta saha', 'RM': 'Sağ orta saha',
         'LW': 'Sol kanat', 'RW': 'Sağ kanat', 'ST': 'Forvet'}
GRUP = {'GK': 'Kaleci', 'CB': 'Defans', 'LB': 'Defans', 'RB': 'Defans', 'LWB': 'Defans', 'RWB': 'Defans', 'DM': 'Orta saha',
        'CM': 'Orta saha', 'AM': 'Orta saha', 'LM': 'Orta saha', 'RM': 'Orta saha', 'LW': 'Forvet', 'RW': 'Forvet', 'ST': 'Forvet'}
GORDER = {'Kaleci': 0, 'Defans': 1, 'Orta saha': 2, 'Forvet': 3}
AYAK = {'R': 'Sağ', 'L': 'Sol', 'B': 'İki ayak'}

# attribute groups: (group title, [(key, label, FM source)])
OUT = [
    ('HÜCUM', [('fin', 'Bitiricilik', 'Finishing'), ('lon', 'Uzaktan Şut', 'Long Shots'),
               ('hed', 'Kafa', 'Heading %60 + Jumping Reach %40'), ('posn', 'Pozisyon Alma', 'Off the Ball %70 + Anticipation %30')]),
    ('TEKNİK', [('dri', 'Çalım', 'Dribbling'), ('ft', 'İlk Dokunuş', 'First Touch'), ('sp', 'Kısa Pas', 'Passing'),
                ('lp', 'Uzun Pas', 'Passing %50 + Vision %30 + Technique %20'), ('cro', 'Orta', 'Crossing'), ('vis', 'Vizyon', 'Vision')]),
    ('SAVUNMA', [('tac', 'Top Kapma', 'Tackling'), ('mar', 'Markaj', 'Marking %70 + Positioning %30')]),
    ('FİZİK', [('pac', 'Hız', 'Pace %60 + Acceleration %40'), ('str', 'Güç', 'Strength')]),
]
GKA = [
    ('KALECİLİK', [('ref', 'Refleks', 'Reflexes'), ('gpos', 'Kaleci Pozisyonu', 'Positioning %60 + Concentration %20 + Anticipation %20'),
                   ('ghd', 'Hava Hakimiyeti', 'Aerial Reach %50 + Command of Area %30 + Handling %20'), ('one', 'Bire Bir', 'One on Ones %70 + Rushing Out %30')]),
    ('AYAK & FİZİK', [('ft', 'İlk Dokunuş', 'First Touch'), ('sp', 'Kısa Pas', 'Passing %70 + Technique %30'), ('lp', 'Uzun Pas', 'Kicking %60 + Passing %40'),
                      ('vis', 'Vizyon', 'Vision %70 + Decisions %30'), ('pac', 'Hız', 'Pace %60 + Acceleration %40'), ('str', 'Güç', 'Strength')]),
]
ID_COLS = [('No', 5), ('Oyuncu', 24), ('Mevki', 12), ('Mevki Grubu', 11), ('Kulüp', 20), ('Lig', 16), ('Ülke', 13),
           ('Yaş', 6), ('Boy', 6), ('Ayak', 8), ('Zayıf Ayak', 8)]


LORD = {'Süper Lig': 0, 'Premier League': 1, 'La Liga': 2, 'Serie A': 3, 'Bundesliga': 4, 'Ligue 1': 5}
def lkey(l):
    return (LORD.get(l, 9), l or 'zzz')


LIG_AD = {'chance-liga': 'Çekya Ligi', 'liga-mx-clausura': 'Liga MX', 'premier-liga': 'Premier Liga',
          'torneo-apertura': 'Arjantin Ligi', 'j1-league': 'J1 League', 'eliteserien': 'Eliteserien',
          'pko-bp-ekstraklasa': 'Ekstraklasa', 'supersport-hnl': 'Hırvatistan Ligi', 'super-league': 'İsviçre Süper Ligi',
          'super-liga-srbije': 'Sırbistan Süper Ligi', 'allsvenskan': 'Allsvenskan'}


def lig(s):
    if s in LIG_AD:
        return LIG_AD[s]
    return s if (not s or any(c.isupper() for c in s)) else s.replace('-', ' ').title()


def sheet(wb, title, players, groups, avg_label, avg_keys, avg_note, hidden_attrs=()):
    ws = wb.create_sheet(title)
    attr = [a for _, g in groups for a in g]
    n_id = len(ID_COLS)
    ncol = n_id + len(attr) + 1
    tech = ['Eski Kulüpler', 'ID', 'Sıra', 'Tahmini Alanlar'] + [f'_{k}' for k in hidden_attrs]
    t0 = ncol + 1
    # row 1: group band, row 2: headers
    ws.row_dimensions[1].height = 18
    ws.row_dimensions[2].height = 34
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n_id)
    ws.cell(1, 1, 'OYUNCU BİLGİLERİ')
    c = n_id + 1
    for gt, g in groups:
        ws.merge_cells(start_row=1, start_column=c, end_row=1, end_column=c + len(g) - 1)
        ws.cell(1, c, gt)
        c += len(g)
    ws.cell(1, ncol, 'GENEL')
    for col in range(1, ncol + 1):
        x = ws.cell(1, col)
        x.fill = GRP_FILL; x.font = F(bold=True, color='C6F432'); x.alignment = Alignment(horizontal='center', vertical='center')
    heads = [h for h, _ in ID_COLS] + [lbl for _, lbl, _ in attr] + [avg_label]
    for i, h in enumerate(heads, 1):
        x = ws.cell(2, i, h)
        x.fill = HDR_FILL; x.font = F(bold=True, color='FFFFFF')
        x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for i, (_, k, src) in enumerate(attr, n_id + 1):
        ws.cell(2, i).comment = Comment(f'FM kaynağı: {src}', 'NEON XI')
    ws.cell(2, ncol).comment = Comment(avg_note, 'NEON XI')
    ws.cell(1, t0, 'DİĞER')
    for j, h in enumerate(tech):
        x = ws.cell(2, t0 + j, h); x.fill = HDR_FILL if j == 0 else GRP_FILL; x.font = F(bold=True, color='FFFFFF')
        x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.cell(1, t0).fill = GRP_FILL; ws.cell(1, t0).font = F(bold=True, color='C6F432')
    ws.cell(2, t0 + 1).comment = Comment('Teknik sütunlar (gizli): oyuna geri aktarırken kullanılır, değiştirme.', 'NEON XI')

    players = sorted(players, key=lambda p: (lkey(lig(p['league'])), p['club'] or 'zzz', GORDER[GRUP[p['positions'][0]]], p['name']))
    first_attr = n_id + 1
    for r, p in enumerate(players, 3):
        est = set(p.get('tahmini') or [])
        vals = [r - 2, p['name'], ' / '.join(p['positions']), GRUP[p['positions'][0]], p['club'], lig(p['league']),
                p['nation'], p['age'], p['height'], AYAK.get(p['foot'], p['foot']), p['weakFoot']]
        for i, v in enumerate(vals, 1):
            x = ws.cell(r, i, v)
            if i in (1, 3, 4, 8, 9, 10, 11):
                x.alignment = Alignment(horizontal='center')
        for i, (k, _, _) in enumerate(attr, first_attr):
            x = ws.cell(r, i, p['attrs'][k]); x.alignment = Alignment(horizontal='center')
            if k in est:
                x.fill = EST_FILL; x.font = F(italic=True, color='7F6000')
        # estimated identity fields
        for k, col in (('club', 5), ('height', 9), ('foot', 10), ('weakFoot', 11), ('positions', 3)):
            if k in est:
                ws.cell(r, col).fill = EST_FILL; ws.cell(r, col).font = F(italic=True, color='7F6000')
        tv = [', '.join(p['former'] or []), p['id'], p['_sira'], ' '.join(p.get('tahmini') or [])] + [p['attrs'][k] for k in hidden_attrs]
        for j, v in enumerate(tv):
            x = ws.cell(r, t0 + j, v); x.font = F(color='595959' if j == 0 else '808080'); x.border = BORDER
        cols = [first_attr + [a[0] for a in attr].index(k) for k in avg_keys]
        refs = ','.join(f'{L(c)}{r}' for c in cols)
        x = ws.cell(r, ncol, f'=ROUND(AVERAGE({refs}),0)')
        x.font = F(bold=True); x.alignment = Alignment(horizontal='center'); x.number_format = '0'
        for col in range(1, ncol + 1):
            cell = ws.cell(r, col)
            if not cell.font or cell.font.name != FONT:
                cell.font = F(bold=cell.font.bold if cell.font else False)
            cell.border = BORDER
            if r % 2 == 0 and cell.fill.fgColor.rgb in (None, '00000000'):
                cell.fill = ZEBRA
    last = len(players) + 2
    rng = f'{L(first_attr)}3:{L(ncol)}{last}'
    ws.conditional_formatting.add(rng, ColorScaleRule(start_type='num', start_value=30, start_color='F8696B',
                                                      mid_type='num', mid_value=60, mid_color='FFEB84',
                                                      end_type='num', end_value=90, end_color='63BE7B'))
    for i, (_, w) in enumerate(ID_COLS, 1):
        ws.column_dimensions[L(i)].width = w
    for i in range(first_attr, ncol + 1):
        ws.column_dimensions[L(i)].width = 10
    ws.column_dimensions[L(t0)].width = 40
    for j in range(1, len(tech)):
        ws.column_dimensions[L(t0 + j)].hidden = True
    ws.freeze_panes = 'C3'
    ws.auto_filter.ref = f'A2:{L(t0)}{last}'
    ws.sheet_view.zoomScale = 100
    return ws, last


wb = Workbook()
wb.remove(wb.active)
info = wb.create_sheet('Açıklama')
gk = [p for p in P if p['positions'] == ['GK']]
out = [p for p in P if p['positions'] != ['GK']]
outkeys = [a[0] for _, g in OUT for a in g]
s1, last1 = sheet(wb, 'Saha Oyuncuları', out, OUT, 'Ortalama', outkeys, '14 saha özelliğinin basit ortalaması (mevkiden bağımsız, yalnızca kabaca karşılaştırma için).')
s2, last2 = sheet(wb, 'Kaleciler', gk, GKA, 'Kaleci Ort.', ['ref', 'gpos', 'ghd', 'one'], '4 kalecilik özelliğinin ortalaması.', GK_HIDDEN)

# club summary with formulas
ks = wb.create_sheet('Kulüpler')
cnt = collections.Counter(p['club'] for p in P)
clubs = sorted({(p['club'], lig(p['league'])) for p in P if p['club']}, key=lambda x: (lkey(x[1]), -cnt[x[0]], x[0]))
heads = ['Kulüp', 'Lig', 'Saha Oyuncusu', 'Kaleci', 'Toplam', 'Saha Ort.', 'Kaleci Ort.', 'Durum']
for i, h in enumerate(heads, 1):
    x = ks.cell(1, i, h); x.fill = HDR_FILL; x.font = F(bold=True, color='FFFFFF'); x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
SO, KL = "'Saha Oyuncuları'", 'Kaleciler'
avg1 = L(len(ID_COLS) + 15); avg2 = L(len(ID_COLS) + 11)
for r, (cl, lg) in enumerate(clubs, 2):
    ks.cell(r, 1, cl); ks.cell(r, 2, lg)
    ks.cell(r, 3, f'=COUNTIF({SO}!$E$3:$E${last1},A{r})')
    ks.cell(r, 4, f'=COUNTIF({KL}!$E$3:$E${last2},A{r})')
    ks.cell(r, 5, f'=C{r}+D{r}')
    ks.cell(r, 6, f'=IFERROR(ROUND(AVERAGEIF({SO}!$E$3:$E${last1},A{r},{SO}!${avg1}$3:${avg1}${last1}),0),"-")')
    ks.cell(r, 7, f'=IFERROR(ROUND(AVERAGEIF({KL}!$E$3:$E${last2},A{r},{KL}!${avg2}$3:${avg2}${last2}),0),"-")')
    ks.cell(r, 8, f'=IF(E{r}<11,"Havuzda az oyuncu",IF(D{r}=0,"Kaleci yok",IF(D{r}<2,"Yedek kaleci eksik","Tamam")))')
    for c in range(1, 9):
        x = ks.cell(r, c); x.font = F(); x.border = BORDER
        if c > 2: x.alignment = Alignment(horizontal='center')
        if r % 2 == 1: x.fill = ZEBRA
for col, w in zip('ABCDEFGH', (24, 18, 12, 9, 9, 10, 10, 18)):
    ks.column_dimensions[col].width = w
ks.freeze_panes = 'B2'; ks.auto_filter.ref = f'A1:H{len(clubs) + 1}'

# excluded
ds = wb.create_sheet('Dışarıda Kalanlar')
for i, h in enumerate(['No', 'Oyuncu', 'Neden'], 1):
    x = ds.cell(1, i, h); x.fill = HDR_FILL; x.font = F(bold=True, color='FFFFFF')
for r, n in enumerate(DIS, 2):
    for c, v in enumerate([r - 1, n, 'Kulüp / yaş bilgisi bulunamadı (veri geldiğinde eklenecek)'], 1):
        ds.cell(r, c, v).font = F()
ds.column_dimensions['A'].width = 5; ds.column_dimensions['B'].width = 26; ds.column_dimensions['C'].width = 58

# info sheet
info.sheet_view.showGridLines = False
info.column_dimensions['A'].width = 2; info.column_dimensions['B'].width = 22; info.column_dimensions['C'].width = 26; info.column_dimensions['D'].width = 52
r = 2
info.cell(r, 2, 'NEON XI · DRAFT XI OYUNCU HAVUZU').font = Font(name=FONT, size=16, bold=True); r += 1
info.cell(r, 2, 'Gönderdiğin FM özellik listelerinden oyunun kendi 1–99 ölçeğine çevrildi.').font = F(color='595959'); r += 2
rows = [('Toplam oyuncu', f"=COUNTA({SO}!B3:B{last1})+COUNTA({KL}!B3:B{last2})"),
        ('Saha oyuncusu', f"=COUNTA({SO}!B3:B{last1})"), ('Kaleci', f"=COUNTA({KL}!B3:B{last2})"),
        ('Kulüp', f"=COUNTA(Kulüpler!A2:A{len(clubs) + 1})"), ('Dışarıda kalan', f"=COUNTA('Dışarıda Kalanlar'!B2:B{len(DIS) + 1})")]
for k, v in rows:
    info.cell(r, 2, k).font = F(bold=True); x = info.cell(r, 3, v); x.font = F(); x.alignment = Alignment(horizontal='left'); r += 1
r += 1
info.cell(r, 2, 'Renkler').font = Font(name=FONT, size=12, bold=True); r += 1
for fill, txt in ((PatternFill('solid', start_color='63BE7B'), '85+ çok iyi'), (PatternFill('solid', start_color='FFEB84'), '~60 orta'),
                  (PatternFill('solid', start_color='F8696B'), '≤35 zayıf'), (EST_FILL, 'Sarı-italik: veri boştu, mevki ortalamasıyla tahmini dolduruldu')):
    info.cell(r, 2).fill = fill; info.cell(r, 3, txt).font = F(); r += 1
r += 1
info.cell(r, 2, 'Özellikler (saha)').font = Font(name=FONT, size=12, bold=True); r += 1
for c, h in enumerate(['Grup', 'Özellik', 'FM kaynağı'], 2):
    x = info.cell(r, c, h); x.fill = HDR_FILL; x.font = F(bold=True, color='FFFFFF')
r += 1
for gt, g in OUT + GKA[:1]:
    for _, lbl, src in g:
        info.cell(r, 2, gt).font = F(color='595959'); info.cell(r, 3, lbl).font = F(bold=True); info.cell(r, 4, src).font = F(); r += 1
r += 1
info.cell(r, 2, 'Mevki kısaltmaları').font = Font(name=FONT, size=12, bold=True); r += 1
for k, v in MEVKI.items():
    info.cell(r, 2, k).font = F(bold=True); info.cell(r, 3, v).font = F(); r += 1
r += 1
for t in ('Notlar',
          '• Değerler FM 5–100 ölçeğinden, ortak oyuncular üzerinden oyunun 1–99 ölçeğine kalibre edildi.',
          '• Kulüp, yaş, boy, ülke: Transfermarkt ana verisi ve mevcut havuzdan.',
          '• Kalecilerin saha özellikleri (bitiricilik vb.) oyunda kullanılmadığı için bu tabloda yok.',
          '• Bir sütun başlığının üzerine gelince hangi FM özelliğinden geldiğini gösteren not çıkar.',
          '',
          'Düzenleme',
          '• Bu dosya oyunun oyuncu havuzudur. Puan, mevki, kulüp, yaş vb. değiştirebilir; satır ekleyip silebilirsin.',
          '• Yeni oyuncu: Oyuncu, Mevki, Kulüp, Lig, Yaş ve tüm özellikleri doldur; ID boş kalabilir (otomatik verilir).',
          '• Puanlar 1–99 arası tam sayı. Mevki birden fazlaysa "LB / RB" gibi yaz. Ayak: Sağ / Sol / İki ayak.',
          '• Gizli sütunlara (ID, Sıra, Tahmini Alanlar) dokunma. Tahmini bir değeri düzelttiysen o özelliğin adını Tahmini Alanlar\'dan silebilirsin.',
          '• Oyuna aktarmak: python3 scripts/draft_xi_havuz_excel_oku.py'):
    info.cell(r, 2, t).font = F(bold=(t in ('Notlar', 'Düzenleme'))); r += 1

wb.active = 1
wb.save(OUTFILE)
print(len(out), len(gk), len(clubs))
