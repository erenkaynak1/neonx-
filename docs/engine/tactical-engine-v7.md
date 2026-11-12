# Draft XI — taktik motoru v7 (tutarlılık)

v6'nın üzerine eklenir. Amaç: oyuncu nitelikleri, roller ve taktik birbirine bağlı olsun. Bir taktik, ona uygun oyunculara sahip takımı güçlendirsin, uygun olmayanı zorlasın.

## Değişenler
- **Plan uyumu (`v7PlanFit`/`v7PlanFactor`).** Her taktik bonusu, o taktiği uygulayacak oyuncuların ilgili niteliklerine göre ölçeklenir. 75 nötrdür (çarpan 1). Yüksek değer bonusu büyütür (en fazla ×1,8). Düşük değer bonusu yok eder ya da cezaya çevirir (en az ×−0,4).
  - Önde Baskı: hücum hattı ve orta sahanın pres disiplini, hızı, dayanıklılığı ve takım oyunu.
  - Alçak Blok: savunma ve orta sahanın pozisyon alma, savunma, takım oyunu ve güç nitelikleri.
  - Hızlı Hücum: hücumcu ve beklerin hızı, top sürme ve karar verme nitelikleri. Geçiş olasılığı da buna bağlıdır.
  - Topu Güvenceye Al: stoper ve orta sahanın kısa pas, soğukkanlılık, karar verme ve vizyon nitelikleri. Topa sahip olma payı da buna bağlıdır.
  - Kanatları Kullan, Merkezden Oyna, Ortaları Artır, Ceza Sahasına Pasla Gir, Kaleyi Görünce Vur: ilgili oyuncuların niteliklerine göre ±.
- **Analizdeki taktik uyumu artık maçı etkiler.** `teamStructure().tacticalFit` faz ayarına eklenir: `(tacticalFit-94)*0.25`. Rol dağılımına uymayan taktik (örneğin kanat oyuncusu yokken "Kanatları Kullan") gerçek bir bedel öder.
- **Kimya tavanı %25'ten %8'e indi.** Motor (`CHEM_MAX_BOOST`) ve draft ekranındaki gösterim (`boostFromChem`) aynı değeri kullanır.
- **Rol ve mevki etkisi büyüdü.** `roleExecution` 0,82–1,10 aralığında. Mevki dışı aşinalık 0,84. Draft ekranındaki mevki kademesi (`positionFitMultiplier`: 1 / 0,95 / 0,90) artık maç niteliklerine de uygulanır (`v7PositionFit`).

## Doğrulama
```bash
node scripts/test_tactical_coherence.cjs      # yeni: plan/nitelik tutarlılığı
MATCHES=40 node scripts/tactical-coherence-lab.cjs
MATCHES=60 node scripts/draft-balance-matrix.cjs
```

Tutarlılık laboratuvarı (40 seed × iki taraf; atletik kadro: hız/dayanıklılık/pres 86, pas 62–66; teknik kadro: pas/vizyon/soğukkanlılık 86, hız 62):

| Ölçüm | v6 | v7 |
| --- | ---: | ---: |
| Atletik kadronun preste, top tutmaya göre xG farkı kazancı | +0,06 | +0,10 |
| Teknik kadronun top tutmada, prese göre xG farkı kazancı | +0,21 | +0,51 |
| Atletik kadro: pres ile gol farkı / top tutma ile gol farkı | −0,05 / −0,43 | +0,08 / −0,48 |
| Teknik kadro: top tutma ile gol farkı / pres ile gol farkı | +0,21 / −0,08 | +0,50 / −0,10 |

Tüm nitelikleri eşit (75) sentetik kadrolarda v6 denge tablosu korunur (1.080 maç; güçlü kadro kazanma oranı %76, zayıf %7, tüm regresyon kontrolleri geçti). Çünkü nötr kadroda plan çarpanı 1'dir.

## Sınırlar
Faz motorunun temel ağırlıkları hâlâ teknik niteliklere (pas, karar) daha fazla değer veriyor. Bu yüzden atletik kadrolar genel olarak teknik kadrolardan biraz geride. Bu bilinçli bir tercih, ileride yeniden ayarlanabilir.

## Maç görseli (v7)
- **Işınlanma kaldırıldı.** `match-2d-compositor-v2.js`, yavaş bir kare (>100 ms) geldiğinde ya da kaynak güncellemesi 180 ms'yi geçtiğinde bütün oyuncuları yeni konuma ışınlıyordu. Artık yalnızca gerçek sahne sıfırlamasında (büyük sıçrama, ekran boyutu değişimi) anlık geçiş yapılıyor.
- **Çift yumuşatma kaldırıldı.** Maç katmanı her oyuncuyu zaten yumuşatıyordu (smooth-damp). Compositor'daki ikinci yay sistemi gecikme ve taşma ekliyordu. Compositor artık yumuşatılmış konumu doğrudan çiziyor.
- **Animasyonlu oyuncu figürleri (`match-players-v7.js`).** Sabit SVG resmi yerine satır içi SVG kullanılıyor: koşu ve tempolu koşu adımı, kol sallama, gövde salınımı, sağa/sola dönük profil, arkadan bakışta forma numarası ve oyuncuya göre ten rengi çeşitliliği. Hareket durumu (`data-gait`, `data-face`) compositor'da hıza göre belirleniyor. Düşük FPS'te kol animasyonu kapanıyor.
- Başsız tarayıcıda 10 saniyelik ölçüm: oyuncu-kare başına ışınlanma 1000'de 6,97'den 0'a düştü. %99'luk hız sıçraması 690'dan 232 px/s'ye indi.
