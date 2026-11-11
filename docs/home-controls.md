# Ana ekran v2 — kontroller ve bağlantılar

Dosyalar: `side-games/neon-home-v2.js`, `side-games/neon-home-v2.css`.
Ortak parçalar (token, font, alt navigasyon, ikonlar): `side-games/neon-arcade-ui-v1.css/.js`.
Tasarım kuralları: `docs/DESIGN_SYSTEM.md`.

Ana ekran artık tek parça bir görsel + SVG "hotspot" haritası değildir; canlı HTML/CSS'tir.
Eski ana ekran işaretlemesi silinmez: `.nx-approved-legacy` içinde gizli ve `inert` tutulur,
yeni kontroller aynı düğmeleri tetikler. Böylece oyun akışları değişmeden çalışır.

## Yerleşim (mobil, yukarıdan aşağı)

1. Üst çubuk: profil (sol) · bildirim zili + ayarlar (sağ)
2. Logo
3. Aktif parti göstergesi (yalnızca partideyken)
4. Draft XI hero + 4 mod (Tek oyunculu · Bota karşı · Online · Turnuva)
5. Quiz oyunları: 6 görsel karo (2 sütun) + "Tümü"
6. Nasıl oynanır · Şikayet ve öneri
7. Sabit alt navigasyon: Ana sayfa · Sosyal · **Oyna** · Lobi · Liderlik

Tablet (≥600px): 3 sütun karo. Masaüstü (≥900px): solda hero, sağda quiz rafı, altta yüzen navigasyon.

## Eylem tablosu

| Kontrol | `data-action` | Tetiklenen mevcut işlev |
| --- | --- | --- |
| Hemen başla, Tek oyunculu | `single` | `#singleModeBtn` |
| Bota karşı | `bot` | `#botModeBtn` |
| Online | `online` | `NEON_ARCADE_UI.openChoice('draft')` (yedek: `#onlineModeBtn`) |
| Turnuva | `tournament` | `.neonHomeQuickRow button` → `NEON_MENU.openTournament` |
| Ayarlar | `settings` | `[data-open-neon-settings]`; `?nxOpenSettings=1` derin bağlantısı korunur |
| Profil | `profile` | Giriş yoksa giriş paneli; varsa hesap kartı (çıkış, Google'a bağla) |
| Bildirimler | `notifications` | `NEON_SOCIAL.open('invites')` → çekmece › Davetler |
| Sosyal | `friends` | `NEON_SOCIAL.open('friends')` → çekmece › Arkadaşlar |
| Lobi, Aktif parti göstergesi | `lobby` | `NEON_SOCIAL.open('party')` → çekmece › Lobi |
| Oyna | `play` | `NEON_SOCIAL.open('play')` → eşleşme paneli |
| Liderlik | `leaderboard` | `NEON_SOCIAL.open('leaderboard')` |
| Ana sayfa | `home` | En üste kaydırır |
| Quiz karoları | — | `./side-games/...` bağlantıları |

## Canlı durum (yalnızca okunur)

- İsim/avatar: `NEON_SOCIAL.profile.username`
- Rozet (Sosyal düğmesi + zil): sosyal çekirdeğin `.nx-social-launch[data-count]` değeri
  (arkadaşlık istekleri + parti davetleri). `MutationObserver` ile izlenir, yoklama yoktur.
- Aktif parti: `NEON_SOCIAL.party` → üye sayısı ve lider adı.

## Sosyal çekmece

- Sekmeler: **Arkadaşlar · Davetler** (iki ana bölüm) + kompakt **Lobi**.
- Arkadaş menüsü (•••) yalnızca: PARTİYE DAVET ET · ARKADAŞLIKTAN ÇIKAR.
- Gelen parti daveti: bildirim (toast) + rozet; "GÖR" Davetler bölümünü açar; KABUL / RED orada kalır.

## Uyumluluk kancaları (değiştirmeyin)

`#bootHome.nx-approved-home-v1`, `.nx-home.nx-approved-canvas` (çekmecenin bağlandığı yer),
`.nx-home-map`, `.nx-hotspot[data-action="friends"]`, `[data-action="online"]`,
`[data-action="settings"]`, `.nx-approved-status`.

## Doğrulama

`node scripts/test_home_v2.cjs` ve `node scripts/test_arcade_navigation.cjs` (çevrimdışı sözleşme testleri).
