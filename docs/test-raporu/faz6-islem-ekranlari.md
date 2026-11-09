# Faz 6 Test Raporu: İşlem Ekranları ve Varlık Detayı

> **Tarih:** 9 Kasım 2026
> **Kapsam:** Al/Sat, temettü ve bölünme formları, varlık seçimi, varlık detay ekranı (`src/app/islem`, `src/app/varlik`, `src/data/trade.ts`, `src/data/service/trade.ts`)
> **Not:** Faz 5'ten (ana ekran) önce yapıldı: fiyatlar geldiği için kendi kayıtlarını girebilmen öncelikliydi.

## Özet

| | Sonuç |
|---|---|
| Yeni testler | **7 test** (form yardımcıları, ön izleme, günün kapanışı, varlık kaydı, son kullanılanlar) |
| Projedeki tüm testler | **343 test** (341 başarılı, 2 canlı test CI'da atlanır) |
| Tip kontrolü, lint, biçim | Temiz |
| Bitiş kriteri: kendi alım-satımlarını girip gerçek fiyatlarla takip | ✅ Tarayıcı önizlemesinde baştan sona denendi (aşağıda); telefonda APK ile |

## Ön İzleme Neden Güvenilir

Formdaki özet ayrı bir formülle hesaplanmaz. Kaydedilecek kayıt, portföyün **tüm geçmişine
eklenip motor yeniden oynatılır** (`previewTrade`). Bu yüzden:

- Gösterilen yeni ortalama maliyet, otomatik para girişi ve tahmini gerçekleşen K/Z, kaydedildikten sonra ekranlarda görülenle aynıdır.
- Kaydetmeyi engelleyecek bir sorun (eldekinden fazla satış, eksi nakit) kaydet düğmesine basmadan önce görünür.
- Bir kaydı düzenlerken ön izleme eski kaydın yerine yenisini koyar.

| Test | Beklenen | Sonuç |
|---|---|---|
| Komisyon önerisi | BIST ₺31.240 → ₺62,48 (‰2); ABD $1; kripto %0,1; endeks/döviz 0 | ✅ |
| Stopaj önerisi | BIST %15, ABD %20 | ✅ |
| Geçmiş günün saati | Saat yazılmazsa BIST 11:00, ABD 18:00; bugün "şimdi"; geçersiz saat yok sayılır | ✅ |
| Alış ön izlemesi | 100 adet ₺100 + 100 adet ₺150 → yeni ort. maliyet ₺125,25; ₺9.980 nakit varken ₺5.050 otomatik para girişi | ✅ |
| Satış ön izlemesi | 40 adet ₺130, komisyon ₺10 → gerçekleşen +₺1.182 | ✅ |
| Fazla satış | 150 adet satış "OVERSELL" olarak görünür | ✅ |
| Düzenleme | Alış 100 → 50 adet: önce 0, sonra 50 | ✅ |
| Günün kapanışı | Cumartesi istenince Cuma'nın kapanışı. Eksikse o hafta bir kez indirilir, sonra yerelden; internetsizken saklı olan | ✅ |
| Varlık kaydı | Yeni bir varlık, fiyat kaynağı koduyla birlikte kaydedilir | ✅ |
| Son kullanılanlar | En son işlem yapılan varlık önce | ✅ |

## Tarayıcı Önizlemesinde Denenen Akış

Web önizlemesi kurgusal fiyat kullanır; telefonda aynı akış gerçek fiyatlarla çalışır.

1. **Örnek portföy, THYAO detayı:**
   - Fiyat grafiği, ortalama maliyet çizgisi (₺246,14).
   - Pozisyon: 1.000 adet, açık K/Z +₺66.256,70 (+%26,92), temettü ₺2.295.
   - Alışlar (3) / Satışlar (0), sabit AL ve SAT.
2. **Ana Portföy:** 1 Eylül'e ₺20.000 para girişi.
3. **Al formu:**
   - Arama ile THYAO seçildi, tarih 2 Eylül yapıldı, fiyat o günün kapanışına (₺337,10) kendiliğinden geçti.
   - 100 adet girildi; komisyon ₺67,42 (‰2).
   - Özet: toplam ₺33.777,42, yeni ort. maliyet ₺337,77. "Nakit yetersiz: ₺13.777,42 için otomatik para yatırma eklenir."
   - Kaydedildi.
4. **Sat formu:**
   - Eldeki 100 adet, "Tümünü sat" düğmesi.
   - 40 adet girildi: kalan 60, tahmini gerçekleşen K/Z −₺1.475,09 (−%10,9). "Hesaptan çek" anahtarı.
5. **Kendi THYAO detayın:** Alış işareti alış fiyatında, pozisyon kartı, izleme listesi yıldızı.
6. **Temettü formu:** ₺500 brüt, %15 stopaj → hesaba geçen +₺425.
7. **Ana ekran:** Yeni pozisyon ve Canlı Bütçe (yatırılan = elle + otomatik para girişleri).

## Test Sırasında Bulunan ve Düzeltilen Konular

1. **Fiyat önerisi:** Gün sonradan değiştirilince fiyat alanı ilk önerilen (bugünün) fiyatta kalıyordu. Artık elle yazılmadıkça seçilen günün kapanışı ve kuru yazılıyor; elle yazılan değere dokunulmuyor.
2. **"Tümünü sat":** BIST adedinde (ondalıksız) sondaki sıfırlar silinip 100 → 1 olabiliyordu. Düzeltildi; yalnız ondalıklı adetlerde gereksiz sıfırlar atılıyor.

## Bilinen Sınırlar

- **Grafik:** Mum grafik ve grafikteki işarete dokununca detay açılması Faz 5'te (FinChart).
- **"Dışarıdan yeni para":** Alışla aynı anda ayrı bir para girişi kaydı oluşturur. Alış sonradan silinirse bu giriş kendiliğinden silinmez; Geçmiş'ten silinebilir. "Portföy nakdi" seçeneğindeki otomatik giriş ise alışla birlikte değişir.
- **Hesap ücreti kaydını düzenleme:** Ayarlar fazında.
