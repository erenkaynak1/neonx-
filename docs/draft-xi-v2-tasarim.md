# Draft XI v2 — Tasarım Belgesi

> Durum: **taslak, birlikte okunacak.** Kod yazılmadı. Bu belge onaylanınca önce matematik (katsayılar), sonra kod.
>
> Kaynak: kullanıcıyla yapılan soru–cevap oturumu (2026-11-17). Her karar burada yazılı olandır; değişiklik önce bu belgede yapılır.
>
> Revizyon 2 (2026-11-17): dış değerlendirmedeki kabul edilen maddeler eklendi. Oyuncu hareketi ve konumlandırma (bölüm 4.5), üç katmanlı savunma (4.6), aksiyona özel rastgelelik (4.3), maç saati (4.7), geometrik ofsayt (5.6), şut isabeti ile kalitesinin ayrımı (5.5), taktik etkileşimleri (6.4), kimyanın 99 üstüne çıkabilmesi (7) ve genişletilmiş laboratuvar (10) eklendi.
>
> Revizyon 3 (2026-11-18): ikinci dış değerlendirmeden kabul edilen maddeler eklendi:
> - formülün işaret düzeltmesi ve "her etkenin tek yeri" kuralı (4.3);
> - motor mimarisi: durum makinesi, olay kaydı, tekrarlanabilirlik, motor ve sunum ayrımı, iki ayrı saat (bölüm 13);
> - tam ofsayt kuralları ile koşu ve pas zamanlaması (5.6);
> - cezasız mevki uyumluluk listesi (2.4);
> - baskın ve zayıf ayak (2.5);
> - boyun hava topu mücadelesine ayrı ve küçük bir etki olarak katılması (2.5, 5.3);
> - şut yönü ve kaleci erişimi (5.5);
> - topsuz davranışların yetenek sonucu olarak tanımlanması (4.5);
> - zincir olasılığı ölçümü, meta avcısının arama yöntemi ve yeni laboratuvar testleri (10).
>
> Revizyon 4 (2026-11-18): oyuncu hareketi ve konumlandırma kuralları (4.5) soru–cevapla belirlendi; mevki uyumluluk tablosu (2.4) onaylandı; spiker olayların sebebini de anlatır (9.1, 13.2); açık sorular kapatıldı (online kopma 8, hızlı izleme 9.1, kimya kapsamı 7); spikere absürt komik yorum katmanı eklendi (9.1).
>
> Revizyon 5 (2026-11-18): matematiğin başlangıç değerleri eklendi (bölüm 14): k katsayıları, yetenek ağırlıkları, taktik etkisinin büyüklüğü (15 puan), hedef olay sıklıkları (maç başına 3–3,5 gol).
>
> Revizyon 6 (2026-11-18): üçüncü dış değerlendirmeden kabul edilenler eklendi:
> - bölge + koordinat sistemi (3.1);
> - hareket motorunun matematiği ve öncelik sistemi (4.5.10);
> - zincir başarısının simülasyonla ölçülmesi (4.3);
> - tek mücadele tablosu ve taktik etkilerinin birleştirme kuralı (14.6, 14.4);
> - gol ortalamasının hedef değil izlenen gösterge olması (14.2, 14.5);
> - online için ev sahibi hesaplar + rakip doğrular + tam sayı matematiği (13.3);
> - botun draftı için pozisyon uygunluğu (8);
> - laboratuvarın kabul kriterleri (10.1);
> - önce küçük prototip (12).
>
> Revizyon 7 (2026-11-20): mücadele tablosu (14.6) tamamlandı: kontrol, pres, kısa ve uzun pas, araya girme, ara pası, ofsayt zamanlaması, orta ve bek bloğu, kafa vuruşu, penaltı, direkt frikik, faul olasılığı. Vizyon savunmada oyunu okuma olarak da kullanılır.
>
> Revizyon 8 (2026-11-20): 17 dizilişin 34 şablonu yazıldı (bölüm 15).

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
| Mevki | Oyuncu sadece oynayabildiği mevkilerde oynar; mevki uyumluluk listesi var, ceza katsayısı yok (2.4) |
| Ayak ve boy | Baskın ayak + zayıf ayak seviyesi; boy hava topunda ayrı ve küçük bir etki (2.5) |
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
| | **Hava topu** | Hücumda kafa (isabet + topa ulaşma), savunmada kafa mücadelesi. Zamanlama ve sıçrama becerisini ölçer; **boyu içermez** (boy ayrı etki, 2.5) |
| | **Pozisyon alma** | Topsuz boşa çıkma, ofsayttan kaçma, orta/ara pası hedefi olma |
| | **Dribling** | Çalım denemesi, baskı altında top taşıma |
| | **İlk dokunuş** | Pası kontrol (özellikle baskı altında ve uzun toplarda) |
| Pas | **Kısa pas** | Kısa/orta mesafe pas isabeti, araya girmeye karşı |
| | **Uzun pas** | Uzun top, çapraz pas, presi atlama |
| | **Orta** | Kanattan orta, korner, frikik ortası |
| | **Vizyon** | Ara pası, karar kalitesi (en iyi seçeneği görme); savunmada oyunu okuma (araya girme) |
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
  - aynı oyuncunun yetenekleri arasındaki çelişki (örneğin bitiricilik 95, kariyer gol oranı çok düşük).
- **Hava topu değeri boydan türetilmez.** Boy motorda ayrı bir etki olarak kullanıldığı için (2.5), hava topu değeri oyuncunun zamanlama ve sıçrama becerisine göre verilir. Aksi halde boy iki kez sayılır. Kısa ama hava topunda çok iyi bir oyuncu yüksek değer alabilir.
- **İnceleme kulüp kulüp, lig lig** yapılır. Kullanıcı düzeltir; düzeltme veri dosyasına işlenir.
- Bilgi sınırı: az tanınan oyuncularda değerler daha kaba olur. Havuz tanınmışlıktan seçildiği için (bkz. 2.3) bu etki sınırlı kalır.

### 2.3 Havuz

- 1000–1500 **aktif** oyuncu.
- Seçim, tanınmışlık puanı (recognition_score) ve mevki dengesine göre yapılır. Her mevkide draft seçeneklerini besleyecek kadar oyuncu olmalı.
- Kimya için gereken kulüp / eski kulüp / milliyet / lig verisi mevcut ana veri dosyasından gelir.

### 2.4 Mevki uyumluluk listesi

Her oyuncunun **oynayabildiği mevkiler listesi** vardır. Oyuncu sadece bu listedeki pozisyonlara yerleştirilebilir. 17 dizilişin hepsinin gerçekten oynanabilmesi için mevki etiketleri genişletilir: **LWB, RWB** (kanat bek), **LM, RM** (geniş orta saha), **AM** (10 numara).

Varsayılan uyumluluk (**onaylandı, 2026-11-18**; veri üretiminde her oyuncu için ayrıca kontrol edilir):

| Oyuncunun ana mevkisi | Oynayabileceği pozisyonlar (varsayılan) |
|---|---|
| GK | GK |
| CB | CB (bazıları DM) |
| LB / RB | LB, LWB / RB, RWB |
| DM | DM, CM (bazıları CB) |
| CM | CM, DM veya AM (oyuncuya göre) |
| AM | AM, CM (bazıları LW/RW) |
| LW / RW | LW, LM / RW, RM (bazıları ST veya LWB/RWB) |
| ST | ST (bazıları LW/RW) |

**Ceza katsayısı yoktur.** Oyuncunun bir pozisyondaki verimi, o pozisyonun sahada gerektirdiği yeteneklerden kendiliğinden çıkar. Kanat bek pozisyonundaki bek, hücumda orta ve hız yetenekleriyle değerlendirilir; orta yeteneği düşükse zaten verimsiz olur. "Bazıları" ile belirtilen ek pozisyonlar, oyuncunun kariyerinde o pozisyonda gerçekten oynamış olmasına göre verilir.

Dizilişlerin sahada birbirine benzememesi pozisyonların farklı davranmasıyla sağlanır (4.5). Örneğin LWB hücumda kanat oyuncusu gibi ileri çıkar, savunmada beşli hattın parçasıdır; LM ise dörtlü orta sahanın genişliğidir ve savunmada bek önünde durur.

### 2.5 Ayak ve boy

Yeni yetenek eklenmez. Oyuncu verisinde iki alan bulunur, bunlar mevcut yeteneklerin **kullanım koşullarını** değiştirir:

- **Baskın ayak:** sağ / sol / iki ayak (veriden gelir).
- **Zayıf ayak seviyesi:** 1–5 (biz üretiriz; iki ayaklı oyuncular 5).

Etkileri:
- **Aksiyon seçimi (4.2):** ters ayaklı kanatçı (örneğin sağ kanatta solak) içeri kat edip şut çekmeye ya da ara pasına daha çok yönelir. Doğal ayaklı kanatçı çizgiye inip orta açmaya yönelir. Bu, yetenek tercihinin (%30) parçasıdır.
- **Başarı:** aksiyon zayıf ayakla yapılmak zorundaysa (topun konumuna ve yönüne göre belirlenir), ilgili yeteneğin S değeri zayıf ayak seviyesine göre düşer. Seviye 5'te kayıp yoktur. Kaybın büyüklüğü matematik bölümünde belirlenir.
- **Şut açısı:** ters ayaklı oyuncunun kat ederek çektiği şut uzak köşeye daha kolay yönelir (5.5).

**Boy** veriden gelir ve hava topu mücadelesinde (5.3) **ayrı ve küçük** bir fiziksel etki olarak kullanılır:
- 190 cm ve hava topu 75 olan oyuncu fiziksel avantajını kullanabilir;
- 175 cm ve hava topu 90 olan oyuncu zamanlama ve sıçrama becerisiyle kazanabilir.

Boy etkisi sınırlıdır ve hava topu yeteneğinin önüne geçmez. Hava topu yeteneği boydan türetilmediği için (2.2) aynı özellik iki kez sayılmaz.

## 3. Saha ve dizilişler

### 3.1 Bölge ızgarası

- Saha **6 boy × 5 en = 30 bölge**. Boyda: kendi ceza sahası, kendi yarı alanı (2), rakip yarı alanı (2), rakip ceza sahası. Ende: sol kanat, sol iç, merkez, sağ iç, sağ kanat.
- **Bölge + koordinat (hibrit):** her oyuncunun ve topun her an **sürekli bir konumu (x, y)** vardır; saha 105 × 68 metre olarak modellenir. Bölge, bu konumdan türetilir.
  - **Bölgeler** stratejik yerleşimi taşır: diziliş şablonları (4.5.1), kayma, hangi bölgenin boş kaldığı, istatistikler.
  - **Koordinatlar** geometrik hesapları taşır: mücadeleye kimin gireceği (mesafe), pas hattındaki savunmacılar, ofsayt (5.6), şut açısı ve mesafesi, şutun yönü ve kalecinin erişimi (5.5).
  - Böylece aynı bölgedeki iki oyuncudan biri savunma çizgisinin önünde, diğeri arkasında olabilir; ofsayt buna göre doğru hesaplanır.
