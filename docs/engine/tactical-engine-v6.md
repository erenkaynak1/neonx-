# Draft XI — taktik motoru v6

Bu sürüm mevcut üretim motorunu değiştirir. Oyun sonucunu ayrı bir basitleştirilmiş test motoruyla üretmez. Football Manager'ın kapalı motorunun kopyası değildir; amaç mevcut faz tabanlı simülasyonda kararların tutarlı neden ve sonuçlara sahip olmasıdır.

## Değişen davranış

- Geçiş hücumu, önceki top kaybından doğar. Kazanım bölgesi, geçiş talimatı, koşucular ve rakibin gerideki savunma desteği olasılığı etkiler. Top kaybeden takımın rakibi sonraki hücumu alır; kontra fırsatı yoksa yerleşik hücum kurar.
- Kontra şutundan önce geri koşan savunma ile ilerleyen hücum karşılaştırılır. Erken şut seçimi bu savunma kontrolünü atlayamaz.
- Yüksek pres geriden çıkışı zorlaştırır, fakat yavaş savunmacılarla arkadaki alanı korumak zorlaşır. Presin fiziksel maliyeti mevcut kondisyon sisteminden gelir.
- Şut, orta veya pas kanalını kapatma talimatı hedef aksiyona yardım eder; diğer aksiyonlara karşı küçük bir açıklık yaratır. Kesin iptal veya garantili karşı taktik yoktur.
- Ekstra pasın interception riski korunur; başarılı olduğunda pozisyon kalitesinin getirisi artırılır. Topu güvenceye alma, hücum başına top tutma süresini artırır; hızlı hücum azaltır.
- Oyuncular mevcut oynadıkları mevkiye göre fazlara katılır. Örneğin forvete yerleştirilmiş doğal stoper aynı anda savunma grubunda sayılamaz. Eksik bir mevki grubuna sabit 65 puanlık hayalî oyuncu atanmaz.
- Kırmızı kart, ilgili oyuncunun takım yapısına katkısını kaldırır. Katkı kalan oyunculara ölçeklenerek geri verilmez. Hücum başlangıcı kontrolünde güncel kadro ve yorgunluk kullanılır.
- Özel oyuncu niteliği, genel nitelikle ortalaması alınarak seyreltilmez. Genel değer yalnızca özel değer eksikse kullanılır. Null değer sıfır yetenek olarak yorumlanmaz.
- Faz olasılıkları yumuşak bir lojistik eğriyle değişir. Küçük özellik farklarının doğrusal biçimde üst sınıra çarpması azaltılır.
- Skorda geride kalmak gizli bir güç bonusu sağlamaz. Mevcut kimya eğrisi korunur.
- Canlı maç ve hızlı simülasyon aynı dakika ilerleme fonksiyonunu kullanır. Arayüz beklemeleri aynı başlangıçla üretilen futbol sonuçlarını değiştirmez.
- Kafa şutlarının xG'si kaleci/bitirici performansından ayrılır; pozisyon kalitesi ayrı, gerçekleşen gol olasılığı ayrıdır.

## Doğrulama

```bash
node scripts/test_draft_tactical_balance.cjs
node scripts/test_engine_mechanics.cjs
node scripts/test_tactical_workshop.cjs
python scripts/test_core_patch_contracts.py
python scripts/test_runtime_hygiene.py
MATCHES=60 node scripts/draft-balance-matrix.cjs
```

`draft-engine-lab.cjs`, üretim HTML'indeki gerçek motor fonksiyonlarını yükler. Kadrolar kontrollü sentetik 4-3-3 oyuncularıdır; özellikler 75, kalite karşılaştırmalarında 65/85 olarak kurulur. Gerçek oyuncu havuzunun tamamını veya bütün formasyonları temsil etmez. Görsel DOM işlemleri başsız koşuda devre dışıdır; pas, şut, kart, skor ve oyuncu puanı hesapları üretim kodudur. Native ve VM çalıştırıcılarının aynı seed için aynı sonucu verdiği ayrıca doğrulanır.

Denge serisi her senaryoyu dengeli rakibe karşı 60 seed ile iki tarafta oynatır: senaryo başına 120, toplam 1.080 maç. Bu bir bütün taktikler arası turnuva değildir. Tablodaki sonuçlar bir gerçek lig kalibrasyonu veya hiçbir baskın taktik bulunmadığının kanıtı sayılmaz. Otomatik kontroller güçlü/zayıf kadro sıralamasını, kırmızı kart dezavantajını, erken şut miktar/kalite bedelini, kontrollü pasın topa sahip olmasını ve geçiş sıklığını denetler.

Ham sonuçlar: `tactical-balance-v6.json`.

## Ölçülen sonuçlar

1.080 maç tamamlandı; tüm regresyon kontrolleri geçti. Aşağıdaki değerler senaryo başına 120 maç ortalamasıdır.

| Senaryo | Şut | xG | Rakip xG | Topa sahip olma |
| --- | ---: | ---: | ---: | ---: |
| Dengeli | 7,93 | 1,13 | 1,13 | %50,00 |
| Hücum / yüksek pres / hızlı | 8,20 | 1,17 | 1,42 | %45,84 |
| Savunma / alçak blok / hızlı | 7,89 | 1,16 | 0,91 | %46,01 |
| Kontrollü merkez / ekstra pas | 7,96 | 1,15 | 1,11 | %56,22 |
| Erken şut | 10,18 | 1,25 | 1,13 | %51,82 |
| Kanat / orta | 6,53 | 0,95 | 1,14 | %48,98 |
| Güçlü kadro (85) | 11,70 | 1,75 | 0,72 | %54,01 |
| Zayıf kadro (65) | 5,33 | 0,75 | 1,74 | %46,22 |
| Bir stoper eksik | 6,84 | 0,97 | 1,33 | %48,76 |

Erken şutta şut başına xG 0,143'ten 0,122'ye düştü. Hızlı kontra planı maç başına 6,51 geçiş, kontrollü pas planı 2,64 geçiş üretti. Eşit kalitedeki altı planın dengeli rakibe karşı kazanma oranı %30–40 aralığındaydı. Bu gözlemler yalnızca bu kontrollü örneklem için geçerlidir; bütün kadrolarda taktik üstünlük sırasını belirlemez.

## Sınırlar

Motor hâlâ faz/olay tabanlıdır; her oyuncunun her karedeki fiziksel kararını simüle etmez. Kondisyon bağımsız stamina verisi yerine mevcut pres disiplini ve talimat yükünü kullanır. Çok oyunculu iki gerçek hesap testi ve tarayıcıdan tam maç görsel testi bu değişikliğin başsız testlerinin kapsamında değildir. Taktik dengesini daha ileri doğrulamak için gerçek draft kadroları, farklı formasyonlar ve bütün planlar arası eşleşmeler gerekir.
