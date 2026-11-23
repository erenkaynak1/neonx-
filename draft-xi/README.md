# Draft XI v2 — prototype engine

Headless match engine for the Draft XI rebuild. The design and every rule it implements are in
[`docs/draft-xi-v2-tasarim.md`](../docs/draft-xi-v2-tasarim.md); lab results are in
[`docs/draft-xi-v2-lab-raporu.md`](../docs/draft-xi-v2-lab-raporu.md).

- `engine/core.mjs`: integer maths (seeded RNG, logistic lookup, tactic combination, event-log hash). No `Math.exp`/`Math.random`, so every browser computes the same match.
- `engine/logistic-table.mjs`: precomputed logistic table.
- `engine/formations.mjs`: all 17 formation templates from the design doc (section 15).
- `engine/sample-players.mjs`: 44 sample players in four squads. First-pass values for testing, not reviewed.
- `engine/match.mjs`: `simulateMatch({ home, away, seed, tacticHome, tacticAway })` → `{ score, stats, events, digest, ratings, motm }`.

Run the lab: `node scripts/draft_xi_lab.mjs 400` (add `--meta` for the meta hunter). Fast CI checks: `node scripts/test_draft_xi_engine.mjs`.

Not wired into the site yet; the live Draft XI still runs on `neon-xi-core.html`.

## Oyuncu havuzu: Excel (2026-11-23)

Oyunun kullandığı havuz **`data/eren-oyuncu-havuzu.xlsx`** dosyasıdır; `data/havuz-fm.mjs` ondan üretilir (Draft, Taktik, Maç ve İnceleme ekranları bunu okur).

- Düzenleme: Excel'de puan, mevki, kulüp, yaş vb. değiştir, satır ekle/sil, sonra `python3 scripts/draft_xi_havuz_excel_oku.py`. Hatalı hücre (1–99 dışı puan, bilinmeyen mevki, tekrar eden isim) varsa dosya yazılmaz, hatalar listelenir.
- Kontrol: `python3 scripts/draft_xi_havuz_excel_oku.py --check` (CI'da çalışır) + `node scripts/test_draft_xi_pool_fm.mjs`.
- Excel'i havuzdan yeniden üretmek: `python3 scripts/draft_xi_havuz_excel.py`.
- Mantık hatası düzeltmesi: `python3 scripts/draft_xi_havuz_duzelt.py --database <transfermarkt.duckdb>` (açık veri seti: dcaribou/transfermarkt-datasets). Yaş/boy/ayak, maç kadrolarından mevki (3-5'li savunmada kanat bek), 2025-26'yı bitirdiği kulüp, gollerden zayıf ayak, özellik çelişkileri (mevki grubu tutarlılık modeli + eski açık veri havuzu), kaleci derinliği ve kimliği eşleşen dışarıda kalanlar. Her değişiklik `data/fm-kaynak/duzeltmeler.json`'a ve Excel'in **Düzeltmeler** sayfasına yazılır; ikinci çalıştırmada yeni değişiklik çıkmaz.
- Değerlerin kaynağı: kullanıcının FM özellik listeleri (`data/fm-kaynak/partiler/*.csv`), `scripts/fm_havuz_birlestir.py` ile birleştirilip `scripts/build_draft_xi_havuz_fm.py` ile 14+4 özelliğe çevrildi. Bu dönüştürücü havuzu sıfırdan yazar; Excel'de elle yapılan düzeltmeler üzerine yazılmasın diye yeni FM partisi eklendiğinde yeni oyuncular Excel'e eklenir, sonra Excel okunur.

## Oyuncu havuzu (ilk geçiş, 2026-11-21)

- `data/havuz.mjs`: aktif NEON XI havuzundan (502 oyuncu) üretildi. Kaynak kopyası `data/kaynak-havuz.json`, dönüştürücü `scripts/build_draft_xi_pool.mjs` (`--extract` canlı oyundan yeniden çeker).
- Eski 7 değer (hız, pas, şut, dribling, savunma, kafa, oyun zekâsı) + orta açma → v2'nin 14 özelliği formülle; kaleciler 4 değerden. Ayak, zayıf ayak ve boy **tahmini** (mevki ve kafa değerinden).
- 236 oyuncunun değerleri dış bir kaynaktan (FMInside FM26) türetilmiş; `kaynak` alanında işaretli, kalıcı havuzda kendi değerlerimizle değiştirilecek.
- Bilinen eksik: canlı oyundaki Süper Lig güncellemesi açılışta hata verdiği için havuzda yalnızca 9 Süper Lig oyuncusu vardı; düzeltildi (2026-11-21), şimdi 35.
- Test: `scripts/test_draft_xi_pool.mjs` (her oyuncu motora uygun; rastgele kadrolarla maçlar hatasız).
