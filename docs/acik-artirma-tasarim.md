# Açık Artırma — Tasarım Belgesi

> Durum: **taslak, soru–cevapla kuruluyor** (2026-11-21). Kod yazılmadı. Çalışma adı: **Açık Artırma**.

## 0. Oyunun özü

İki (ya da daha fazla) oyuncu aynı bütçeyle başlar. Bir konu çıkar ("Tarihin en iyi Fenerbahçe kadroları"), konunun maddeleri ("2007-08 Fenerbahçe", "2010-11 Fenerbahçe"…) sırayla açık artırmaya çıkar ve en yüksek teklifi veren maddeyi alır. Seçimler dolunca **yapay zekâ hakem (Gemini)** iki tarafın topladıklarını değerlendirir, kazananı ve gerekçesini esprili bir dille açıklar.

Futbol bilgisi = doğru maddeye doğru parayı vermek, rakibi pahalı maddelere çekmek, ucuz kalan cevheri kapmak.

## 1. Kararlar

| Konu | Karar |
|---|---|
| Oyuncu sayısı | 2 (online 1v1, aynı telefon); parti modunda 3+ |
| Bütçe | 20 **NEON para** |
| Seçim | Oyuncu başına **5** |
| Madde sayısı | Seçim sayısının tam iki katı: 2 kişide **10** (partide 5 × oyuncu sayısı) |
| Konu ve maddeler | **Hazır liste**, bizim kontrolümüzde; her maçta konudan rastgele 10 madde. Yanlış ya da uydurma madde çıkmaz. Gemini sadece hakemlik yapar |
| Teklif | **Sırayla artırma**: açılış 1 para; sıra gelen +1 / +2 / +3 yapar ya da PAS der; hamle başına **10 sn**, süre biterse pas. Pas diyen o maddeden çekilir, son teklifi veren alır |
| Açılış sırası | İlk maddeyi kimin açacağı rastgele; sonra her maddede sıra değişir. Açan 1 para ile açar ya da pas der |
| Bütçe kuralı | Para biriktirme zorunluluğu yok. Parası biten teklif veremez; kalan maddelerden rakibin almadıkları **bedavaya** ona gelir. Rakip tek teklifçi olarak 1 paraya alabilir ya da pas diyebilir; pas derse madde parası bitene gider. 5 seçimini dolduran teklif vermez; kalan maddeler diğer oyuncuya gider. Kimsenin seçimi boş kalmaz |
| Bilgi | Teklif sırasında madde adı + **kısa künye** (gerçek bilgi, değerlendirme yok). Örnek: "2007-08 Fenerbahçe · TD Zico · Şampiyonlar Ligi çeyrek final" |
| Kazanan | **Yapay zekâ hakem (Gemini)** |
| Ters konular | "En kazma kadro" gibi konularda en kötüyü toplayan kazanır; konu başlığında açıkça gösterilir (↓ EN KÖTÜYÜ TOPLAYAN KAZANIR). Hakeme konunun yönü söylenir |
| Hakem tarzı | **Komik + gerekçeli**: meme / sosyal medya dili, ama her kararın futbol gerekçesi var |

## 2. Akış

1. Lobi: mod seçimi (online 1v1, aynı telefon, parti); online'da mevcut lobi ve eşleşme sistemi.
2. Konu kartı: konu başlığı, yönü (en iyi / en kötü), 10 maddenin listesi (sıralı).
3. Açık artırma: madde madde; ekranda madde + künye, iki tarafın kalan parası ve dolan seçimleri, teklif tuşları (+1 / +2 / +3 / PAS), 10 sn sayaç.
4. Hakem bekleme ekranı ("Hakem düşünüyor…").
5. Karar ekranı: kazanan, kısa özet, her maddeye tek satır yorum, yılın soygunu / en pahalı hata, iki tarafın harcaması.
6. Rövanş / yeni konu.

## 3. Yapay zekâ hakem (Gemini)

### 3.1 Mimari

```
Oyun (telefon) ──► Aracı sunucu: Cloudflare Worker (Gemini anahtarı burada, gizli) ──► Gemini API
               ◄── { kazanan, gerekçe, madde yorumları } ◄──
```

- **API anahtarı oyunun koduna asla girmez** (site herkese açık; anahtar sızar). Anahtar Cloudflare paneline gizli değişken (secret) olarak girilir; ne oyuncular ne de depo görür. Anahtar sohbete de yapıştırılmaz.
- **Neden Cloudflare Workers:** ücretsiz katmanı (günde 100.000 istek) yeterli, kart gerekmez. Firebase'in sunucu fonksiyonları ücretli plana bağlı.
- **Koruma:** Worker yalnızca oyuna giriş yapmış oyunculardan (Firebase kimlik jetonu doğrulanır) gelen istekleri kabul eder; oyuncu başına dakikalık istek sınırı vardır; istek gövdesi boyutu sınırlıdır; Worker sadece hakem çağrısını yapar, serbest metin göndermeye izin vermez (maddeler listeden id ile gelir).
- **Online maçta:** kararı yalnızca ev sahibi cihaz ister ve sonucu odaya yazar; iki oyuncu aynı kararı görür.
- **Hata durumu:** Gemini cevap vermezse ya da biçim bozuksa bir kez yeniden denenir; yine olmazsa yedek kural: maçlar berabere sayılır ve kullanıcıya açıkça söylenir (sessizce rastgele karar verilmez).

### 3.2 Hakeme gönderilen

- Konu başlığı ve yönü (en iyi / en kötü).
- Her oyuncunun aldığı maddeler, künyeleri ve ödediği paralar.
- Kullanıcının hazırladığı talimat (prompt) — **bekleniyor**.
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

1. **Hakem talimatı (prompt):** kullanıcı hazırladı, paylaşacak (anahtar olmadan).
2. **Konu listesi:** başlangıç için kaç konu, hangi konular (en iyi kadrolar, en iyi golcüler, en kazma kadrolar, …), her konuda kaç madde; maddelerin künyeleri.
3. **Görsel tasarım:** kullanıcı benzer oyunun video ekran görüntülerini paylaşacak; NEON XI tasarım diline uyarlanacak. Birebir kopya yapılmaz.
4. **Parti modu ayrıntıları:** 3+ kişide teklif sırası (sırayla dönen), hakemin sıralama vermesi.
5. **Puan / liderlik tablosu:** kazanılan maçlar liderliğe yazılsın mı?
6. **Oyunun adı:** çalışma adı "Açık Artırma".