- 2D ekran oyuncuları koordinatlarına göre çizer; ızgara arka planda silik durur.

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

`P(başarı) = 1 / (1 + e^-(k·(S − D) − B))`

- **S:** saldıranın ilgili yetenek(ler)inin ağırlıklı değeri. Kimya katkısı dahildir; 99'u aşabilir. Örnek: hava topu mücadelesinde `S = 0,7 × Hava topu + 0,3 × Güç`. Bu yalnızca bir örnek; gerçek ağırlıklar her mücadele tipi için matematik bölümünde gerekçeleriyle belirlenir.
- **D:** savunanın ilgili yetenek(ler)i. Baskısız aksiyonda D yerine aksiyonun **sabit zorluğu** kullanılır (mesafe, açı vb.).
- **B:** aksiyonun zorluğu (bölge, mesafe, açı, baskı, taktik etkileri). **B arttıkça başarı olasılığı azalır.** (Önceki revizyonlarda `+ b` yazıyordu; bu, zorluğun başarıyı artırması anlamına geliyordu ve düzeltildi.)
- **k:** farkın ne kadar belirleyici olduğu.

**Her etkenin tek yeri:** mesafe, açı, baskı ve savunmacı sayısı gibi bir etken ya D'ye ya da B'ye eklenir, **ikisine birden asla eklenmez.** Aynı dezavantaj iki kez hesaplanmaz. Kural:
- karşıdaki oyuncunun **yeteneği** D'ye girer;
- **durum** (mesafe, açı, ikincil savunmacı, taktik etkisi) B'ye girer;
- matematik bölümünde her mücadele tipi için hangi etkenin nerede olduğu tablo olarak yazılır.

**Aksiyona özel rastgelelik:** gerçekçi rastgelelik, bütün aksiyonlara eşit şans vermek değildir. Kısa pasla karşı karşıya pozisyonun belirsizliği aynı değildir. Bu yüzden **her aksiyon tipinin kendi k ve B değeri vardır.**
- Kolay ve tekrarlı aksiyonlarda (kısa pas, kontrol) k yüksektir: yetenek farkı belirleyicidir, sonuç öngörülebilirdir.
- Doğası gereği belirsiz anlarda (karşı karşıya, uzaktan şut, ikinci top) k düşüktür: zar daha çok söz sahibidir.

**Yetenek katlanmasının önlenmesi:** bir aksiyon zincirinde aynı yetenek gereğinden fazla halkada kullanılıp etkisi katlanmamalıdır. Her halkanın yetenek ağırlıkları zincir bütününde kontrol edilir. Örneğin orta zincirinde "orta" yeteneği sadece isabet halkasında kullanılır, topun düştüğü noktayı belirlerken ikinci kez kullanılmaz.

**Zincir olasılığı:** bir zincirdeki mücadelelerin başarı olasılıkları çarpılarak birleşir. Her halka %80 olsa bile 5 halkalı bir zincirin tamamlanma olasılığı `0,8^5 ≈ %33`'tür. Ama Draft XI'da halkalar birbirinden bağımsız değildir: bir aşamanın sonucu sonraki aşamanın koşullarını değiştirir (başarılı pas sonrası baskıdan kurtulan oyuncunun sonraki aksiyonu kolaylaşır; başarılı çalım sayısal üstünlük yaratır). Bu yüzden:
- her aşama ayrı ayrı ölçülür;
- zincirin toplam başarısı basit çarpımla değil, **gerçek simülasyonlardan** ölçülür;
- "zincir en zayıf halkası kadar güçlüdür" bir tasarım ilkesidir, hesaplama kuralı değildir.

Örneğin bir takımın kendi yarı sahasından rakip ceza sahasına ulaşma oranı gerçek futbol aralığında olmalıdır (laboratuvar, bölüm 10).

Sonra 0–1 arası bir zar çekilir. Zar P'den küçükse saldıran kazanır.

- Ayrı bir "hata zarı" yoktur. Kötü pas, kontrol kaybı gibi hatalar kaybedilen mücadelelerdir. Baskısız aksiyonlar da sabit zorluğa karşı aynı formülle çözülür (kolay geri pas neredeyse her zaman başarılıdır, zor uzun pas sık kaçar).
- k ve B değerleri bu belgenin "matematik" bölümünde (sonraki adım) gerekçeleriyle yazılacak. Kontrol ölçütü gerçek futbolun olay sıklıklarıdır (aşağıda 9.2).

### 4.4 Topsuz yer alma

- Temel yer dizilişten gelir; taktik (hücum yönü, tempo, hat yüksekliği) kaydırır. Ayrıntısı 4.5'te.
- Her aksiyonda, aksiyonun hedef bölgesindeki ve yakınındaki hücumcular için **pozisyon alma** ile en yakın savunmacının **markajı** karşılaşır. Kazanan hücumcu "boşta" sayılır: pas seçeneklerinde öne çıkar ve pası alırken baskı görmez.

### 4.5 Oyuncu hareketi ve konumlandırma

> Motorun temeli. Kim kiminle karşılaşacak, pas seçenekleri ve kontra boşlukları buradan doğar. Kurallar 2026-11-18 soru–cevap oturumunda belirlendi.

Oyuncular dizilişte duran diskler değil, futbol oynayan birimlerdir. Her oyuncunun her anda bir **hedef konumu** ve bir **hareket davranışı** vardır. Hedef konum üç katmandan hesaplanır:

1. **Top bizdeyken temel pozisyon:** dizilişin **hücum şablonu**, taktikle kaydırılmış hali.
2. **Top rakipteyken temel pozisyon:** dizilişin **savunma şablonu**, taktikle kaydırılmış hali.
3. **Dinamik hareket:** temel pozisyondan, topun konumuna ve oyunun anına göre kayma (aşağıdaki kurallar).

Bu hareketler sadece animasyon değildir: kim kiminle karşılaşacak, hangi bölge boş kalacak, bunlar doğrudan buradan çıkar ve mücadele matematiğine girer. Oyuncular hiçbir zaman rastgele konum değiştirerek simüle edilmez; her hareketin bir kuralı vardır.

**Topsuz davranışlar yeteneklerin sonucudur, ayrı mekanik değildir.** Forvetin savunmacının arkasında kaybolması, orta sahanın baskıdan kurtulmak için yana açılması, bir oyuncunun savunmacıyı üzerine çekip arkadaşına alan açması ayrı ayrı modellenmez. Bunlar **pozisyon alma** (doğru boşluğu bulma ve zamanlama) ile **vizyon** (taşıyıcının bu hareketleri görmesi) yeteneklerinin sonucunda ortaya çıkar.

#### 4.5.1 Diziliş şablonları

Her dizilişin iki şablonu vardır; 17 diziliş × 2 = 34 şablon. Şablon her pozisyonun ızgaradaki temel bölgesini verir. Dizilişlerin sahada gerçekten farklı davranması bu şablonlardan gelir. Örnekler:
- **4-3-3:** top bizdeyken bekler ileri çıkar, 6 numara stoperlerin önünde kalır (yaklaşık 2-3-5); top rakipteyken kanatçılar geri iner (4-5-1).
- **3-5-2:** top bizdeyken kanat bekler en ileride genişlik verir (3-2-5); top rakipteyken kanat bekler hatta iner (5-3-2).

Taktik şablonu kaydırır: hücum yönü ve tempo hücum şablonunu; hat yüksekliği, pres ve kapatılan alan savunma şablonunu.

#### 4.5.2 Kayma

