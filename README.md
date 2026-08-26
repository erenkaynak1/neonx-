# neonx-
Neon XI football games 
Eğer bir sorun ile karşılaşırsanız veya sorunuz, öneriniz olursa anlık olarak iletişime geçebilirsiniz 
instagram: @erenkaynak_

## Yan oyun oyuncu havuzu

Career Twin ve Futbol XOX aynı master oyuncu evreninden türetilir. Master kaynak,
haftalık güncellenen `dcaribou/transfermarkt-datasets` DuckDB dağıtımıdır ve
Transfermarkt `player_id` kalıcı kimlik olarak kullanılır.

- `scripts/build_transfermarkt_master_pool.py` canonical master havuzu üretir.
- `scripts/build_xox_master_pool.py` mevcut `xox-rules.json` kurallarını master
  havuza uygular.
- Career Twin master JSON'u doğrudan okur ve kaynakta bulunmayan parametreleri
  tur listesinden çıkarır.
- Kilo ve kupa alanları başka bir doğrulanmış kaynak bağlanana kadar `null`
  kalır; tahmin veya eski veri kaynağıyla doldurulmaz.
