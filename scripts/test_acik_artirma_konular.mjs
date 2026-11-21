// Açık Artırma konu listesi bütünlük testi: her konu oynanabilir mi, kimlikler benzersiz mi, künyeler kısa mı.
import assert from 'node:assert/strict';
import { KONULAR, TURLER } from '../side-games/acik-artirma/konular.mjs';

const MADDE_PER_MAC = 10;
const konuIds = new Set();
const maddeIds = new Set();
let toplam = 0;
let kontrol = 0;

for (const k of KONULAR) {
  assert.ok(/^[a-z0-9-]+$/.test(k.id), `konu kimliği: ${k.id}`);
  assert.ok(!konuIds.has(k.id), `tekrarlanan konu: ${k.id}`);
  konuIds.add(k.id);
  assert.ok(TURLER[k.tur], `${k.id}: bilinmeyen tür ${k.tur}`);
  assert.ok(k.yon === 'iyi' || k.yon === 'kotu', `${k.id}: yön iyi/kotu olmalı`);
  assert.equal(k.yon === 'kotu', k.tur === 'ters', `${k.id}: ters konular ve yalnızca onlar "kotu" yönlü`);
  assert.ok(k.baslik && k.baslik.length <= 60, `${k.id}: başlık 1–60 karakter`);
  assert.ok(k.maddeler.length >= MADDE_PER_MAC, `${k.id}: en az ${MADDE_PER_MAC} madde (var: ${k.maddeler.length})`);
  const adlar = new Set();
  for (const m of k.maddeler) {
    assert.ok(m.ad && m.ad.length <= 40, `${m.id}: ad 1–40 karakter`);
    assert.ok(m.kunye && m.kunye.length <= 80, `${m.id}: künye 1–80 karakter`);
    assert.ok(!adlar.has(m.ad), `${k.id}: tekrarlanan madde ${m.ad}`);
    adlar.add(m.ad);
    assert.ok(!maddeIds.has(m.id), `tekrarlanan madde kimliği: ${m.id}`);
    maddeIds.add(m.id);
    toplam++;
    if (m.kontrol) kontrol++;
  }
}
for (const tur of Object.keys(TURLER)) {
  assert.ok(KONULAR.some((k) => k.tur === tur), `türde konu yok: ${tur}`);
}
console.log(`Açık Artırma konuları: ${KONULAR.length} konu, ${toplam} madde, ${kontrol} madde kontrol bekliyor ✓`);
