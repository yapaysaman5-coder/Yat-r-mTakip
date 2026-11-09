# Faz 5 Test Raporu: Ana Ekran

> **Tarih:** 9 Kasım 2026
> **Kapsam:** Ana ekran (`src/app/(tabs)/index.tsx`), FinChart (`src/ui/charts`), varlık satırı ve
> menüsü (`src/components/HoldingRow.tsx`, `HoldingMenu.tsx`), toplu silme/geri alma
> (`src/data/service/transactions.ts`), kripto canlı akışı (`src/data/market/stream.ts`, `src/state/market.ts`)

## Özet

| | Sonuç |
|---|---|
| Yeni testler | **16 test**: grafik okuma ve ölçüm (3), toplu silme/geri alma (1), canlı akış (10), akış fiyatının kaydı (1), gerçek akış (1, canlı) |
| Projedeki tüm testler | **359 test** (356 başarılı, 3 canlı test CI'da atlanır) |
| Canlı testler (gerçek kaynaklar) | 3/3 başarılı, gerçek Binance akışı dahil |
| Tip kontrolü, lint, biçim | Temiz |
| Bitiş kriteri: ana ekran örnek ve gerçek veriyle çalışıyor | ✅ Tarayıcı önizlemesinde ve gerçek kaynaklarla denendi |
| 4 temada ekran görüntüleri | ✅ [1-dort-tema.jpg](../onizleme/faz5/1-dort-tema.jpg) |
| 60 fps akıcılık | Telefonda APK ile doğrulanacak (sunucuda ölçülemez) |

## Birim Testleri

| Test | Beklenen | Sonuç |
|---|---|---|
| Grafik etiketleri | Her noktanın tarihi ve o günkü net yatırılan grafikte okunabilir | ✅ |
| İki gün arası değişim | Aradaki para girişi kazanç sayılmaz (değer farkı − net para akışı) | ✅ |
| Özel aralık | Seçilen iki gün arası, uçlar dahil | ✅ |
| Toplu silme | Bir varlığın tüm kayıtları tek değişiklik olarak silinir, geri alınca döner; sonraki bir para çekimini karşılıksız bırakacak silme reddedilir ve hiçbir kayıt silinmez | ✅ |
| Akış mesajı | Gerçek bir mesajdan son fiyat ve zaman okunur; başka olaylar, bozuk metin, sıfır fiyat atlanır | ✅ |
| Akışa girecek coinler | Yalnız doğrudan Binance paritesiyle fiyatlananlar (BTC, ETH); hisse, döviz, gram altın girmez | ✅ |
| Tek bağlantı | Tüm coinler tek soket; aynı liste gelince bağlantı korunur, liste değişince yenilenir | ✅ |
| Yeniden bağlanma | 1 → 2 → 4 sn… en fazla 60 sn; adresler sırayla; başarılı bağlantıdan sonra baştan | ✅ |
| Sessiz bağlantı | 30 sn mesaj yoksa kapatılıp yeniden açılır | ✅ |
| Durdurma | Soket kapanır, zamanlayıcılar iptal; eski soketin geç gelen kapanışı yeni bağlantı açtırmaz | ✅ |
| Akış fiyatının kaydı | Fiyat ve günün kapanışı yazılır, günün başlangıç fiyatı korunur; İstanbul gece yarısından sonra dünün son fiyatı başlangıç olur | ✅ |

## Gerçek Kaynaklarla

`npm run test:live` (bu oturumda ortamın ağ izinlerine `data-stream.binance.vision` eklendi):

- **Akış:** Bağlantı açıldı, 1–2 saniye içinde BTCUSDT ve ETHUSDT fiyatları geldi (BTC 74.698,06 $).
- **Uçtan uca:** THYAO, AAPL ve BTC içeren bir portföy önce sorguyla fiyatlandı, sonra akıştan gelen
  BTC fiyatı kaydedildi. Portföyde BTC fiyatı akıştakiyle aynı oldu, günün başlangıç fiyatı
  (75.743,85 $) korundu, grafiğin son değeri toplam değere eşit kaldı.

> Telefonda Ayarlar › Veri kaynakları'nda "Kripto canlı akış: Bağlı (anlık) · N coin" görünmeli.

## Tarayıcı Önizlemesinde Denenen Akış

Web önizlemesi kurgusal fiyat kullanır. Dokunuşlar gerçek dokunma olaylarıyla (tek ve iki parmak) verildi.

1. **Dört tema:** Okyanus, Gece, Gün, Kraliyet'te ana ekran ([görsel](../onizleme/faz5/1-dort-tema.jpg)).
2. **Parmakla okuma:** Kılavuz çizgi 23.10.2026'da; üstte o günün değeri ₺1.387.514,08 ve aralık
   başına göre +₺11.696,54 (+%0,84). Parmak kalkınca canlı değere döndü.
3. **İki parmakla ölçüm:** 15.10 → 05.11 arası renklendi; değişim −₺31.652,10 (−%2,25).
4. **Aralık değişimi:** 1A → 1Y şekil dönüşümüyle geçti.
5. **Canlı Bütçe ayrıntısı:**

   | Kalem | Tutar |
   |---|---|
   | Gerçekleşmemiş K/Z | +₺270.954,50 |
   | Gerçekleşen K/Z | +₺7.034,76 |
   | Temettü | +₺6.860,19 |
   | Hesap ücretleri | −₺120,00 |
   | **= Net K/Z** | **+₺284.729,44** (kalemlerin toplamıyla 1 kuruş yuvarlama farkı) |
   | Komisyon (maliyete dahil) | ₺1.455,73 |

6. **Sıralama:** Değer → Bugün % → Toplam % → Ad, sıra her basışta değişti.
7. **Kaydırma:** Sola çekince Sat + Sil, sağa çekince Düzenle + Al ([görsel](../onizleme/faz5/3-satir-hareketleri.jpg)).
8. **Sil ve geri al:** THYAO'nun 4 kaydı silindi; liste ve toplam güncellendi ("THYAO: 4 kayıt silindi").
   GERİ AL ile hepsi döndü, toplam eski değerine geldi.
9. **Uzun basma:** ASELS menüsü açıldı (Ayrıntı, Al, Sat, Kayıtları düzenle, Tüm kayıtlarını sil).

## Test Sırasında Bulunan ve Düzeltilen Konular

| Konu | Düzeltme |
|---|---|
| İki parmakla ölçümde tarih metni sığmıyordu ("15.10.2026 → 05…") | Aynı yıl içindeyse yıl yazılmıyor: "15.10 → 05.11" |
| Akış testindeki örnek mesaj belgeden kurulmuştu | Gerçek akıştan kaydedilen mesajla değiştirildi |
| Canlı testte yalnız BTC beklenmişti | Varsayılan izleme listesindeki ETH de akışa giriyor; beklenti düzeltildi |

## Bilinen Sınırlar

- **1G:** Gün içi değerler saklanmadığı için gerçek portföyde gün başından şimdiye tek çizgi (Faz 10).
- **Grafik ekleri** (para giriş/çıkış işaretleri, en yüksek/en düşük etiketleri, Değer/Getiri/K/Z
  anahtarı, yan çevirince tam ekran): Faz 9'a kaldı.
- **Satırdan silme** onay sormaz; geri alma süresi 5 saniye (karar 32).
