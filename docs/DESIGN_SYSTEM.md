# NEON XI — Interface System v2

Durum: yürürlükte · 11 Kasım 2026
Kapsam: ana ekran, ortak alt navigasyon, sosyal çekmece/panel, bildirimler, quiz merkezi,
bağlı ekranlar (bota karşı, çok oyunculu seçim, oda kodu, lobi, turnuva çubuğu, ayarlar).
Oyun motoru, kimya, taktik simülasyon, eşleştirme, kimlik doğrulama ve veri yapıları bu çalışmada **değiştirilmedi**.

## Yön

"Maç gecesi": koyu grafit zemin, arkada bulanık ve karartılmış şehir, önde gerçek görsel
varlıklar ve net tipografi. Neon, yüzeyleri çerçevelemek için değil **yalnızca eylemi ve aktif
durumu göstermek** için kullanılır. Sürekli parlama, neon çerçeve ve renkli gradyan yoktur.

## Token'lar (`side-games/neon-arcade-ui-v1.css`)

| Rol | Token | Değer |
| --- | --- | --- |
| Birincil eylem, aktif durum | `--nxu-action` → `--neon-primary` | `#BAFF18` |
| Eylem hover | `--nxu-action-hover` → `--neon-lime` | `#DCFF72` |
| Başarı, çevrimiçi, hazır | `--nxu-success` → `--neon-positive` | `#31FF76` |
| İkincil bilgi, etiket, ikon | `--nxu-info` → `--neon-frame` | `#9ADFFF` |
| LED / camgöbeği (görsellerde) | `--neon-led`, `--neon-cyan` | `#3DCFFF`, `#00EAFF` |
| Zemin | `--nxu-black`, `--nxu-ink` | `#050708`, `#0A0D10` |
| Yüzeyler | `--nxu-surface-1/2/3` | `#10151A`, `#171D23`, `#212931` |
| Metin | `--nxu-text`, `-2`, `-3` | `#F3F6F8`, `#AAB6C0`, `#75828D` |
| Yıkıcı onay (yalnızca işlevsel) | `--nxu-danger` | `#FF7A8A` |

Kurallar:
- Lime dolgu yalnızca bir ekrandaki birincil eylemde (HEMEN BAŞLA, OYNA, KABUL, OYUNU BAŞLAT).
- Rozetler lime zemin + koyu metin. Palet dışı vurgu rengi eklenmez; `--nxu-danger` yalnızca
  "arkadaşlıktan çıkar / lobiden çıkar" onayında metin rengi olarak kullanılır.
- Kenarlık yerine ton farkı: yüzeyler `surface-1 → 3`, ayırıcılar `--nxu-line` (1px, %8 beyaz).

## Tipografi

- Başlık / etiket: **Barlow Condensed** 600–800 (ekran başlıkları 800 italik).
- Gövde: **Barlow** 500–600.
- Dosyalar depo içinde: `assets/ui/fonts/*.woff` (Latin + Türkçe alt küme, SIL OFL 1.1 —
  `assets/ui/fonts/OFL.txt`). Ana ekran için dış font isteği yoktur.
- En küçük metin 11px (yalnızca büyük harfli etiketlerde), gövde 13–15px.

## Ölçü ve biçim

- 4px ızgara: 4 · 8 · 12 · 16 · 20 · 24 · 32. Sayfa kenar boşluğu 16px.
- Köşe: 4 (rozet), 8 (buton, karo, satır), 12 (hero, panel).
- Kesik köşe (`--nxu-cut`) yalnızca birincil eylemlerde kullanılan imzadır.
- Dokunma hedefi en az 44×44px.

## Hareket

- 120ms (basış), 220ms (panel/rozet), 420ms (ilk giriş, kademeli).
- Moda girerken 260ms lime yıkama, sonra geçiş. Bildirim geldiğinde zil bir kez sallanır.
- `prefers-reduced-motion` ve Ayarlar › "Azaltılmış efekt modu" tüm animasyonları kapatır.

## Görsel varlıklar (`assets/ui/`)

Hepsi depodaki onaylı NEON XI görsellerinden kesilip tek bir renk reçetesiyle derecelendirildi
(`python scripts/build_home_assets.py`). Stok görsel yoktur.

| Dosya | Boyut | Kaynak |
| --- | --- | --- |
| `bg-city.webp` | 720×1556 | `neon-xi-background-v4.png` — bulanık, karartılmış |
| `hero-draft.webp` | 941×538 | `assets/entry/first-login-v1.png` — 10 numara, stadyum |
| `thumb-xox/twin/imposter/wordle.webp` | 704×396 | `neon-xi-foreground-ice-v5.png` kart görselleri |
| `thumb-en11.webp`, `thumb-reverse.webp` | 704×396 | `xox-stadium-approved-v3.webp` üzerine kompozisyon |
| `logo-neon-xi.webp` | 640×141 | `assets/neon-xi-logo-outline.png` (kimlik değişmedi) |

Imposter görseli palet dışı mordan camgöbeğine çevrildi. EN 11 ve RE:VERSE için özgün
illüstrasyon yoktu; mevcut stadyum görselinden üretilen kompozisyonlar aynı ad ve boyutta
yeni çizimlerle doğrudan değiştirilebilir.

## SVG ve görsel ayrımı

- SVG: 24px çizgi ikonlar (`NEON_ARCADE_UI.icons`), tek stil, 1.75 çizgi.
- Görsel: hero, oyun karoları, arka plan, logo.
- Metin ve butonlar her zaman canlı HTML'dir; hiçbir ekran görüntüsü üzerine "hotspot" konmaz.

## Bağlı ekranlar (`side-games/neon-screens-v2.css`)

Ana ekrandan bir dokunuş uzaktaki ekranlar çekirdek dosyadaki işaretlemeye dokunulmadan,
yalnızca `html.nx-home-v2` kapsamındaki stil ile aynı sisteme bağlanır:

- Zemin: ana ekranla aynı şehir görseli, daha koyu. Eski "KADRO" yazısı yerine NEON XI logosu.
- Seçim satırları (zorluk, çok oyunculu): çerçeve yerine `surface-1` ton farkı, sağda ok,
  hover'da solda 3px lime çizgi. Zorluk etiketi: kolay `--nxu-success`, orta `--nxu-info`, zor `--nxu-action`.
- Ekran başına tek dolu lime buton (ODA OLUŞTUR, ODAYA KATIL, TAMAM); diğerleri çizgili, sessiz.
- Ayarlar: kart içinde kart yok; bölümler ince ayırıcıyla ayrılır, anahtarlar lime dolgu.
- Turnuva merkezi gömülü bir belgedir; `neon-home-v2.js` yüklenince ona yalnızca renk ve yazı
  token'larını verir (düzen, mantık ve mesajlaşma aynı kalır).
- Bildirim balonları ana ekranda üst çubuğun altında (mobil) veya sağ altta (≥600px) durur;
  profil, zil ve ayarlar her zaman erişilebilir kalır.

## Henüz eski görünümde kalanlar

Bu ekranlar çalışır durumda ve bilinçli olarak dokunulmadı; aynı token'larla sırayla taşınabilir:
ilk giriş karşılama görseli (`neon-entry-v1`), Draft XI kadro/taktik/maç ekranları, turnuva
merkezinin iç düzeni, quiz oyunlarının oyun içi ekranları, `how-to-play.html`.
