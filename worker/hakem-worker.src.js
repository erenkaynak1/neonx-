// NEON XI — Açık Artırma yapay zekâ hakem: Cloudflare Worker (DeepSeek / Gemini aracı sunucusu).
// Bu dosya şablondur; Cloudflare'a yapıştırılan dosya `worker/hakem-worker.js`, `node scripts/build_hakem_worker.mjs`
// ile konu listesi ve hakem talimatı içine gömülerek üretilir. Elle düzenleme yapma, şablonu düzenleyip yeniden üret.
//
// Gizli değişkenler (Cloudflare → Worker → Settings → Variables and Secrets):
//   DEEPSEEK_API_KEY (Secret, isteğe bağlı) DeepSeek API anahtarı. Tanımlıysa hakem önce DeepSeek'i kullanır.
//   DEEPSEEK_MODEL   (Text, isteğe bağlı)   Varsayılan deepseek-chat.
//   GEMINI_API_KEY  (Secret, isteğe bağlı)  Google AI Studio API anahtarı; DeepSeek yoksa ya da hata verirse kullanılır.
//   En az biri tanımlı olmalı. Anahtarlar koda ya da sohbete asla yazılmaz.
//   GEMINI_MODEL    (Text, isteğe bağlı) Belirli bir model zorlamak için. Boşsa Worker, anahtarın erişebildiği modelleri
//                   Google'dan sorup en yeni hızlı (flash) modeli seçer; model kaldırılırsa sıradakine geçer.
//
// Durum: adresi tarayıcıda açmak (GET) anahtarın tanımlı olup olmadığını ve modeli gösterir; anahtarın kendisini asla göstermez.
//
// Güvenlik: yalnızca NEON XI sitesinden ve giriş yapmış (Firebase, misafir dahil) oyunculardan istek kabul eder;
// oyuncu başına dakikalık sınır vardır; serbest metin kabul etmez: istek konu ve madde kimlikleriyle gelir, metni
// Worker kendisi kurar. Oyuncu adı ya da kişisel bilgi Gemini'ye gitmez.

const KONULAR = /*KONULAR*/;
const HAKEM_TALIMATI = /*TALIMAT*/;
const HAKEM_SEMASI = /*SEMA*/;
const HAKEM_STILLERI = /*STILLER*/;  // kurgusal hakem karakterleri: id → üslup
const hakemIstegi = /*ISTEK*/;

const FIREBASE_PROJECT = 'neonxi';
const ORIGINS = ['https://erenkaynak1.github.io'];
const LIMIT = { pencereMs: 10 * 60 * 1000, istek: 8 };
const BUTCE = 20, SECIM = 5;
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const DEEPSEEK = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_SURE_MS = 45000;
const YEDEK_MODEL = 'gemini-flash-latest';
const MODEL_SURE_MS = 18000; // tek modele en fazla bu kadar beklenir; sonra sıradaki denenir
const TOPLAM_SURE_MS = 80000; // bütün denemeler için üst sınır (oyun 100 sn bekler)
let modelOnbellek = { at: 0, list: [] };

// Anahtarın erişebildiği, generateContent destekleyen flash modelleri: en yeni sürüm önce, "lite" ve "preview" sonra.
async function uygunModeller(env) {
  if (Date.now() - modelOnbellek.at < 6 * 3600_000 && modelOnbellek.list.length) return modelOnbellek.list;
  try {
    const r = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
    if (!r.ok) return [];
    const surum = (n) => Number((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const list = ((await r.json()).models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((n) => /^gemini-\d+(\.\d+)?-flash(-lite)?(-preview[\w.-]*)?$/.test(n))
      .sort((a, b) => (/lite/.test(a) - /lite/.test(b)) || (/preview/.test(a) - /preview/.test(b)) || surum(b) - surum(a));
    modelOnbellek = { at: Date.now(), list };
    return list;
  } catch { return []; }
}

// Deneme sırası: en yeni 2 kararlı flash, sonra en yeni 2 lite (daha hızlı, daha az yoğun), sonra önizlemeler, son çare takma ad.
function denemeSirasi(env, liste) {
  const kararli = liste.filter((n) => !/lite|preview/.test(n));
  const lite = liste.filter((n) => /lite/.test(n) && !/preview/.test(n));
  const onizleme = liste.filter((n) => /preview/.test(n));
  return [...new Set([env.GEMINI_MODEL, ...kararli.slice(0, 2), ...lite.slice(0, 2), ...onizleme.slice(0, 1), YEDEK_MODEL].filter(Boolean))];
}

// Hız için "düşünme" en aza indirilir: 2.x modellerde bütçe 0, diğerlerinde "minimal", desteklenmezse "low", o da
// desteklenmezse ayarsız.
const DUSUNME_ADIMLARI = (model) => /^gemini-2\./.test(model) ? [{ thinkingBudget: 0 }, null] : [{ thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, null];
const GECICI = new Set([429, 500, 502, 503, 504]); // yoğunluk / geçici hata: sıradaki model denenir
const sayac = new Map(); // uid → [zaman damgaları] (her Worker örneğinde ayrı; kaba bir sınır)

const izinli = (origin) => ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
const cors = (origin) => ({
  'access-control-allow-origin': izinli(origin) ? origin : ORIGINS[0],
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-max-age': '86400',
  vary: 'origin',
});
const json = (data, status, origin) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) } });

