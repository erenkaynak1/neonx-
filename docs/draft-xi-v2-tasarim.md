# Draft XI v2 — Tasarım Belgesi

> Durum: **taslak, birlikte okunacak.** Kod yazılmadı. Bu belge onaylanınca önce matematik (katsayılar), sonra kod.
> Kaynak: kullanıcıyla yapılan soru–cevap oturumu (2026-11-17). Her karar burada yazılı olandır; değişiklik önce bu belgede yapılır.
> Revizyon 2 (2026-11-17): dış değerlendirmedeki kabul edilen maddeler eklendi. Oyuncu hareketi ve konumlandırma (bölüm 4.5), üç katmanlı savunma (4.6), aksiyona özel rastgelelik (4.3), maç saati (4.7), geometrik ofsayt (5.6), şut isabeti ile kalitesinin ayrımı (5.5), taktik etkileşimleri (6.4), kimyanın 99 üstüne çıkabilmesi (7) ve genişletilmiş laboratuvar (10) eklendi.

## 0. Oyunun özü

Güçlü kadro kur, taktikle harmanla, futbol bilginle (kimya) güçlendir. **Hiçbiri tek başına kazandırmaz.**

İlkeler:

1. **"İyi / kötü" yok, matematik var.** Her oyuncunun sayısal yetenekleri vardır. Sahadaki her an iki yetenek (veya bir yetenek ve bir zorluk) arasındaki farkın olasılığıyla, sonra zarla çözülür.
2. **Sonuç aşağıdan yukarı doğar.** Kazanma oranı hedefi konmaz. Maçın sonucu tek tek anların toplamıdır. Bir zincir en zayıf halkası kadar güçlüdür: kafa vuruşu 99 olan forvet, ortası zayıf kanatçıdan top alamaz.
3. **Her seçimin sonucu var.** Ölçülebilir etkisi olmayan ayar oyunda kalmaz.
4. **Meta yok.** Bir taktik her şeye karşı kazanıyorsa sayılar kırpılmaz; gerçek futbolda ona karşı işe yarayan şey bulunur ve mantığa eklenir.
5. **Her şey izlenebilir.** "Neden kazandım / kaybettim" sorusunun cevabı sayılarla gösterilebilir (maç sonu taktik karşılaştırması).
6. **Gizli değişken yok.** Motordaki her değişken bir yetenekten, bir taktik ayarından ya da sahadaki ölçülebilir bir durumdan (mesafe, açı, baskı, oyuncu sayısı) gelir. Hiçbir yeteneğe veya taktiğe bağlı olmayan bir sayı eklenmez.
7. **Ölçülemeyen ayrıntı eklenmez.** Her yeni sistem için iki soru sorulur: hangi yeteneği veya taktiği anlamlı kılıyor? Laboratuvarda etkisi ölçülebiliyor mu?

## 1. Kararlar özeti

