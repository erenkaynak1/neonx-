# Draft XI v2 — Laboratuvar raporu (prototip v0.2.0)

> 2026-11-20 · motor `draft-xi/engine/` · laboratuvar `node scripts/draft_xi_lab.mjs 400 --meta`
> Örnek veri: 44 oyuncu, 4 takım (4-3-3, 4-4-2, 4-2-3-1, 3-5-2). Oyuncu değerleri test amaçlı ilk değerlendirme, incelenmedi. Motorda 17 dizilişin hepsi var.

## v0.2.0'da yeni

- **Pres faul riski** (kullanıcı kararı, 2026-11-20): presçi topu kazansa bile hızla geldiği için küçük bir faul olasılığı var (az / orta / yoğun: %3 / %6 / %11, müdahale sertliğiyle çarpılır). Sonuç: yoğun preste rakip faulü 11,7 → 13,4.
- **17 dizilişin hepsi** (bölüm 15).
- **Kırmızı kartta yeniden yerleşim** (3.3): en hücumdaki oyuncu boşalan pozisyona geçer; kaleci atılırsa en hücumdaki oyuncu kaleye geçer.
- **Maç sonu oyuncu notu ve maçın oyuncusu** (16.14): herkes 6,0 ile başlar, her mücadele kazanma olasılığına göre ekler ya da çıkarır; gol +1, asist +0,6, kurtarış +0,3, kırmızı −1,5.
- **Meta avcısı** (bölüm 10): aynı kadro iki tarafta; 9 taktik × 40 maç, ardından en iyiye karşı cevap araması.
- **Sağlamlık:** rastgele taktiklerle ve sert müdahaleyle (bol kırmızı kartla) 1.500 maç hatasız oynandı.

### Meta avcısı sonucu

| Puan / maç | Taktik (yön / pas / bitiriş / tempo / top kazanınca / hat / pres / kapatılan / müdahale) |
|---|---|
| 2,35 | sağ / karışık / orta / hızlı / kontra / yüksek / orta / dengeli / normal |
| 1,94 | sağ / karışık / orta / hızlı / kontra / yüksek / az / dengeli / sert |
| 1,66 | sol / karışık / uzaktan / hızlı / kontra / orta / az / merkez / temkinli |
| 1,62 | varsayılan (her şey dengeli) |
| 0,61 | merkez / kısa / çalım / hızlı / yerleşik / alçak / yoğun / merkez / sert |

En iyi taktiğe karşı bulunan cevap: **1,70 puan/maç** (sağ / kısa / orta / hızlı / kontra / alçak / orta / kanatlar / temkinli). Cevabı var, meta yok. Yine de "kanattan orta + hızlı + kontra + yüksek hat" kombinasyonu en güçlü aday; daha geniş aramalarla izlenecek. Dikkat çeken nokta: cevap taktiği "kanatları kapat + alçak hat" ile orta planını karşılıyor. Bu, belgedeki counter mantığının (6.3) çalıştığını gösteriyor.

## Özet

- Motor belgedeki kuralları prototip derinliğinde uyguluyor ve **tekrarlanabilir**: aynı tohum her seferinde aynı olay kaydını (özet) üretiyor.
- **Bütün taktik ve yetenek etkileri doğru yönde ve ölçülebilir** (bölüm 3).
- Olay sıklıklarının çoğu gerçek futbol aralığında. Kalan sapmalar bölüm 4'te bulgu olarak listelendi.
- Hız: maç başına ~50 ms. 1.000 maç yaklaşık 50 saniye (kabul kriteri: 1 dakikanın altı).

## 1. Tekrarlanabilirlik

| Test | Sonuç |
|---|---|
| Aynı kadro + taktik + tohum → aynı olay kaydı özeti | ✓ |
| Farklı tohum → farklı maç | ✓ |
| Motor `Math.exp` / `Math.random` kullanmıyor (tam sayı matematiği, sabit lojistik tablo) | ✓ |

## 2. Olay sıklıkları (400 maç; izlenen göstergeler, hedef değil)

| Ölçü | Prototip | Gerçek futbol | Durum |
|---|---|---|---|
| Maç başına gol | 3,9 | 3–3,5 (gösterge) | biraz yüksek |
| Beraberlik | %18 | ~%22–27 | biraz düşük |
| Şut / takım | 14,1 | ~12–14 | ✓ |
| İsabetli şut / takım | 5,2 | ~4–5 | yakın |
| İsabetli şutun gole dönüşü | %37 | ~%30–35 | biraz yüksek |
| Pas / takım | 336 | ~400–550 | düşük (bulgu 4.1) |
| Pas isabeti | %78 | ~%80–90 | biraz düşük |
| Uzun pas isabeti | %52 | ~%50–60 | ✓ |
| Orta / takım | 13,5 | ~15–20 | biraz düşük |
| Orta isabeti | %30 | ~%25–35 | ✓ |
| Çalım başarısı | %58 | ~%50–60 | ✓ |
| Faul / takım | 9,8 | ~10–12 | ✓ |
| Sarı kart / takım | 1,5 | ~2 | biraz düşük |
| Kırmızı kart / maç | 0,2 | ~0,05–0,1 | yüksek (bulgu 4.3) |
| Ofsayt / takım | 0,8 | ~1–2 (kullanıcı: "daha az") | ✓ |
| Korner / takım | 4,2 | ~5 | yakın |
| Penaltı / maç | 0,3 | ~0,25 | ✓ |

