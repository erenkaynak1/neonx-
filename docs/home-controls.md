# Ana ekran etkileşim katmanı

Ön plan: `neon-xi-foreground-brown-v6.png` (853 × 1844, şeffaf PNG).
Arka plan: `neon-xi-background-v4.png`; mevcut `blur(2px) saturate(.72) brightness(.86)` korunur.
SVG ve görsel aynı `853 × 1844` koordinat sistemini paylaşır. CSS ekran genişliğine göre ikisini birlikte ölçekler.

| Alan | x, y, genişlik, yükseklik | Davranış |
| --- | --- | --- |
| Profil | 46, 46, 205, 82 | Sosyal profil/giriş |
| Bildirimler | 718, 46, 85, 85 | Davetler; zil üzerinde yeşil SVG vurgusu |
| Hemen başla | 83, 559, 305, 64 | Tek oyunculu |
| Tek oyunculu | 65, 752, 238, 111 | İnsan simgesi vurgusu; mevcut oyun eylemi |
| Bota karşı | 311, 752, 233, 111 | Robot simgesi vurgusu; mevcut oyun eylemi |
| Online | 551, 752, 233, 111 | Küre simgesi vurgusu; mevcut oyun eylemi |
| Turnuva | 65, 874, 719, 90 | Kupa simgesi vurgusu; mevcut turnuva eylemi |
| Tüm quiz oyunları | 638, 1000, 174, 46 | Mevcut yan oyunlar sayfası |
| Futbol XOX | 42, 1058, 379, 272 | Doğrudan oyun bağlantısı |
| Kariyer İkizi | 434, 1058, 380, 272 | Doğrudan oyun bağlantısı |
| Futbol Imposter | 42, 1343, 379, 305 | Doğrudan oyun bağlantısı |
| Football Wordle | 434, 1343, 380, 305 | Doğrudan oyun bağlantısı |
| Ana sayfa | 43, 1659, 182, 118 | Üste kaydırır; ev simgesi yeşil seçili kalır |
| Oyna | 231, 1659, 182, 118 | Draft kartına kaydırır; üçgen yeşil seçili kalır |
| Arkadaşlar | 424, 1659, 194, 118 | Sosyal panel; anlık simge tepkisi |
| Ayarlar | 628, 1659, 179, 118 | Ayarlar paneli; anlık simge tepkisi |

Kutucuk kenarları tek renk `#483A2A` kahverengidir. Basışta 280 ms ışık tepkisi verilir. Alt menü simgeleri ve yazıları SVG ile çizilir; seçili simge/yazı yeşil olur. Modal açan Arkadaşlar/Ayarlar tuşları kalıcı sayfa seçimini değiştirmez. Klavyede Tab, Enter ve Space desteklenir. Kaydırma veya pointercancel basma efektini temizler. Hareketi azalt tercihinde ölçek ve geçiş animasyonları devre dışıdır.

Doğrulama: JS sözdizimi ve diff kontrolü; jsdom üzerinde 16 alan, dokuz eylemin birer kez tetiklenmesi, Oyna renginin basma efekti bittikten sonra korunması, Ana sayfa ile seçim sıfırlama, Enter/Space, beş bağlantı ve iptal/kaydırma temizliği geçti.
