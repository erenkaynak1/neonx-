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
  assert.ok(k.taslak || k.maddeler.length >= MADDE_PER_MAC, `${k.id}: en az ${MADDE_PER_MAC} madde (var: ${k.maddeler.length})`);
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

// Hakem: istek metni takma adlı ve sıralı, cevap doğru oyuncuya eşleniyor, bozuk cevap reddediliyor.
import { HAKEM_TALIMATI, HAKEM_SEMASI, hakemIstegi, hakemCevabi } from '../side-games/acik-artirma/hakem.mjs';
{
  const konu = KONULAR.find((k) => k.id === 'fb-kadrolar');
  const al = (i, fiyat) => ({ ad: konu.maddeler[i].ad, kunye: konu.maddeler[i].kunye, fiyat });
  const taraflar = [
    { maddeler: [al(0, 5), al(1, 2), al(2, 3), al(3, 4), al(4, 6)] },
    { maddeler: [al(5, 1), al(6, 7), al(7, 4), al(8, 5), al(9, 1)] },
  ];
  const ters = hakemIstegi(konu, taraflar, () => 0.9);
  assert.deepEqual(ters.sira, [1, 0]);
  assert.ok(ters.metin.startsWith(`KONU: ${konu.baslik}\nYÖN: EN İYİ`));
  assert.ok(ters.metin.indexOf(taraflar[1].maddeler[0].ad) < ters.metin.indexOf(taraflar[0].maddeler[0].ad), 'rastgele sıra uygulanmalı');
  assert.ok(ters.metin.includes('Taraf 1 (harcadığı: 18 NP)'));
  const cevap = {
    kazanan: 'Taraf 1', ozet: 'Bu iş bitti.',
    maddeler: [...taraflar[0].maddeler, ...taraflar[1].maddeler].map((m) => ({ madde: m.ad, taraf: 'Taraf 1', yorum: 'iyi' })),
    soygun: { madde: taraflar[1].maddeler[0].ad, neden: '1 paraya' }, hata: { madde: taraflar[1].maddeler[1].ad, neden: '7 para' },
  };
  const sonuc = hakemCevabi(cevap, ters, taraflar);
  assert.equal(sonuc.kazanan, 1, '"Taraf 1" bu sırada oyun içindeki 2. oyuncu');
  assert.equal(Object.keys(sonuc.yorumlar).length, 10);
  assert.equal(hakemCevabi({ ...cevap, kazanan: 'Berabere' }, ters, taraflar), null);
  assert.equal(hakemCevabi({ ...cevap, soygun: { madde: 'Uydurma madde', neden: 'x' } }, ters, taraflar), null);
  assert.equal(hakemIstegi(KONULAR.find((k) => k.yon === 'kotu'), taraflar, () => 0.1).metin.split('\n')[1], 'YÖN: EN KÖTÜ (ters konu: en kötüyü toplayan kazanır)');
  assert.ok(HAKEM_TALIMATI.includes('ASLA dalga geçme') && HAKEM_SEMASI.required.includes('kazanan'));
  console.log('Açık Artırma hakem isteği ve cevap doğrulaması ✓');
}

// Oyun kuralları: rastgele hamlelerle binlerce oyun; her oyun 5'e 5 biter, para eksiye düşmez, bütçe korunur.
import { yeniOyun, hamle, secenekler, oynanabilir, harcanan, maddeyiBaslat, BUTCE, SECIM, MADDE } from '../side-games/acik-artirma/oyun.mjs';
{
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const konular = oynanabilir(KONULAR);
  assert.ok(konular.length >= 10 && konular.every((k) => !k.taslak));
  const nedenler = new Set();
  for (let g = 0; g < 3000; g++) {
    const s = yeniOyun({ konu: konular[g % konular.length], rnd });
    assert.equal(s.maddeler.length, MADDE);
    assert.equal(new Set(s.maddeler.map((m) => m.id)).size, MADDE, 'aynı madde iki kez çıkmaz');
    let adim = 0;
    while (!s.bitti) {
      const sec = secenekler(s);
      const agresif = g % 3 === 0;
      const h = sec.artirimlar.length && (!sec.pas || rnd() < (agresif ? 0.8 : 0.45))
        ? { tip: 'artir', miktar: sec.artirimlar[Math.floor(rnd() * sec.artirimlar.length)] }
        : { tip: 'pas' };
      hamle(s, h);
      for (const o of s.olaylar) if (o.tip === 'satildi') nedenler.add(o.neden);
      assert.ok(++adim < 500, 'oyun sonsuza gitmemeli');
    }
    for (const p of s.oyuncular) {
      assert.equal(p.secimler.length, SECIM);
      assert.ok(p.para >= 0);
      assert.equal(p.para + harcanan(p), BUTCE);
    }
    assert.equal(secenekler(s), null);
  }
  for (const n of ['teklif', 'dolu', 'karsilanamaz', 'tek', 'hediye']) assert.ok(nedenler.has(n), `kural hiç denenmedi: ${n}`);

  // Elle senaryo: teklif + pas, geçersiz teklif reddi, açılış sırası değişimi.
  const s = yeniOyun({ konu: konular[0], rnd: () => 0.1 });
  assert.equal(s.tur.acan, 0);
  assert.equal(secenekler(s).pas, false, 'açan pas diyemez');
  assert.throws(() => hamle(s, { tip: 'pas' }));
  hamle(s, { tip: 'artir', miktar: 3 });
  assert.equal(secenekler(s).pas, true);
  assert.equal(s.tur.sira, 1);
  assert.throws(() => hamle(s, { tip: 'artir', miktar: 4 }));
  hamle(s, { tip: 'artir', miktar: 2 });
  hamle(s, { tip: 'pas' });
  assert.equal(s.oyuncular[1].para, BUTCE - 5);
  assert.equal(s.oyuncular[1].secimler[0].fiyat, 5);
  assert.equal(s.tur.acan, 1, 'ikinci maddeyi diğer oyuncu açar');
  // İkisinin de parası bitince maddeler sırayla dağıtılır.
  const z = yeniOyun({ konu: konular[0], rnd: () => 0.1 });
  z.oyuncular.forEach((p) => { p.para = 0; });
  z.olaylar = [];
  maddeyiBaslat(z);
  assert.ok(z.bitti, 'ikisi de parasızsa kalan maddeler otomatik dağıtılır');
  assert.deepEqual(z.oyuncular.map((p) => p.secimler.length), [SECIM, SECIM]);
  assert.deepEqual(z.oyuncular[0].secimler.map((m) => m.id), [0, 2, 4, 6, 8].map((i) => z.maddeler[i].id), 'sırayla: açan oyuncudan başlayarak');
  console.log('Açık Artırma oyun kuralları (3.000 rastgele oyun) ✓');
}
