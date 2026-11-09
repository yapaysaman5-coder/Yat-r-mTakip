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
| 1 | Proje iskeleti ve tasarım sistemi ✅ | 4 temalı, alt barlı, gezilebilir uygulama kabuğu |
| 2 | Hesaplama motoru ✅ | Tüm formüllerin test raporu |
| 3 | Veritabanı ve kalıcılık ✅ | İşlemler kaydediliyor, uygulama kapanınca kaybolmuyor. Örnek portföy |
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

## Faz 1.1: Geri Bildirim Revizyonu ✅ (9 Kasım 2026)

- [x] Yazı tipi Nunito → **Inter** (daha sade, profesyonel), eşit genişlikli rakamlar
- [x] Hesabım ekranından pay değeri ve pay sayısı kaldırıldı. Yerine Maliyet, Kâr/Zarar ve Bugün
- [x] Analiz: **Performans Karnesi** (Bugün, TWR, XIRR, Alpha) ve dokununca açılan açıklamalar
- [x] Analiz: profesyonel karşılaştırma grafiği:
  - Dokun-kaydır imleç
  - Eksenler ve ızgara
  - ₺/% modu, dönem seçimi, seri seçimi
- [x] Analiz > Performans: Beta, volatilite, Sharpe, Sortino, maks. düşüş, en iyi/kötü ay, dönemsel tablo, aylık harita
- [x] Hesap fonksiyonları ve testleri: XIRR, risk ölçüleri, Alpha, Ya Olsaydı simülasyonu (Faz 2'den öne alındı)
- [x] **GitHub'da APK derleme** ve indirme sayfası (Faz 11'den öne alındı), uygulama simgesi

## Faz 2: Hesaplama Motoru ✅ (9 Kasım 2026)

- [x] Ondalık yardımcıları, işlem tipleri ve alan doğrulamaları
- [x] Pozisyon: ağırlıklı ortalama ve FIFO, gerçekleşen ve gerçekleşmemiş K/Z, elde tutma süresi
- [x] Nakit ve Canlı Bütçe. Otomatik bağlı kayıtlar (kuruşa yuvarlanmış para yatırma, satış tutarını çekme)
- [x] Fazla satış ve eksi nakit uyarıları (geçmişe dönük düzenlemeler dahil)
- [x] Kur etkisi ayrıştırması, bugünkü değişim
- [x] Bölünme / bedelsiz, temettü (stopajlı), hesap ücreti, kaydedilmemiş bedelsiz tespiti
- [x] Günlük değer serisi (tatil taşıma, bölünme düzeltmesi), USD raporlama, LTTB seyreltme
- [x] TWR (iç birim değer yöntemi), dönemsel getiri tablosu, reel getiri (TÜFE ara değeri)
- [x] XIRR, risk metrikleri, Alpha, risk seviyesi
- [x] Ya Olsaydı simülasyonu (ondalık hassasiyetli)
- [x] Test senaryoları T1–T14 ve değişmez kurallar 1–5
- [x] **Ek:** Önizleme ekranlarının tüm rakamları artık motordan geliyor (örnek işlem geçmişi → defter → değerleme → seri → metrikler)

**Bitiş kriteri:** Tüm testler başarılı ✅ (267 test). `src/domain` satır kapsamı
%99,8 ✅. Test raporu paylaşıldı ✅ ([faz2-hesaplama-motoru.md](test-raporu/faz2-hesaplama-motoru.md)).

> **Not:** T12'deki hız hedefi (10.000 işlem < 200 ms) tam karşılanmadı: ~270 ms. Gerçekçi
> boyutta (~1.150 işlem) 25–35 ms. Faz 3'teki günlük değer önbelleği ile tüm geçmişin baştan
> hesaplanması nadir bir işlem oldu. Telefonda ölçüm için uygulamaya hız testi eklendi
> (Ayarlar › Veri ve Yedekleme).

## Faz 3: Veritabanı ve Kalıcılık ✅ (9 Kasım 2026)

- [x] SQLite şeması ve migration altyapısı (`PRAGMA user_version`, yarıda kalan migration geri alınır, yeni sürüm veritabanı korunur)
- [x] Repository'ler: portföy, varlık, kayıt, günlük fiyat, değer önbelleği
- [x] Kayıt ekleme, düzenleme ve silme kontrolleri:
  - Alan kuralları
  - Fazla satış, geçmişe dönük dahil (T7, T8)
  - Nakdin eksiye düşmesi
  - Otomatik kayıtlar saklanmaz, türetilir
- [x] Günlük değer önbelleği: değişen ilk günden itibaren artımlı hesap (baştan hesapla birebir aynı)
- [x] Örnek portföy veritabanında, kendi kurgusal fiyatlarıyla. Her zaman oluşturulduğu gün biter
- [x] Yedeği dışa ve içe aktarma (JSON): paylaş menüsü, dosya seçici, tam denetim, ya hep ya hiç geri yükleme
- [x] Ekranlar veritabanından çalışıyor. Boş portföy ekranları, portföy seçici
- [x] **Ek (Faz 6'dan öne alındı):** Para Yatır / Para Çek formu
- [x] **Ek (Faz 7'den öne alındı):** Kayıt detayı, düzenleme (para kayıtları), silme ve geri alma
- [x] **Ek (Faz 10'dan öne alındı):** Ayarlar › Veri ve Yedekleme:
  - Sayılar, yedekleme
  - Örnek portföyü bugüne taşıma ve kaldırma
  - Tüm verileri silme
  - Telefonda hız testi

**Bitiş kriteri:** Eklenen işlemler uygulama yeniden açılınca duruyor ✅. Yedekten geri yükleme
birebir aynı sonucu veriyor ✅ ([faz3-veritabani.md](test-raporu/faz3-veritabani.md)).

> **Not:** Alış ve satış formları Faz 6'da gelecek. Şimdilik kendi portföyüne para girişi ve
> çıkışı eklenebiliyor; tüm kayıt türleri örnek portföyde görülebiliyor. Gerçek fiyatlar ve
> "Ya Olsaydı?" ölçütleri Faz 4'te (piyasa verisi) gelecek.

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
- [ ] Temettü, bölünme formları (para yatırma/çekme Faz 3'te yapıldı ✅)
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

- [ ] Toplam varlık, maliyet, K/Z, bugün ve risk seviyesi kartı (gerçek veriyle)
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
- [ ] CSV dışa aktarma (yedekleme ve tüm verileri silme Faz 3'te yapıldı ✅)
- [ ] İlk açılış akışı, boş durumlar, yükleniyor durumları
- [ ] Yatay tam ekran grafik ve mum grafik
- [ ] Erişilebilirlik (ekran okuyucu, dinamik yazı boyutu, kontrast) ve performans ölçümü

## Faz 11: Yayına Hazırlık

- [ ] Uygulama adı, ikon, açılış ekranı
- [ ] Geliştirme derlemesine geçiş, veritabanı şifrelemesi (SQLCipher)
- [x] Android APK derleme hattı (GitHub Actions) *(Faz 1.1'de yapıldı)*
- [ ] Play Store için gizli anahtarla imzalama
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
