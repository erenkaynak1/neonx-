// Açık Artırma hakem Worker testi (çevrimdışı): jeton doğrulama, köken, kadro doğrulama, hız sınırı, Gemini isteği.
// Google'ın anahtar uç noktası ve Gemini sahte fetch ile taklit edilir; gerçek ağ kullanılmaz.
import assert from 'node:assert/strict';
import { webcrypto as crypto } from 'node:crypto';
import { KONULAR } from '../side-games/acik-artirma/konular.mjs';
import { hakemCevabi } from '../side-games/acik-artirma/hakem.mjs';

const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function jeton(claims) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ aud: 'neonxi', iss: 'https://securetoken.google.com/neonxi', sub: 'u1', iat: now, exp: now + 3600, ...claims }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(h + '.' + p));
  return `${h}.${p}.${b64u(sig)}`;
}

let geminiIstek = null;
const kararlar = [];
const modelIstekleri = [];
let model404 = false;
let model503 = false;
globalThis.fetch = async (url, opt) => {
  url = String(url);
  if (url.includes('securetoken@system.gserviceaccount.com')) return new Response(JSON.stringify({ keys: [jwk] }));
  if (url.includes('generativelanguage.googleapis.com') && url.includes('/models?')) {
    // ListModels: the Worker picks the newest non-lite, non-preview flash model.
    return new Response(JSON.stringify({ models: [
      { name: 'models/gemini-2.0-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.1-flash-preview', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
      { name: 'models/gemini-3-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
    ] }));
  }
  if (url.includes('generativelanguage.googleapis.com')) {
    modelIstekleri.push(url);
    if (model503 && url.includes('gemini-3-flash:')) return new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 });
    if (model404 && url.includes('gemini-3-flash:')) return new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 404 });
    geminiIstek = { url, opt, body: JSON.parse(opt.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(kararlar.shift()) }] } }] }));
  }
  throw new Error('beklenmeyen ağ isteği: ' + url);
};
const { default: worker } = await import('../worker/hakem-worker.js');
const env = { GEMINI_API_KEY: 'test-key' };
const ORIGIN = 'https://erenkaynak1.github.io';
const istek = (body, { token, origin = ORIGIN, method = 'POST' } = {}) => worker.fetch(new Request('https://hakem.example/', {
  method, headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined,
}), env);

const konu = KONULAR.find((k) => k.id === 'fb-kadrolar');
const taraflar = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]].map((ix, t) => ix.map((i, j) => ({ id: konu.maddeler[i].id, fiyat: t ? [1, 7, 4, 5, 1][j] : [5, 2, 3, 4, 6][j] })));
const iyiJeton = await jeton({});

assert.equal((await istek(null, { method: 'OPTIONS' })).status, 204);
assert.equal((await istek({ konu: konu.id, taraflar }, { token: iyiJeton, origin: 'https://kotu.example' })).status, 403, 'yabancı köken reddedilir');
assert.equal((await istek({ konu: konu.id, taraflar })).status, 401, 'jetonsuz istek reddedilir');
assert.equal((await istek({ konu: konu.id, taraflar }, { token: await jeton({ aud: 'baska-proje' }) })).status, 401, 'başka projenin jetonu reddedilir');
assert.equal((await istek({ konu: konu.id, taraflar }, { token: await jeton({ exp: 1 }) })).status, 401, 'süresi dolmuş jeton reddedilir');
assert.equal((await istek({ konu: konu.id, taraflar }, { token: iyiJeton.slice(0, -4) + 'AAAA' })).status, 401, 'imzası bozuk jeton reddedilir');

const t2 = await jeton({ sub: 'u2' });
assert.equal((await istek({ konu: 'yok', taraflar }, { token: t2 })).status, 400, 'bilinmeyen konu');
assert.equal((await istek({ konu: konu.id, taraflar: [taraflar[0], taraflar[0]] }, { token: t2 })).status, 400, 'aynı madde iki tarafta olamaz');
assert.equal((await istek({ konu: konu.id, taraflar: [taraflar[0].map((x) => ({ ...x, fiyat: 9 })), taraflar[1]] }, { token: t2 })).status, 400, 'bütçe aşılamaz');
assert.equal((await istek({ konu: konu.id, taraflar: [[...taraflar[0].slice(0, 4), { id: 'uydurma', fiyat: 1 }], taraflar[1]] }, { token: t2 })).status, 400, 'listede olmayan madde');

