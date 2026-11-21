# Açık Artırma — Tasarım Belgesi

> Durum: **taslak, soru–cevapla kuruluyor** (2026-11-21). Kod yazılmadı. Çalışma adı: **Açık Artırma**.

## 0. Oyunun özü

İki (ya da daha fazla) oyuncu aynı bütçeyle başlar. Bir konu çıkar ("Tarihin en iyi Fenerbahçe kadroları"), konunun maddeleri ("2007-08 Fenerbahçe", "2010-11 Fenerbahçe"…) sırayla açık artırmaya çıkar ve en yüksek teklifi veren maddeyi alır. Seçimler dolunca **yapay zekâ hakem (Gemini)** iki tarafın topladıklarını değerlendirir, kazananı ve gerekçesini esprili bir dille açıklar.

Futbol bilgisi = doğru maddeye doğru parayı vermek, rakibi pahalı maddelere çekmek, ucuz kalan cevheri kapmak.

## 1. Kararlar

| Konu | Karar |
|---|---|
| Oyuncu sayısı | 2: aynı telefon ve online 1v1 (arkadaşlarla parti, rakip ara, rastgele oyun, rally). 3+ kişilik parti modu **şimdilik yok** |
| Bütçe | 20 **NEON para** |
| Seçim | Oyuncu başına **5** |
| Madde sayısı | Seçim sayısının tam iki katı: **10** |
| Konu ve maddeler | **Hazır liste**, bizim kontrolümüzde; her maçta konudan rastgele 10 madde. Yanlış ya da uydurma madde çıkmaz. Gemini sadece hakemlik yapar |
| Teklif | **Sırayla artırma**: açılış 1 para; sıra gelen +1 / +2 / +3 yapar ya da PAS der; hamle başına **10 sn**, süre biterse pas. Pas diyen o maddeden çekilir, son teklifi veren alır |
| Açılış sırası | İlk maddeyi kimin açacağı rastgele; sonra her maddede sıra değişir. Açan, parası varsa **açmak zorunda** (en az 1 NP; açılışta pas yok). Süre biterse 1 NP ile açılmış sayılır |
| Bütçe kuralı | Para biriktirme zorunluluğu yok. Parası biten teklif veremez; kalan maddelerden rakibin almak istemedikleri **bedavaya** ona gelir. Rakip tek teklifçi olarak 1 paraya alabilir ya da pas diyebilir; pas derse madde parası bitene gider. **İkisinin de parası bittiyse** kalan maddeler sırayla dağıtılır (o maddenin açanından başlayarak). 5 seçimini dolduran teklif vermez; kalan maddeler diğer oyuncuya gider. Kimsenin seçimi boş kalmaz |
| Bilgi | Teklif sırasında madde adı + **kısa künye** (gerçek bilgi, değerlendirme yok). Örnek: "2007-08 Fenerbahçe · TD Zico · Şampiyonlar Ligi çeyrek final" |
| Kazanan | **Yapay zekâ hakem (Gemini)** |
| Ters konular | "En kazma kadro" gibi konularda en kötüyü toplayan kazanır; konu başlığında açıkça gösterilir (↓ EN KÖTÜYÜ TOPLAYAN KAZANIR). Hakeme konunun yönü söylenir |
| Hakem tarzı | **Komik + gerekçeli**: meme / sosyal medya dili, ama her kararın futbol gerekçesi var |
| Beraberlik | **Yok**: hakem her zaman bir kazanan seçer; çok yakınsa bunu söyler ama yine karar verir |
| Liderlik | Yalnızca **online 1v1** galibiyetleri profile ve liderlik tablosuna yazılır; aynı telefon maçları sayılmaz |
| Konu türleri | Tarihi kadrolar, oyuncular, ters konular (en kazma), dünya futbolu |

## 2. Akış

1. Lobi: mod seçimi (online 1v1, aynı telefon); online'da mevcut lobi ve eşleşme sistemi.
2. Konu kartı: konu başlığı ve yönü (en iyi / en kötü). Maddeler önceden gösterilmez; her madde yalnızca açık artırmaya çıktığında görünür (kullanıcı kararı, 2026-11-21).
3. Açık artırma: madde madde; ekranda madde + künye, iki tarafın kalan parası ve dolan seçimleri, teklif tuşları (+1 / +2 / +3 / PAS), 10 sn sayaç.
4. Hakem bekleme ekranı ("Hakem düşünüyor…").
5. Karar ekranı: kazanan, kısa özet, her maddeye tek satır yorum, yılın soygunu / en pahalı hata, iki tarafın harcaması.
6. Yeni oyun (yeni rastgele konu) / menü. Rövanş yok; konu seçilemez, her maçta tüm konulardan rastgele gelir (kullanıcı kararı, 2026-11-21).

