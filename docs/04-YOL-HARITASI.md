# Yol Haritası

> Geliştirme bu sırayla, faz faz ilerler. Her fazın sonunda:
>
> 1. Kod commit'lenir ve bu depoya gönderilir.
> 2. Ekran görüntüleri ve özet paylaşılır.
> 3. Onayınız ve geri bildiriminiz alınır, sonra bir sonraki faza geçilir.
>
> Ana doküman: [01-PROJE-DOKUMANI.md](01-PROJE-DOKUMANI.md)

## Genel Bakış

| Faz | Konu | Sonunda göreceğiniz |
|---|---|---|
| 0 | Doküman ve onay | Bu dokümanlar ✅ |
| 1 | Proje iskeleti ve tasarım sistemi | 4 temalı, alt barlı, gezilebilir uygulama kabuğu |
| 2 | Hesaplama motoru | Tüm formüllerin test raporu |
| 3 | Veritabanı ve kalıcılık | İşlemler kaydediliyor, uygulama kapanınca kaybolmuyor. Örnek portföy |
| 4 | Piyasa verisi | Telefonda gerçek ve canlı fiyatlar |
| 5 | Portföy (ana ekran) | Canlı bakiye, grafik, canlı bütçe, kaydırmalı liste |
| 6 | İşlem ekranları ve varlık detayı | Al/Sat, para yatır/çek, varlık detay |
| 7 | Geçmiş | 4 alt sekmeli geçmiş ekranı |
| 8 | Fon (Hesabım) | Varlık/Maliyet tuşlu fon ekranı |
| 9 | Analiz | Ya Olsaydı?, performans, risk, dağılım |
| 10 | Ayarlar, güvenlik ve cila | Tüm ayarlar, Face ID, yedekleme, ilk açılış akışı |
| 11 | Yayına hazırlık | Telefona kurulabilir sürüm (APK / TestFlight) |
| 12+ | Sonraki sürümler | Alarmlar, widget, temettü takvimi, ek varlık türleri... |

---

## Faz 0: Doküman ve Onay ✅