## 3. İzolasyon testleri (her seçimin sonucu var)

| Değişiklik | Ölçü | Önce → sonra |
|---|---|---|
| Bitiriş: Orta | Takım A orta / maç | 14,2 → 18,0 |
| Bitiriş: Ara pası | Takım A ara pası / maç | 4,7 → 7,3 |
| Hücum yönü: Sağ | Sağ koridor atağı / maç (sol) | 17,0 → 22,7 (12,7 → 14,0) |
| Rakip pres: Yoğun | Rakip pres / maç (faul) | 23,6 → 49,8 (11,7 → 13,4) |
| Rakip müdahale: Sert | Rakip faul (sarı) | 11,7 → 14,8 (1,9 → 3,0) |
| Hava topu +20 (orta planıyla) | Kafa golü / maç (hava topu kazanma) | 0,8 → 2,2 (%61 → %81) |
| Bitiricilik +20 | Gol / maç | 2,6 → 3,2 |

Sonuç dağılımı örneği (A–D, 200 maç): A kazanır %67, beraberlik %14, D kazanır %19. Güçlü kadro daha sık kazanıyor ama her zaman değil.

## 4. Bulgular (sonraki ayar turunda ele alınacak)

1. **Pas sayısı düşük (~340, gerçek ~450).** Prototipte aksiyonlar gerçekten iri: kendi yarı sahadaki kısa paslaşmalar ve topu tutma tek aksiyonda geçiyor. Çözüm sayıları kırpmak değil: sabırlı oyunda pas süresini ve kendi yarı sahada güvenli pas seçeneğini gerçekçi hale getirmek.
2. ~~Yoğun pres faulü artırmıyor.~~ **Çözüldü (v0.2):** kullanıcı kararıyla pres faul riski taşıyor; yoğun preste rakip faulü 11,7 → 13,4.
3. **Kırmızı kart yüksek (0,2 / maç).** Çoğu ikinci sarıdan geliyor. Sarı kartlı oyuncunun faul ihtimali zaten %25'e iniyor; kart oranlarının taktik faul tanımı yeniden ele alınmalı.
4. **Korner (v0.2: 4,2).** Bloklardan ve kötü ortalardan korner olasılığı artırıldı; gerçeğe yakın.
5. **Gol biraz yüksek (3,8).** Belgedeki kurala göre bitiricilik ve kaleci keyfi değiştirilmedi. Şut sayısı gerçek aralıkta, dönüşüm oranı aralığın üst sınırında; önce şutun yönü ve kaleci erişimi (5.5) tam uygulanacak.
6. **Prototipte henüz olmayanlar:**
   - devir teslim savunması ve tehdit puanının tam hali (basitleştirilmiş sürüm var);
   - gole yol açan hata için not kesintisi (−0,8);
   - spiker metinleri (motor olay kaydını üretiyor, metinler sunum katmanında yazılacak);
   - daha geniş meta araması (daha çok taktik, daha çok maç).

## 5. Ayar geçmişi (bu turda)

1. Faul mantığı ters bağlanmıştı: faul, savunmacı mücadeleyi kazandığında kontrol ediliyordu. Belgeye göre (5.8) savunmacı kaybettiğinde kontrol edilecek şekilde düzeltildi.
2. Olay kaydında şut türü (`type`) olayın kendi türünün üzerine yazılıyordu. `shotType` olarak ayrıldı, çekirdek alanlar korumaya alındı.
3. Kötü pasların bir kısmı taca çıkıyor, bir kısmı sahipsiz topa dönüşüyor (önceden hep rakibe temiz geçiyordu).
4. Son adam kırmızısı daraltıldı: kaleye 30 m'den yakın olmalı; ceza sahasında topa oynama girişiminde 4'te 3 penaltı + sarı.
5. Kalabalık bölgeye pas: hedefin 8 m çevresindeki her rakip pası zorlaştırıyor (durum etkisi, B'ye).
6. Şut seçme ağırlıkları ve şut isabeti başlangıcı gerçek futbol oranlarına göre ayarlandı.
7. Sert müdahalenin faul çarpanı, belgedeki hedeflere göre ayarlandı (sert ~16, temkinli ~7).