// Firebase kimlik jetonu (RS256) doğrulaması — Google'ın açık anahtarlarıyla.
let anahtarlar = { at: 0, keys: [] };
async function googleAnahtarlari() {
  if (Date.now() - anahtarlar.at < 3600_000 && anahtarlar.keys.length) return anahtarlar.keys;
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!r.ok) throw new Error('jwk');
  anahtarlar = { at: Date.now(), keys: (await r.json()).keys || [] };
  return anahtarlar.keys;
}
const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
async function jetonDogrula(token) {
  const parca = String(token || '').split('.');
  if (parca.length !== 3) return null;
  const baslik = JSON.parse(new TextDecoder().decode(b64url(parca[0])));
  const govde = JSON.parse(new TextDecoder().decode(b64url(parca[1])));
  if (baslik.alg !== 'RS256' || !baslik.kid) return null;
  const jwk = (await googleAnahtarlari()).find((k) => k.kid === baslik.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parca[2]), new TextEncoder().encode(parca[0] + '.' + parca[1]));
  const simdi = Math.floor(Date.now() / 1000);
  if (!ok || govde.aud !== FIREBASE_PROJECT || govde.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT}`) return null;
  if (!(govde.exp > simdi) || govde.iat > simdi + 300 || !govde.sub) return null;
  return govde.sub;
}

function sinirda(uid) {
  const simdi = Date.now();
  const liste = (sayac.get(uid) || []).filter((t) => simdi - t < LIMIT.pencereMs);
  if (liste.length >= LIMIT.istek) { sayac.set(uid, liste); return true; }
  liste.push(simdi); sayac.set(uid, liste);
  if (sayac.size > 5000) sayac.clear();
  return false;
}

// İstek: { konu: "<konu id>", taraflar: [[{id, fiyat}×5], [{id, fiyat}×5]] } — oyun sırasındaki iki taraf.
function istegiKur(body) {
  const konu = KONULAR.find((k) => k.id === body?.konu);
  if (!konu || konu.taslak || !Array.isArray(body.taraflar) || body.taraflar.length !== 2) return null;
  const gorulen = new Set();
  const taraflar = [];
  for (const taraf of body.taraflar) {
    if (!Array.isArray(taraf) || taraf.length !== SECIM) return null;
    let toplam = 0;
    const maddeler = [];
    for (const x of taraf) {
      const m = konu.maddeler.find((y) => y.id === x?.id);
      const fiyat = x?.fiyat;
      if (!m || gorulen.has(m.id) || !Number.isInteger(fiyat) || fiyat < 0 || fiyat > BUTCE) return null;
      gorulen.add(m.id); toplam += fiyat;
      maddeler.push({ ad: m.ad, kunye: m.kunye, fiyat });
    }
    if (toplam > BUTCE) return null;
    taraflar.push({ maddeler });
  }
  return { konu, taraflar };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === 'GET') {
      const modeller = env.GEMINI_API_KEY ? await uygunModeller(env) : [];
      return json({ hakem: 'NEON Hakem', anahtar: !!(env.DEEPSEEK_API_KEY || env.GEMINI_API_KEY), deepseek: !!env.DEEPSEEK_API_KEY, gemini: !!env.GEMINI_API_KEY,
        model: env.DEEPSEEK_API_KEY ? (env.DEEPSEEK_MODEL || 'deepseek-chat') : env.GEMINI_MODEL || modeller[0] || YEDEK_MODEL, modeller: modeller.slice(0, 6) }, 200, origin);
    }
    if (request.method !== 'POST') return json({ hata: 'yalnızca POST' }, 405, origin);
    if (!izinli(origin)) return json({ hata: 'izin yok' }, 403, origin);
    if (!env.GEMINI_API_KEY && !env.DEEPSEEK_API_KEY) return json({ hata: 'hakem ayarlanmadı' }, 503, origin);

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let uid = null;
    try { uid = await jetonDogrula(token); } catch { uid = null; }
    if (!uid) { console.log('NEON Hakem: jeton doğrulanamadı'); return json({ hata: 'giriş gerekli' }, 401, origin); }
    if (sinirda(uid)) return json({ hata: 'çok sık istek' }, 429, origin);

    const ham = await request.text();
    if (ham.length > 8000) return json({ hata: 'istek çok büyük' }, 413, origin);
    let body;
    try { body = JSON.parse(ham); } catch { return json({ hata: 'bozuk istek' }, 400, origin); }
    const kurulan = istegiKur(body);
    if (!kurulan) return json({ hata: 'geçersiz kadro' }, 400, origin);

    const istek = hakemIstegi(kurulan.konu, kurulan.taraflar);
    // Karakter: listeden id ile seçilir (serbest metin yok). Kurgusal bir tiptir, gerçek bir kişi değildir.
    const stil = HAKEM_STILLERI[body.hakem] || '';
    const talimat = stil ? `${HAKEM_TALIMATI}\n\nKARAKTER\n- ${stil}\n- Kurgusal bir karaktersin; gerçek bir kişi olduğunu ya da gerçek kişilerin adına konuştuğunu asla söyleme.` : HAKEM_TALIMATI;
    // DeepSeek önce: OpenAI uyumlu uç; şema desteklemediği için şema talimata yazılır ve JSON modu istenir
    if (env.DEEPSEEK_API_KEY) {
      try {
        const r = await fetch(DEEPSEEK, {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: env.DEEPSEEK_MODEL || 'deepseek-chat', temperature: 0.9, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${talimat}\n\nÇIKTI\n- Yalnızca geçerli bir JSON nesnesi döndür, başka metin yazma. JSON şu şemaya uymalı:\n${JSON.stringify(HAKEM_SEMASI)}` },
              { role: 'user', content: istek.metin },
            ],
          }),
          signal: AbortSignal.timeout(DEEPSEEK_SURE_MS),
        });
        if (r.ok) {
          const veri = await r.json();
          const metin = veri?.choices?.[0]?.message?.content || '';
          try { return json({ sira: istek.sira, karar: JSON.parse(metin), saglayici: 'deepseek' }, 200, origin); }
          catch { console.log('NEON Hakem: DeepSeek bozuk cevap', metin.slice(0, 200)); }
        } else {
          let detay = '';
          try { detay = String((await r.json())?.error?.message || '').slice(0, 240); } catch {}
          console.log('NEON Hakem: DeepSeek hatası', r.status, detay);
          if (!env.GEMINI_API_KEY) return json({ hata: 'hakem cevap vermedi', durum: r.status, detay }, 502, origin);
        }
      } catch (e) {
        console.log('NEON Hakem: DeepSeek zaman aşımı', e?.name || '');
        if (!env.GEMINI_API_KEY) return json({ hata: 'hakem zaman aşımı', durum: 504 }, 504, origin);
      }
      if (!env.GEMINI_API_KEY) return json({ hata: 'hakem cevabı bozuk' }, 502, origin);
    }
    const govde = (dusunme) => JSON.stringify({
      systemInstruction: { parts: [{ text: talimat }] },
      contents: [{ role: 'user', parts: [{ text: istek.metin }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: HAKEM_SEMASI, temperature: 0.9, ...(dusunme ? { thinkingConfig: dusunme } : {}) },
    });
    const basla = Date.now();
    const cagir = (model, dusunme) => fetch(`${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: govde(dusunme),
      signal: AbortSignal.timeout(Math.max(3000, Math.min(MODEL_SURE_MS, TOPLAM_SURE_MS - (Date.now() - basla)))),
    });
    let r = null, sonHata = null;
    for (const model of denemeSirasi(env, await uygunModeller(env))) {
      if (Date.now() - basla > TOPLAM_SURE_MS - 3000) break;
      try {
        for (const dusunme of DUSUNME_ADIMLARI(model)) {
          r = await cagir(model, dusunme);
          if (r.status !== 400 || !/thinking/i.test(await r.clone().text())) break;  // düşünme ayarı desteklenmiyorsa bir sonrakini dene
        }
      } catch (e) {
        console.log('NEON Hakem: model zaman aşımı', model, e?.name || '');
        r = null;
        continue;
      }
      if (r.ok) break;
      if (r.status === 404) { console.log('NEON Hakem: model bulunamadı', model); continue; }
      if (GECICI.has(r.status)) {
        sonHata = r;
        console.log('NEON Hakem: model yoğun', model, r.status);
        continue;
      }
      break;  // kalıcı hata (anahtar, istek): başka model denemek boşuna
    }
    if ((!r || r.status === 404) && sonHata) r = sonHata;  // en anlamlı hatayı (yoğunluk) bildir
    if (!r) return json({ hata: 'hakem zaman aşımı', durum: 504 }, 504, origin);
    if (!r.ok) {
      // Google'ın hata mesajı anahtarı içermez; teşhis için kısaltılmış haliyle döner.
      let detay = '';
      try { detay = String((await r.json())?.error?.message || '').slice(0, 240); } catch {}
      console.log('NEON Hakem: Gemini hatası', r.status, detay);
      return json({ hata: 'hakem cevap vermedi', durum: r.status, detay }, 502, origin);
    }
    const veri = await r.json();
    const metin = veri?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    let karar;
    try { karar = JSON.parse(metin); } catch { console.log('NEON Hakem: bozuk cevap', metin.slice(0, 200)); return json({ hata: 'hakem cevabı bozuk', detay: veri?.candidates?.[0]?.finishReason || '' }, 502, origin); }
    return json({ sira: istek.sira, karar }, 200, origin);
  },
};
