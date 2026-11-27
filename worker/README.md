# NEON Hakem — kurulum (Google AI Studio + Cloudflare Worker)

> **DeepSeek (2026-11-27):** Worker artık DeepSeek ile de çalışır. Cloudflare → `neonxi-hakem` → Settings → Variables and Secrets → **Secret** türünde `DEEPSEEK_API_KEY` tanımlıysa hakem önce DeepSeek'i (`deepseek-chat`, isteğe bağlı `DEEPSEEK_MODEL` ile değişir) kullanır. DeepSeek hata verirse ve `GEMINI_API_KEY` de tanımlıysa Gemini devralır. İkisinden biri yeterlidir. Worker adresini tarayıcıda açınca `"deepseek": true` görünmelidir (anahtarın kendisi asla gösterilmez). Bakiye biterse DeepSeek 402 döner; hata mesajı oyunda "hakem cevap vermedi" olarak görünür.

Açık Artırma'nın yapay zekâ hakemi bu Worker üzerinden Gemini'ye bağlanır. API anahtarı yalnızca Cloudflare'da gizli değişken olarak durur: oyunun koduna, depoya ya da sohbete **asla** yazılmaz.

## 1. Google AI Studio'dan API anahtarı

1. https://aistudio.google.com adresine Google hesabınla gir.
2. Sol menüden **Get API key** (API anahtarı al) → **Create API key**. Proje sorarsa yeni bir proje oluşturmasına izin ver.
3. Çıkan anahtarı kopyala ve bir yere not et. Kimseyle paylaşma; sohbete de yapıştırma.
4. Not: Ücretsiz katmanda gönderilen içerik Google tarafından model geliştirmede kullanılabilir. Hakeme yalnızca futbol maddeleri ve fiyatlar gider; oyuncu adı ya da kişisel bilgi gitmez.

## 2. Cloudflare'da Worker

### Yol A — GitHub bağlantısıyla (önerilen: konu listesi değişince kendisi güncellenir)

1. **Workers & Pages** → **Create application** → GitHub ile **Import a repository** → `erenkaynak1/neonx-` deposunu seç.
2. Ayar ekranında:
   - **Project name**: `neonxi-hakem` (`worker/wrangler.jsonc` içindeki adla aynı olmalı)
   - **Path / Root directory**: `worker`
   - **Build command**: boş bırak
   - **Deploy command**: `npx wrangler deploy`
   - **Enable Preview builds**: kapat (her dalda ayrı önizleme kurmasın)
3. **Deploy**. Bittikten sonra aşağıdaki 5. adımla anahtarı ekle.

### Yol B — Elle yapıştırarak

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

`side-games/acik-artirma/aa-ui.mjs` içindeki `HAKEM_URL` bu adresle doldurulur (bağlandı: `https://neonxi-hakem.erenkynk50.workers.dev`). Worker GitHub'a bağlı: main'e her gönderimde Cloudflare kendisi yeniden kurar.

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
