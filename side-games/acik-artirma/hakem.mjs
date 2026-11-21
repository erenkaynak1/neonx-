// Açık Artırma: yapay zekâ hakem (Gemini) talimatı, istek metni ve cevap doğrulaması.
// API anahtarı burada YOK ve olmayacak: istek Cloudflare Worker üzerinden gider (docs/acik-artirma-tasarim.md §3).

export const HAKEM_TALIMATI = `Sen "NEON Hakem"sin: futbol tarihini çok iyi bilen, sosyal medya dilinde konuşan, esprili ama adil bir açık artırma hakemi.

OYUN
İki taraf aynı bütçeyle bir konunun maddelerini açık artırmada topladı. Sen hangi tarafın konuya göre DAHA GÜÇLÜ bir set topladığına karar veriyorsun.

NASIL KARAR VERİRSİN
1. Yön: "EN İYİ" konularda en iyi seti toplayan kazanır. "EN KÖTÜ" konularda (ters konu) en kötü / en kazma seti toplayan kazanır; orada kötülük övülür.
2. Kazananı YALNIZCA maddelerin GERÇEK futbol değerine göre seç: başarılar, kupalar, etkisi, akılda kalıcılığı. Önce FİYAT LİSTESİ'ne hiç bakmadan kadroları karşılaştır ve kazananı belirle. Kim daha çok ya da daha az para harcadı, kazananı ASLA etkilemez: 2 paraya alınan şampiyon kadro da 7 paraya alınan da aynı değerdedir. Fiyatları yalnızca "soygun" ve "hata" kartları için kullan.
3. Bir set sadece en iyi maddesiyle değil bütünüyle değerlendirilir: 1 dev + 4 zayıf madde, 5 sağlam maddeyi her zaman yenmez.
4. Beraberlik YOK. Çok yakınsa bunu söyle ama yine bir taraf seç.
5. Sadece sana verilen maddeleri ve künyeleri kullan. Emin olmadığın istatistik, skor ya da sayı uydurma; emin değilsen genel konuş.
6. Tarafların adı "Taraf 1" ve "Taraf 2"dir. Sıraları rastgeledir; önce yazılan tarafı kayırma.

TARZ
- Türkçe, kısa, vurucu. Modern sosyal medya / meme dili: "bu iş bitti", "abi ne yaptın", "çöp kutusu bile reddetti", "tarihi soygun", "kanka bu ne fiyat", gerektiğinde bir iki emoji (💀🔥😭).
- Her espri bir futbol gerçeğine yaslanmalı. Komik ama gerekçeli.
- Takımlarla, kararlarla, performanslarla ve fiyatlarla dalga geç. Gerçek kişilerin dış görünüşü, kökeni, ailesi, sağlığı ya da özel hayatı ile ASLA dalga geçme. Küfür, hakaret ve aşağılama yok.

ÇIKTI (sadece istenen JSON şeması, başka metin yok)
- kazanan: "Taraf 1" ya da "Taraf 2"
- ozet: en fazla 2 cümle, en çok 220 karakter; kazananın neden kazandığı + kaybedenin eksiği
- maddeler: verilen HER madde için bir kayıt; yorum en fazla 90 karakter, tek cümle
- soygun: ödediği paraya göre en değerli alım (madde adı + kısa neden)
- hata: ödediği paraya göre en kötü alım (madde adı + kısa neden)`;

/**
 * Hakeme gidecek istek metni. Taraflar rastgele sırayla ve takma adla yazılır; oyuncu adı gönderilmez.
 * @param {{baslik:string, yon:'iyi'|'kotu'}} konu
 * @param {{maddeler:{ad:string,kunye:string,fiyat:number}[]}[]} taraflar  oyun sırasındaki iki taraf
 * @param {() => number} rnd  0–1 arası rastgele sayı (test için sabitlenebilir)
 * @returns {{metin:string, sira:number[]}} sira[i] = "Taraf i+1" olarak yazılan oyuncunun dizinindeki yeri
 */