- [x] Dünyadaki en iyi uygulamaların incelenmesi
- [x] Ürün dokümanı, ekranlar, temalar
- [x] Hesaplama motoru tanımı ve örnek hesaplar
- [x] Teknik mimari ve veri kaynakları
- [x] **Onay** (8 Kasım 2026, [01-PROJE-DOKUMANI §13](01-PROJE-DOKUMANI.md#13-onaylanan-kararlar))

## Faz 1: Proje İskeleti ve Tasarım Sistemi ✅

- [x] Expo SDK 58 + TypeScript (strict) + expo-router kurulumu
- [x] ESLint, Prettier, Jest ve GitHub Actions (tip kontrolü + lint + test + biçim)
- [x] Tasarım jetonları ve 4 tema (Okyanus, Gece, Gün, Kraliyet) + sistem modu + renk körü modu
- [x] Temel bileşenler:
  - Metin, Para metni, Değişim rozeti, Kart, Degrade kart
  - Buton, Simge butonu, Çip, Bölmeli seçici
  - Liste satırı, Varlık rozeti, Canlı nokta, Dağılım çubuğu
  - İskelet yükleyici, Alt sayfa, Bildirim ve Geri al çubuğu, Boş durum
  - Statik grafikler: alan, çoklu çizgi, mini trend, halka
- [x] Alt bar: Portföy · Analiz · ＋ · Fon · Geçmiş. ＋ tuşu hızlı işlem sayfasını açar
- [x] Ekran kabukları (örnek verili tasarım önizlemesi):
  - Portföy, Analiz (Ya Olsaydı?), Fon (Varlık / Maliyet), Geçmiş
  - Ayarlar, Tema seçimi, Tasarım vitrini
- [x] Türkçe biçimlendiriciler (para, yüzde, kısaltma, adet, tarih, giriş ayrıştırma) ve testleri
- [x] **Ek:** Gizlilik modu (Faz 5'ten öne alındı), titreşim ayarı, ayarların kalıcı saklanması
- [x] **Ek:** Tüm temalar için otomatik WCAG AA kontrast testi (150 test)

**Bitiş kriteri:** Uygulama açılıyor, sekmeler arasında geziliyor, 4 tema arasında anında
geçiş yapılıyor. Ekran görüntüleri paylaşıldı ✅
([önizleme görselleri](onizleme/faz1/)).

> **Not:** Ekranlardaki tutarlar **örnek veridir** ve ekranda "Tasarım önizlemesi" etiketiyle
> belirtilir. Gerçek hesaplar Faz 2–4'te bağlanır. Grafikler bu fazda statiktir. Parmakla
> gezinilen GPU grafiği (FinChart) Faz 5'te gelir.

## Faz 2: Hesaplama Motoru

- [ ] Ondalık yardımcıları, işlem tipleri ve doğrulama
- [ ] Pozisyon: ağırlıklı ortalama ve FIFO, gerçekleşen ve gerçekleşmemiş K/Z
- [ ] Nakit ve Canlı Bütçe. Otomatik bağlı kayıtlar (para yatırma ve çekme)
- [ ] Kur etkisi ayrıştırması, günlük değişim
- [ ] Bölünme / bedelsiz, temettü
- [ ] Değer serisi (günlük ve gün içi), LTTB seyreltme
- [ ] Pay değeri ve TWR, XIRR, risk metrikleri, risk değeri, reel getiri
- [ ] Ya Olsaydı simülasyonu
- [ ] Test senaryoları T1–T14 ve değişmez kurallar

**Bitiş kriteri:** Tüm testler başarılı. `src/domain` kapsamı ≥ %95. Test raporu paylaşıldı.

## Faz 3: Veritabanı ve Kalıcılık

- [ ] SQLite şeması ve migration altyapısı
- [ ] Repository'ler, işlem ekleme/düzenleme/silme ve doğrulamalar (fazla satış vb.)
- [ ] Günlük değer önbelleği (artımlı yeniden hesap)
- [ ] Örnek (demo) portföy üretici
- [ ] Yedeği dışa ve içe aktarma (JSON)

**Bitiş kriteri:** Eklenen işlemler uygulama yeniden açılınca duruyor. Yedekten geri yükleme
birebir aynı sonucu veriyor.

## Faz 4: Piyasa Verisi

- [ ] Sağlayıcı arayüzü ve sahte (mock) sağlayıcı
- [ ] Adaptörler: Yahoo (BIST, ABD, döviz, emtia, endeks), Binance (REST + WebSocket), CoinGecko, TCMB
- [ ] Sembol katalogları (BIST, kripto) ve arama
- [ ] Canlı güncelleme zamanlayıcısı, seans takvimi, piyasa durumu
- [ ] Önbellek, çevrimdışı mod, yedeğe geçiş
- [ ] Bölünme ve temettü olaylarının alınması

**Bitiş kriteri:** Telefonda BIST, ABD ve kripto fiyatları geliyor. İnternet kesilince son
fiyatlarla çalışmaya devam ediyor.

## Faz 5: Portföy (Ana Ekran)

- [ ] Canlı bakiye: kayan sayaç, durum noktası, yapışkan başlık
- [ ] **FinChart:**
  - Aralıklar: 1G · 1H · 1A · 3A · 6A · 1Y · YB · Tümü · Özel
  - Sürükleyerek okuma, net yatırılan çizgisi
  - Şekil dönüşümü animasyonu, iki parmakla ölçüm
- [ ] Canlı Bütçe kartı (genişleyebilir)
- [ ] Dağılım çubuğu
- [ ] Varlık listesi:
  - Filtre ve sıralama, rozet geçişi
  - Mini grafik (sparkline), fiyat tik efekti
- [ ] Satır hareketleri:
  - Sağa çek: Düzenle + Al. Sola çek: Sat + Sil
  - Uzun bas menüsü, geri al
- [ ] Portföy seçici, gizlilik modu, aşağı çekip yenileme

**Bitiş kriteri:** Ana ekran örnek ve gerçek veriyle akıcı çalışıyor (60 fps). Ekran
görüntüleri 4 temada paylaşıldı.

## Faz 6: İşlem Ekranları ve Varlık Detayı

- [ ] Varlık arama (BIST / ABD / Kripto sekmeleri, son kullanılanlar)
- [ ] Al / Sat formu:
  - Tarihli kapanış fiyatı önerisi, kur alanı
  - Otomatik komisyon, canlı özet
  - Nakit kaynağı seçimi, satış ön izlemesi
- [ ] Para yatırma/çekme, temettü, bölünme formları
- [ ] Varlık detay:
  - Fiyat grafiği (alış ▲ ve satış ▼ işaretleri, maliyet çizgisi)
  - Pozisyon kartı, kur etkisi
  - Alış/Satış sekmeleri, AL ve SAT butonları

## Faz 7: Geçmiş

- [ ] İşlemler: aylara göre gruplama, filtre, arama, kaydırma hareketleri
- [ ] Gerçekleşen K/Z (elde tutma süresi, kazanan/kaybeden oranı)
- [ ] Nakit Hareketleri
- [ ] Aylık Ekstre ve ay detayı

## Faz 8: Fon (Hesabım)

- [ ] Fon büyüklüğü, pay değeri, pay sayısı, risk değeri kartı
- [ ] **Varlık** ve **Maliyet** tuşları, animasyonlu halka grafik
- [ ] Varlık ve maliyet listeleri, maliyet-değer karşılaştırma çubukları
- [ ] Getiri tablosu, en büyük 5 pozisyon

## Faz 9: Analiz

- [ ] Ölçüt verileri:
  - BIST 100, BIST 30, gram altın, gram gümüş
  - S&P 500, Nasdaq 100, Russell 2000, Bitcoin
  - Dolar/TL, Euro/TL, TÜFE, mevduat
- [ ] Ya Olsaydı:
  - Çoklu grafik, lig tablosu, ölçüt detay kartı
  - Otomatik içgörü cümleleri
  - TL/USD seçimi, dönem seçimi, karşılaştırma bazı
- [ ] Performans: TWR, XIRR, dönemsel tablo, aylık ısı haritası, en iyi ve en kötüler
- [ ] Risk: düşüş grafiği, volatilite, Sharpe, Sortino, Beta, yoğunlaşma uyarısı
- [ ] Dağılım: piyasa, para birimi, sektör, ısı haritası

## Faz 10: Ayarlar, Güvenlik ve Cila

- [ ] Tüm ayar grupları (01-PROJE-DOKUMANI §6.8)
- [ ] Face ID / parmak izi kilidi, otomatik kilit, arka planda bulanıklaştırma, ekran görüntüsü engeli
- [ ] Yedekleme, CSV dışa aktarma, tüm verileri silme
- [ ] İlk açılış akışı, boş durumlar, yükleniyor durumları
- [ ] Yatay tam ekran grafik ve mum grafik
- [ ] Erişilebilirlik (ekran okuyucu, dinamik yazı boyutu, kontrast) ve performans ölçümü

## Faz 11: Yayına Hazırlık

- [ ] Uygulama adı, ikon, açılış ekranı
- [ ] Geliştirme derlemesine geçiş, veritabanı şifrelemesi (SQLCipher)
- [ ] EAS Build: Android APK ve iOS TestFlight
- [ ] Son kontrol listesi: veri doğruluğu, çevrimdışı, yedek/geri yükleme, tema kontrastları

## Faz 12+: Sonraki Sürümler

- Fiyat alarmları ve günlük özet bildirimleri
- Ana ekran widget'ı
- Temettü takvimi ve yıllık temettü geliri
- Ek varlık türleri: gram altın, döviz, TEFAS fonları, mevduat, manuel fiyatlı özel varlık
- Hedef dağılım ve dengeleme önerisi
- Aracı kurum ekstresinden CSV içe aktarma
- Yurt dışı hisse vergi beyan yardımcısı (FIFO + Yİ-ÜFE)
- Uçtan uca şifreli bulut senkronizasyonu
- İngilizce dil desteği
- Lisanslı gerçek zamanlı BIST verisi
