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

## Oyuncu havuzu (ilk geçiş, 2026-11-21)

- `data/havuz.mjs`: aktif NEON XI havuzundan (502 oyuncu) üretildi. Kaynak kopyası `data/kaynak-havuz.json`, dönüştürücü `scripts/build_draft_xi_pool.mjs` (`--extract` canlı oyundan yeniden çeker).
- Eski 7 değer (hız, pas, şut, dribling, savunma, kafa, oyun zekâsı) + orta açma → v2'nin 14 özelliği formülle; kaleciler 4 değerden. Ayak, zayıf ayak ve boy **tahmini** (mevki ve kafa değerinden).
- 236 oyuncunun değerleri dış bir kaynaktan (FMInside FM26) türetilmiş; `kaynak` alanında işaretli, kalıcı havuzda kendi değerlerimizle değiştirilecek.
- Bilinen eksik: canlı oyundaki Süper Lig güncellemesi açılışta hata verdiği için havuzda yalnızca 9 Süper Lig oyuncusu vardı; düzeltildi (2026-11-21), şimdi 35.
- Test: `scripts/test_draft_xi_pool.mjs` (her oyuncu motora uygun; rastgele kadrolarla maçlar hatasız).
