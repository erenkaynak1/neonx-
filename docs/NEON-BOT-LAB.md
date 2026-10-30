# NEON XI Bot Lab v1

NEON XI Bot Lab, gerçek Chromium tarayıcı bağlamlarıyla birden fazla bağımsız oyuncuyu taklit eden geliştirme/test aracıdır. Oyunun normal kullanıcı arayüzüne eklenmez.

## v1 kapsamı

1. İki ayrı mobil tarayıcı oturumu açar.
2. İki ayrı Firebase misafir hesabı oluşturur ve benzersiz oyun içi ad alır.
3. Bot A, Bot B'yi kullanıcı adıyla arar ve arkadaşlık isteği gönderir.
4. Bot B isteği kabul eder; iki tarafta arkadaş listesinin senkronize olduğunu doğrular.
5. Bot A parti daveti gönderir; Bot B kabul eder; iki tarafta aynı parti üyelerinin göründüğünü doğrular.
6. Üyeler partiden ayrılır ve parti kartının temizlendiğini kontrol eder.
7. İki bot aynı anda Draft için `RAKİP BUL` akışına girer.
8. Aynı match ID, aynı room code, zıt host/guest rolü ve doğru opponent UID üretildiğini doğrular.
9. Hata durumunda ekran görüntüsü, Playwright trace ve JSON/Markdown raporu GitHub Actions artifact'i olarak saklar.

## Neden ayrı branch/workflow?

Bot Lab Firebase'in gerçek misafir oturumlarını kullandığı için ilk aşamada otomatik sürekli çalıştırılmaz. `workflow_dispatch` ile elle çalıştırılabilir. Geliştirme branch'inde yapılan değişiklikler ayrıca otomatik test koşusu başlatır.

## Sonraki aşamalar

- Draft seçimlerini iki botla tamamlamak ve aynı oyuncu/slot/kimya tutarlılığını kontrol etmek.
- Draft maçı bitimine kadar gidip skor, maç sonucu ve leaderboard yazımlarını karşılaştırmak.
- XOX için iki oyunculu tam maç botu.
- Bağlantı kesme, sayfa yenileme, double-click, geri çıkma ve yarım kalan oda senaryoları.
- 3+ bot ile Imposter ve parti yarış koşulları.