### 2.1 Maç ekranı (onaylandı, 2026-11-21)

Taslaklar: https://claude.ai/artifact/RR3hjYUci5w3thcA17y3C4 (A: kullanıcının konsepti, B: alternatif, C: hakem kararı). Karar: **A ile B'nin birleşimi**.

- **İki yanda 5'er kutu** (A): solda oyuncu (mavi), sağda rakip (turuncu). Dolu kutuda madde ve ödenen para, boş kutu kesik çizgili. Kutular ortadaki sahneye yer açacak kadar ince.
- **Ortada sahne** (B): madde adı + künye, büyük son teklif rakamı, kimde olduğu, etrafında süre halkası, altında teklif geçmişi ("Rakip 1 → Sen 2 → Rakip 3 → Sen 4").
- **Üstte** konu başlığı, madde sırası (5 / 10) ve iki tarafın kalan parası.
- ~~Sıradakiler şeridi~~ kullanıcı kararıyla kaldırıldı (2026-11-21): gelecek maddeler hiçbir yerde önceden gösterilmez.
- **Altta** PAS / +1 / +2 / +3; tuşlar sonucu gösterir ("+2 → 6") ve yalnızca oyuncunun sırasında yanar.
- **Karar ekranı** (C): kazanan, hakem özeti, her maddeye tek satır yorum ve ödenen para, "Yılın soygunu" / "En pahalı hata" kartları, Yeni oyun / Menü.
- Renkler: mavi ile turuncu (renk körlüğünde de ayırt edilir), koyu NEON zemin.

## 2.2 Online (2026-11-21)

- Menü: standart yan oyun menüsü; ARKADAŞLARINLA OYNA ve RAKİP ARA NEON XI lobisini açar (`NEON_SOCIAL.chooseMode('auction', …)`). Lobide oyun seçilebilir, rastgele oyun kuyruğunda ve rally'de (XOX → Kariyer İkizi → Açık Artırma → Draft) yer alır.
- Bağlantı: ortak Firebase oda katmanı (`career-twin/firebase-peer-shim-v1.js`, `rooms/AA-<kod>`, oyun türü `auction`).
- Yetki: maçı kuran cihaz kuralları yönetir. Misafir istediği hamleyi gönderir; kurucu sıranın misafirde ve hamlenin geçerli olduğunu kontrol edip uygular ve her hamleyi misafire gönderir. İki ekran aynı başlangıç durumundan aynı hamle listesini oynatır. Süre dolmalarına yalnızca kurucu karar verir.
- Konu tanıtımı online'da tuşsuz, iki ekranda birlikte kapanır.
- Sonuç: yapay zekâ hakem bağlanana kadar iki oyuncu da kazananı oylar; aynı kişiyi seçerlerse sonuç o, farklıysa berabere. Sonuç liderliğe ve rally'ye `neon-match-result` ile yazılır. Hakem bağlanınca kararı kurucu ister ve iki ekrana gönderir.
- Bağlantı koparsa "Bağlantı kesildi / Rakibin ayrıldı" ekranı ve lobiye dönüş; terk etme ekranı ortak `match-forfeit` modülünden gelir.

## 3. Yapay zekâ hakem (Gemini)

### 3.1 Mimari

```
Oyun (telefon) ──► Aracı sunucu: Cloudflare Worker (Gemini anahtarı burada, gizli) ──► Gemini API
               ◄── { kazanan, gerekçe, madde yorumları } ◄──
```