Takım, topun bulunduğu tarafa blok halinde kayar. Kayma miktarını **kapatılan alan** ayarı belirler:
- **Dengeli:** orta düzeyde kayma.
- **Kanatlar:** topun olduğu kanada güçlü kayma (2'ye 1); karşı kanat boşalır.
- **Merkez:** dar blok; kanatlara az kayma.

Karşı tarafın boşalması, oyun değiştiren uzun pasların değerini doğal olarak üretir.

#### 4.5.3 Bireysel hücum hareketleri

- **Bek bindirmesi:** hücum yönü o kanatsa ve top o taraftaysa bek ileri çıkar; karşı bek geride kalır ve savunma üçlü olur. Hızlı bek daha sık ve daha ileri çıkar, çünkü geri dönebilir. Kanat bek (LWB/RWB) her zaman daha ileridedir.
- **Arka kapatma:** ileri çıkan bekin arkasını dizilişte DM varsa o kapatır (stoperlerin arasına ya da yanına iner). DM yoksa yakın stoper kanata kayar, diğer stoperler de kayar. Böylece bindirmeden sonra savunma üçlü kalır. Boşluğa yapılan kontrada bu oyuncunun hızı ve markajı belirleyicidir.
- **Forvet:** orta saha topu aldığında forvetin hareketi bitiriş tercihine ve yeteneğine göre değişir:
  - "Ara pası" seçiliyse ve forvet hızlıysa savunma arkasına koşar;
  - "Orta" seçiliyse ceza sahasına girer;
  - kısa pas oyununda ve forvet güçlü, ilk dokunuşu iyiyse topa gelip duvar olur.

  Koşunun zamanlaması pozisyon alma yeteneğinden gelir (ofsayt, 5.6).
- **Kanat oyuncusu (top merkezdeyken):** ters ayaklı kanatçı içeri girer (şut ve ara pası alanı), doğal ayaklı kanatçı çizgide genişlik verir. Arkadaki bek bindirdiyse kanatçı içeri girer ve genişliği bek alır.
- **Orta sahalar (top bizdeyken):**
  - **DM** stoperlerin önünde pas istasyonu olur;
  - **CM**'ler pas üçgenlerini kurmak için topa yakın bölgelere açılır (kısa pasta daha yakın, uzun pasta daha ileri);
  - **AM** rakip orta saha ile savunma arasındaki boşlukları arar.

  Pozisyon alma, doğru boşluğu ne kadar sık bulduklarını belirler.
- **Kanat bekler (3'lü / 5'li dizilişler):** iki yönlü oynar. Top bizdeyken kanat oyuncusu gibi en ileride genişlik verir; top rakipteyken savunma hattına inip beşli oluşturur. Geçişte en uzun yolu koşan oyuncudur; hızı ve dönüş süresi kanadın kapanıp kapanmayacağını belirler.

#### 4.5.4 Çakışma: iki oyuncu aynı bölgeye yönelirse

Doğru seçimi **pozisyon alma** yeteneği belirler. Pozisyon alması yüksek oyuncu boşluğu doğru okuyup komşu bölgeye kayar. Düşükse iki oyuncu aynı yere yığılabilir. Bunun iki sonucu olabilir:
- **avantaj:** o bölgede sayısal üstünlük (örneğin kanatta 2'ye 1);
- **dezavantaj:** başka bir yerde boşluk (pas seçeneği eksilir, top kaybında açık kalan bölge).

Böylece pozisyon alma yeteneğinin takım düzenine de görünür bir etkisi olur.

#### 4.5.5 Destek ve pas üçgenleri

Taşıyıcının çevresindeki takım arkadaşları pas seçeneği oluşturur. Bir seçeneğin değeri, o arkadaşın boşta olup olmamasına (4.4), uzaklığına ve pas hattındaki savunmacı sayısına bağlıdır. Kısa pas oyunu, bu üçgenler kurulabildiği ölçüde anlam kazanır. Dizilişin ve pas tarzının üçgen kurma kapasitesi farklıdır.

#### 4.5.6 Savunma hareketleri

- **Savunma çizgisi:** temel yükseklik hat ayarından gelir. Top sahibine baskı yoksa (uzun pas atabilir) çizgi geri çekilir; baskı varsa ileri çıkar. Çizgi birlikte hareket eder ve ofsayt geometrisi (5.6) buna bağlıdır. Markajı düşük stoper çizgiyi bozabilir.
- **Alan savunması, devir teslim:** savunmacı kendi bölgesindeki rakibi takip eder; rakip bölgeden çıkınca bir sonraki bölgenin savunmacısına devreder. Devir anında markajı düşük oyuncular koşucuyu kaçırabilir ve rakip boşta kalır. Hücumcu iki bölge arasındaki boşluğu bulursa pozisyon alma yeteneği işe yarar.
- **Pres tetikleyicileri:** rakip topu çizgi kenarında, sırtı dönük, kötü kontrolle ya da geri pasla aldığında pres olasılığı artar. Yoğun preste bu anların hepsinde, az preste sadece en belirgininde basılır. Pres yoğunluğu ayrıca topa yakın bölgelere kaç oyuncunun kayacağını belirler (4.6, 5.2).
- **Hücum oyuncularının savunması:** savunma şablonu yerlerini belirler (4-3-3'te kanatçılar 4-5-1'e iner, forvet ilk presi yapar). Yoğun preste forvetler stoperlere bastırır, az preste orta çizgide bekler. Kanatçının geri dönüş süresi hızına bağlıdır.

#### 4.5.7 Geçişler

- **Top kaybı:** topa en yakın oyuncu hemen baskı yapar (yoğun preste iki oyuncu). Diğerleri savunma şablonundaki yerlerine döner; dönüş süresi mesafeye ve hıza bağlıdır. Dönmeyen oyuncuların bıraktığı bölgeler rakip kontrası (5.4) için açık kalır. İleri çıkmış bekler ve orta sahalar en geç dönenlerdir.
- **Top kazanma (kontra):** top kazanıldığı anda ileride olan hücumcular (forvet, kanatlar, AM) kontraya koşar; arkadan hızlı bir orta saha ya da bek de katılabilir. Savunmacılar yerinde kalır. Sayısal durum (örneğin 3'e 2) bu dağılımdan doğar.

#### 4.5.8 Kaleci ile oyun kurma

Kaleci topu aldığında seçimini **pas tarzı** ve **rakibin presi** belirler:
- kısa pas tarzında stopere ya da beke kısa çıkış; rakip yoğun pres yapıyor ve stoperler kapalıysa uzun degaja döner;
- uzun pas tarzında forvete ya da kanada degaj;
- karışık tarzda boştaki oyuncuya göre seçer.

Kısa çıkışta rakip presini aşmak ayrı bir mücadeledir: pas hattındaki presçiler ve alıcının ilk dokunuşu. Uzun degajda hedef oyuncu hava topu ve güç mücadelesine girer. Kalecinin ayakla oyun yeteneği olmadığı için kısa pas isabeti sabit bir zorlukla çözülür.

#### 4.5.9 Ceza sahası içi yerleşim (orta ve korner)

Orta ya da korner geldiğinde herkes topa koşmaz. Oyuncular **yeteneklerine göre otomatik** olarak dört noktaya dağılır:
- **Hücumda:** hava topu en iyi oyuncu penaltı noktasına, ikinci en iyi yakın ya da arka direğe gider; uzaktan şutu iyi oyuncu seken top bölgesinde (ceza sahası önü) bekler.
- **Savunmada:** hava topu en iyi oyuncular en tehlikeli noktalara yerleşir, biri yakın direği tutar.
- **Kornerde hücuma çıkan oyuncu sayısı** hat ayarına bağlıdır:
  - yüksek hat: iki stoper dahil kalabalık çıkılır (daha çok kafa şansı, kontra riski);
  - alçak hat: bir stoper çıkar, üç oyuncu kontraya karşı geride kalır;
  - orta hat: ikisinin arası.

Kim kime karşı çıkacağı bu dağılımdan, topun düştüğü nokta (5.3) da hangi eşleşmenin mücadeleye gireceğini belirler.

#### 4.5.10 Hareket motorunun matematiği

Yukarıdaki davranışların nasıl hesaplanacağı:

**Yeniden değerlendirme sıklığı:** her aksiyonun başında (top bir oyuncudan diğerine geçtiğinde, bir mücadele sonuçlandığında) bütün oyuncuların hedef konumu yeniden hesaplanır. Motor saniye saniye değil aksiyon aksiyon ilerlediği için bu yeterlidir.

**Hedef konum** dört katmanın toplamıdır:
1. şablon konumu: dizilişin hücum ya da savunma şablonundaki bölgenin merkezi (4.5.1);
2. taktik kaydırması: hücum yönü, tempo, hat yüksekliği, kapatılan alan (4.5.2);
3. top çekimi: topa yakın oyuncular topa doğru çekilir; çekim topa olan mesafe arttıkça azalır;
4. görev: oyuncunun o anki görevi (aşağıdaki öncelik sistemi) hedefi kendi noktasına taşır, örneğin marke edilen rakibin yanı ya da kapatılan boş alan.

**Hedefe ulaşma süresi:** `süre = mesafe / koşu hızı`. Koşu hızı **Hız** yeteneğinden doğrusal olarak türetilir: yaklaşık 1 hız → 6 m/s, 99 hız → 9,5 m/s. Aksiyonun süresi (4.7) içinde hedefe yetişemeyen oyuncu, aksiyon anında yolun bir kısmındadır. Kim mücadeleye girer, kim geç kalır, kontrada kimin döneceği bundan çıkar.

**Savunmada öncelik sistemi:** bir savunmacının aynı anda birden fazla görevi olabilir (örneğin 6 numara hem merkezdeki rakibi marke ediyor hem ileri çıkan bekin arkasını kapatmalı). Her görev bir **tehdit puanı** alır, savunmacı en yüksek puanlı görevi seçer:
1. **Topu taşıyan rakibe baskı:** en yakın savunmacının birinci görevi (pres yoğunluğu ikinci presçiyi ekler).
2. **Kaleye en yakın boştaki tehdit:** rakip kaleye yakın ve boştaysa puanı çok yüksektir.
3. **Topun gidebileceği boş alan:** bindirme sonrası açılan alan gibi; puanı, topun oraya gitme ihtimaline ve alanın kaleye yakınlığına bağlıdır.
4. **Marke edilen oyuncu:** bölgedeki rakibi takip; puanı, rakibin kaleye yakınlığına ve topa uzaklığına bağlıdır.

Taktik puanları kaydırır: "kapatılan alan" ilgili koridordaki alan görevlerinin puanını artırır.

**Doğru seçimi okumak:** savunmacı tehdit puanlarını her zaman doğru göremez. En yüksek puanlı görevi seçme olasılığı **Markaj** (savunmada konum okuma) ve **Pozisyon alma** yeteneklerine bağlıdır. Yetenek düşükse daha düşük puanlı görevi seçebilir; örneğin merkezdeki rakibi bırakmaz ve bekin arkası açık kalır. Bu, 4.5.4'teki çakışma kuralının savunmadaki karşılığıdır.

**Hücumda çakışma:** iki oyuncu aynı hedef noktaya yöneldiğinde, hedefi daha yüksek pozisyon alma değerine sahip olan doğru okur. Diğeri bir olasılıkla komşu boş noktaya kayar, aksi halde yığılma olur (4.5.4).

### 4.6 Savunmanın üç katmanı

Futbolda bir mücadele her zaman iki oyuncu arasında geçmez. Savunma üç katmanda değerlendirilir:

1. **Birincil savunmacı:** doğrudan mücadeleye giren oyuncu (çalıma müdahale eden, pası alan oyuncuya baskı yapan).
2. **İkincil savunmacı:** yakındaki destek; alanı daraltır, çalımdan sonraki kaçış yolunu kapatır.
3. **Takım savunması:** pas koridorlarının kapatılması; taşıyıcının pas seçeneklerini azaltır.

**Kural: üç katmanın değerleri toplanıp tek bir D olarak hücumcunun karşısına konmaz.** Toplamak savunmayı aşırı güçlü yapar. Her katmanın katkısı ayrı hesaplanır:
- birincil savunmacı mücadelenin D'sidir;
- ikincil savunmacı B'ye sınırlı bir zorluk ekler ve başarılı çalımdan sonra yeni bir mücadele fırsatı yaratabilir;
- takım savunması aksiyon seçiminde (4.2) pas seçeneklerinin sayısını ve kalitesini düşürür.

Böylece 95 top kapma yeteneğine sahip bir orta saha yanlış konumlanmışsa rakibin pas oyununu engelleyemez: birincil savunmacı olamaz, en fazla ikincil katkı yapar.

### 4.7 Maç saati

İki saat birbirinden **tamamen bağımsızdır**:
- **Simülasyon saati:** futbol maçının 90 dakikası. Motor maçı bu saatle baştan sona hesaplar.
- **Gerçek zaman:** kullanıcının ekranda geçirdiği 2–3 dakika. Ekran, motorun ürettiği olay kaydını (13.2) bu süreye sığacak şekilde oynatır; önemsiz anları hızlı geçer, tehlikeli anları yavaşlatır.

Gösterim hızı hiçbir zaman simülasyonu etkilemez.

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
- Kalibrasyon ölçütü: takım başına topa sahip olma sayısı (45–70), aksiyon başına süreler ve duran top / ölü top süreleri **birlikte** simüle edilip gerçek futbol aralıklarında olmalı. Aksi halde 90 dakika ya çok erken biter ya da gereğinden fazla pozisyon oluşur.

## 5. Aksiyon zincirleri

### 5.1 Pas (kısa / uzun)

1. **Araya girme:** pasın geçtiği bölgelerdeki ve hedef bölgedeki en yakın savunmacılar araya girmeyi dener.
   - Pasçının yeteneği: kısa pas veya uzun pas, vizyonla birlikte.
   - Savunmacının yeteneği: markaj + top kapma.
   - Mesafe uzadıkça ve hattaki savunmacı sayısı arttıkça zorlaşır.
2. **Kontrol:** alıcının ilk dokunuşu, yanındaki savunmacının baskısına karşı (top kapma + hız). Alıcı boştaysa sabit zorluğa karşı çözülür. Uzun toplarda zorluk daha yüksektir; havadan gelen uzun topta hava topu + güç mücadelesi de olur.
3. **Ara pası:** hedef koşu yapan oyuncudur.
   - **Zamanlama:** pasçının vizyonu ile koşucunun pozisyon alması birlikte çalışır. Vizyon, pasın doğru anda ve doğru boşluğa atılmasını; pozisyon alma, koşunun doğru anda başlamasını belirler. İkisi de yüksekse pas, koşucu çizgiyi geçtiği anda ve ofsayta düşmeden ulaşır. Biri düşükse ya ofsayt (koşu erken, pas geç) ya da kesilen pas (koşu geç) olur. Ayrıntısı 5.6'da.
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
3. **Hava mücadelesi:** topun düştüğü noktaya en yakın hücumcu(lar) ile savunmacı(lar) karşılaşır. Yetenekler: hava topu + güç, hücumcular için ayrıca pozisyon alma. **Boy** iki oyuncu arasındaki farka göre küçük ve ayrı bir etki olarak eklenir (2.5). Kaleci hava toplarıyla çıkıp topu alabilir (kaleciye yakın düşen toplarda).
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
4. **Şutun yönü:** şut kalitesi, topun kalede hangi noktaya gittiğini belirler: köşeye yakın mı, kalecinin üzerine mi? Ters ayaklı oyuncunun kat ederek çektiği şut uzak köşeye daha kolay yönelir (2.5). Kalite iki kez sayılmaz: kalite noktayı belirler, noktanın zorluğu ayrıca eklenmez.
5. **Kaleci erişimi:** kalecinin o andaki konumu, pozisyon yeteneğine ve şutun açısına göre belirlenir. Kaleci şutun gittiği noktaya ne kadar yakınsa kurtarış o kadar kolaydır. Aynı kalitede iki şuttan kalecinin uzanabileceği köşeye gideni, yetişemeyeceği köşeye gidenden daha sık kurtarılır.
   - Kurtarış mücadelesinde kullanılan yetenek şut tipine göre değişir: yakın ve sert şut → refleks; uzaktan veya açılı → pozisyon; kafa → hava topları + pozisyon; karşı karşıya → bire bir.
6. **Kurtarışın türü ve sekme:** kaleci kazanırsa kurtarışın türü belirlenir: tutuş, çelme ya da kornere çelme. Bunu kalecinin üstünlük farkı ve şutun sertliği belirler: zayıf şut genelde tutulur, sert şut çelinir. Çelinen topun düştüğü yer şutun yönüne ve kurtarışın türüne göre hesaplanır ve ikinci top (5.7) doğar.

### 5.6 Ofsayt (geometrik)

Ofsayt bir hız yarışı değil, **pasın atıldığı andaki konuma bağlı bir kuraldır.** Motor şu sırayı izler:

1. Pasın atıldığı anı belirle.
2. Hücumcunun konumunu belirle.
3. Topun konumunu belirle.
4. Rakip kale çizgisine göre sondan ikinci rakibin (genelde en geri stoperin) konumunu belirle.
5. Ofsayt konumunu kontrol et: hücumcu o anda topun ve sondan ikinci rakibin önündeyse ofsayttır.
6. Ofsayt değilse koşu ve hız avantajını hesapla.

- Kontrol koordinatlarla yapılır (3.1): pas anında koşucunun, topun ve sondan ikinci rakibin boydaki konumları karşılaştırılır. Savunma çizgisinin konumunu hat yüksekliği ve topun yeri belirler.
- **Pozisyon alma yeteneği koşunun zamanlamasını belirler:** iyi pozisyon alan forvet koşuya doğru anda başlar ve ofsayta düşmeden çizgiye en yakın yerden çıkar. Kötü zamanlama ya ofsayt ya da geç ve verimsiz koşu demektir.
- Yüksek hat ofsayt ihtimalini artırır. Ama tuzak bozulursa, yani koşucu doğru zamanladıysa, koşucu arkada boş alanla karşı karşıya kalır ve hız yarışı başlar (yüksek riskli büyük fırsat).
- **Koşu ve pas zamanlaması:** pasçının vizyonu pasın atılma anını, koşucunun pozisyon alması koşuya başlama anını belirler. 95 vizyonlu bir oyuncu 95 pozisyon almalı bir forvete doğru zamanda pas atabilir. Forvet erken koşarsa ofsayta düşer, geç koşarsa savunmacı pası keser ya da forvete yetişir.

Gerçek futbol kuralları ve istisnaları:
- **Kendi yarı sahası:** oyuncu kendi yarı sahasındaysa ofsayt olamaz.
- **Taç, kale vuruşu ve korner:** doğrudan bu atışlardan gelen topta ofsayt yoktur.
- **Topun gerisinde olmak:** pas anında topun gerisindeki oyuncu ofsayt değildir.
- **Ofsayt konumu ile aktif oyun:** ofsayt konumunda bulunmak tek başına ihlal değildir. Oyuncu ancak topa oynar veya oyuna müdahale ederse (topu alır, kaleciyi engeller) ofsayt verilir. Ofsayt konumunda kalıp oyuna katılmayan oyuncu cezalandırılmaz; motor topun kime gittiğine göre karar verir.
- **Savunmacının oynadığı top:** savunmacının bilinçli oynadığı bir top (pas, kontrol, uzaklaştırma girişimi) ofsaytı sıfırlar. Seken top (blok, kurtarış) ofsaytı sıfırlamaz; pas anındaki konum geçerli kalır.
- **Sonuç:** ofsayt verilirse savunan takım ihlalin olduğu yerden serbest vuruş kullanır.

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

Her ayarın **sahada net bir karşılığı** ve **kendine özgü bir riski** var. Tablolar etkinin yönünü gösterir; büyüklükleri 14.4'te (ayar başına ~15 puan, birleşik en fazla 25).

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
- **Kapsam (karar, 2026-11-18):** kimya ikili aksiyonlara (iki oyuncu arasındaki pas, orta vb.) ayrıca bağlanmaz. Tek etkisi oyuncu yeteneklerine yaptığı artıştır.
- Kimya inceleme ekranı, en etkili üç bağlantıyı ve yeteneklerin kimya öncesi/sonrası değerlerini göstermeye devam eder.

## 8. Modlar ve akış

- **Akış:** draft (şimdiki akış) → taktik (diziliş + 9 ayar) → maç → maç sonu.
- **Bota karşı:**
  - *Kolay:* draftta mevkiyi dolduran makul rastgele seçimler yapar, taktiği makul ve rastgeledir.
  - *Orta:* bir oyun tarzı seçer (örneğin kanat ortası) ve draftta buna uygun yetenekleri alır; taktiği kendi güçlü yanlarına göredir.
  - *Zor:* tarzına uygun oyuncu seçer, kimyayı kollar, senin seçtiğin oyunculara göre counter düşünür. Taktiği hem kendi gücüne hem senin kadronun zayıflıklarına göre seçer.
  - Bot hiçbir zorlukta senin **taktik** seçimini görmez; sadece kadronu görür.
  - **Pozisyon uygunluğu (sadece bot için):** botun "bu oyuncu bu pozisyona ne kadar uygun" diye karar verebilmesi için her pozisyona yetenek ağırlıkları tanımlanır (örneğin AM: vizyon, kısa pas, ilk dokunuş, pozisyon alma; LWB: hız, orta, top kapma, markaj). Bu ağırlıklar **motorda kullanılmaz** ve oyuncuya genel güç olarak gösterilmez; motorda verim, sahada girilen mücadelelerin yeteneklerinden kendiliğinden çıkar.
- **Aynı telefonda 2 kişi:** draft sırayla yapılır. Taktikte Oyuncu 1 seçer, "Telefonu Oyuncu 2'ye ver" perdesi gelir, sonra Oyuncu 2 seçer. Maç başlayınca iki taktik de açılır.
- **Online 1v1:** draft bitince rakip kadro görünür. İki taraf aynı anda 90 sn içinde taktik seçer; süre biterse son kaydedilen ya da varsayılan dengeli taktikle oynanır. Maçı ev sahibi cihaz hesaplar, rakip cihaz oynatır ve doğrular (13.3).
  - **Bağlantı koparsa:** taktik seçimi sırasında kopan oyuncuya yeniden bağlanması için **30 saniye** tanınır; seçim süresi bu sırada durur. 30 saniyede dönmezse son kaydedilen ya da varsayılan dengeli taktikle oynanır. Maç zaten iki cihazda aynı tohumla hesaplandığı için (13.3) maç sırasında kopan oyuncu geri döndüğünde maçı kaldığı yerden izler; sonuç değişmez.
- **Parti turnuvası:** mevcut parti ve turnuva altyapısı. Elemede beraberlik direkt penaltıyla çözülür. Penaltılar penaltıcının bitiriciliği ile kalecinin bire birinin karşılaşmasıdır; atıcı sırası otomatiktir (bitiricilik sırası).

## 9. Ekranlar

### 9.1 Maç ekranı

- **Sol:** dikey 2D saha. Kaleler üstte ve altta, numaralı neon diskler, top, pas çizgileri. Mücadele anında iki oyuncu vurgulanır. Sahanın üstünde skor, dakika ve baskı barı.
- **Orta:** spiker. Canlı ve taktiğe bağlıdır: mücadele detayını ve ara ara taktik gözlemlerini anlatır ("Sağ kanat atakları işliyor: 6 ortadan 4'ü isabetli").
  - **Spiker "neden"i anlatır.** Spiker sadece ne olduğunu değil, **neden olduğunu** da söyler. Böylece oyuncu her olayın kendi seçimlerinin (kadro, taktik, kimya) ve rakibin seçimlerinin sonucu olduğunu görür, motorun derinliği hissedilir. Sebepler olay kaydındaki (13.2) gerçek verilerden gelir, uydurulmaz. Örnekler:
    - *Konumlanma:* "Bek bindirdi, arkasını kapatacak 6 numara yetişemedi; kontra tam o boşluktan geldi." / "Stoper koşucuyu devrederken kaçırdı, forvet bomboş kaldı."
    - *Çakışma:* "İki orta saha aynı bölgeye yığıldı, sol iç koridor boş kaldı."
    - *Taktik:* "Rakip kanatları kapattı, ortalar artık ceza sahasına ulaşmıyor." / "Yüksek hat bir kez daha ofsayt tuzağı kurdu, ama Mbappé koşuyu doğru zamanladı."
    - *Yetenek karşılaşması:* "Haaland hava topunda Van Dijk'i geçti (%58)." / "Ters ayaklı kanatçı içeri kat edip uzak köşeye vurdu."
    - *Kimya:* "Eski takım arkadaşları Saka ile Ødegaard'ın paslaşması yine işledi."
  - Spiker her olayda değil, **anlamlı anlarda** sebep söyler: goller, büyük fırsatlar, top kayıpları sonrası kontralar, taktik bir örüntü oluştuğunda (örneğin aynı koridordan üst üste atak). Ayrıca ara ara toplu gözlem yapar: "Son 15 dakikada sağ koridordan 6 atak geldi; rakibin sol beki hızda yetişemiyor."
  - **Komik yorumlar (absürt mizah katmanı):** spiker ara sıra sokak ağzıyla, abartılı ve absürt yorumlar yapar. Bu oyuna kimlik katar. Kurallar:
    - **Olaya bağlıdır:** her espri bir olay tipine bağlıdır ve sadece o olay olduğunda çıkar. Örnekler:
      - *sert şut:* "Gavura vurur gibi vurdu!!"
      - *şaşırtıcı an (beklenmedik kurtarış, çalım, ters köşe):* "Vay babayın düşmanlarına!!!"
      - *sert müdahale:* "Lülülülü, doktor yok mu doktor!"
      - kaçan net gol, kaleci hatası, ofsayt tuzağına düşme, direk gibi olaylar için de espri havuzu olur.
    - **Seyrek ve tekrarsız:** maç başına birkaç kez (örneğin 90 dakikada 3–5); aynı espri aynı maçta tekrar etmez. Sık kullanılırsa etkisini kaybeder.
    - **Sebebi bozmaz:** espri, sebep anlatımının (yukarıda) yerine geçmez, onun yanında gelir. Örnek: "Gavura vurur gibi vurdu!! Uzaktan şut 91, kaleci pozisyonda yakaladı ama tutamadı, korner."
    - **Seçilmiş havuz:** espriler ayrı bir metin dosyasında (olay tipi → satırlar) tutulur. Kullanıcı ekleyip çıkarabilir; motor kodu değişmez.
    - **Ayar:** ayarlarda "Komik yorumlar: açık / kapalı" seçeneği olur. Varsayılan açık.
    - **Not (yayın öncesi kontrol):** mobil mağazalarda yayınlanacağı için havuzdaki her satır bir kez gözden geçirilir. Bir grubu aşağıladığı şeklinde okunabilecek ifadeler (örneğin "gavur" bazı kişilerce gayrimüslimlere yönelik aşağılayıcı bulunabilir) için karar kullanıcınındır; istenirse yerine aynı tadı veren alternatifler konur ("Kale direğini söküyordu!!").
- **Sağ:** taktik ve istatistik. İki takımın taktikleri gösterilir (rakibinki maç başında açılır). Canlı istatistikler: koridor başına atak, orta, ikili mücadele başarı oranları, şut ve isabet.
- **Panel davranışı:** her panelde **tam ekran** ve **kapat** tuşu var. Kapatılan panelin yeri kalan panellere paylaştırılır; kapatılan panel bir tuşla geri açılır.
- **Dar ekran (dikey telefon):** saha + spiker açık başlar, taktik paneli bir dokunuşla açılır. Yan çevrilmiş telefonda, tablette ve masaüstünde üç panel açık başlar.
- Önemli anlar (gol, büyük kurtarış, kırmızı kart) sahanın üzerinde kısa yazıyla vurgulanır.
- **Hızlı izleme:** maç sırasında **1x / 2x** hız tuşu ve **"Sonuca atla"** tuşu vardır. Motor maçı zaten baştan sona hesapladığı için (13.4) bunlar sadece oynatmayı değiştirir, sonucu asla değiştirmez. "Sonuca atla" doğrudan maç sonu ekranına geçer. Online maçta her oyuncu kendi cihazındaki oynatma hızını seçer.

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
| Zincir olasılığı | Zincirlerin birleşik başarı oranları gerçekçi mi (örneğin kendi yarı sahadan ceza sahasına ulaşma oranı)? |
| Ayak testi | Baskın ve zayıf ayak beklenen etkiyi yapıyor mu (ters ayaklı kanatçı daha çok kat edip şut çekiyor mu, zayıf ayak isabeti düşürüyor mu)? |
| Boy / fizik testi | Boyun hava topu mücadelesine etkisi sınırlı mı, hava topu yeteneğinin önüne geçmiyor mu? |
| Mevki uyumluluğu | Oyuncunun listesindeki farklı pozisyonlarda verimi, o pozisyonun gerektirdiği yeteneklere göre doğal olarak değişiyor mu? |
| Kaleci ve şut yönü | Aynı kalitede şutlarda kalecinin konumu kurtarış oranını beklenen yönde değiştiriyor mu? |
| Pas ağı | Oyuncular birbirlerine destek ve pas üçgenleri oluşturuyor mu; dizilişler farklı pas ağları üretiyor mu? |
| Kimyanın toplam etkisi | Kimya katkısı (özellikle 99 → ~107) bazı oyuncu profillerini beklenenden fazla güçlendiriyor mu? |
| Motor performansı | Binlerce maç ne kadar sürede simüle ediliyor? Laboratuvarın ve meta avcısının çalışabileceği hızda mı? |
| Online tutarlılık | İki cihaz aynı tohum ve aynı girdilerle aynı olay kaydını üretiyor mu? |
| Tekrarlanabilirlik | Hata bulunan bir maç aynı tohumla birebir yeniden oynatılabiliyor mu? |

**Meta avcısının arama yöntemi:** sadece hücum ve savunma ayarlarının kombinasyonu 23.328, dizilişlerle birlikte yaklaşık 400 bin. Hepsini birbirine karşı oynatmak mümkün değil. Bu yüzden:
1. **Örnekleme:** rastgele seçilmiş taktiklerden bir başlangıç havuzu oluşturulur.
2. **Arama:** her adımda bir taktiğin tek bir ayarı değiştirilir. Değişiklik havuzdaki rakiplere karşı sonucu iyileştiriyorsa korunur (tepe tırmanma / evrimsel arama).
3. **Değerlendirme:** her karşılaşma çok sayıda farklı tohumla oynanır. Test başına maç sayısı, sonucun istatistiksel olarak anlamlı olmasına yetecek kadar seçilir; kesin sayı motor hızına göre belirlenir.
4. **Karar:** bulunan en iyi taktiklere karşı ayrıca en iyi cevap aranır. Her taktiğin onu yenen bir cevabı varsa meta yoktur. Yoksa rapor verilir ve mantığa gerçek bir counter eklenir (ilke 4).

### 10.1 Kabul kriterleri

Her test için başarı ölçütü ve örnek sayısı (başlangıç önerisi; motor hızı ölçülünce kesinleşir):

| Test | Başarılı sayılır | Örnek |
|---|---|---|
| Tekrarlanabilirlik | Aynı kadro + taktik + tohum, 100 tekrarda birebir aynı olay kaydı (hash) | 100 maç |
| Dağılım | Aynı kadrolar farklı tohumlarla: sonuçların yayılımı makul, tek bir skora yığılma yok | 1.000 maç |
| Olay sıklıkları | Gol, şut, isabet, faul, kart, pas isabeti gerçek futbol aralıklarında (14.5) | 10.000 maç |
| Yetenek izolasyonu | Bir yetenek 20 puan artınca ilgili istatistik beklenen yönde ve istatistiksel olarak anlamlı değişir | yetenek başına 2.000 maç |
| Taktik izolasyonu | Bir ayar değişince ilgili istatistik beklenen yönde değişir; etkisi olmayan ayar yok | ayar başına 2.000 maç |
| Meta avcısı | Bulunan en iyi taktiklerin her birini yenen bir cevap var | arama sonunda her aday için 5.000 maç |
| Senaryo testleri (6.3 gibi) | Beklenen yönde sonuç | senaryo başına 2.000 maç |
| Uç değer | 1'lik ve ~107'lik değerlerle motor hata vermez, olasılıklar 0–1 aralığında kalır | sınır kombinasyonları |
| Online doğrulama | Ev sahibi ve rakip cihazın hesapladığı olay kaydı özeti farklı tarayıcılarda aynı | 3 tarayıcı × 100 maç |
| Performans | Ekransız 1.000 maç makul sürede (örneğin bir dakikanın altında) | 1.000 maç |

## 11. Açık noktalar (kapatılacak)

> Kullanıcı kararı (2026-11-20): **hiçbir şey açıkta kalmayacak.** Aşağıdaki her madde soru–cevapla kapatılır; kapanan madde ✓ ile işaretlenir ve ilgili bölüme işlenir.

**Motor ve matematik**
1. Aksiyon seçiminin temel olasılıkları: hangi bölgede, hangi taktikle pas / taşıma / çalım / orta / şut seçeneklerinin ağırlıkları (4.2).
2. Her taktik ayarının tam olarak hangi mücadeleye ya da sıklığa etki ettiği ve sayısal büyüklüğü; 15 puanın hangi ayarlarda geçerli olduğu, tempo ve pas tarzı gibi sıklık ayarlarının etkisi (6, 14.4).
3. Zayıf ayak kaybının büyüklüğü: seviye 1–5 → S'den kaç puan düşer (2.5).
4. Maç saati: aksiyon sürelerinin aralıktan nasıl seçileceği (4.7).
5. Savunmada tehdit puanının formülü (4.5.10).
6. Savunmacının doğru görevi seçme olasılığı ve hücumda çakışmada kayma olasılığı: yetenekten olasılığa dönüşüm (4.5.4, 4.5.10).
7. Hedef konumda top çekiminin gücü (4.5.10).
8. Ofsayt zamanlama hatasının metre ölçeği (5.6, 14.6).
9. Pres tetikleyicilerinin olasılıkları: az / orta / yoğun preste hangi anda ne sıklıkla basılır (4.5.6).
10. İkinci topun düştüğü yerin dağılımı (5.7).
11. Kaleci çıkışları: ara pası ve uzun topa karşı kalecinin kalesini terk etmesi (süpürücü davranış).

**Kurallar ve duran toplar**
12. Kart kuralları: sarı ve kırmızı kart olasılıkları, "sert faul" tanımı (5.8).
13. Duran toplar: kornerde kısa / uzun seçimi, frikikte orta mı şut mu kararı, baraj sayısı, taç ve kale vuruşu ayrıntıları (5.9).

**Oyun ve veri**
14. Draft kuralları belgede yazılı değil ("şimdiki gibi"): seçim sırası, aday sayısı, süre, mevki zorunlulukları.
15. Havuz seçimi: 1000–1500 oyuncunun seçim ölçütü (tanınmışlık eşiği, mevki ve lig dağılımı).
16. Bot algoritmaları: orta seviyede "oyun tarzı" seçimi, zor seviyede counter hesabı; botun taktik seçimi.
17. Maç sonu oyuncu puanı ve maçın oyuncusunun formülü (9.2).

**Sunum**
18. Spiker: "anlamlı an" tanımı, sebep cümlelerinin şablon yapısı, taktik gözlemlerinin sıklığı (9.1).
19. Maç öncesi taktik ekranının içeriği (taslak çizildi, ayrıntılar ertelendi).
20. 2D sahanın görsel ayrıntıları: hız, animasyon, vurgu kuralları (taslak beğenildi, "daha düzgün yapılacak").

## 12. Yol haritası

Kodlamadan önce çözülecekler (sırasıyla):

1. **Oyuncu hareketi ve konumlandırma (4.5):** ✓ kurallar belirlendi (2026-11-18); ✓ 34 diziliş şablonu yazıldı (bölüm 15, 2026-11-20).
2. **Aksiyon ve mücadele zincirleri:** üç katmanlı savunma (4.6) dahil, her halkanın yetenek ağırlıkları.
3. **Şut ve gol hesaplaması (5.5):** isabet, kalite, kaleci, sekme.
4. **Ofsayt geometrisi (5.6).**
5. **Taktiklerin birlikte çalışma matematiği (6.4).**
6. **Motor mimarisi (13):** durum makinesinin durumları ve geçişleri, olay kaydının alanları, tohumlu rastgelelik.
7. **Matematik:** aksiyon başına k ve B değerleri (4.3), maç saati süreleri (4.7) ve taktik etki büyüklükleri gerekçeleriyle bu belgeye eklenir.

Sonra:

8. **Küçük prototip (önce bu):** 40–60 oyunculuk örnek havuz ve 3–4 diziliş ile motor + laboratuvar kurulur. Motor doğrulanmadan 1500 oyunculuk havuz ve 34 şablonun tamamı üretilmez.
9. **Veri:**
   - mevki uyumluluk listesi, baskın/zayıf ayak, boy ve kimya alanlarıyla 1000–1500 oyunculuk havuz;
   - yetenek değerlerinin üretimi;
   - tutarlılık testleri;
   - kulüp kulüp inceleme.
10. **Motor + laboratuvar (tam):** saf JavaScript modülü (ekransız), tohumlu rastgelelik, bölüm 10 testleri.
11. **Ekranlar:** draft (mevcut tasarım), taktik, maç (3 panel), maç sonu.
12. **Modlar:** bota karşı → aynı telefon → online 1v1 → parti turnuvası.
13. **Geçiş:** yeni sürüm eskisinin her modunu karşılayınca ana menü yeniye bağlanır. Eski çekirdek (`neon-xi-core.html`) ve yaklaşık 20 yama dosyası silinir.

## 13. Motor mimarisi

Futbolun nasıl oynanacağı yukarıdaki bölümlerde. Bu bölüm motorun bunu bilgisayarda nasıl yöneteceğini tanımlar.

### 13.1 Maç durum makinesi

Maçın her anı tek bir durumdadır ve durumlar arasındaki geçişler kurallarla tanımlıdır:

```
KICKOFF ──▶ POSSESSION ──▶ ACTION ──▶ CONTEST ──▶ RESULT
                ▲                                  │
                │      ┌───────────────────────────┤
                │      │ top tutuldu    → ACTION   │
                └──────┤ top kaybedildi → TRANSITION → POSSESSION (rakip)
                       │ şut            → SHOT → (gol → KICKOFF / kurtarış → SECOND_BALL / aut → SET_PIECE)
                       │ faul / ofsayt  → SET_PIECE
                       │ ikinci top     → SECOND_BALL → POSSESSION
                       │ devre / maç sonu → HALF_TIME / FULL_TIME (elemede → PENALTIES)
                       └───────────────────────────
```

- Her durumun girdisi ve çıktısı bellidir. Örneğin CONTEST girdisi: aksiyon, saldıran, birincil/ikincil savunmacılar, durum etkenleri. Çıktısı: P, zar ve sonuç.
- Tanımsız bir geçiş motor hatasıdır ve laboratuvarda yakalanır.

### 13.2 Olay kaydı (event log)

Motor maç boyunca her mücadeleyi kaydeder:
- dakika (simülasyon saati) ve durum;
- aksiyon tipi ve topun bölgesi;
- saldıran ve savunan oyuncu(lar);
- kullanılan yetenekler ve ağırlıklı değerleri (kimya dahil), B'yi oluşturan etkenler;
- hesaplanan başarı olasılığı P ve çekilen zar;
- sonuç (kazanan, topun yeni yeri, skor, kart);
- taktik bağlamı (bu aksiyonu hangi taktik ayarı tetikledi);
- konumlanma bağlamı: aksiyonun doğduğu yerleşim sebebi (bindirme sonrası boşluk, devir teslimde kaçırılan koşucu, çakışma, pres tetikleyicisi, geç dönen oyuncu).

Spikerin "neden" anlatımı (9.1) bu bağlam alanlarından üretilir.

Bu kayıt motorun tek çıktısıdır. Spiker, 2D saha, canlı istatistik, oyuncu puanları ve maç sonu taktik karşılaştırması bu kayıttan üretilir. "Neden kazandım / kaybettim" sorusunun cevabı (ilke 5) teknik olarak bu kayıtla verilir.

### 13.3 Tekrarlanabilir (deterministik) simülasyon

- Aynı kadrolar + aynı taktikler + aynı tohum (seed) = aynı maç: aynı sonuç ve aynı olay sırası.
- Rastgelelik tek bir tohumlu sayı üreticisinden gelir. Motor içinde başka hiçbir rastgelelik kaynağı (saat, `Math.random`) kullanılmaz.
- **Online maç: ev sahibi hesaplar, rakip doğrular.** Aynı tohum iki cihazda her koşulda aynı sonucu garanti etmez: rastgele sayıların tüketilme sırası, motor sürümü ya da tarayıcılar arasındaki sayısal farklar (örneğin `Math.exp` farklı tarayıcılarda son basamakta farklı sonuç verebilir) maçları ayrıştırabilir. Sunucuda hesaplama ücretli plan gerektirdiği için şimdilik kullanılmaz. Bunun yerine:
  - maçı **ev sahibi cihaz** hesaplar ve olay kaydını Firebase'e yazar; rakip cihaz bu kaydı oynatır, sonucu belirlemez (Saha Fethi'deki yöntem);
  - hileye karşı rakip cihaz maçı arka planda aynı tohum ve girdilerle **yeniden hesaplar** ve olay kaydının özetini (hash) karşılaştırır; uyuşmazsa maç geçersiz sayılır ve bildirilir;
  - doğrulamanın güvenilir olması için motor **tam sayı (sabit noktalı) matematik** kullanır: olasılıklar binde/on binde birlik tam sayılarla hesaplanır, lojistik fonksiyon için kendi `exp` tablomuz kullanılır, tarayıcının ondalıklı matematik fonksiyonlarına güvenilmez;
  - motor sürümü olay kaydına yazılır; iki cihaz farklı sürümdeyse maç başlamaz.
  - İleride bütçe olursa hesaplama sunucuya taşınabilir; motor ekrandan ayrı olduğu için (13.4) bu kolaydır.
- Hata bulunan bir maç, tohumu ve girdileriyle birlikte birebir yeniden oynatılabilir.
- Tekrarlanabilirlik gerçekçilik demek değildir: aynı kadroların farklı tohumlarla oynadığı maçların sonuç dağılımı ayrıca ölçülür (bölüm 10).

### 13.4 Motor ve sunum ayrımı

- **Motor** futbolu hesaplar: ekrandan, animasyondan ve zamandan bağımsız, saf bir modüldür. Girdi: kadrolar, taktikler, tohum. Çıktı: olay kaydı.
- **Görsel katman** (2D saha) olay kaydını oynatır.
- **Spiker** olayları yorumlar.
- **İstatistik katmanı** sonuçları toplar.

Motor hiçbir zaman animasyona bağlı olmaz. Animasyon motorun sonucunu gösterir, sonucu belirlemez. Görsel efektler maç matematiğini etkilemez. Böylece motor laboratuvarda ekransız binlerce maç oynayabilir ve ileride mobil uygulamaya geçişte yeniden yazılması gerekmez.

## 14. Matematik: başlangıç değerleri

> Soru–cevapla belirlenen sezgisel başlangıç değerleri (2026-11-18). Hepsi `P = 1 / (1 + e^-(k·(S − D) − B))` formülünün (4.3) katsayılarıdır. Bunlar **başlangıçtır**: laboratuvar (10) gerçek futbol olay sıklıklarıyla ve meta testleriyle kontrol eder. Bir değer değişirse önce bu tablo değişir.

### 14.1 Fark belirleyiciliği (k)

Kullanıcının sezgisi "X puan fark → başarı yüzdesi" olarak alındı ve k'ya çevrildi (`k = ln(p/(1−p)) / fark`).

| Mücadele tipi | Sezgi | k (puan başına) |
|---|---|---|
| Çalım, top taşıma (dribling vs savunma) | Eşitte %50, 10 puan fark → ~%70 | **0,085** |
| Baskı altında ilk dokunuş (kontrol vs baskı) | Çalım kadar | **0,085** |
| Hava topu | Çalımdan daha belirleyici: 10 puan → ~%75 | **0,110** |
| Şut isabeti ve kaleci karşılaşması | Çalım kadar belirleyici | **0,085** |
| Baskısız kısa pas (sabit zorluğa karşı) | 50'lik pasçı ~%85, 90'lık ~%98 | **0,054** |
| Baskısız uzun pas, 30 m+ (sabit zorluğa karşı) | 60'lık pasçı ~%45, 90'lık ~%75 | **0,043** |

Örnek (çalım): 85 dribling (ağırlıklı S) karşısında 75 savunma (ağırlıklı D) → ~%70; 20 puan fark → ~%85.

### 14.2 Temel zorluklar (B)

- **Şut ve gol zorluğu:** sabit bir yüzde olarak seçilmez; sabit olan, yeteneğin ne kadar fark yarattığıdır (k). Şut isabeti ve kaleci karşılaşmasının B değerleri, gerçek futbolun şut başına gol ve isabet oranlarına göre başlatılır. **Maç başına 3–3,5 gol bir hedef değil, izlenen bir denge göstergesidir:** önce bütün zincirler (pas, savunma, şut) tek tek doğrulanır; gol ortalaması aralığın dışında kalırsa sorunun hangi zincirden kaynaklandığı aranır. Bitiricilik ya da kaleci başarısı ortalamayı tutturmak için keyfi olarak değiştirilmez. Örnek sonuç (k = 0,085, eşit yetenekte ~%30 başlangıç varsayımıyla):

| Pozisyon | Bitiricilik vs kaleci | Gol olasılığı |
|---|---|---|
| Ceza sahası içi, normal | 80 vs 80 | ~%30 |
| Aynı | 95 vs 80 | ~%60 |
| Aynı | 70 vs 85 | ~%11 |
| Karşı karşıya | 95 vs 80 | ~%75 (mesafe ve açı zorluğu düşük) |

- **Sabit zorluğa karşı çözülenler** (kısa pas, uzun pas): B değerleri 14.1'deki iki referans noktasından çıkar.
- **Araya girme:** pas hattında savunmacı yoksa araya girme olmaz. Her savunmacı ayrı ayrı ve sırayla dener; değerleri toplanmaz (4.6). Mesafe uzadıkça hat uzar, daha çok savunmacı hatta girer.

### 14.3 Yetenek ağırlıkları (S ve D)

| Mücadele | Saldıranın S'i | Savunanın D'si |
|---|---|---|
| Çalım | Dribling %60 + Hız %30 + Güç %10 (dar alanda hızın payı azalır, geniş alanda artar) | Top kapma %50 + Markaj %25 + Hız %25 |
| Hava topu | Hava topu %70 + Güç %30 (+ hücumcuda topa ilk ulaşmada pozisyon alma) | Hava topu %70 + Güç %30 |
| Ceza sahası içi şut isabeti | Bitiricilik %80 + İlk dokunuş %20 (zayıf ayakla vuruşta zayıf ayak seviyesi düşürür) | — (sabit zorluk + baskı) |
| Ceza sahası dışı şut isabeti | Uzaktan şut %100 | — (sabit zorluk + baskı) |
| Kurtarış: yakın / sert | şut kalitesi | Refleks %70 + Pozisyon %30 |
| Kurtarış: uzaktan / açılı | şut kalitesi | Pozisyon %60 + Refleks %40 |
| Kurtarış: kafa | şut kalitesi | Hava topları %50 + Pozisyon %30 + Refleks %20 |
| Kurtarış: karşı karşıya | şut kalitesi | Bire bir %70 + Refleks %30 |

- **Boy (hava topu):** iki oyuncu arasındaki boy farkı başarıya küçük bir katkı yapar, yaklaşık **10 cm → %3–4**. Hava topu yeteneğinin önüne geçmez (2.5).
- Pas, orta, ara pası, araya girme, pres, kontrol, ofsayt zamanlaması, penaltı ve frikik ağırlıkları tek mücadele tablosunda (14.6).

### 14.4 Taktik etkisinin büyüklüğü

- Bir taktik ayarının bir mücadeleye etkisi **15 puan** kadardır. Örnek: "Kanatları kapat" seçildiğinde kanattaki hücumcu, 15 puan daha iyi bir rakiple karşılaşmış gibi zorlanır (ikincil savunmacı desteği, B'ye eklenir); aynı anda merkezdeki aksiyonlar o oranda kolaylaşır.
- Sonuç: taktik, yetenek farkından biraz daha ağır basar; doğru counter kadro farkını önemli ölçüde dengeleyebilir. Bu bilinçli bir tercihtir.
- **Birleştirme kuralı:** bir mücadeleyi aynı anda birden fazla taktik ayarı etkilerse etkiler basitçe toplanmaz (üç ayar 45 puan ederdi ve motor bozulurdu). Etkiler büyükten küçüğe sıralanır: en büyüğü tam, ikincisi yarısı, üçüncüsü dörtte biri oranında eklenir; toplam etki **en fazla 25 puan** olur. Ters yönlü etkiler (birinin kolaylaştırdığını diğeri zorlaştırıyorsa) önce birbirinden çıkarılır. Örnek: yoğun pres (+15) ve yüksek hat (+15) aynı anda bir savunmacıya katkı yapıyorsa toplam 15 + 7,5 = 22,5 puan.
- Risk: 15 puan büyük bir etki olduğu için bazı kombinasyonların (6.4) aşırı güçlü çıkma ihtimali vardır. Meta avcısı (10) bunu özellikle kontrol eder. Bir sorun çıkarsa önce mantığa gerçek counter eklenir (ilke 4); etki büyüklüğü sadece kullanıcı onayıyla değişir.

### 14.5 İzlenen olay sıklıkları (teşhis göstergeleri, hedef değil)

| Ölçü | Hedef |
|---|---|
| Maç başına ortalama gol | 3–3,5 |
| Faul (takım başına, normal müdahale sertliği) | ~10–12 |
| Sarı kart (takım başına, normal) | ~2 |
| Sert müdahalede | ~16 faul, ~3–4 sarı |
| Temkinli müdahalede | ~7 faul, ~1 sarı |
| Kırmızı kart | ~20 maçta bir; sert müdahalede daha sık |
| Pas isabeti (genel) | gerçek futbol aralığı, ~%80–90 |
| Uzun pas isabeti | ~%50–60 |

### 14.6 Tek mücadele tablosu

Her mücadele tek bir satırda tanımlanır. Ağırlıklar yüzde olarak verilir; S ve D bu ağırlıklı ortalamalardır (kimya katkısı dahil). Tablo 2026-11-20 itibarıyla tamamlandı.

| Mücadele | Saldıranın S'i | Savunanın D'si (ya da sabit zorluk) | Durum etkisi (B) | Taktik etkisi | k |
|---|---|---|---|---|---|
| Çalım | Dribling 60 + Hız 30 + Güç 10 | Top kapma 50 + Markaj 25 + Hız 25 | Alan genişliği, ikincil savunmacı | Pres, kapatılan alan, müdahale sertliği | 0,085 |
| Baskı altında kontrol | İlk dokunuş 70 + Güç 20 + Dribling 10 | Top kapma 50 + Markaj 25 + Hız 25 | Pasın hızı ve yüksekliği | Pres | 0,085 |
| Pres (top kazanma) | Taşıyıcının o anki aksiyonu (kontrol / çalım / pas) | Presçi: Top kapma 50 + Markaj 25 + Hız 25; ikinci presçi ikincil savunmacı olarak B'ye | Pres tetikleyicisi, presçi sayısı | Pres yoğunluğu | aksiyonun k'sı |
| Kısa pas | Kısa pas 80 + Vizyon 20 | Baskısızsa sabit zorluk; hattaki her savunmacı ayrı ayrı araya girmeyi dener | Mesafe, açı, hattaki savunmacı sayısı | Pas tarzı, kapatılan alan | 0,054 (baskısız) |
| Uzun pas | Uzun pas 75 + Vizyon 25 | Sabit zorluk; hattaki savunmacılar ayrı ayrı | Mesafe, açı | Pas tarzı, hat yüksekliği | 0,043 (baskısız) |
| Araya girme | Pasçının S'i | Top kapma 70 + Vizyon 20 + Markaj 10 | Savunmacının pas hattına uzaklığı: hat üzerinde tam şans, 5 m'de yarı, 10 m ve üzeri araya giremez (pasın hızı bu mesafeyi ölçekler) | Kapatılan alan, pres | 0,085 |
| Ara pası (pas) | Vizyon 50 + Kısa ya da Uzun pas 50 (mesafeye göre) | Hattaki savunmacılar (araya girme satırı) | Mesafe, boşluğun genişliği | Bitiriş tercihi, hat yüksekliği | 0,085 |
| Ara pası (koşu yarışı) | Koşucu: Hız 60 + Pozisyon alma 40 | Savunmacı: Hız 60 + Markaj 40 | Başlangıç mesafesi, koşu zamanlaması | Hat yüksekliği | 0,085 |
| Ofsayt zamanlaması | Koşucu Pozisyon alma 70 + Pasçı Vizyon 30 → zamanlama hatası (metre) | Geometrik kontrol: pas anında koşucu, top ve sondan ikinci rakip (5.6); çizginin düzeni stoperlerin markaj ortalamasına bağlı | Hat yüksekliği | Hat yüksekliği | 0,085 |
| Orta (isabet) | Orta 85 + Vizyon 15 (zayıf ayakla ortada zayıf ayak seviyesi düşürür) | Sabit zorluk | Mesafe; bek baskısı: 2 m'den yakında zorluk artar ve blok şansı doğar, 2–5 m'de sadece zorluk artar, 5 m ve üzeri baskısız | Bitiriş tercihi, kapatılan alan | 0,043 (uzun pas gibi; orta da uzun mesafeli bir pastır) |
| Orta (bek bloğu) | Ortacının Orta S'i | Bek: Markaj 60 + Hız 40 | Bekin mesafesi (2 m'den yakın) | Kapatılan alan | 0,085 |
| Hava topu | Hava topu 70 + Güç 30 (+ Pozisyon alma, topa ilk ulaşma) | Hava topu 70 + Güç 30 | Boy farkı (10 cm → ~%3–4), topun yüksekliği, ceza sahası yerleşimi | Ceza sahası yerleşimi, hat yüksekliği | 0,110 |
| Kafa vuruşu (isabet) | Hava topu 70 + Bitiricilik 30 | Sabit zorluk | Mesafe, açı, baskı | Bitiriş tercihi | 0,085 |
| Şut isabeti (içeride) | Bitiricilik 80 + İlk dokunuş 20 | Sabit zorluk | Mesafe, açı, baskı, zayıf ayak | Bitiriş tercihi | 0,085 |
| Şut isabeti (dışarıda) | Uzaktan şut 100 | Sabit zorluk | Mesafe, açı, baskı, zayıf ayak | Bitiriş tercihi | 0,085 |
| Kurtarış | Şut kalitesi | Şut tipine göre kaleci yetenekleri (14.3) | Şutun yönü ve kalecinin konumu | — | 0,085 |
| Penaltı | Bitiricilik 100 | Kaleci: Bire bir 60 + Refleks 40 | Eşit yetenekte ~%76 gol (gerçek futbol ortalaması) | — | 0,085 (çalım kadar belirleyici) |
| Direkt frikik | Uzaktan şut 70 + Orta 30 (falso) | Önce baraj bloğu (barajdaki oyuncu sayısı mesafeye göre), sonra isabet (sabit zorluk), sonra kaleci: Pozisyon 60 + Refleks 40 | Mesafe, açı | — | 0,085; gerçek futbolda direkt frikik golü ~%6–8 (gösterge) |

**Faul olasılığı:** savunmacı bir mücadeleyi kaybettiğinde faul olasılığı = temel oran × müdahale sertliği çarpanı × top kapma çarpanı. Top kapma düştükçe çarpan artar: top kapması 90 olan stoper nadiren faul yapar, 50 olan sık yapar. Temel oran, izlenen faul sıklığıyla (14.5, takım başına ~10–12) başlatılır.

## 15. Diziliş şablonları (34 şablon)

> Revizyon 8 (2026-11-20). Her dizilişin iki şablonu: **top bizdeyken** ve **top rakipteyken** her pozisyonun temel bölgesi. Hareket kuralları (4.5) bu temel bölgelerden başlar.

### 15.1 Gösterim ve okuma kuralları

- **Bölge adı:** sütun harfi + satır numarası. Sütunlar soldan sağa (hücum yönüne bakarken) **A** sol kanat, **B** sol iç, **C** merkez, **D** sağ iç, **E** sağ kanat. Satırlar kendi kalemizden rakip kaleye **1–6**: 1 kendi ceza sahamız, 2–3 kendi yarı sahamız, 4–5 rakip yarı saha, 6 rakip ceza sahası. Örnek: **E5** rakip yarı sahada sağ kanat.
- **Referans durum:**
  - *Top bizdeyken:* top rakip yarı sahada, orta koridorda; takım yerleşik hücumda.
  - *Top rakipteyken:* **orta hat**, top orta koridorda, rakip kendi yarı sahasında oyun kuruyor.
- **Bölge içi konum:** oyuncunun koordinatı (3.1) bölgenin merkezinden başlar. Aynı bölgede iki oyuncu varsa "önde / geride" ya da sol / sağ yarıya ayrılırlar (tabloda yazılı). Kaleci kale çizgisinin ~8 m önündedir.
- **"Stoperlerin önü":** ön libero C2'nin üst kısmında, stoperlerle orta saha hattı arasında durur.

### 15.2 Şablonları kaydıran genel kurallar

Tablolar sadece referans durumdur. Her aksiyonun başında hedef konum (4.5.10) şu kaydırmalarla hesaplanır:
1. **Topun boydaki yeri (top bizdeyken):** top kendi yarı sahamızdaysa (oyun kurma) kaleci hariç herkes **1 satır geri** gelir; forvetler en fazla 5. satıra iner. Top rakip ceza sahası çevresindeyse (satır 5–6) orta saha ve bekler **yarım satır ileri** gelir.
2. **Hat yüksekliği (top rakipteyken):** *alçak* → kaleci hariç herkes 1 satır geri (savunma hattı 1. satırın üst kısmı, forvet 3. satır); *yüksek* → herkes 1 satır ileri (savunma hattı 3. satır, forvet 5. satır).
3. **Topun ende yeri (kayma, 4.5.2):** top bir kanattaysa takım o tarafa kayar. *Dengeli:* herkes topa doğru yarım sütun. *Kanatlar:* top tarafındaki bek, kanat oyuncusu ve en yakın orta saha tam bir sütun, diğerleri yarım sütun; karşı kanat oyuncusu içeri girer. *Merkez:* C koridorundakiler yerinde kalır, kanat oyuncuları yarım sütun içeri.
4. **Hücum yönü (top bizdeyken):** seçilen koridorun tarafındaki bek ve orta saha yarım satır ileri; *dengeli* değişiklik yapmaz.
5. **Tempo:** *hızlı* tempoda forvetler ve kanat oyuncuları son çizgide (satır 6) kalır; *sabırlı* tempoda orta sahalar topa yarım satır yaklaşır (pas üçgeni için).
6. **Bireysel hareketler:** bek bindirmesi, arka kapatma, forvet koşuları, kanatçının içeri girmesi vb. bu kaydırılmış şablonun üstüne eklenir (4.5.3–4.5.9). Kırmızı kartta en hücumdaki pozisyon boşaltılır, kalanlar şablona en yakın şekilde yeniden dağılır (3.3).

### 15.3 Şablon tabloları

#### 4-4-2
Dengeli iki forvet. Orta sahada biri tutar, biri ileri çıkar.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol orta saha | LM | A5 | A3 |
| Merkez orta saha (tutan) | CM | C3 | B3 |
| Merkez orta saha (çıkan) | CM | C4 | D3 |
| Sağ orta saha | RM | E5 | E3 |
| Sol forvet | ST | B6 | C4 (önde) |
| Sağ forvet | ST | D6 | C4 (geride) |

#### 4-3-3
Üç forvet, tek ön libero. Savunmada kanatçılar inip 4-1-4-1 olur.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Ön libero | DM | C3 | C2 (stoperlerin önü) |
| Sol iç orta saha | CM | B4 | B3 |
| Sağ iç orta saha | CM | D4 | D3 |
| Sol kanat | LW | A5 | A3 |
| Santrfor | ST | C6 | C4 |
| Sağ kanat | RW | E5 | E3 |

#### 4-2-3-1
Çift ön libero, 10 numara. Savunmada 4-4-1-1.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol ön libero | DM | B3 | B3 |
| Sağ ön libero | DM | D3 | D3 |
| Sol kanat | LW | A5 | A3 |
| 10 numara | AM | C5 | C4 (geride) |
| Sağ kanat | RW | E5 | E3 |
| Santrfor | ST | C6 | C4 (önde) |

#### 4-1-4-1
4-3-3'ün daha temkinli hali: geniş orta sahalar kanatçılardan daha geride oynar.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A3 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E3 | E2 |
| Ön libero | DM | C3 | C2 (stoperlerin önü) |
| Sol iç orta saha | CM | B4 | B3 |
| Sağ iç orta saha | CM | D4 | D3 |
| Sol orta saha | LM | A5 | A3 |
| Sağ orta saha | RM | E5 | E3 |
| Santrfor | ST | C6 | C4 |

#### 4-4-1-1
İkinci forvet santrforun arkasında; savunmada ilk presi ikisi birlikte yapar.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol orta saha | LM | A5 | A3 |
| Merkez orta saha (tutan) | CM | C3 | B3 |
| Merkez orta saha (çıkan) | CM | C4 | D3 |
| Sağ orta saha | RM | E5 | E3 |
| İkinci forvet | AM | C5 | C4 (geride) |
| Santrfor | ST | C6 | C4 (önde) |

#### 4-3-2-1
Noel ağacı: dar, merkezde kalabalık. Genişliği sadece bekler verir.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol orta saha | CM | B3 | B3 |
| Merkez orta saha | CM | C3 | C3 |
| Sağ orta saha | CM | D3 | D3 |
| Sol 10 numara | AM | B5 | B4 |
| Sağ 10 numara | AM | D5 | D4 |
| Santrfor | ST | C6 | C4 |

#### 4-1-2-1-2
Elmas: dar, iki forvet. Kanatlar boş; genişliği bekler verir.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Ön libero | DM | C3 | C2 (stoperlerin önü) |
| Sol iç orta saha | CM | B4 | B3 |
| Sağ iç orta saha | CM | D4 | D3 |
| 10 numara | AM | C5 | C4 |
| Sol forvet | ST | B6 | B4 |
| Sağ forvet | ST | D6 | D4 |

#### 4-2-2-2
Kutu orta saha: iki ön libero, iki iç 10 numara, iki forvet. Savunmada 10 numaralar kanatlara açılır.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol ön libero | DM | B3 | B3 |
| Sağ ön libero | DM | D3 | D3 |
| Sol 10 numara | AM | B5 | A3 |
| Sağ 10 numara | AM | D5 | E3 |
| Sol forvet | ST | B6 | C4 (önde) |
| Sağ forvet | ST | D6 | C4 (geride) |

#### 4-3-1-2
Üç merkez orta saha, bir 10 numara, iki forvet. Dar.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A4 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E4 | E2 |
| Sol orta saha | CM | B3 | B3 |
| Merkez orta saha | CM | C3 | C3 |
| Sağ orta saha | CM | D3 | D3 |
| 10 numara | AM | C5 | C4 |
| Sol forvet | ST | B6 | B4 |
| Sağ forvet | ST | D6 | D4 |

#### 4-5-1
Temkinli: bekler az çıkar, orta saha beşli hat. Tek forvet yalnız kalır.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol bek | LB | A3 | A2 |
| Sol stoper | CB | B2 | B2 |
| Sağ stoper | CB | D2 | D2 |
| Sağ bek | RB | E3 | E2 |
| Sol orta saha | LM | A4 | A3 |
| Sol iç orta saha | CM | B3 | B3 |
| Merkez orta saha | CM | C3 | C3 |
| Sağ iç orta saha | CM | D3 | D3 |
| Sağ orta saha | RM | E4 | E3 |
| Santrfor | ST | C6 | C4 |

#### 3-5-2
Üç stoper, iki yönlü kanat bekler. Savunmada 5-3-2.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A5 | A2 |
| Sağ kanat bek | RWB | E5 | E2 |
| Ön libero | DM | C3 | C3 |
| Sol iç orta saha | CM | B4 | B3 |
| Sağ iç orta saha | CM | D4 | D3 |
| Sol forvet | ST | B6 | B4 |
| Sağ forvet | ST | D6 | D4 |

#### 3-4-3
Üç stoper, dört orta saha, üç forvet. Savunmada kanatçılar iner: 5-4-1.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A4 | A2 |
| Sağ kanat bek | RWB | E4 | E2 |
| Sol merkez orta saha | CM | B3 | B3 |
| Sağ merkez orta saha | CM | D3 | D3 |
| Sol kanat | LW | A5 | A3 |
| Santrfor | ST | C6 | C4 |
| Sağ kanat | RW | E5 | E3 |

#### 3-4-2-1
İki iç 10 numara santrforun arkasında. Savunmada 5-2-2-1.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A5 | A2 |
| Sağ kanat bek | RWB | E5 | E2 |
| Sol merkez orta saha | CM | B3 | B3 |
| Sağ merkez orta saha | CM | D3 | D3 |
| Sol 10 numara | AM | B5 | B4 |
| Sağ 10 numara | AM | D5 | D4 |
| Santrfor | ST | C6 | C4 |

#### 3-4-1-2
Bir 10 numara, iki forvet. Savunmada 10 numara orta sahaya iner: 5-3-2.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A5 | A2 |
| Sağ kanat bek | RWB | E5 | E2 |
| Sol merkez orta saha | CM | B3 | B3 |
| Sağ merkez orta saha | CM | D3 | D3 |
| 10 numara | AM | C5 | C3 |
| Sol forvet | ST | B6 | B4 |
| Sağ forvet | ST | D6 | D4 |

#### 5-3-2
3-5-2'nin temkinli hali: kanat bekler daha az ileri çıkar.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A4 | A2 |
| Sağ kanat bek | RWB | E4 | E2 |
| Sol orta saha | CM | B4 | B3 |
| Merkez orta saha | CM | C3 | C3 |
| Sağ orta saha | CM | D4 | D3 |
| Sol forvet | ST | B6 | B4 |
| Sağ forvet | ST | D6 | D4 |

#### 5-4-1
En temkinli: beşli savunma, dörtlü orta saha, tek forvet.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A3 | A2 |
| Sağ kanat bek | RWB | E3 | E2 |
| Sol orta saha | LM | A5 | A3 |
| Merkez orta saha (tutan) | CM | C3 | B3 |
| Merkez orta saha (çıkan) | CM | C4 | D3 |
| Sağ orta saha | RM | E5 | E3 |
| Santrfor | ST | C6 | C4 |

#### 5-2-3
Beşli savunma ama üç forvet; savunmada kanatçılar kontra için yukarıda bekler.

| Pozisyon | Mevki | Top bizde | Top rakipte |
|---|---|---|---|
| GK | GK | C1 | C1 |
| Sol stoper | CB | B2 | B2 |
| Merkez stoper | CB | C2 | C2 |
| Sağ stoper | CB | D2 | D2 |
| Sol kanat bek | LWB | A4 | A2 |
| Sağ kanat bek | RWB | E4 | E2 |
| Sol merkez orta saha | CM | B3 | B3 |
| Sağ merkez orta saha | CM | D3 | D3 |
| Sol kanat | LW | A5 | A4 |
| Santrfor | ST | C6 | C4 |
| Sağ kanat | RW | E5 | E4 |
