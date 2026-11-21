# NEON Hakem — kurulum (Google AI Studio + Cloudflare Worker)

Açık Artırma'nın yapay zekâ hakemi bu Worker üzerinden Gemini'ye bağlanır. API anahtarı yalnızca Cloudflare'da gizli değişken olarak durur: oyunun koduna, depoya ya da sohbete **asla** yazılmaz.

## 1. Google AI Studio'dan API anahtarı

1. https://aistudio.google.com adresine Google hesabınla gir.
2. Sol menüden **Get API key** (API anahtarı al) → **Create API key**. Proje sorarsa yeni bir proje oluşturmasına izin ver.
3. Çıkan anahtarı kopyala ve bir yere not et. Kimseyle paylaşma; sohbete de yapıştırma.
4. Not: Ücretsiz katmanda gönderilen içerik Google tarafından model geliştirmede kullanılabilir. Hakeme yalnızca futbol maddeleri ve fiyatlar gider; oyuncu adı ya da kişisel bilgi gitmez.

## 2. Cloudflare'da Worker

Tarayıcıdan, panelden yapılır; bilgisayara bir şey kurmak gerekmez.

1. https://dash.cloudflare.com adresine gir (hesabın yoksa ücretsiz aç).
2. Sol menü: **Workers & Pages** (bazı hesaplarda **Compute → Workers**) → **Create** → **Create Worker** (ya da "Start with Hello World").
3. Ad olarak `neonxi-hakem` yaz → **Deploy**.
4. **Edit code** → editördeki her şeyi sil → bu dosyanın içeriğini yapıştır:
   https://raw.githubusercontent.com/erenkaynak1/neonx-/main/worker/hakem-worker.js
   (Sayfayı aç, tümünü seç, kopyala.) → sağ üstten **Deploy**.
5. Worker sayfasına dön → **Settings** → **Variables and Secrets** → **Add**:
   - Type: **Secret**, Name: `GEMINI_API_KEY`, Value: 1. adımdaki anahtar → **Save / Deploy**.
   - (İsteğe bağlı) Type: **Text**, Name: `GEMINI_MODEL`, Value: AI Studio'daki model adı (boş bırakılırsa `gemini-2.5-flash`).
6. Worker'ın adresini kopyala: `https://neonxi-hakem.<senin-alt-alanın>.workers.dev`. Bu adres gizli değildir; oyuna bağlamak için bunu ilet.

## 3. Oyuna bağlama

`side-games/acik-artirma/aa-ui.mjs` içindeki `HAKEM_URL` bu adresle doldurulur. Sonra bir maç oynayıp kararın geldiği kontrol edilir.

## Konu listesi değişince

Worker konu listesini içinde taşır (oyuncular serbest metin gönderemesin diye). Konular değişince:

```bash
node scripts/build_hakem_worker.mjs
```

ardından Cloudflare'da **Edit code** → yeni `worker/hakem-worker.js` içeriğini yapıştır → **Deploy**. CI, depodaki dosya güncel değilse uyarır.

## Güvenlik özeti

- Yalnızca `erenkaynak1.github.io` (ve yerel geliştirme) kökeninden gelen istekler kabul edilir.
- Firebase giriş jetonu (misafir girişi dahil) Google'ın açık anahtarlarıyla doğrulanır; giriş yapmamış istek reddedilir.
- Oyuncu başına 10 dakikada en fazla 8 istek (kaba sınır).
- İstek yalnızca konu ve madde kimliklerinden oluşur; metni Worker kurar, kadro kuralları (5'er madde, aynı madde iki tarafta olamaz, bütçe ≤ 20) kontrol edilir.
- Anahtar Gemini'ye istek başlığında gider, adreste görünmez.