- **API anahtarı oyunun koduna asla girmez** (site herkese açık; anahtar sızar). Anahtar Cloudflare paneline gizli değişken (secret) olarak girilir; ne oyuncular ne de depo görür. Anahtar sohbete de yapıştırılmaz.
- **Neden Cloudflare Workers:** ücretsiz katmanı (günde 100.000 istek) yeterli, kart gerekmez. Firebase'in sunucu fonksiyonları ücretli plana bağlı.
- **Koruma:** Worker yalnızca oyuna giriş yapmış oyunculardan (Firebase kimlik jetonu doğrulanır) gelen istekleri kabul eder; oyuncu başına dakikalık istek sınırı vardır; istek gövdesi boyutu sınırlıdır; Worker sadece hakem çağrısını yapar, serbest metin göndermeye izin vermez (maddeler listeden id ile gelir).
- **Online maçta:** kararı yalnızca maçı kuran cihaz ister ve sonucu rakibe gönderir; iki oyuncu aynı kararı görür.
- **Hata durumu:** Gemini cevap vermezse ya da biçim bozuksa bir kez yeniden denenir; yine olmazsa maç "hakemsiz" biter: kullanıcıya açıkça söylenir, liderliğe yazılmaz ve aynı kadrolarla kararı yeniden isteme tuşu çıkar (sessizce rastgele karar verilmez).

### 3.1.1 Kurulum ve kod (2026-11-21)

- Worker: `worker/hakem-worker.js` (üretilen, Cloudflare'a yapıştırılır; şablon `worker/hakem-worker.src.js`, üretici `scripts/build_hakem_worker.mjs`). Adım adım kurulum: `worker/README.md`.
- İstek: `{ konu, taraflar: [[{id, fiyat}×5]×2] }` + Firebase kimlik jetonu. Cevap: `{ sira, karar }`.
- Hakem iki denemede cevap vermezse oyuncular karar verir (aynı telefonda seçim, online'da oylama); sessiz rastgele karar yok.
- Metinlerdeki "Taraf 1 / Taraf 2" ekranda oyuncu adlarına çevrilir.

### 3.2 Hakeme gönderilen

- Konu başlığı ve yönü (en iyi / en kötü).
- Her oyuncunun aldığı maddeler, künyeleri ve ödediği paralar.
- Hakem talimatı: `side-games/acik-artirma/hakem.mjs` (`HAKEM_TALIMATI`). Kazanan maddelerin gerçek futbol değerine göre seçilir; **ödenen para kazananı belirlemez**, sadece "soygun" ve "pahalı hata" yorumlarında kullanılır. Set bütün olarak değerlendirilir. Uydurma istatistik yok. Gerçek kişilerin görünüşü, kökeni, ailesi, sağlığı ya da özel hayatıyla dalga geçilmez.
- Adalet: oyuncuların listeleri hakeme **rastgele sırayla** ve takma adla ("Taraf 1 / Taraf 2") gönderilir; yapay zekâların ilk okunan listeyi kayırma eğilimini azaltır. Oyuncu adları ya da kişisel bilgi gönderilmez.

### 3.3 Hakemden beklenen (yapılandırılmış JSON)

```json
{
  "kazanan": "Taraf 1",
  "ozet": "…",
  "maddeler": [{ "madde": "2007-08 Fenerbahçe", "taraf": "Taraf 1", "yorum": "…" }],
  "soygun": { "madde": "…", "neden": "…" },
  "hata": { "madde": "…", "neden": "…" }
}
```

Gemini'nin yapılandırılmış çıktı özelliğiyle bu şema zorunlu tutulur; oyun cevabı doğrulamadan ekrana basmaz.

### 3.4 Maliyet ve gizlilik

- Maç başına tek hakem çağrısı. Google AI Studio ücretsiz katmanı başlangıç için yeterli olabilir; dakikalık istek sınırı vardır.
- Ücretsiz katmanda gönderilen veriler Google tarafından model geliştirmede kullanılabilir; bu yüzden sadece futbol maddeleri gönderilir, kişisel bilgi gönderilmez.

## 4. Açık noktalar

1. ~~Hakem talimatı~~ yazıldı (3.2); gerçek Gemini ile denendikten sonra ayarlanacak.
2. **Konu listesi:** başlangıç için kaç konu, hangi konular (en iyi kadrolar, en iyi golcüler, en kazma kadrolar, …), her konuda kaç madde; maddelerin künyeleri.
3. ~~Görsel tasarım~~ **Karar verildi** (2.1). Lobi ve konu kartı ekranları kodlama sırasında aynı dille çizilecek.
4. ~~Parti modu~~ şimdilik yok. ~~Liderlik~~ karar verildi.
5. **Oyunun adı:** çalışma adı "Açık Artırma".
