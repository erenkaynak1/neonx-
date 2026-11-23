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

## Maç ekranı · 2D motor (2026-11-23)

`ui/mac.mjs` + `ui/mac/` beş katman (kullanıcının 2D maç motoru istemi): **durum** (olay kaydından oyun durumu, takım/oyuncu istatistikleri, önemli anlar), **taktik** (diziliş + taktik ayarlarından her oyuncunun hedefi: düz savunma çizgisi, bloğun topa kayması, pres + kademe + pas yolu kapatma, son üçte birde markaj; hücumda stoperlerin açılması, kanat genişliği, bindiren bek, pas üçgenleri, savunma arkasına koşu, ortada ceza sahası doldurma; duran toplar ve gol sevinci), **fizik** (oyuncu hız/ivme Hız'dan, yorgunluk; top yerden/havadan/şut/yuvarlanma; sabit 50 Hz), **yönetmen** (motor olayı → aksiyon: pas, orta, şut + kaleci, müdahale, faul, duran top), **çizim** (canvas, adımlar arası ara değer). Sonucu motor belirler; ekran onu oynatır. Oyuncu görevleri kullanılmaz (davranış mevkiden).
Kurallar: top yalnızca bir oyuncu dokununca hareket eder (vuran topa koşar, kafa topunu kazanan vurur, sahipsiz topa koşulur, kurtarış kalecinin erişiminde); top bir sonraki oyuncunun motordaki konumuna gider; oyundaki ölü top atışı kullanan oyuncuca noktaya taşınır, oyun dışına çıkan top yerine yeni top konur; korner her zaman topun çizgiyi geçmesiyle başlar; santralar (maç başı, ikinci yarı) iki yarıda dizilişle; devre arasında taraflar değişir. İzleme şekilleri: **Sadece spiker** (saha yok, ~1,5 dk), **Önemli anlar** (~4 dk), **Uzun özet** (~7 dk, daha uzun atak kuruluşları); hızlı maç kurulumunda ve draft→maç geçişinde seçilir, son seçim hatırlanır (`?izle=spiker|onemli|uzun`). Önemli anlar tam oynanır (1x: maç saniyesi ×1,6, ölü top hazırlığı hızlı), aralarda saat ilerler; maç 1x'te ~2,5–4 dk. Test yardımcıları: `?tohum=N`, `?an=N`, `?hizli`. CI: `scripts/test_draft_xi_mac.mjs` (istatistikler = motor, goller özette).

## Motor 0.4 · gol seviyesi ve plan dengesi (2026-11-23)

Hedef (kullanıcı): eşit kadrolar, iki takım da dengeli → maç başına ~3 gol; açık oyunda 5–6, savunmacı maçta 1–2 gol olabilir; hiçbir hazır plan baskın değil.
Ölçüm: draft benzeri eşit kadrolarla 6×6 plan tablosu (her hücre iki yönde 240 maç).

| | önce (0.3.1) | sonra (0.4.0) |
|---|---|---|
| dengeli – dengeli gol | 3,52 | 3,05 (1–2 gol %38, 3–4 %39, 5+ %19) |
| otobüs – otobüs gol | 2,09 | 1,98 |
| plan puanları (en düşük – en yüksek) | 1,10 – 1,70 | 1,34 – 1,51 |

Değişenler: hat yüksekliğinin hücum karşılığı (alçak blok 10 m düşer, rakip yarı sahada destek az; yüksek hat paslarda derli toplu), alçak bloğa karşı uzaktan şut kolaylaşır; kapatılan alan +20/−10 ve +10/−20 (ortalamada eşit); sıklık çarpanları puan etkileri gibi birleşir (en fazla ×3); kısa pas daha isabetli ve son üçte birde şutu boğmuyor; kontra 2 aksiyon ×1,5, kontrayı kesen faulde sarı %30 (önce %60: kontra takımının rakibi maç başına 0,36 kırmızı görüyordu); uzun pas %40, ara pası okunmaya daha açık; serbest oyunun cezası hafifledi; temkinli müdahale −10; gole dönüşüm ×0,8.

## Oyuncu havuzu: Excel (2026-11-23)

Oyunun kullandığı havuz **`data/eren-oyuncu-havuzu.xlsx`** dosyasıdır; `data/havuz-fm.mjs` ondan üretilir (Draft, Taktik, Maç ve İnceleme ekranları bunu okur).

- Düzenleme: Excel'de puan, mevki, kulüp, yaş vb. değiştir, satır ekle/sil, sonra `python3 scripts/draft_xi_havuz_excel_oku.py`. Hatalı hücre (1–99 dışı puan, bilinmeyen mevki, tekrar eden isim) varsa dosya yazılmaz, hatalar listelenir.
- Kontrol: `python3 scripts/draft_xi_havuz_excel_oku.py --check` (CI'da çalışır) + `node scripts/test_draft_xi_pool_fm.mjs`.
- Excel'i havuzdan yeniden üretmek: `python3 scripts/draft_xi_havuz_excel.py`.
- Mantık hatası düzeltmesi: `python3 scripts/draft_xi_havuz_duzelt.py --database <transfermarkt.duckdb>` (açık veri seti: dcaribou/transfermarkt-datasets). Yaş/boy/ayak, maç kadrolarından mevki (3-5'li savunmada kanat bek), 2025-26'yı bitirdiği kulüp, gollerden zayıf ayak, özellik çelişkileri (mevki grubu tutarlılık modeli + eski açık veri havuzu), kaleci derinliği ve kimliği eşleşen dışarıda kalanlar. Her değişiklik `data/fm-kaynak/duzeltmeler.json`'a ve Excel'in **Düzeltmeler** sayfasına yazılır; ikinci çalıştırmada yeni değişiklik çıkmaz.
- Değerlerin kaynağı: kullanıcının FM özellik listeleri (`data/fm-kaynak/partiler/*.csv`), `scripts/fm_havuz_birlestir.py` ile birleştirilip `scripts/build_draft_xi_havuz_fm.py` ile 14+4 özelliğe çevrildi. Ölçek dönüşümü `scripts/draft_xi_fm_olcek.py`: mevki grubuna göre eşit yüzdelik eşleme, uçlar kırpılmaz (çapraz doğrulamada eski havuza fark 5,87 → 4,94); düzeltme betiği dönüşümü düzeltilmiş mevkilerle yeniden uygular. Bu dönüştürücü havuzu sıfırdan yazar; Excel'de elle yapılan düzeltmeler üzerine yazılmasın diye yeni FM partisi eklendiğinde yeni oyuncular Excel'e eklenir, sonra Excel okunur.

## Oyuncu havuzu (ilk geçiş, 2026-11-21)

- `data/havuz.mjs`: aktif NEON XI havuzundan (502 oyuncu) üretildi. Kaynak kopyası `data/kaynak-havuz.json`, dönüştürücü `scripts/build_draft_xi_pool.mjs` (`--extract` canlı oyundan yeniden çeker).
- Eski 7 değer (hız, pas, şut, dribling, savunma, kafa, oyun zekâsı) + orta açma → v2'nin 14 özelliği formülle; kaleciler 4 değerden. Ayak, zayıf ayak ve boy **tahmini** (mevki ve kafa değerinden).
- 236 oyuncunun değerleri dış bir kaynaktan (FMInside FM26) türetilmiş; `kaynak` alanında işaretli, kalıcı havuzda kendi değerlerimizle değiştirilecek.
- Bilinen eksik: canlı oyundaki Süper Lig güncellemesi açılışta hata verdiği için havuzda yalnızca 9 Süper Lig oyuncusu vardı; düzeltildi (2026-11-21), şimdi 35.
- Test: `scripts/test_draft_xi_pool.mjs` (her oyuncu motora uygun; rastgele kadrolarla maçlar hatasız).
