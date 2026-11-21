// NEON XI — Açık Artırma yapay zekâ hakem: Cloudflare Worker (Gemini aracı sunucusu).
// Bu dosya şablondur; Cloudflare'a yapıştırılan dosya `worker/hakem-worker.js`, `node scripts/build_hakem_worker.mjs`
// ile konu listesi ve hakem talimatı içine gömülerek üretilir. Elle düzenleme yapma, şablonu düzenleyip yeniden üret.
//
// Gizli değişkenler (Cloudflare → Worker → Settings → Variables and Secrets):
//   GEMINI_API_KEY  (Secret, zorunlu)  Google AI Studio API anahtarı. Koda ya da sohbete asla yazılmaz.
//   GEMINI_MODEL    (Text, isteğe bağlı) Varsayılan: gemini-2.5-flash
//
// Güvenlik: yalnızca NEON XI sitesinden ve giriş yapmış (Firebase, misafir dahil) oyunculardan istek kabul eder;
// oyuncu başına dakikalık sınır vardır; serbest metin kabul etmez: istek konu ve madde kimlikleriyle gelir, metni
// Worker kendisi kurar. Oyuncu adı ya da kişisel bilgi Gemini'ye gitmez.

const KONULAR = /*KONULAR*/;
const HAKEM_TALIMATI = /*TALIMAT*/;
const HAKEM_SEMASI = /*SEMA*/;
const hakemIstegi = /*ISTEK*/;

const FIREBASE_PROJECT = 'neonxi';
const ORIGINS = ['https://erenkaynak1.github.io'];
const LIMIT = { pencereMs: 10 * 60 * 1000, istek: 8 };
const BUTCE = 20, SECIM = 5;
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
    if (request.method !== 'POST') return json({ hata: 'yalnızca POST' }, 405, origin);
    if (!izinli(origin)) return json({ hata: 'izin yok' }, 403, origin);
    if (!env.GEMINI_API_KEY) return json({ hata: 'hakem ayarlanmadı' }, 503, origin);

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let uid = null;
    try { uid = await jetonDogrula(token); } catch { uid = null; }
    if (!uid) return json({ hata: 'giriş gerekli' }, 401, origin);
    if (sinirda(uid)) return json({ hata: 'çok sık istek' }, 429, origin);

    const ham = await request.text();
    if (ham.length > 8000) return json({ hata: 'istek çok büyük' }, 413, origin);
    let body;
    try { body = JSON.parse(ham); } catch { return json({ hata: 'bozuk istek' }, 400, origin); }
    const kurulan = istegiKur(body);
    if (!kurulan) return json({ hata: 'geçersiz kadro' }, 400, origin);

    const istek = hakemIstegi(kurulan.konu, kurulan.taraflar);
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: HAKEM_TALIMATI }] },
        contents: [{ role: 'user', parts: [{ text: istek.metin }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: HAKEM_SEMASI, temperature: 0.9 },
      }),
    });
    if (!r.ok) return json({ hata: 'hakem cevap vermedi', durum: r.status }, 502, origin);
    const veri = await r.json();
    const metin = veri?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    let karar;
    try { karar = JSON.parse(metin); } catch { return json({ hata: 'hakem cevabı bozuk' }, 502, origin); }
    return json({ sira: istek.sira, karar }, 200, origin);
  },
};