| Konu | Karar |
|---|---|
| Modlar | Bota karşı, aynı telefonda 2 kişi, online 1v1, parti turnuvası |
| Maç akışı | Atak atak (topa sahip olma zincirleri); gerçek zamanda 2–3 dk |
| Karar verme | Taktik ~%70 + yetenek tercihi ~%30; vizyon karar kalitesini belirler |
| Rastgelelik | Gerçek futbol kadar; maç günü formu yok |
| Saha | Bölge ızgarası; mücadeleye topa en yakın savunmacı girer |
| Taktik değişikliği | Maç içinde yok |
| Skor durumu | Kararları etkilemez |
| Yorgunluk, sakatlık, ev sahibi | Yok |
| Ofsayt | Var; hat yüksekliği + hız + pozisyon alma |
| İkinci toplar | Var |
| Duran top | Ayrı zincirler; kullanıcılar otomatik |
| Faul / kart | Kaybedilen mücadeleden doğar; kırmızıda otomatik yeniden yerleşim |
| Eleme beraberliği | Direkt penaltılar |
| Kadro | 11 kişi, yedek yok |
| Havuz | 1000–1500 aktif oyuncu |
| Yetenekler | Saha oyuncusu 14, kaleci 4; ölçek 1–99; hepsi görünür; genel güç (OVR) yok |
| Roller | Yok |
| Mevki | Oyuncu sadece kendi mevkilerinde oynar (şimdiki kural) |
| Kimya | Şimdiki sistem; tüm yeteneklere katkı; yetenek kimyayla 99'u aşabilir |
| Dizilişler | 17 (4'lü, 3'lü, 5'li savunmalar) |
| Taktik ayarları | 5 hücum + 4 savunma; bireysel talimat yok; şablon yok |
| Taktik ekranı | Sadece sayısal veri, yorum yok |
| Draft akışı ve kadro ekranı | Şimdiki gibi |
| Bot | Zorluğa göre planlı draft + counter taktik; senin taktiğini görmez |
| Aynı telefon | Taktikler perdeyle sırayla |
| Online | Kadro açık, taktik gizli; 90 sn taktik süresi |
| Maç ekranı | Sol: dikey saha, orta: spiker, sağ: taktik/istatistik; her panel tam ekran/kapat |
| 2D görünüm | Numaralı neon diskler |
| Spiker | Canlı + taktik bağlantılı |
| Maç sonu | Detaylı istatistik, oyuncu puanları, taktik karşılaştırması |

## 2. Oyuncular

### 2.1 Yetenekler (1–99)

**Saha oyuncusu (14):**

| Grup | Yetenek | Motorda nerede kullanılır |
|---|---|---|
| Hücum | **Bitiricilik** | Ceza sahası içi şut isabeti/kalitesi, penaltı |
| | **Uzaktan şut** | Ceza sahası dışı şut, direkt frikik |
| | **Hava topu** | Hücumda kafa (isabet + topa ulaşma), savunmada kafa mücadelesi |
| | **Pozisyon alma** | Topsuz boşa çıkma, ofsayttan kaçma, orta/ara pası hedefi olma |
| | **Dribling** | Çalım denemesi, baskı altında top taşıma |
| | **İlk dokunuş** | Pası kontrol (özellikle baskı altında ve uzun toplarda) |
| Pas | **Kısa pas** | Kısa/orta mesafe pas isabeti, araya girmeye karşı |
| | **Uzun pas** | Uzun top, çapraz pas, presi atlama |
| | **Orta** | Kanattan orta, korner, frikik ortası |
| | **Vizyon** | Ara pası, karar kalitesi (en iyi seçeneği görme) |
| Savunma | **Top kapma** | Çalıma karşı müdahale, pas arası, faul ihtimali (düşük top kapma → daha çok faul) |
| | **Markaj** | Topsuz oyuncuyu takip, pas hattını kapatma, şut bloğu |
| Fizik | **Hız** | Hız yarışları, kontra, arkaya koşu, pres mesafesi |
| | **Güç** | Omuz omuza, hava topunda itişme, top saklama |

**Kaleci (4):**

| Yetenek | Kullanım |
|---|---|
| **Refleks** | Yakın mesafe / sert şutlar, sekmeler |
| **Pozisyon** | Uzaktan ve açılı şutlar, açıyı daraltma |
| **Hava topları** | Orta, korner, kafa vuruşları; çıkıp yumruklama/tutma |
| **Bire bir** | Karşı karşıya, ara pası sonrası pozisyonlar, penaltı |

Kalecinin oyun kurması ayrı yetenek değildir; takımın pas tarzından gelir (uzun pas tarzında kaleci uzun degaj yapar).

### 2.2 Değerlerin üretimi

- Değerleri **biz üretiriz**: her oyuncu için kariyer bilgisi, oyun tarzı, bilinen istatistikleri (gol/asist oranları, boy, ayak, mevki, yaş, oynadığı lig) tek tek düşünülerek. Başka bir oyunun (FM, EA FC) puanları kopyalanmaz.
- **Tutarlılık testleri** her güncellemede çalışır:
  - aynı mevkide dağılım makul mü (örneğin kaç stoperin hızı 90 üstü?);
  - yaş eğrisi;
  - mevkinin gerektirdiği yeteneklerin tutarlılığı;
  - aynı oyuncunun yetenekleri arasındaki çelişki (örneğin hava topu 95, boy 170 cm).
- **İnceleme kulüp kulüp, lig lig** yapılır. Kullanıcı düzeltir; düzeltme veri dosyasına işlenir.
- Bilgi sınırı: az tanınan oyuncularda değerler daha kaba olur. Havuz tanınmışlıktan seçildiği için (bkz. 2.3) bu etki sınırlı kalır.

### 2.3 Havuz

- 1000–1500 **aktif** oyuncu.
- Seçim, tanınmışlık puanı (recognition_score) ve mevki dengesine göre yapılır. Her mevkide draft seçeneklerini besleyecek kadar oyuncu olmalı.
- Kimya için gereken kulüp / eski kulüp / milliyet / lig verisi mevcut ana veri dosyasından gelir.

## 3. Saha ve dizilişler

### 3.1 Bölge ızgarası

- Saha **6 boy × 5 en = 30 bölge**. Boyda: kendi ceza sahası, kendi yarı alanı (2), rakip yarı alanı (2), rakip ceza sahası. Ende: sol kanat, sol iç, merkez, sağ iç, sağ kanat.
- Her oyuncunun her an bir bölgesi vardır. Bu bölge diziliş + taktik + topun yeri + takımın topa sahip olup olmamasından hesaplanır.
- 2D ekran bu ızgarayı birebir kullanır; diskler bölgelerin içinde hafifçe dağıtılarak çizilir.

### 3.2 Dizilişler (17)

- **4'lü klasik:** 4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 4-4-1-1, 4-3-2-1
- **4'lü özel:** 4-1-2-1-2 (elmas), 4-2-2-2, 4-3-1-2, 4-5-1
- **3'lü:** 3-5-2, 3-4-3, 3-4-2-1, 3-4-1-2
- **5'li:** 5-3-2, 5-4-1, 5-2-3

Her dizilişin iki yerleşim tablosu vardır: **topa sahipken** ve **topsuzken** her pozisyonun ızgaradaki temel bölgesi.

### 3.3 Kırmızı kart

Atılan oyuncunun pozisyonu boşalır. Kalan 10 oyuncu, dizilişe en yakın şekilde yeniden dağıtılır. Kural: önce en hücumdaki pozisyondan bir oyuncu geri çekilir, savunma sayısı korunur. Taktik aynı kalır.

## 4. Maçın akışı

### 4.1 Döngü

```
başlama vuruşu → [topa sahip olma]
  topa sahip olma: taşıyıcı bir aksiyon seçer → aksiyon mücadele(ler)le çözülür
    → başarılı: top yeni bölgeye / yeni oyuncuya geçer, döngü devam
    → başarısız: top kaybı → rakip için yeni topa sahip olma (kontra durumu değerlendirilir)
    → duran top doğarsa (korner, faul, taç, aut) ilgili zincir
    → şut → şut zinciri → gol / kurtarış / ikinci top / aut
  her aksiyon maç saatini ilerletir (aksiyon tipine ve tempoya göre)
90. dakika → bitiş (elemede beraberlik → penaltılar)
```

- Bir topa sahip olma 1–15 aksiyon sürer. Takım başına maçta yaklaşık 45–70 topa sahip olma vardır; bu sayı tempo ve pas tarzından doğal olarak çıkar.
- Gösterim: kendi yarı sahandaki önemsiz pas zincirleri 2D'de hızlı geçilir, son üçte birdeki tehlikeli anlar yavaşlatılıp spikerle anlatılır.

### 4.2 Aksiyon seçimi

Taşıyıcının seçenekleri bulunduğu bölgeye göre değişir: kısa pas, uzun pas, ara pası, top taşıma, çalım, orta, şut.

1. **Taktik ağırlığı (~%70):** hücum ayarları her seçeneğin temel olasılığını belirler. Örneğin "Bitiriş: Orta" seçilmişse son üçte birde kanattaki oyuncu için orta seçeneğinin ağırlığı yüksektir.
2. **Yetenek tercihi (~%30):** oyuncu güçlü olduğu aksiyona yönelir. Dribling yeteneği yüksekse çalım ağırlığı artar, uzun pası zayıfsa uzun pas ağırlığı azalır.
3. **Vizyon (karar kalitesi):** her seçeneğin tahmini başarı şansı hesaplanır. Vizyonu yüksek oyuncu bu şansı yüksek seçeneklere daha çok ağırlık verir (boştaki arkadaşını görür). Vizyonu düşük oyuncu tahmini şansa daha az bakar; daha rastgele ve zorlama kararlar verir.

**Önemli ayrım:** %70 / %30 oranı sadece **hangi aksiyonun seçileceğini** belirler. Seçilen aksiyonun **başarı olasılığı** bu orandan bağımsızdır ve tamamen mücadele matematiğinden (4.3) gelir.

Pas seçenekleri, taşıyıcının çevresindeki destek oyuncularından oluşur (4.5.4). Çevresinde boşa çıkmış arkadaşı olmayan oyuncunun kısa pas seçeneği azdır. 95 vizyonlu bir oyuncu bile etrafında hareket eden arkadaşı yoksa mucize yaratamaz.

### 4.3 Temel çözüm formülü (taslak)

Her mücadele:

`P(başarı) = 1 / (1 + e^-(k·(S − D) + b))`

- **S:** saldıranın ilgili yetenek(ler)inin ağırlıklı değeri. Kimya katkısı dahildir; 99'u aşabilir. Örnek: hava topu mücadelesinde `S = 0,7 × Hava topu + 0,3 × Güç`. Bu yalnızca bir örnek; gerçek ağırlıklar her mücadele tipi için matematik bölümünde gerekçeleriyle belirlenir.
- **D:** savunanın ilgili yetenek(ler)i. Baskısız aksiyonda D yerine aksiyonun **sabit zorluğu** kullanılır (mesafe, açı vb.).
- **b:** durumun temel zorluğu (bölge, mesafe, açı, baskı altındaki oyuncu sayısı, taktik etkileri).
- **k:** farkın ne kadar belirleyici olduğu.

**Aksiyona özel rastgelelik:** gerçekçi rastgelelik, bütün aksiyonlara eşit şans vermek değildir. Kısa pasla karşı karşıya pozisyonun belirsizliği aynı değildir. Bu yüzden **her aksiyon tipinin kendi k ve b değeri vardır.**
- Kolay ve tekrarlı aksiyonlarda (kısa pas, kontrol) k yüksektir: yetenek farkı belirleyicidir, sonuç öngörülebilirdir.
- Doğası gereği belirsiz anlarda (karşı karşıya, uzaktan şut, ikinci top) k düşüktür: zar daha çok söz sahibidir.

**Yetenek katlanmasının önlenmesi:** bir aksiyon zincirinde aynı yetenek gereğinden fazla halkada kullanılıp etkisi katlanmamalıdır. Her halkanın yetenek ağırlıkları zincir bütününde kontrol edilir. Örneğin orta zincirinde "orta" yeteneği sadece isabet halkasında kullanılır, topun düştüğü noktayı belirlerken ikinci kez kullanılmaz.

Sonra 0–1 arası bir zar çekilir. Zar P'den küçükse saldıran kazanır.

- Ayrı bir "hata zarı" yoktur. Kötü pas, kontrol kaybı gibi hatalar kaybedilen mücadelelerdir. Baskısız aksiyonlar da sabit zorluğa karşı aynı formülle çözülür (kolay geri pas neredeyse her zaman başarılıdır, zor uzun pas sık kaçar).
- k ve b değerleri bu belgenin "matematik" bölümünde (sonraki adım) gerekçeleriyle yazılacak. Kontrol ölçütü gerçek futbolun olay sıklıklarıdır (aşağıda 9.2).

### 4.4 Topsuz yer alma

- Temel yer dizilişten gelir; taktik (hücum yönü, tempo, hat yüksekliği) kaydırır. Ayrıntısı 4.5'te.
- Her aksiyonda, aksiyonun hedef bölgesindeki ve yakınındaki hücumcular için **pozisyon alma** ile en yakın savunmacının **markajı** karşılaşır. Kazanan hücumcu "boşta" sayılır: pas seçeneklerinde öne çıkar ve pası alırken baskı görmez.

### 4.5 Oyuncu hareketi ve konumlandırma

> Motorun temeli. Kim kiminle karşılaşacak, pas seçenekleri ve kontra boşlukları buradan doğar. **Bu bölüm bir sonraki soru–cevap oturumunda ayrıntılandırılacak.** Aşağıdakiler çerçeve ve cevaplanması gereken sorulardır.

Oyuncular dizilişte duran diskler değil, futbol oynayan birimlerdir. Her oyuncunun üç konum davranışı vardır:

1. **Top bizdeyken temel pozisyon:** dizilişin hücum yerleşimi, taktikle kaydırılmış hali (hücum yönü, tempo).
2. **Top rakipteyken temel pozisyon:** dizilişin savunma yerleşimi, taktikle kaydırılmış hali (hat yüksekliği, kapatılan alan).
3. **Topun bulunduğu bölgeye göre dinamik hareket:** temel pozisyondan, topun konumuna ve oyunun anına göre kayma.

Cevaplanacak sorular (örnekler):
- Top merkezdeyken sağ kanattaki oyuncu ne yapar: genişlikte mi kalır, içeri mi kat eder?
- Orta saha topu aldığında forvet savunma arkasına koşar mı, topa mı gelir?
- Sol bek hücuma katıldığında arkasındaki boşluğu kim kapatır?
- Top rakibe geçtiğinde hücum oyuncuları hangi bölgeleri savunur?
- Rakibinden kurtulan oyuncu boş alanı nasıl değerlendirir?

Alt sistemler:

#### 4.5.1 Kayma kuralları
Takım, topun bulunduğu tarafa doğru blok halinde kayar. Kayma miktarı diziliş, kapatılan alan ve pres ayarıyla belirlenir. Kayan takımın karşı tarafı incelir; bu, oyun değiştiren uzun pasların değerini doğal olarak üretir.

#### 4.5.2 Alan savunması ve takip
Savunmacının iki görevi vardır: bölgesindeki oyuncuyu takip etmek ya da pas kanalını kapatmak. Hangisinin seçileceği topun yerine ve markaj yeteneğine bağlıdır. Takip edilen oyuncu bölgeden çıkınca savunmacı ne zaman bırakıp yerinde kalır, bu kuralla tanımlanır.

#### 4.5.3 Geçiş savunması (top kaybı)
Top kaybedildiği anda takım savunma düzenine hemen dönmez. Her oyuncunun dönüş süresi, uzaklığına ve hızına bağlıdır. Bu süre boyunca açık kalan bölgeler rakibin kontra fırsatını (5.4) belirler. İleri çıkmış bek ve orta sahalar en geç dönenlerdir.

#### 4.5.4 Destek ve pas üçgenleri
Taşıyıcının çevresindeki takım arkadaşları pas seçeneği oluşturur. Bir seçeneğin değeri, o arkadaşın boşta olup olmamasına (4.4), uzaklığına ve pas hattındaki savunmacı sayısına bağlıdır. Kısa pas oyunu, bu üçgenler kurulabildiği ölçüde anlam kazanır. Dizilişin ve pas tarzının üçgen kurma kapasitesi farklıdır.

#### 4.5.5 Kaleci ile oyun kurma
Kale vuruşunda ve kaleciye geri pasta kalecinin seçenekleri:
- kısa pasla stopere ya da beke çıkış;
- orta mesafe pasla orta sahaya;
- uzun degajla forvete.

Seçim, pas tarzına ve rakibin presine göre yapılır. Kısa çıkışta rakip presini aşmak ayrı bir mücadeledir: pas hattındaki presçiler ve alıcının ilk dokunuşu. Uzun degajda hedef oyuncu hava topu ve güç mücadelesine girer. Kalecinin ayakla oyun yeteneği olmadığı için kısa pas isabeti sabit bir zorlukla çözülür. Kalecinin oyun kurmadaki etkisini takımın pas tarzı belirler.

#### 4.5.6 Ceza sahası içi yerleşim
Orta ya da korner geldiğinde herkes topa koşmaz. Hücumcular ve savunmacılar dört noktaya dağılır: **yakın direk, penaltı noktası, arka direk** ve **seken top bölgesi** (ceza sahası önü). Kimin hangi noktaya gideceği hava topu ve pozisyon alma yeteneklerine ve dizilişe göre belirlenir. Topun düştüğü nokta (5.3) hangi eşleşmenin mücadeleye gireceğini belirler.

### 4.6 Savunmanın üç katmanı

Futbolda bir mücadele her zaman iki oyuncu arasında geçmez. Savunma üç katmanda değerlendirilir:

1. **Birincil savunmacı:** doğrudan mücadeleye giren oyuncu (çalıma müdahale eden, pası alan oyuncuya baskı yapan).
2. **İkincil savunmacı:** yakındaki destek; alanı daraltır, çalımdan sonraki kaçış yolunu kapatır.
3. **Takım savunması:** pas koridorlarının kapatılması; taşıyıcının pas seçeneklerini azaltır.

**Kural: üç katmanın değerleri toplanıp tek bir D olarak hücumcunun karşısına konmaz.** Toplamak savunmayı aşırı güçlü yapar. Her katmanın katkısı ayrı hesaplanır:
- birincil savunmacı mücadelenin D'sidir;
- ikincil savunmacı b'ye sınırlı bir zorluk ekler ve başarılı çalımdan sonra yeni bir mücadele fırsatı yaratabilir;
- takım savunması aksiyon seçiminde (4.2) pas seçeneklerinin sayısını ve kalitesini düşürür.

Böylece 95 top kapma yeteneğine sahip bir orta saha yanlış konumlanmışsa rakibin pas oyununu engelleyemez: birincil savunmacı olamaz, en fazla ikincil katkı yapar.

### 4.7 Maç saati

- Her aksiyon maç saatinden bir süre tüketir. Maç saati aksiyonların toplam süresiyle doğal olarak ilerler. Aksiyon sayısı ile maç süresi arasında yapay bir ilişki kurulmaz: 15 aksiyonluk bir atak doğal olarak uzun sürer.
- Önerilen başlangıç aralıkları (kalibre edilecek, kesin değil):

| Aksiyon | Süre |
|---|---|
| Kısa pas | 2–4 sn |
| Uzun pas | 3–5 sn |
| Çalım | 2–4 sn |
| Top taşıma | 3–6 sn |
| Orta | 3–5 sn |
| Şut | 2–4 sn |
| Duran top hazırlığı (korner, frikik) | 20–40 sn |
| Gol sonrası santra | 40–60 sn |

- Tempo ayarı süreleri kısaltır ya da uzatır (sabırlı tempoda pas arası bekleme daha uzun).
- Kalibrasyon ölçütü: takım başına topa sahip olma sayısı ve ölü top süreleri gerçek futbol aralıklarında olmalı.

## 5. Aksiyon zincirleri

### 5.1 Pas (kısa / uzun)

1. **Araya girme:** pasın geçtiği bölgelerdeki ve hedef bölgedeki en yakın savunmacılar araya girmeyi dener.
   - Pasçının yeteneği: kısa pas veya uzun pas, vizyonla birlikte.
   - Savunmacının yeteneği: markaj + top kapma.
   - Mesafe uzadıkça ve hattaki savunmacı sayısı arttıkça zorlaşır.
2. **Kontrol:** alıcının ilk dokunuşu, yanındaki savunmacının baskısına karşı (top kapma + hız). Alıcı boştaysa sabit zorluğa karşı çözülür. Uzun toplarda zorluk daha yüksektir; havadan gelen uzun topta hava topu + güç mücadelesi de olur.
3. **Ara pası:** hedef koşu yapan oyuncudur.
   - Pası atan: vizyon + kısa/uzun pas.
   - Koşucu ile savunmacı: hız + pozisyon alma vs hız + markaj.
   - Ofsayt kontrolü yapılır (5.6).
   - Başarılı olursa koşucu ceza sahası önünde veya içinde avantajlı pozisyona girer (çoğu zaman bire bir).

### 5.2 Top taşıma ve çalım

- **Taşıma:** önü boşsa taşıyıcı bir bölge ilerler. En yakın savunmacının pres mesafesi (hız) yetiyorsa karşılaşma olur.
- **Çalım:** dribling + hız (+ güç) vs top kapma + hız (+ güç).
  - **Başarı:** geçilen savunmacı bu topa sahip olma boyunca bir sonraki mücadeleye geç kalır ve sayısal üstünlük doğar.
  - **Başarısızlık:** top kaybı, kontra riski.
  - Savunmacı kaybederse müdahale sertliğine ve top kapma yeteneğine bağlı olarak **faul** ihtimali doğar (5.8).

### 5.3 Orta

1. **Ortayı açabilme:** kanattaki oyuncu bekle karşılaşır (çalım/taşıma veya boş alan). Kapatılmışsa orta engellenebilir ve top kornere gidebilir.
2. **İsabet:** orta yeteneği vs zorluk (mesafe, baskı). İsabete göre topun düşeceği nokta belirlenir: yakın direk, penaltı noktası, arka direk ya da kaleci bölgesi. İsabetsiz orta kaleciye, auta ya da savunmaya gider.
3. **Hava mücadelesi:** topun düştüğü noktaya en yakın hücumcu(lar) ile savunmacı(lar) karşılaşır. Yetenekler: hava topu + güç, hücumcular için ayrıca pozisyon alma. Kaleci hava toplarıyla çıkıp topu alabilir (kaleciye yakın düşen toplarda).
4. **Bitiriş:** kafayı kazanan hücumcu şut zincirine (5.5) girer, şut tipi kafadır. Savunmacı kazanırsa top uzaklaştırılır ve ikinci top doğar (5.7).

Ceza sahasındaki hücumcu ve savunmacı sayısı diziliş + taktikten gelir. Örneğin alçak blok ceza sahasına daha çok savunmacı yığar.

### 5.4 Kontra

- Top kazanıldığı anda rakibin yerleşimi değerlendirilir. Rakibin hat yüksekliği ve topa sahipken ileri çıkmış oyuncu sayısı, arkada kalan boş bölgeleri belirler.
- "Top kazanınca: Kontra" seçen takım bu boşluğa hızlı, dikine aksiyonlar dener. Belirleyici olan hız vs hız yarışlarıdır, uzun pas ve vizyonla birlikte.
- "Yerleşik" seçen takım topu tutar ve rakip yerine döner.
- Kontrada savunan takımın geri dönen oyuncuları birkaç aksiyon gecikmeli olarak mücadeleye katılır.

### 5.5 Şut (3 aşama)

Şutta iki ayrı şey ölçülür: **isabet** (top çerçeveyi buluyor mu?) ve **kalite** (kaleci için ne kadar zor?). Oyuncu kaleyi bulup zayıf vurabilir, köşeye sert vurabilir ya da kaleyi bulamayıp direğe takılabilir.

1. **Blok:** şut hattındaki savunmacı (markaj) bloklamayı dener. Blok olursa top ikinci top olur veya kornere çıkar.
2. **İsabet:** ilgili yetenek, zorluğa karşı çözülür.
   - Yetenek: ceza sahası içinde bitiricilik, dışında uzaktan şut, kafada hava topu.
   - Zorluk: mesafe, açı, baskı.
   - Sonuç: çerçeve, direk veya aut. Direk, isabet sınırına çok yakın kalan şutlardan doğar.
3. **Kalite:** çerçeveyi bulan şutun kalitesi ayrı bir değerdir. Aynı yetenekten gelir, ama baskı ve pozisyon (açı, vuruş anında boşta olup olmama) etkisi ayrıca hesaplanır. Yüksek kalite köşeye yakın ve sert şut, düşük kalite kalecinin üstüne giden şut demektir.
   - Şutun sertliği ayrı bir yetenek değildir (bkz. ilke 6). Mesafeden ve vuruş koşullarından (baskı, kafa/ayak) türetilir: uzaktan şut daha sert ama daha az isabetli olabilir, kafa vuruşu daha yumuşaktır.
4. **Kaleci:** şut kalitesi, şut tipine göre kalecinin yeteneğiyle karşılaşır.
   - Yakın ve sert şut → refleks; uzaktan veya açılı → pozisyon; kafa → hava topları + pozisyon; karşı karşıya → bire bir.
5. **Kurtarışın türü ve sekme:** kaleci kazanırsa kurtarışın türü belirlenir: tutuş, çelme ya da kornere çelme. Bunu kalecinin üstünlük farkı ve şutun sertliği belirler: zayıf şut genelde tutulur, sert şut çelinir. Çelinen topun düştüğü yer şutun yönüne ve kurtarışın türüne göre hesaplanır ve ikinci top (5.7) doğar.

### 5.6 Ofsayt (geometrik)

Ofsayt bir hız yarışı değil, **pasın atıldığı andaki konuma bağlı bir kuraldır.** Motor şu sırayı izler:

1. Pasın atıldığı anı belirle.
2. Hücumcunun konumunu belirle.
3. Topun konumunu belirle.
4. Rakip kale çizgisine göre sondan ikinci rakibin (genelde en geri stoperin) konumunu belirle.
5. Ofsayt konumunu kontrol et: hücumcu o anda topun ve sondan ikinci rakibin önündeyse ofsayttır.
6. Ofsayt değilse koşu ve hız avantajını hesapla.

- Bölge ızgarası bu kontrol için yeterince ince değildir. Bu yüzden **savunma çizgisinin boydaki tam konumu** ve koşucunun konumu bölge içinde sürekli bir değer olarak tutulur. Savunma çizgisini hat yüksekliği ve topun yeri belirler.
- **Pozisyon alma yeteneği koşunun zamanlamasını belirler:** iyi pozisyon alan forvet koşuya doğru anda başlar ve ofsayta düşmeden çizgiye en yakın yerden çıkar. Kötü zamanlama ya ofsayt ya da geç ve verimsiz koşu demektir.
- Yüksek hat ofsayt ihtimalini artırır. Ama tuzak bozulursa, yani koşucu doğru zamanladıysa, koşucu arkada boş alanla karşı karşıya kalır ve hız yarışı başlar (yüksek riskli büyük fırsat).

### 5.7 İkinci toplar

Kurtarış, blok, uzaklaştırma veya kaybedilen hava topu sonrası top bir bölgeye düşer. Bölgeyi belirleyen etkenler: şutun ya da uzaklaştırmanın yönü ve gücü, kaleci çelmişse çelmenin yönü. O bölgedeki ve komşu bölgelerdeki oyuncular topa ulaşmak için yarışır: hız + pozisyon alma (hücum) vs hız + markaj (savunma). Kaleci çeldiği topu bazen tutar (refleks).

### 5.8 Faul ve kart

- **Faul ihtimali** savunmacı bir mücadeleyi kaybettiğinde doğar; özellikle çalım, hız yarışı ve ilk dokunuşa yapılan baskıda. Ihtimali artıran etkenler:
  - müdahale sertliği;
  - düşük top kapma yeteneği;
  - pres yoğunluğu (daha çok mücadele).
- **Sonuç:** faulün yeri duran topu belirler. Ceza sahası içi penaltıdır. Rakip yarı sahada tehlikeli bölgedeyse frikik olur, değilse oyun devam eder.
- **Kart:**
  - sert müdahalede sarı kart ihtimali artar;
  - gol pozisyonunun faulle engellenmesi (son adam, karşı karşıya) kırmızı karttır;
  - ikinci sarı kırmızıdır;
  - kırmızı kartta 3.3'teki yeniden yerleşim uygulanır.

### 5.9 Duran toplar

Kullanıcılar otomatik seçilir: her duran top tipi için ilgili yeteneği en yüksek oyuncu.

| Tip | Kullanıcı yeteneği | Zincir |
|---|---|---|
| Korner | Orta | Orta zinciri 3–4. adım; ceza sahası kalabalık (stoperler hücuma çıkar) |
| Frikik (uzak) | Orta | Orta zinciri |
| Frikik (yakın) | Uzaktan şut | Baraj bloğu → isabet → kaleci (pozisyon) |
| Penaltı | Bitiricilik | Bitiricilik vs kaleci bire bir |
| Taç | — | Taç atan yakındaki arkadaşa pas; normal pas zinciri |
| Aut (kale vuruşu) | — | Pas tarzına göre kısa çıkış veya uzun degaj |

## 6. Taktik ayarları ve etkileri

Her ayarın **sahada net bir karşılığı** ve **kendine özgü bir riski** var. Tablolar etkinin yönünü gösterir; büyüklükler matematik adımında belirlenecek.

### 6.1 Hücum

**H1 — Hücum yönü:** Sol / Merkez / Sağ / Dengeli

| Etki | Risk / counter |
|---|---|
| Seçilen koridora doğru pas ve taşıma seçeneklerinin ağırlığı artar | Rakip "Kapatılan alan" ile o koridoru kapatırsa mücadele sayısı ve zorluğu artar |
| Topa sahipken o koridora fazladan oyuncu kayar (sayısal üstünlük) | Karşı koridor boşalır, top kaybında rakip kontrası o taraftan gelir |

**H2 — Pas tarzı:** Kısa / Karışık / Uzun

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Kısa | Kısa pas ağırlığı yüksek, isabet yüksek, topa sahip olma uzun | Yoğun preste kendi yarı alanında top kaybı riski; kaybedilen top kaleye yakındır |
| Uzun | Uzun top ve degaj, presi atlar; hedef oyuncunun hava topu ve güç değerleri önem kazanır | İsabet düşük, top daha çok kaybedilir; alçak blok ve hava hakimi stoperlere karşı verimsiz |
| Karışık | Ara değerler | — |

**H3 — Bitiriş tercihi:** Orta / Ara pası / Uzaktan şut / Çalım (son üçte birde)

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Orta | Kanatta orta ağırlığı yüksek; hava topu ve orta yetenekleri belirleyici | "Kanatları kapat" ortayı açmayı zorlaştırır; alçak blok ceza sahasını kalabalık tutar |
| Ara pası | Vizyon, hız ve pozisyon alma belirleyici | Alçak hat arkada alan bırakmaz; yüksek hatta ofsayt riski vardır ama tuzak bozulursa büyük fırsat doğar |
| Uzaktan şut | Ceza sahası dışından şut ağırlığı yüksek | İsabet ve gol olasılığı düşük; blok ve ikinci top oluşturur; alçak blok buna alan bırakır |
| Çalım | Dribling ve hız belirleyici; çalımla geçilen savunmacı sayısal üstünlük yaratır | Top kaybı ve kontra riski; ama sert müdahale yapan rakip faul ve kart riskine girer |

**H4 — Tempo:** Sabırlı / Dengeli / Hızlı

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Sabırlı | Daha çok güvenli pas, rakibi yerinden oynatana kadar bekler; topa sahip olma uzun | Atak sayısı az; rakip savunması yerleşik kalır |
| Hızlı | Daha dikine, daha az aksiyonlu ataklar; atak sayısı artar | Karar kalitesi düşer (vizyonun tahmini şans ağırlığı azalır), top daha çok rakibe geçer |

**H5 — Top kazanınca:** Kontra / Yerleşik

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Kontra | Kazanılan topta hızlı, dikine aksiyonlar (5.4); hız belirleyici | Az oyuncuyla yapılır, kaybedilirse takım dağınık yakalanır |
| Yerleşik | Topu tutar, oyuncular yerleşir | Rakip de yerleşir; kontra fırsatı kullanılmaz |

### 6.2 Savunma

**S1 — Hat yüksekliği:** Alçak / Orta / Yüksek

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Alçak | Savunma kendi ceza sahası önünde; arkada boş alan yok, ceza sahası kalabalık | Rakibe orta sahayı ve uzaktan şut alanını bırakır; kontra için uzak mesafe |
| Yüksek | Rakip kendi yarı alanında; ofsayt tuzağı; top kazanılırsa kaleye yakın | Ara pası ve uzun topa açık; hızlı forvetler büyük fırsat bulur |

**S2 — Pres yoğunluğu:** Az / Orta / Yoğun

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Az | Oyuncular yerinde kalır, düzen korunur | Rakip rahat oyun kurar |
| Yoğun | Topa yakın bölgelere daha çok oyuncu kayar; taşıyıcıya daha çok mücadele; yukarıda top kazanma | Presçi geçilirse arkasında boşluk kalır; daha çok mücadele → daha çok faul; uzun pas tarzı presi atlar |

**S3 — Kapatılan alan:** Kanatlar / Merkez / Dengeli

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Kanatlar | Kanat bölgelerine ek savunmacı kayar (2'ye 1); orta açmak zorlaşır | Merkez koridor incelir: ara pası ve merkezden şut kolaylaşır |
| Merkez | Merkeze kompakt blok; ara pası ve merkez şutları zorlaşır | Kanatlar açık kalır: ortalar kolaylaşır |

**S4 — Müdahale sertliği:** Temkinli / Normal / Sert

| Seçenek | Etki | Risk / counter |
|---|---|---|
| Temkinli | Faul ve kart az | Mücadelelerde savunmacıya eksi katkı (rakip daha kolay geçer) |
| Sert | Mücadelelerde savunmacıya artı katkı | Faul, frikik, penaltı ve kart riski artar; çalım tercihli rakip bunu cezalandırır |

### 6.3 Örnek etkileşim (doğrulama senaryosu)

> **Takım A:** Hücum yönü Sağ, Bitiriş Orta. Sağ kanatçının ortası 90, forvetin hava topu 92.
> **Takım B:** Kapatılan alan Dengeli, Hat Orta, stoperlerin hava topu 70.
> Beklenti: A'nın sağ kanattan orta sayısı ve kafa gol olasılığı belirgin yüksek çıkmalı.
>
> **Takım B'** aynı oyuncularla Kapatılan alan: Kanatlar, Hat: Alçak seçerse orta açma başarısı ve kafa mücadelesi kazanma oranı düşmeli; buna karşılık A'nın merkezden şut ve ara pası fırsatları artmalı.
>
> Bu senaryo laboratuvarda otomatik test olarak kalır.

### 6.4 Taktiklerin birlikte çalışması

Ayarlar tek tek değil, birlikte çalışır. Bazı kombinasyonlar tek tek etkilerinin toplamından farklı sonuç üretir, bu yüzden etkileşimleri matematik bölümünde ayrıca tanımlanır. İlk incelenecek kombinasyonlar:

| Kombinasyon | Birlikte ne olur |
|---|---|
| Yüksek hat + yoğun pres | Rakibi kendi yarı alanında boğar, top kazanılırsa kaleye çok yakındır. Ama pres kırılırsa arkada çok büyük alan kalır; hızlı forvet ve uzun pasa karşı en riskli savunma |
| Alçak blok + merkezi kapat | Ceza sahası ve merkez neredeyse kapalıdır. Kanatlar ve uzaktan şut alanı tamamen rakibe kalır |
| Uzun pas + kontra | Top kazanılınca en kısa yoldan arkaya oynanır. Hızlı forvet ve iyi uzun pasçı ister; topa sahip olma çok düşüktür |
| Hızlı tempo + ara pası | Az aksiyonla çok fırsat yaratır ama karar kalitesi düşer, ofsayt ve top kaybı artar |
| Kanat hücumu + rakip "kanatları kapat" | Doğrudan çatışma: ortayı açma halkası zorlaşır; hücum yönü dengeli değilse atak tıkanır |
| Kısa pas + rakip yoğun pres | Pas üçgenleri (4.5.4) kurulabiliyorsa pres kırılır ve arkada alan doğar; kurulamıyorsa tehlikeli bölgede top kaybı |

Kural: bir kombinasyonun etkisi yine yetenekler ve sahadaki durumlar üzerinden doğmalıdır. Örneğin "yüksek hat + yoğun pres" için ayrı bir bonus sayısı yazılmaz. Bunun yerine iki ayarın oyuncu konumlarına (4.5) ve mücadele sayısına etkisi birleşir, sonuç da oradan çıkar. Matematik bölümü bu birleşimin aşırı güçlü bir kombinasyon üretmediğini laboratuvarla gösterir.

### 6.5 Yoğun presin bedeli (yorgunluk olmadan)

Yorgunluk yok. Ama 90 dakika yoğun pres yapan takım bedel öder:
- geçilen presçinin arkasında boşluk kalır;
- daha çok mücadele daha çok faul, frikik ve kart demektir;
- pres kırılınca savunma düzensiz yakalanır (4.5.3).

Bu riskler, yoğun presin her rakibe karşı en iyi seçim olmamasını sağlayacak güçte modellenir. İleride gerekirse yorgunluk ayrıca eklenebilir.

## 7. Kimya (şimdiki sistem)

- Her oyuncu dizilişte kendisine **en yakın 4** takım arkadaşına bakar; bunlardan **en güçlü 3** bağlantı sayılır.
- Bağ puanları (bir bağlantıda en fazla 10):
  - aynı milli takım (milliyet) **+3**;
  - aynı kulüp **+3**;
  - aynı lig **+2**;
  - ortak eski kulüp (ya da birinin eski kulübü diğerinin şimdiki kulübü) **+2**.
- Oyuncunun kimyası = 3 bağlantının toplamı, **en fazla 10**.
- **Etki:** tüm yeteneklere `kimya/10 × %8` çarpan katkısı. 10 kimya = +%8.
- **99 sınırı yok:** kimya katkısıyla yetenek 99'u aşabilir (99 × 1,08 ≈ 107). Sebep: kimya futbol bilgisini ödüllendiren güçlü bir katkı olarak kalmalı; 99'da sınırlansaydı en iyi oyuncularda hiç etkisi olmazdı. Formül iki değer arasındaki farka baktığı için matematik bundan etkilenmez; lojistik katsayılar bu genişlemiş aralıkta (yaklaşık 1–107) kalibre edilir.
- **Gösterim:** temel değer ile kimya katkısı ayrı görünür, örneğin "99 (+8)".
- Kimya inceleme ekranı, en etkili üç bağlantıyı ve yeteneklerin kimya öncesi/sonrası değerlerini göstermeye devam eder.

## 8. Modlar ve akış

- **Akış:** draft (şimdiki akış) → taktik (diziliş + 9 ayar) → maç → maç sonu.
- **Bota karşı:**
  - *Kolay:* draftta mevkiyi dolduran makul rastgele seçimler yapar, taktiği makul ve rastgeledir.
  - *Orta:* bir oyun tarzı seçer (örneğin kanat ortası) ve draftta buna uygun yetenekleri alır; taktiği kendi güçlü yanlarına göredir.
  - *Zor:* tarzına uygun oyuncu seçer, kimyayı kollar, senin seçtiğin oyunculara göre counter düşünür. Taktiği hem kendi gücüne hem senin kadronun zayıflıklarına göre seçer.
  - Bot hiçbir zorlukta senin **taktik** seçimini görmez; sadece kadronu görür.
- **Aynı telefonda 2 kişi:** draft sırayla yapılır. Taktikte Oyuncu 1 seçer, "Telefonu Oyuncu 2'ye ver" perdesi gelir, sonra Oyuncu 2 seçer. Maç başlayınca iki taktik de açılır.
- **Online 1v1:** draft bitince rakip kadro görünür. İki taraf aynı anda 90 sn içinde taktik seçer; süre biterse son kaydedilen ya da varsayılan dengeli taktikle oynanır. Maç tek bir tohumla (seed) iki cihazda aynı oynanır.
- **Parti turnuvası:** mevcut parti ve turnuva altyapısı. Elemede beraberlik direkt penaltıyla çözülür. Penaltılar penaltıcının bitiriciliği ile kalecinin bire birinin karşılaşmasıdır; atıcı sırası otomatiktir (bitiricilik sırası).

## 9. Ekranlar

### 9.1 Maç ekranı

- **Sol:** dikey 2D saha. Kaleler üstte ve altta, numaralı neon diskler, top, pas çizgileri. Mücadele anında iki oyuncu vurgulanır. Sahanın üstünde skor, dakika ve baskı barı.
- **Orta:** spiker. Canlı ve taktiğe bağlıdır: mücadele detayını ve ara ara taktik gözlemlerini anlatır ("Sağ kanat atakları işliyor: 6 ortadan 4'ü isabetli").
- **Sağ:** taktik ve istatistik. İki takımın taktikleri gösterilir (rakibinki maç başında açılır). Canlı istatistikler: koridor başına atak, orta, ikili mücadele başarı oranları, şut ve isabet.
- **Panel davranışı:** her panelde **tam ekran** ve **kapat** tuşu var. Kapatılan panelin yeri kalan panellere paylaştırılır; kapatılan panel bir tuşla geri açılır.
- **Dar ekran (dikey telefon):** saha + spiker açık başlar, taktik paneli bir dokunuşla açılır. Yan çevrilmiş telefonda, tablette ve masaüstünde üç panel açık başlar.
- Önemli anlar (gol, büyük kurtarış, kırmızı kart) sahanın üzerinde kısa yazıyla vurgulanır.

### 9.2 Maç sonu

- **Detaylı istatistik:** topa sahip olma, şut ve isabet, koridor bazında atak ve orta, ikili mücadele kazanma oranları, faul ve kart.
- **Oyuncu puanları:** her oyuncunun maçtaki mücadele sonuçlarından hesaplanan maç notu ve maçın oyuncusu.
- **Taktik karşılaştırması:** hangi ayarın rakibe karşı işe yaradığını gösteren sayısal özet. Örneğin: "Sağ koridor ataklarının %38'i şutla bitti (rakibin ortalaması %21)", "Ortaların %61'i hücumcuya ulaştı".

### 9.3 Draft ve taktik ekranı

- **Draft ve kadro ekranı:** şimdiki tasarım korunur. Kartlarda genel güç yerine yetenekler gösterilir; detayda 14 (kaleci için 4) yeteneğin hepsi görünür.
- **Taktik ekranı:** diziliş seçimi, 9 ayar ve **sadece sayısal veri** (yorum yok). Örneğin sağ koridordaki oyuncuların ortalama orta değeri, rakip beklerin markaj ve hız değerleri, ceza sahasında hava topu karşılaştırması.

## 10. Doğrulama laboratuvarı (teşhis, hedef değil)

Ekranlardan önce kurulur ve her değişiklikte otomatik çalışır:

1. **Gerçek futbol olay sıklıkları:** maç başına gol, şut, isabet, orta, korner, faul ve kart sayıları gerçek futbol aralıklarında mı? Değilse mantıkta hata vardır.
2. **Meta avcısı:** aynı kadrolarla tüm taktik kombinasyonları birbirine karşı oynatılır. Bir arama algoritması "her şeye karşı iyi" bir taktik arar. Bulursa rapor verir ve mantığa gerçek bir counter eklenir.
3. **"Her seçimin sonucu var" testi:** her ayar tek tek değiştirildiğinde ilgili istatistik ölçülebilir şekilde değişmeli.
4. **Senaryo testleri:** 6.3'teki gibi yazılı futbol senaryoları beklenen yönde sonuç vermeli.
5. **Tutarlılık:** aynı tohum aynı maçı üretmeli (online için şart).
6. **Dağılım:** aynı kadroların farklı tohumlarla oynadığı yüzlerce maçta sonuçlar istatistiksel olarak anlamlı bir dağılım göstermeli. Bir maçın tekrarlanabilir olması motorun gerçekçi olduğu anlamına gelmez.

Ek testler:

| Test | Ne kontrol eder? |
|---|---|
| Yetenek izolasyonu | Her yetenek gerçekten kullanılıyor mu? Tek bir yetenek değiştirilince ilgili istatistik değişiyor mu? |
| Pozisyon / diziliş testi | 17 diziliş sahada gerçekten farklı davranıyor mu (bölge doluluğu, pas ağları, atak koridorları)? |
| Zincir testi | Bir önceki aksiyonun sonucu bir sonrakini etkiliyor mu (örneğin başarılı çalım sonraki aksiyonu kolaylaştırıyor mu)? |
| Savunma testi | İkincil savunmacı ve takım savunması katkıları çalışıyor mu? Toplanarak aşırı güçlü hale gelmiyor mu? |
| Kaleci testi | Farklı kaleci yetenek profilleri farklı sonuçlar üretiyor mu (refleks / pozisyon / hava / bire bir)? |
| Rastgelelik testi | Aynı koşullarda sonuç dağılımları tutarlı mı? Her aksiyonun belirsizliği tasarlandığı gibi mi? |
| Uç değer testi | 99'luk (kimyayla ~107) oyuncular ya da 1'lik değerler motoru bozuyor mu? |
| İstismar testi | Bir taktik, kombinasyon ya da aksiyon sürekli avantaj sağlıyor mu? |
| Taktik etkileşim testi | 6.4'teki kombinasyonlar beklenen yönde ve aşırı güçlü olmadan çalışıyor mu? |
| Ofsayt testi | Ofsayt kararları geometrik kurala uyuyor mu? Hat yüksekliği ve koşu zamanlaması beklenen yönde etkiliyor mu? |
| Maç saati testi | Takım başına topa sahip olma sayısı ve ölü top süreleri gerçekçi aralıkta mı? |

## 11. Açık sorular (sonraki oturum)

1. **Mevki listesi:**
   - Şimdiki havuzda GK, CB, LB, RB, DM, CM, LW, RW, ST var. 3'lü ve 5'li savunmalardaki **kanat bek (LWB/RWB)** ve 4-2-3-1'deki **10 numara (AM)** pozisyonlarını hangi mevkiler doldurabilir?
   - Yeni mevki etiketleri (LWB, RWB, AM) eklensin mi?
2. **Online kopma:** taktik süresi içinde bağlantı koparsa, yeniden bağlanana kadar bekleme süresi ne olsun?
3. **Hızlı izleme:** maç sırasında 2x hızlandırma veya "sonuca atla" tuşu olsun mu?
4. **Kimya ile taktik ilişkisi:** kimya şimdilik sadece yetenek çarpanı. İleride ikili aksiyonlara da bağlansın mı? (Şimdilik hayır.)
5. **Oyuncu hareketi ve konumlandırma (4.5):** kayma, takip, geçiş, pas üçgenleri, kaleci oyun kurma ve ceza sahası yerleşim kuralları. Soru–cevap oturumunda kurulacak.

## 12. Yol haritası

Kodlamadan önce çözülecekler (sırasıyla):

1. **Oyuncu hareketi ve konumlandırma (4.5):** soru–cevapla kurallar, sonra bu belgeye eklenir.
2. **Aksiyon ve mücadele zincirleri:** üç katmanlı savunma (4.6) dahil, her halkanın yetenek ağırlıkları.
3. **Şut ve gol hesaplaması (5.5):** isabet, kalite, kaleci, sekme.
4. **Ofsayt geometrisi (5.6).**
5. **Taktiklerin birlikte çalışma matematiği (6.4).**
6. **Matematik:** aksiyon başına k ve b değerleri (4.3), maç saati süreleri (4.7) ve taktik etki büyüklükleri gerekçeleriyle bu belgeye eklenir.

Sonra:

7. **Veri:**
   - mevki ve kimya alanlarıyla 1000–1500 oyunculuk havuz;
   - yetenek değerlerinin üretimi;
   - tutarlılık testleri;
   - kulüp kulüp inceleme.
8. **Motor + laboratuvar:** saf JavaScript modülü (ekransız), tohumlu rastgelelik, bölüm 10 testleri.
9. **Ekranlar:** draft (mevcut tasarım), taktik, maç (3 panel), maç sonu.
10. **Modlar:** bota karşı → aynı telefon → online 1v1 → parti turnuvası.
11. **Geçiş:** yeni sürüm eskisinin her modunu karşılayınca ana menü yeniye bağlanır. Eski çekirdek (`neon-xi-core.html`) ve yaklaşık 20 yama dosyası silinir.
