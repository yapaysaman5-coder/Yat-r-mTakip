# Faz 4 Test Raporu: Piyasa Verisi

> **Tarih:** 9 Kasım 2026 (Pazartesi, 17:58 İstanbul)
> **Kapsam:** `src/data/market/` (kaynaklar, yönlendirici, seans takvimi, arama), `src/data/service/market.ts` (eşitleme), `src/state/market.ts` (canlı döngü) ve ekranlar
> **Çalıştırma:** `npm run test:coverage` (CI), `npm run test:live` (gerçek kaynaklar; internet gerekir)

## Özet

| | Sonuç |
|---|---|
| Piyasa verisi testleri | **36 test, hepsi başarılı** (+2 canlı test, internet gerektirdiği için isteğe bağlı). Testlerdeki örnek yanıtların **hepsi gerçek kaynaklardan kaydedildi** |
| Projedeki tüm testler | **336 test** (334 başarılı, 2 canlı test CI'da atlanır) |
| Kod kapsamı `src/data` (satır) | **%98,5** |
| Bitiş kriteri 1: BIST, ABD ve kripto fiyatları geliyor | ✅ Gerçek kaynaklarla denendi (aşağıda). Telefonda APK ile doğrulanacak |
| Bitiş kriteri 2: İnternet kesilince son fiyatlarla çalışmaya devam | ✅ Testte: bağlantı yokken saklı fiyatlar duruyor, durum "çevrimdışı" |
| Uçtan uca deneme (gerçek fiyatlar) | ✅ 13 enstrümanın geçmişi 3,9 sn'de, 12 canlı fiyat 1 sn'de, portföy değerlemesi tutarlı |
| Bulunan ve düzeltilen hesap hatası | **TWR para akışı kuralı** (ayrıntı aşağıda) |

## Gerçek Kaynaklarla Canlı Deneme

`npm run test:live` çıktısı. Bu sunucudan, Node'un normal istemcisiyle alındı:

| Enstrüman | Fiyat | Önceki kapanış | Kaynak |
|---|---|---|---|
| THYAO | 309,00 ₺ | 299,25 | Yahoo (15 dk gecikmeli) |
| ASELS | 337,50 ₺ | 331,75 | Yahoo |
| BIST 100 | 11.692,57 | 11.482,60 | Yahoo |
| Dolar/TL | 50,1759 | 50,1343 | Yahoo |
| Euro/TL | 56,2626 | 55,8762 | Yahoo |
| Gram Altın | 6.618,87 ₺ | 6.530,30 | Binance (PAXG/TRY ÷ 31,1035) |
| Bitcoin | 74.794,00 $ | 75.743,85 (İstanbul gece yarısı) | Binance |
| Ethereum | 2.126,88 $ | 2.226,78 | Binance |
| Avalanche | 8,881 $ | 8,181 | Binance |
| Apple | 347,97 $ | 342,37 | Yahoo |
| S&P 500 | 7.499,13 | 7.376,86 | Yahoo |

**Geçmiş, 400 gün:**

| Enstrüman | Gün sayısı | Kaynak |
|---|---|---|
| THYAO | 275 işlem günü | Yahoo |
| BIST 100 | 274 işlem günü | Yahoo |
| Dolar/TL | 284 gün | Yahoo |
| Gram Altın | 401 gün (7/24) | Binance |
| Bitcoin | 401 gün (7/24) | Binance |

Tutarlılık kontrolü: İş Yatırım'ın THYAO için verdiği 6 Kasım kapanışı (299,25), Yahoo'nun
"önceki kapanış"ıyla aynı.

### Uçtan uca: telefondaki akışın aynısı, gerçek fiyatlarla

Senaryo (örnek alımlar):

1. Ocak 2026'da ₺500.000 yatırıldı, 500 THYAO alındı.
2. Şubat'ta 50 AAPL alındı, Mart'ta 0,5 BTC alındı.
3. Nakit yetmeyen alımlar için otomatik para girişleri türedi.

| Adım | Sonuç |
|---|---|
| Gerekenlerin bulunması | Varlıklar, Dolar/TL, 10 ölçüt, izleme listesi |
| Geçmişin indirilmesi | 13 enstrüman, 0 hata, 3,9 sn |
| Canlı fiyatlar | 12 fiyat, 0 hata, 1,0 sn |
| Değerleme | BTC ₺1.875.674 · AAPL ₺874.739 · THYAO ₺154.500 · **toplam ₺2.904.913** |
| Grafiğin son noktası | Toplamla aynı (₺2.904.913) |
| Getiri ölçüleri | TWR %16,5 · XIRR %12,9 · Alpha %19,9 · β 0,35 |
| "Ya Olsaydı?" | 10 gerçek ölçüt. Örnek: Nasdaq 100 ₺3,37 Mn, Dolar/TL ₺3,05 Mn, Gram Altın ₺2,44 Mn |

## Kaynak Adaptörleri (kaydedilmiş gerçek yanıtlarla)

| Kaynak | Denenen | Sonuç |
|---|---|---|
| Binance | Anlık fiyat ve İstanbul gece yarısı açılışı (`tradingDay`, `timeZone=3`); günlük mumlar | ✅ |
| Binance | Sayfalı uzun geçmiş (1.000'er gün) | ✅ |
| Binance | Bilinmeyen bir sembol tüm isteği bozunca tek tek sorma | ✅ |
| Binance | Bölge engelinde (451) diğer adrese geçme | ✅ |
| CoinGecko | 24 saatlik değişimden önceki fiyat; günlük noktaların İstanbul günlerine yerleşmesi | ✅ |
| İş Yatırım | Düzeltilmemiş kapanış | ✅ |
| İş Yatırım | Aynı satırlardan BIST 100 ve USD/TRY | ✅ |
| İş Yatırım | Düzeltilmiş/düzeltilmemiş fiyat oranından bedelsiz tespiti | ✅ |
| İş Yatırım | Yıl yıl isteme, bilinmeyen sembol | ✅ |
| TCMB | Günlük kur XML'i (alış-satış ortası) | ✅ |
| Yahoo | Fiyat, önceki kapanış, zaman, 15 dk gecikme | ✅ |
| Yahoo | **NVDA 10:1 bölünmesi:** düzeltilmiş kapanışlar işlem gören fiyata geri çevrildi (115 → 1.150), bölünme ve temettü olayları okundu | ✅ |
| Yahoo | Bilinmeyen sembol; ilk adres sınır koyunca ikinci adres | ✅ |
| HTTP | Bağlantı yok, zaman aşımı, hata kodu ve "bulunamadı" ayrı ayrı tanınıyor | ✅ |

## Yönlendirici, Seans Takvimi, Arama

| Kontrol | Sonuç |
|---|---|
| Kaynağa göre toplu istek; hata veren veya sembolü bilmeyen kaynakta sıradakine geçme | ✅ |
| Hata veren kaynağı dinlendirme (30 sn → 60 sn → … en çok 15 dk), süre bitince tekrar deneme | ✅ |
| Gram altın (PAXG ÷ 31,1035), Euro/TL (EUR/USDT × Dolar/TL) türetme, önceki kapanış dahil | ✅ |
| Vadeli altın × Dolar/TL geçmişini gün gün çarpma (eksik günlerde son kur) | ✅ |
| Bütün istekler bağlantısız düşünce "çevrimdışı" | ✅ |
| BIST seansı, hafta sonu, Kurban Bayramı 2026 (arife yarım gün, sonra Pazartesi'ye kadar kapalı) | ✅ |
| New York saati: yaz saati başlangıç ve bitiş anları, 9 Kasım'da açılış 17:30 İstanbul, Şükran Günü | ✅ |
| Döviz hafta sonu kapalı, kripto 7/24 | ✅ |
| Yenileme planı: yeni enstrüman hemen; kripto 15 sn, BIST 60 sn, kapalı BIST kapanıştan sonra bir kez | ✅ |
| Arama: "THYAO", "türk hava", "turk hava" (Türkçe harfsiz), "aselsan", "apple", "btc", "altın" | ✅ |
| Katalogda olmayan sembol önerisi (BIST/ABD/Kripto) | ✅ |

## Eşitleme ve Veritabanı

| Kontrol | Sonuç |
|---|---|
| Gerekenler: tutulan varlıklar ilk alım gününden, para birimleri, ölçütler ilk kayıttan, izleme listesi 40 gün | ✅ |
| Örnek portföy hiçbir zaman piyasa verisine dokunmuyor | ✅ |
| Geçmiş bir kez indiriliyor; bir saat sonra hiç istek yok | ✅ |
| Daha eski bir kayıt eklenince yalnız eksik eski günler isteniyor | ✅ |
| Ertesi gün son birkaç gün tazeleniyor | ✅ |
| Hata kaydediliyor, 10 dk beklenmeden tekrar denenmiyor | ✅ |
| Canlı fiyat hem fiyat tablosuna hem o günün kapanışına yazılıyor | ✅ |
| Portföy, kaynağın önceki kapanışıyla değerleniyor | ✅ |
| "Bugün" değişimi fiyat ve kur hareketini birlikte içeriyor | ✅ |
| İnternet yokken saklı fiyatlar korunuyor, durum "çevrimdışı" | ✅ |
| Şema 1'den 2'ye geçiş, mevcut veriye dokunmadan | ✅ |
| İzleme listesi ekleme (sona, tekrarsız), çıkarma; bölünmelerin saklanması | ✅ |

## Bulunan ve Düzeltilen Hesap Hatası: TWR Para Akışı Kuralı

- **Belirti:** Uçtan uca denemede net K/Z +%9 iken TWR **−%47** çıktı.
- **Neden:** Senaryoda BTC, o günün kapanışından (~70.000 $) pahalıya (90.000 $) "alınmıştı". Eski kural para girişini **gün sonunda** sayıyordu. Bu yüzden yeni paranın o gün içindeki kaybı, portföydeki eski paraya yazıldı. Giriş, portföyün 2,7 katı olduğu için kayıp 2,7 kat büyüdü.
- **Düzeltme:** Para girişi artık **günün başında**, para çıkışı **günün sonunda** sayılıyor (performans hesaplarında yaygın kural).
  - Alım veya satım fiyatı kapanıştan farklı olsa bile hata, mevcut paranın o günkü hareketiyle sınırlı kalıyor.
  - Aynı senaryoda TWR **%16,5** oldu; XIRR (%12,9) ve net K/Z ile uyumlu.
- **Belgeler:** Hesaplama Motoru §8 güncellendi. Örnek tablo aynı sonucu (%3,125) verecek şekilde yeniden sıralandı. Tek varlıklı portföy kuralı yeni varsayımla iki ayrı testte doğrulanıyor.
- **Etki:** Örnek portföyün TWR'si %29,5'ten %28,2'ye, Alpha %11,5'ten %10,9'a değişti. Diğer rakamlar aynı.

## Denemede Öğrenilenler (kaynak seçimi)

| Bulgu | Karar |
|---|---|
| `api.binance.com` bu sunucuya 451 (bölge engeli) döndürdü | Birincil adres `data-api.binance.vision` (yalnız piyasa verisi, her yerden erişilir), diğeri yedek |
| Stooq tarayıcı doğrulaması (JavaScript bulmacası) istiyor | Kullanılmıyor: bot korumasını aşmak doğru değil |
| Yahoo komut satırı araçlarına 429 dedi, uygulamanın normal istemcisine yanıt verdi | Uygulama hiçbir kimlik taklidi yapmaz. Yahoo yanıt vermezse yedekler devrede |
| İş Yatırım bir istekte en fazla ~1 yıl veriyi eksiksiz veriyor | Takvim yılı yılı istenir |
| Binance'te EUR/TRY paritesi yok | Euro/TL = EUR/USDT × Dolar/TL |

## Tarayıcı Önizlemesinde Denenen Akışlar

Web önizlemesi kurgusal fiyatlarla çalışır ve bunu ekranda yazar.

1. Ana ekran:
   - Örnek portföyde rozet **ÖRNEK** (eskiden "CANLI" yazıyordu).
   - Piyasalar şeridi görünüyor.
2. Piyasalar:
   - 10 enstrüman, mini grafikler, "Açık · 17:55 · 15 dk gecikme" gibi durum satırları.
   - Arama: "türk" yazınca THYAO, TCELL, TTKOM… ile 12 sonuç geldi; THYAO listeye eklendi.
   - Gram Altın ayrıntısı: piyasa, durum, fiyat zamanı, önceki kapanış, kaynak.
3. Veri Kaynakları: son fiyat ve geçmiş zamanları, beş kaynağın durumu.
4. Ana Portföy:
   - 1 Haziran'a ₺100.000 para girişi eklendi.
   - Analiz'de "Ya Olsaydı?" 10 ölçütle çizildi: grafik, lig tablosu, özet.

## Bilinen Sınırlar

- **Telefonda doğrulama:** Bu rapordaki canlı denemeler sunucudan yapıldı. Telefonda (Android) aynı istekler APK ile denenmeli. Ayarlar › Veri kaynakları ekranı her kaynağın durumunu ve son hatasını gösterir.
- **Kripto WebSocket akışı:** Faz 5'te. Şimdilik 15 sn'de bir sorgu.
- **TÜFE ve mevduat ölçütleri:** Faz 9'da gömülü tabloyla.
- **Yedeksiz veriler:** ABD hisseleri ve BIST 30 için yedek kaynak yok. Yahoo yanıt vermezse son fiyat gösterilir.
- **Alış/satış formu:** Faz 6'da. Piyasalar ekranında aranıp izlenen bir sembol, o zaman doğrudan alınabilecek.