export function hakemIstegi(konu, taraflar, rnd = Math.random) {
  const sira = rnd() < 0.5 ? [0, 1] : [1, 0];
  const yon = konu.yon === 'kotu' ? 'EN KÖTÜ (ters konu: en kötüyü toplayan kazanır)' : 'EN İYİ';
  const satirlar = [`KONU: ${konu.baslik}`, `YÖN: ${yon}`, ''];
  // Kadrolar fiyatsız gider (kazanan yalnızca futbol değerine göre seçilsin); fiyatlar en sonda, ayrı ve etiketli.
  sira.forEach((oyuncu, i) => {
    satirlar.push(`Taraf ${i + 1}`);
    for (const m of taraflar[oyuncu].maddeler) satirlar.push(`- ${m.ad} | ${m.kunye}`);
    satirlar.push('');
  });
  satirlar.push('FİYAT LİSTESİ (kazananı belirlemez; yalnızca "soygun" ve "hata" kartları için)');
  sira.forEach((oyuncu, i) => {
    for (const m of taraflar[oyuncu].maddeler) satirlar.push(`- Taraf ${i + 1}: ${m.ad} = ${m.fiyat} NP`);
  });
  return { metin: satirlar.join('\n').trim(), sira };
}

// Gemini "responseSchema" (OpenAPI alt kümesi). Worker bunu generationConfig'e koyar.
export const HAKEM_SEMASI = {
  type: 'OBJECT',
  properties: {
    kazanan: { type: 'STRING', enum: ['Taraf 1', 'Taraf 2'] },
    ozet: { type: 'STRING' },
    maddeler: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          madde: { type: 'STRING' },
          taraf: { type: 'STRING', enum: ['Taraf 1', 'Taraf 2'] },
          yorum: { type: 'STRING' },
        },
        required: ['madde', 'taraf', 'yorum'],
      },
    },
    soygun: { type: 'OBJECT', properties: { madde: { type: 'STRING' }, neden: { type: 'STRING' } }, required: ['madde', 'neden'] },
    hata: { type: 'OBJECT', properties: { madde: { type: 'STRING' }, neden: { type: 'STRING' } }, required: ['madde', 'neden'] },
  },
  required: ['kazanan', 'ozet', 'maddeler', 'soygun', 'hata'],
  propertyOrdering: ['kazanan', 'ozet', 'maddeler', 'soygun', 'hata'],
};

/**
 * Hakem cevabını doğrular ve oyun sırasına çevirir. Bozuksa null döner (oyun bir kez yeniden dener).
 * @returns {null | {kazanan:number, ozet:string, yorumlar:Record<string,string>, soygun:{madde:string,neden:string}, hata:{madde:string,neden:string}, sira:number[]}}
 * sira[i]: "Taraf i+1" olarak yazılan oyuncu (metinlerdeki takma adları oyuncu adına çevirmek için).
 */
export function hakemCevabi(cevap, istek, taraflar) {
  if (!cevap || typeof cevap !== 'object') return null;
  const tarafNo = { 'Taraf 1': 0, 'Taraf 2': 1 };
  if (!(cevap.kazanan in tarafNo)) return null;
  const metin = (s, max) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null);
  const ozet = metin(cevap.ozet, 300);
  if (!ozet || !Array.isArray(cevap.maddeler)) return null;
  const adlar = new Set(taraflar.flatMap((t) => t.maddeler.map((m) => m.ad)));
  const yorumlar = {};
  for (const m of cevap.maddeler) {
    const y = metin(m && m.yorum, 140);
    if (m && adlar.has(m.madde) && y) yorumlar[m.madde] = y;
  }
  const kart = (k) => (k && adlar.has(k.madde) && metin(k.neden, 140) ? { madde: k.madde, neden: metin(k.neden, 140) } : null);
  const soygun = kart(cevap.soygun);
  const hata = kart(cevap.hata);
  if (!soygun || !hata) return null;
  return { kazanan: istek.sira[tarafNo[cevap.kazanan]], ozet, yorumlar, soygun, hata, sira: istek.sira.slice() };
}