const tumAdlar = taraflar.flat().map((x) => konu.maddeler.find((m) => m.id === x.id).ad);
kararlar.push({ kazanan: 'Taraf 2', ozet: 'Bu iş bitti.', maddeler: tumAdlar.map((ad) => ({ madde: ad, taraf: 'Taraf 1', yorum: 'iyi' })), soygun: { madde: tumAdlar[5], neden: '1 paraya' }, hata: { madde: tumAdlar[6], neden: '7 para' } });
const r = await istek({ konu: konu.id, taraflar }, { token: await jeton({ sub: 'u3' }) });
assert.equal(r.status, 200);
assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
const cevap = await r.json();
assert.ok(geminiIstek.url.endsWith('/models/gemini-3-flash:generateContent'), 'en yeni kararlı flash model seçilir');
assert.deepEqual(geminiIstek.body.generationConfig.thinkingConfig, { thinkingLevel: 'minimal' }, 'düşünme en aza indirilir (hız)');
assert.equal(geminiIstek.opt.headers['x-goog-api-key'], 'test-key', 'anahtar başlıkta gider, adreste değil');
assert.ok(!geminiIstek.url.includes('test-key'));
assert.equal(geminiIstek.body.generationConfig.responseMimeType, 'application/json');
assert.ok(geminiIstek.body.systemInstruction.parts[0].text.includes('NEON Hakem'));
assert.ok(geminiIstek.body.contents[0].parts[0].text.startsWith(`KONU: ${konu.baslik}`));
// Oyun tarafı aynı doğrulamayla kararı oyunculara eşler.
const oyunTaraflari = taraflar.map((t) => ({ maddeler: t.map((x) => ({ ...konu.maddeler.find((m) => m.id === x.id), fiyat: x.fiyat })) }));
const k = hakemCevabi(cevap.karar, { sira: cevap.sira }, oyunTaraflari);
assert.ok(k && k.kazanan === cevap.sira[1], '"Taraf 2" rastgele sıraya göre doğru oyuncuya eşlenir');

// Hız sınırı: aynı oyuncu 10 dakikada en fazla 8 istek.
const t4 = await jeton({ sub: 'u4' });
const durumlar = [];
for (let i = 0; i < 10; i++) { kararlar.push(kararlar[0] || {}); durumlar.push((await istek({ konu: konu.id, taraflar }, { token: t4 })).status); }
assert.equal(durumlar.filter((s) => s === 429).length, 2, 'hız sınırı');

assert.equal((await worker.fetch(new Request('https://h/', { method: 'POST', headers: { origin: ORIGIN } }), {})).status, 503, 'anahtar yoksa hakem kapalı');

// Durum sayfası: anahtarın varlığını söyler, kendisini asla göstermez.
const durum = await (await worker.fetch(new Request('https://h/', { method: 'GET' }), env)).json();
assert.deepEqual(durum, { hakem: 'NEON Hakem', anahtar: true, model: 'gemini-3-flash', modeller: ['gemini-3-flash', 'gemini-3.1-flash-preview', 'gemini-2.0-flash-lite'] });
assert.equal((await (await worker.fetch(new Request('https://h/', { method: 'GET' }), {})).json()).anahtar, false);
assert.ok(!JSON.stringify(durum).includes('test-key'));

// Model emekliye ayrıldıysa (404) sıradaki model denenir.
model404 = true; modelIstekleri.length = 0;
kararlar.push({ kazanan: 'Taraf 1', ozet: 'x', maddeler: [], soygun: { madde: 'a', neden: 'b' }, hata: { madde: 'a', neden: 'b' } });
const r404 = await istek({ konu: konu.id, taraflar }, { token: await jeton({ sub: 'u5' }) });
assert.equal(r404.status, 200);
const uretim = modelIstekleri.filter((u) => u.includes(':generateContent'));
assert.ok(uretim[0].includes('gemini-3-flash:') && uretim[1].includes('gemini-2.0-flash-lite:'), 'kaldırılan modelden sonra sıradaki (lite) denenir');

// Model yoğunsa (503) vazgeçilmez, sıradaki model denenir.
model404 = false; model503 = true; modelIstekleri.length = 0;
kararlar.push({ kazanan: 'Taraf 1', ozet: 'x', maddeler: [], soygun: { madde: 'a', neden: 'b' }, hata: { madde: 'a', neden: 'b' } });
const r503 = await istek({ konu: konu.id, taraflar }, { token: await jeton({ sub: 'u7' }) });
assert.equal(r503.status, 200, 'yoğun modelden sonra başka model cevap verir');
const uretim503 = modelIstekleri.filter((u) => u.includes(':generateContent'));
assert.ok(uretim503[0].includes('gemini-3-flash:') && uretim503.length >= 2, 'yoğunlukta sıradaki model');
model503 = false;

// Gemini hatası: kod ve kısa açıklama döner (teşhis için).
globalThis.fetch = async (url) => String(url).includes('securetoken') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
const rHata = await istek({ konu: konu.id, taraflar }, { token: await jeton({ sub: 'u6' }) });
assert.equal(rHata.status, 502);
assert.deepEqual(await rHata.json(), { hata: 'hakem cevap vermedi', durum: 400, detay: 'API key not valid' });
console.log('hakem worker ✓');
