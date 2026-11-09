# Faz 3 Test Raporu: Veritabanı ve Kalıcılık

> **Tarih:** 9 Kasım 2026
> **Kapsam:** `src/data/` (veritabanı, kayıt kuralları, değer önbelleği, örnek portföy, yedek) ve ekranların veritabanına bağlanması
> **Çalıştırma:** `npm run test:coverage` (GitHub'da her gönderimde otomatik çalışır)

## Özet

| | Sonuç |
|---|---|
| Veri katmanı testleri | **30 test, hepsi başarılı.** Hepsi Node'un yerleşik SQLite'ı ile **gerçek bir SQLite veritabanında** çalışır |
| Projedeki tüm testler | **294 test, hepsi başarılı** |
| Kod kapsamı `src/data` (satır / dal) | **%98,4 / %88,7** (hedef ≥ %90 / ≥ %80) |
| Kod kapsamı `src/domain` (satır / dal) | **%99,8 / %96** (değişmedi) |
| Bitiş kriteri 1: eklenen kayıtlar uygulama yeniden açılınca duruyor | ✅ Testte ve tarayıcı önizlemesinde (sayfa yenilendikten sonra) doğrulandı |
| Bitiş kriteri 2: yedekten geri yükleme birebir aynı sonucu veriyor | ✅ Özet, varlıklar, geçmiş, günlük seri ve tüm analiz ölçüleri **birebir** aynı |
| Artımlı değer önbelleği | ✅ Herhangi bir günden başlayan hesap, baştan hesapla birebir aynı |

## Bitiş Kriterleri

### 1. Kayıtlar kalıcı

- **Test:** Kayıtlar yazılır, veritabanı yeniden okunur, her alan aynı metin olarak geri gelir. Örneğin `0.12345678` adet, `312.40` fiyat, not ve "satış tutarını çek" seçeneği.
- **Tarayıcı önizlemesi:**
  1. Ana Portföy'e ₺25.000 yatırıldı.
  2. Sayfa yenilendi: tutar, Canlı Bütçe ve geçmiş aynı kaldı.
- **Telefonda:** Aynı akış APK'da denenebilir.
  1. ＋ › Para Yatır ile kayıt ekle.
  2. Uygulamayı kapatıp aç.

### 2. Yedekten geri yükleme birebir aynı

Test senaryosu:

1. Bir veritabanına örnek portföy ve Ana Portföy yazılır. İkisine de birer kayıt eklenir, biri örnek portföyde elle yapılan bir değişikliktir.
2. Yedek alınır (29 kayıt, 5,3 KB).
3. Yedek, içinde başka veriler olan ikinci bir veritabanına geri yüklenir.
4. Her iki portföy için şunlar karşılaştırılır: özet, varlıklar, geçmiş, günlük değer serisi, TWR, XIRR, Alpha, Beta, risk ölçüleri ve aylık getiriler. **Hepsi birebir aynı.**
5. Geri yüklenen veritabanından alınan yedek, ilk yedekle aynı.

Örnek portföyün kurgusal fiyatları yedeğe girmez. Bitiş gününden birebir aynı üretilir.

## Kayıt Kuralları

Her ekleme, düzenleme ve silme yazılmadan önce tüm geçmiş yeniden oynatılarak denetlenir. Sorun varsa hiçbir şey yazılmaz.

| Durum | Sonuç | Test |
|---|---|---|
| Eksi tutar, gelecek tarih, bilinmeyen varlık | Reddedilir, alan ve sebep bildirilir | ✅ |
| T7: Eldekinden fazla satış | Reddedilir | ✅ |
| T8: Sonraki bir satışın dayandığı alışı **silmek** | Reddedilir, etkilenen satış adıyla bildirilir (0 adet vardı, 8 satılmış) | ✅ |
| T8: Aynı alışın adedini **küçültmek** | Reddedilir | ✅ |
| Nakitten fazla para çekme | Reddedilir. Formda "en fazla ₺X çekebilirsin" yazar | ✅ |
| Sonraki bir çekişi karşılıksız bırakacak para girişini silmek | Reddedilir | ✅ |
| Nakit yetmeyen alış | Otomatik para girişi türetilir, bir üst kuruşa yuvarlanır (₺21.818,4974… → ₺21.818,50) | ✅ |
| Otomatik kaydı tek başına silmek veya kaydetmek | Reddedilir: bağlı olduğu kaydın düzenlenmesi gerekir | ✅ |
| Başka portföyün kaydını değiştirmek, olmayan portföye yazmak | Reddedilir | ✅ |
| Sil ve **geri al** | Silinen kayıt aynı kimlikle geri gelir | ✅ |

## Veritabanı Altyapısı

| Kontrol | Sonuç |
|---|---|
| Şema sıfırdan kurulur, tekrar çalıştırmak bir şey değiştirmez | ✅ |
| Sonraki bir migration, mevcut verinin üstüne uygulanır | ✅ |
| Yarıda hata veren migration **tamamen** geri alınır (sütun eklenmez, sürüm değişmez) | ✅ |
| Uygulamanın daha yeni sürümüyle yazılmış veritabanı açılmaz (bozulmasın diye) | ✅ |
| Hata veren işlem (transaction) tamamen geri alınır | ✅ |
| Bir işlem sürerken gelen okuma onun bitmesini bekler, kuyruk hatadan sonra tıkanmaz | ✅ |
| 1.000 satır tek seferde yazılır (parçalı çok satırlı INSERT) | ✅ |
| Bilinmeyen varlıklı kayıt veritabanı kuralıyla da reddedilir (yabancı anahtar) | ✅ |
| Portföy silinince kayıtları ve önbelleği de silinir | ✅ |

## Artımlı Değer Önbelleği

| Kontrol | Sonuç |
|---|---|
| Motor düzeyi: 11 günlük karışık senaryo (alış, satış, USD varlık, kur boşluğu, bölünme, temettü, para çekme). **Her** başlangıç gününden hesaplanan seri, baştan hesapla birebir aynı | ✅ |
| Veritabanı düzeyi: Her değişiklikten sonra önbellek, sıfırdan hesaplanan seriyle birebir aynı | ✅ |
| Değişiklik yoksa sadece son gün yeniden hesaplanır | ✅ |
| Şubat'taki bir değişiklik sadece Şubat'tan itibaren hesaplanır | ✅ |
| İlk kayıttan önceki bir tarihe kayıt eklenirse tamamı yeniden kurulur | ✅ |
| Ertesi gün açılınca seri bir gün uzar | ✅ |
| Fiyatı hiç olmayan varlık en son işlem fiyatıyla değerlenir | ✅ (yeni kural, motorda) |

## Örnek Portföy ve Boş Portföyler

| Kontrol | Sonuç |
|---|---|
| Örnek portföy veritabanına yazılır, oluşturulduğu gün biter (666 gün) | ✅ |
| Motor uyarısı yok, nakit hiç eksiye düşmüyor, temel eşitlik farkı < 10⁻²⁰ ₺ | ✅ |
| Rakamlar Faz 2 önizlemesiyle aynı: ₺1.435.284,81, bugün +₺12.383,17, TWR %29,5, XIRR %16,8, Alpha %11,5, β 0,44, risk 6/7 | ✅ |
| Grafiğin son noktası ana ekrandaki toplamla aynı | ✅ |
| Bugünkü alış "şu andan" ileri tarihli olmaz (sabah erken açılışta da) | ✅ |
| Sonraki günlerde açılınca: değer aynı, "bugün" değişimi 0, seri bugüne uzar | ✅ |
| Yeniden oluşturma ve kaldırma: kurgusal fiyatlar ve varlıklar da temizlenir | ✅ |
| Boş portföy: tüm tutarlar 0, oranlar "—", grafik ve ölçüler boş, hata yok | ✅ |
| Sadece nakit: Canlı Bütçe, geçmiş, getiri %0 doğru | ✅ |

## Yedek Dosyası Kontrolleri

Bozuk veya uyumsuz dosyalar **hiçbir şeyi değiştirmeden** reddedilir. Her durumun Türkçe bir mesajı var.

- JSON değil
- Başka bir uygulamanın dosyası
- Uygulamanın daha yeni bir sürümünün yedeği
- Eksik bölüm
- Geçersiz portföy türü
- Aynı kimlikli iki portföy veya iki kayıt
- Örnek portföyün bitiş günü eksik
- Desteklenmeyen para birimi
- Var olmayan portföye ait kayıt
- Otomatik işaretli kayıt
- Tutarın sayı yerine yanlış türde olması
- Geçersiz tutar
- Eldekinden fazla satış içeren tutarsız geçmiş

## Hız

Ölçüm ortamı: Node.js, bu geliştirme sunucusu. Örnek portföy: 27 kayıt, 666 gün, 7 varlık, 12 ölçüt.

| İşlem | Süre |
|---|---|
| Örnek portföyü yazmak (12.654 günlük fiyat dahil) | 30–48 ms |
| İlk açılış: değer serisi baştan | 51–63 ms |
| Sonraki açılış: önbellekten | **18–19 ms** |
| Ekim'de bir değişiklikten sonra açılış (artımlı) | 21–23 ms |
| 2025 Ocak'ta bir değişiklikten sonra açılış (neredeyse tamamı) | 47–48 ms |
| Bir kaydı denetleyip yazmak (iki kez tüm geçmişi oynatarak) | 2 ms |
| Analiz ekranı (12 ölçüt, ondalık hassasiyetli Ya Olsaydı) | 25–34 ms |
| Yedeği geri yüklemek | 27 ms |

- **Telefonda ölçüm:** Ayarlar › Veri ve Yedekleme › **Hesaplama hız testi** düğmesi, T12 senaryosunu (1.000 ve 10.000 kayıt) **telefonun kendisinde** çalıştırır. Faz 2'de söz verilen telefon ölçümü artık uygulamanın içinden yapılabilir. Aynı ekranda son açılışın süresi de görünür.
- **Tarayıcıda (Chromium):** 1.147 kayıt 19 ms, 11.221 kayıt 129 ms.

## Tarayıcı Önizlemesinde Elle Denenen Akışlar

1. Portföy seçici ile Örnek Portföy'den Ana Portföy'e geçiş. Boş portföy ekranı ve "Para Yatır" düğmesi göründü.
2. ₺25.000 para girişi eklendi. Canlı Bütçe, dağılım (%100 nakit) ve geçmiş güncellendi.
3. Sayfa yenilendi: veriler duruyor.
4. ₺30.000 çekmek istendi. Kayıt reddedildi: "Nakit yetmiyor: o tarihte en fazla ₺25.000,00 çekebilirsin."
5. Geçmiş'te kayda dokunuldu: detay açıldı. "Sil" ile silindi, "GERİ AL" ile geri geldi.
6. Ayarlar › Veri ve Yedekleme: sayılar ve hız testi göründü.

## Test Sırasında Bulunan ve Düzeltilen Konular

1. **Ortadan başlayan seri:**
   - **Sorun:** `buildDailySeries` bir tarihten başlatıldığında, önceki tüm para girişlerini ilk günün akışı sayıyordu. Önceki günlerin kapanışını da taşımıyordu.
   - **Düzeltme:** Önceki kayıtlar artık sessizce oynatılıyor ve son kapanış taşınıyor. Artımlı önbellek buna dayanıyor.
2. **Fiyatı olmayan varlık:**
   - **Sorun:** İlk alış fiyatıyla değerleniyordu.
   - **Düzeltme:** Artık en son işlem fiyatıyla değerleniyor.
3. **Form taşması (web):** Büyük tutar alanı dar ekranda sayfayı yana kaydırıyordu. Düzeltildi.
4. **Dağılım çubuğu:** Sadece nakit olan portföyde boş piyasalar nokta gibi görünüyordu. Artık sıfır dilimler gösterilmiyor.
5. **Test beklentisi hataları:** Üç testte yanlış olan benim yazdığım beklenen değerlerdi, kodun hesabı değildi; elle hesaplanıp düzeltildi:
   - Kuruşa yuvarlama örneği. Doğrusu 603,999 × 36,1234 = 21.818,4974…
   - Örnek portföydeki günlük fiyat sayısı. Dolar/TL hem kur hem ölçüt olduğu için 666 × 19.
   - Nakdi eksiye düşüreceği için **doğru şekilde reddedilen** bir silme.

## Bilinen Sınırlar (sonraki fazlar)

- **Alış/satış formu:** Faz 6'da geliyor. Şimdilik kendi portföyüne para girişi ve çıkışı eklenebiliyor; örnek portföyde tüm türler görülebiliyor.
- **Gerçek fiyatlar:** Kendi portföyün için gerçek fiyatlar ve "Ya Olsaydı?" ölçütleri Faz 4'te (piyasa verisi) gelecek. O zamana kadar Analiz'de ölçüt bölümü bunu açıklayan bir mesaj gösterir.
- **Portföy ekleme, yeniden adlandırma ve hesaplama ayarları:** Faz 10'da gelecek (maliyet yöntemi, otomatik para yatırma).
