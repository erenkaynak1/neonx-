// Açık Artırma: hakem karakterleri. Hepsi kurgusal tiplerdir; gerçek bir kişinin adı, yüzü ya da sözü kullanılmaz.
// Her maçta biri seçilir: bekleme ekranında piksel art olarak "düşünür", kararı kendi üslubuyla yazar (Worker'a `stil`).

// 16×16 piksel art. Harfler: h saç · k ten · e göz · m ağız · c kıyafet · a aksesuar · w beyaz · . boş
const TABAN = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hkkkkkkh....',
  '....kkkkkkkk....',
  '....kekkkkek....',
  '....kkkkkkkk....',
  '....kkkmmkkk....',
  '.....kkkkkkkk...',
  '......kkkk.kk...',
  '...ccccccccccc..',
  '..ccccccccccccc.',
  '..ccccccccccccc.',
  '..ccccccccccccc.',
  '..cc.ccccccc.cc.',
  '..cc.ccccccc.cc.',
];

// Bir karakterin karelerini kurar: aksesuar satırları tabanın üzerine yazılır ('.' = tabanı koru).
function kareler(ustuneYaz = {}) {
  const ac = TABAN.map((satir, y) => {
    const u = ustuneYaz[y];
    if (!u) return satir;
    return [...satir].map((ch, x) => (u[x] && u[x] !== '.' ? u[x] : ch)).join('');
  });
  const kapali = ac.map((s, y) => (y === 5 ? s.replace(/e/g, 'k') : s));  // göz kırpma
  return [ac, kapali];
}

export const HAKEMLER = [
  {
    id: 'baskan', ad: 'BAŞKAN', unvan: 'Kulüp Başkanı', karari: 'BAŞKAN\'IN KARARI',
    renk: { h: '#9aa3ab', k: '#e0ac84', e: '#14181c', m: '#7a3b2e', c: '#1d2b44', a: '#d6283b', w: '#f3f6f8' },
    kareler: kareler({ 10: '......wwa.......', 11: '......waa.......', 12: '.......a........', 13: '.......a........' }),
    satirlar: ['Kadroları inceliyor…', 'Transfer bütçesine bakıyor…', 'Yönetim kuruluyla görüşüyor…', 'Basın açıklamasını hazırlıyor…'],
    stil: 'Bir kulüp başkanı gibi konuş: büyük vaatler, "şampiyonluk projesi", "camiamız", bütçe ve transfer dili; hafif kibirli ama sevimli.',
  },
  {
    id: 'hoca', ad: 'HOCA', unvan: 'Teknik Direktör', karari: 'HOCA\'NIN KARARI',
    renk: { h: '#2b2118', k: '#d9a37c', e: '#14181c', m: '#6b3426', c: '#16351f', a: '#baff18', w: '#f3f6f8' },
    kareler: kareler({ 1: '....aaaaaaaa....', 2: '...aaaaaaaaaa...', 3: '...aaaaaaaaaaaa.', 10: '...cccaacccccc..', 11: '..cccccaaccccccc' }),
    satirlar: ['Taktik tahtasına bakıyor…', 'Oyun planını çiziyor…', 'Maç kasetini izliyor…', 'Dengeyi hesaplıyor…'],
    stil: 'Tecrübeli bir teknik direktör gibi konuş: "oyun planı", "denge", "geçiş oyunu" gibi taktik terimler; ağırbaşlı ama iğneleyici.',
  },
  {
    id: 'yorumcu', ad: 'YORUMCU', unvan: 'TV Yorumcusu', karari: 'YORUMCU\'NUN KARARI',
    renk: { h: '#3a2414', k: '#e3b08c', e: '#14181c', m: '#8a2b2b', c: '#5a1424', a: '#00e1ff', w: '#f3f6f8' },
    kareler: kareler({ 3: '...ahkkkkkkha...', 4: '...akkkkkkkka...', 5: '...akekkkkeka...', 6: '...akkkkkkkka...', 7: '...akkkmmkkka...', 8: '....aa.kkkkkkk..' }),
    satirlar: ['Pozisyonu tekrar izliyor…', 'VAR odasına bağlanıyor…', 'Sesini yükseltmeye hazırlanıyor…', 'Istatistiklere bakıyor…'],
    stil: 'Ateşli bir TV yorumcusu gibi konuş: ünlemler, abartılı tepkiler, "bu ne ya!", "olmaz böyle şey!"; çok heyecanlı.',
  },
  {
    id: 'yayinci', ad: 'YAYINCI', unvan: 'Futbol İçerik Üreticisi', karari: 'YAYINCI\'NIN KARARI',
    renk: { h: '#ff4fb8', k: '#e6b590', e: '#14181c', m: '#7a3b2e', c: '#3b2a6b', a: '#ffd23f', w: '#f3f6f8' },
    kareler: kareler({ 2: '...cchhhhhhhcc..', 3: '...cchkkkkkhcc..', 4: '...cckkkkkkkcc..', 8: '.....kkkkkkkaa..', 9: '......kkkk.aa...' }),
    satirlar: ['Chat\'i okuyor…', 'Thumbnail hazırlıyor…', 'Takipçilere soruyor…', 'Klip kesiyor…'],
    stil: 'Genç bir futbol içerik üreticisi gibi konuş: Z kuşağı dili, "aga", "efsane", "cringe", "W/L", bolca emoji.',
  },
];

export const hakemBul = (id) => HAKEMLER.find((h) => h.id === id) || HAKEMLER[0];

// Maçın hakemi: maddelerden türetilir, böylece online'da iki ekran ayrı mesaj olmadan aynı hakemi görür.
export function hakemSec(maddeler) {
  let x = 0;
  for (const m of maddeler) for (const ch of String(m.id || m)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return HAKEMLER[x % HAKEMLER.length];
}

// Kareyi SVG olarak çizer (her piksel bir <rect>); yazı rengi değil, karakterin paleti kullanılır.
export function pikselSVG(hakem, kare, boyut = 128, sinif = '') {
  const rects = [];
  hakem.kareler[kare].forEach((satir, y) => [...satir].forEach((ch, x) => {
    if (ch !== '.' && hakem.renk[ch]) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${hakem.renk[ch]}"/>`);
  }));
  return `<svg class="${sinif}" viewBox="0 0 16 16" width="${boyut}" height="${boyut}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}
