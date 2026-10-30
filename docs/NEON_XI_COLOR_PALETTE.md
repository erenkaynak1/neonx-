# NEON XI — Ana Renk Paleti

Durum: Resmî tasarım referansı  
Güncelleme: 29 Eylül 2026

Bu dosya, NEON XI ana ekranı, Draft XI, sosyal ekranlar, maç arayüzleri ve yan oyunlardaki yeni UI/CSS/SVG tasarımları için temel renk kaynağıdır. Eski renk varyasyonları bu paletin yerine geçmez. Mevcut çalışan ekranlar, ayrı bir uygulama değişikliği yapılmadan otomatik olarak yeniden renklendirilmiş sayılmaz.

| Renk | HEX | Kullanım |
| --- | --- | --- |
| Ana neon yeşil | `#BAFF18` | Draft, butonlar, aktif durum |
| Parlak lime | `#DCFF72` | Vurgu ve parlama |
| Neon yeşil | `#31FF76` | Pozitif aksiyonlar |
| Buz mavisi | `#9ADFFF` | Ana ekran çerçeveleri |
| Elektrik mavisi | `#3DCFFF` | LED ışık ve glow |
| Neon camgöbeği | `#00EAFF` | İkincil vurgu |

## Tasarım token'ları

```css
:root {
  --neon-primary: #BAFF18;
  --neon-lime: #DCFF72;
  --neon-positive: #31FF76;
  --neon-frame: #9ADFFF;
  --neon-led: #3DCFFF;
  --neon-cyan: #00EAFF;
}
```

## Uygulama ilkesi

- Birincil etkileşimlerde `--neon-primary`; pozitif onay/başarı durumlarında `--neon-positive` kullan.
- Ana ekran çerçevelerinde `--neon-frame`, LED ışık ve glow efektlerinde `--neon-led`, ikincil vurguda `--neon-cyan` kullan.
- `--neon-lime` vurgu ve parlama içindir; tüm panelleri eşzamanlı farklı renklerle aydınlatma.
- Okunabilirlik için parlak renkli butonlarda koyu yazı/ikon ve karanlık zeminde gerektiğinde kontrollü glow kullan.
- Bu token'lar yeni tasarımlar için referanstır; mevcut çalışan arayüzün bileşenleri test edilmeden toplu şekilde değiştirilmemelidir.
