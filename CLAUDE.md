# NEON XI — çalışma kuralları

## Yan oyunlar: giriş ekranı her zaman standart menü

Her yan oyunun (mevcut ya da yeni eklenecek) oyuna tıklanınca açılan ilk ekranı, diğer oyunlarla aynı ortak menüdür. Kullanıcı bunu tekrar hatırlatmak zorunda kalmamalı; yeni oyun eklerken baştan böyle yapılır.

- Stil: `side-games/sidegame-skin-v2.css` içindeki `.sgm` menüsü (`body.sg-skin`). Kendi menü tasarımı yapılmaz.
- Yapı (`sgmFrame`): sol üstte NEON XI logosu + "YAN OYUNLAR" geri bağlantısı, oyun adı (`.sgm-hero h1`, ikinci kelime `<span>` ile lime), kısa açıklama, sağ üstte oyunun amblemi.
- Amblem: `side-games/assets/<oyun>-emblem-v1.svg`, 720×640, diğer amblemlerle aynı aile (metal sekizgen kalkan, lime kenar, yan kanatlar, içinde oyunun simgesi).
- "OYUN MODUNU SEÇ" listesi (`.sgm-mode`): TEK TELEFON · ARKADAŞLARINLA OYNA · RAKİP ARA (hazır olmayan mod `disabled` + YAKINDA). Altında "NASIL OYNANIR?" kartı (`.sgm-how`).
- Mod seçilince açılan ayar ekranı `.sgm-panel` + `.sgm-sheet` (alanlar `.sgm-field`, ana tuş `.sgm-btn.primary`, geri `.sgm-back`).
- Örnek uygulamalar: `side-games/en11/index.html` (`renderMenu`), `side-games/acik-artirma/aa-ui.mjs` (`menu`).
- Oyunun kendi ekranları (maç, sonuç) kendi stilini kullanabilir; `sg-skin` sınıfı yalnızca menü açıkken gövdeye eklenirse oyun ekranlarının yazı tipi ve zemini etkilenmez (Açık Artırma böyle yapıyor).
- Ortak yükleme ekranı: sayfanın başında `../sidegame-loader-v1.js` (`.sgm .sgm-mode` hazır seçicisi zaten listede).
- Ana menü kartı: `assets/ui/thumb-<oyun>.webp`, 704×396; `side-games/neon-home-v2.js` (GAMES) ve `side-games/index.html` listesine eklenir, `scripts/test_home_v2.cjs` oyun sayısı güncellenir.
