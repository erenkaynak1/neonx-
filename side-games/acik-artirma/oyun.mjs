// Açık Artırma: oyun kuralları (arayüzden bağımsız, test edilebilir). Kurallar: docs/acik-artirma-tasarim.md §1.
//
// Akış: konudan rastgele 10 madde → her madde sırayla açık artırmaya çıkar. Açılışı yapan her maddede değişir
// (ilk madde rastgele). Açan, parası varsa açmak ZORUNDA: en az 1 NP (+1 / +2 / +3), açılışta pas yok.
// Sonra sıra gelen +1 / +2 / +3 yapar ya da PAS der; pas diyen çekilir, son teklifi veren maddeyi o parayla alır.
// Bütçe: parası biten teklif veremez. Rakip tek başına 1 paraya alabilir ya da pas diyebilir; pas derse madde
// bedavaya parası bitene gider. İkisinin de parası bittiyse kalan maddeler sırayla (o maddenin açanından başlayarak)
// dağıtılır. 5 seçimini dolduran artık almaz; kalan maddeler bedavaya diğerine gider.
// Rakibin bir sonraki teklifi karşılayacak parası yoksa satış hemen olur.

export const BUTCE = 20;
export const SECIM = 5;
export const MADDE = SECIM * 2;
export const ARTIRIMLAR = [1, 2, 3];

/** Konudan rastgele n madde (Fisher–Yates). */
export function maddeSec(konu, rnd = Math.random, n = MADDE) {
  const a = konu.maddeler.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Oynanabilir konular: taslak olmayan ve en az MADDE maddesi olan. */
export const oynanabilir = (konular) => konular.filter((k) => !k.taslak && k.maddeler.length >= MADDE);

export function yeniOyun({ konu, adlar = ['Oyuncu 1', 'Oyuncu 2'], rnd = Math.random, maddeler }) {
  const s = {
    konu,
    maddeler: maddeler || maddeSec(konu, rnd),
    i: 0,
    oyuncular: adlar.map((ad) => ({ ad, para: BUTCE, secimler: [] })),
    ilkAcan: rnd() < 0.5 ? 0 : 1,
    tur: null, // { acan, teklif, lider, sira, paslar, mod: 'normal' | 'tek', gecmis: [{kim, teklif}] }
    olaylar: [], // son hamlenin olayları (arayüz animasyonları için)
    bitti: false,
  };
  maddeyiBaslat(s);
  return s;
}

const dolu = (p) => p.secimler.length >= SECIM;
const diger = (k) => 1 - k;

function ver(s, kim, fiyat, neden) {
  const madde = s.maddeler[s.i];
  const p = s.oyuncular[kim];
  p.para -= fiyat;
  p.secimler.push({ ...madde, fiyat });
  s.olaylar.push({ tip: 'satildi', kim, fiyat, madde, neden });
  s.i++;
  if (s.i >= s.maddeler.length) {
    s.bitti = true;
    s.tur = null;
    s.olaylar.push({ tip: 'bitti' });
  } else {
    maddeyiBaslat(s);
  }
}

export function maddeyiBaslat(s) {
  const acan = (s.ilkAcan + s.i) % 2;
  const [a, b] = s.oyuncular;
  s.tur = { acan, teklif: 0, lider: null, sira: acan, mod: 'normal', gecmis: [] };
  s.olaylar.push({ tip: 'madde', i: s.i, madde: s.maddeler[s.i], acan });
  if (dolu(a) || dolu(b)) return ver(s, dolu(a) ? 1 : 0, 0, 'dolu');
  const bitik = [a.para <= 0, b.para <= 0];
  if (bitik[0] && bitik[1]) return ver(s, acan, 0, 'parasiz');
  if (bitik[0] || bitik[1]) {
    s.tur.mod = 'tek';
    s.tur.sira = bitik[0] ? 1 : 0;
  }
}

/** Sırası gelen oyuncunun yapabilecekleri. */
export function secenekler(s) {
  if (s.bitti || !s.tur) return null;
  const t = s.tur;
  const p = s.oyuncular[t.sira];
  if (t.mod === 'tek') return { kim: t.sira, artirimlar: p.para >= 1 ? [1] : [], pas: true, tek: true };
  // Açılışta pas yok: açan en az 1 NP ile açar.
  return { kim: t.sira, artirimlar: ARTIRIMLAR.filter((x) => t.teklif + x <= p.para), pas: t.lider !== null, tek: false };
}

/** Hamle: { tip: 'artir', miktar } ya da { tip: 'pas' }. Geçersiz hamlede hata fırlatır. */
export function hamle(s, h) {
  const sec = secenekler(s);
  if (!sec) throw new Error('oyun bitti');
  const t = s.tur;
  const kim = t.sira;
  if (h.tip === 'pas' && !sec.pas) throw new Error('açılışta pas yok');
  s.olaylar = [];

  if (t.mod === 'tek') {
    if (h.tip === 'artir') {
      if (!sec.artirimlar.includes(h.miktar)) throw new Error('geçersiz teklif');
      t.gecmis.push({ kim, teklif: 1 });
      s.olaylar.push({ tip: 'teklif', kim, teklif: 1 });
      return ver(s, kim, 1, 'tek');
    }
    s.olaylar.push({ tip: 'pas', kim });
    return ver(s, diger(kim), 0, 'hediye');
  }

  if (h.tip === 'artir') {
    if (!sec.artirimlar.includes(h.miktar)) throw new Error('geçersiz teklif');
    t.teklif += h.miktar;
    t.lider = kim;
    t.gecmis.push({ kim, teklif: t.teklif });
    s.olaylar.push({ tip: 'teklif', kim, teklif: t.teklif });
    const rakip = s.oyuncular[diger(kim)];
    if (rakip.para < t.teklif + 1) return ver(s, kim, t.teklif, 'karsilanamaz');
    t.sira = diger(kim);
    return;
  }

  if (!sec.pas) throw new Error('açılışta pas yok');
  s.olaylar.push({ tip: 'pas', kim });
  return ver(s, t.lider, t.teklif, 'teklif');
}

export const harcanan = (p) => p.secimler.reduce((n, m) => n + m.fiyat, 0);
