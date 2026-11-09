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
| 4 | Piyasa verisi ✅ | Telefonda gerçek ve canlı fiyatlar |
| 5 | Portföy (ana ekran) | Canlı bakiye, grafik, canlı bütçe, kaydırmalı liste |
| 6 | İşlem ekranları ve varlık detayı ✅ | Al/Sat, para yatır/çek, varlık detay |
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

## Faz 4: Piyasa Verisi ✅ (9 Kasım 2026)

- [x] Sağlayıcı arayüzü, sahte (mock) sağlayıcı (web önizlemesi ve testler)
- [x] Adaptörler, hepsi gerçek isteklerle denendi:
  - Yahoo: BIST, ABD, endeks, döviz, vadeli altın/gümüş
  - Binance: kripto, USDT/TRY, PAXG altın
  - CoinGecko (kripto yedeği)
  - İş Yatırım: BIST kapanış, BIST 100, USD/TRY yedeği
  - TCMB: resmi kur, son yedek
- [x] Yedeğe geçiş, hatalı kaynağı dinlendirme, türetilmiş fiyatlar (gram altın, Euro/TL, TL'ye çevrilmiş endeksler)
- [x] Sembol katalogları ve çevrimdışı arama: 629 BIST şirketi, 248 kripto, popüler ABD hisse/fonları
- [x] Canlı güncelleme zamanlayıcısı, seans takvimi (BIST, NYSE, yaz saati, 2026–2027 tatilleri), piyasa durumu
- [x] Önbellek (şema 2: canlı fiyat, indirme durumu), çevrimdışı mod, arka planda durma
- [x] Bölünme olaylarının alınması (Yahoo; İş Yatırım'dan öneri)
- [x] Eksik geçmişin indirilmesi; kendi portföyün için gerçek ölçütlerle "Ya Olsaydı?"
- [x] **Ek:** Piyasalar ekranı (izleme listesi, arama, ayrıntı), ana ekranda piyasa şeridi, Ayarlar › Veri kaynakları
- [x] **Düzeltme:** TWR'de para girişi günün başında, çıkışı günün sonunda sayılıyor (Hesaplama Motoru §8)

**Bitiş kriteri:** BIST, ABD ve kripto fiyatları geliyor ✅ (gerçek kaynaklarla denendi; telefonda
APK ile doğrulanacak). İnternet kesilince son fiyatlarla çalışmaya devam ediyor ✅
([faz4-piyasa-verisi.md](test-raporu/faz4-piyasa-verisi.md)).

> **Not:** Kripto için canlı akış (WebSocket) Faz 5'te eklendi. TÜFE ve mevduat ölçütleri Faz 9'da gömülü tabloyla gelecek.

## Faz 5: Portföy (Ana Ekran) ✅ (9 Kasım 2026)

- [x] Canlı bakiye: kayan sayaç, durum noktası (canlı / örnek / çevrimdışı), kaydırınca yapışkan küçük başlık
- [x] **FinChart:**
  - Aralıklar: 1G · 1H · 1A · 3A · 6A · 1Y · YB · Tümü · Özel (takvim ve hazır kısayollar)
  - Tek parmakla okuma: kılavuz çizgi, o günün değeri, aralık başına göre değişim
  - İki parmakla ölçüm: aradaki alan renklenir, iki gün arası değişim (para giriş/çıkışı ayıklanmış)
  - Net yatırılan çizgisi (kesikli basamak), aralık değişince şekil dönüşümü (UI iş parçacığında)
- [x] Canlı Bütçe kartı, "Ayrıntılar" ile açılır: gerçekleşmemiş + gerçekleşen + temettü − hesap ücretleri = Net K/Z; komisyon bilgi olarak
- [x] Dağılım çubuğu
- [x] Varlık listesi:
  - Pazar filtresi; sıralama: Değer · Bugün % · Toplam % · Ad (seçim saklanır)
  - Rozete dokununca: günlük % → günlük ₺ → toplam %
  - Mini grafik, fiyat değişince satır yeşil/kırmızı parlar
- [x] Satır hareketleri:
  - Sağa çek: Düzenle + Al. Sola çek: Sat + Sil
  - Uzun bas menüsü: Ayrıntı, Al, Sat, Kayıtları düzenle, İzleme listesine ekle, Tüm kayıtlarını sil
  - Sil, varlığın tüm kayıtlarını tek değişiklik olarak siler; 5 saniye "GERİ AL"
- [x] Portföy seçici, gizlilik modu, aşağı çekip yenileme
- [x] **Faz 4'ten:** Kripto için canlı akış (Binance WebSocket); kesilirse sorguyla devam

**Bitiş kriteri:** Ana ekran örnek ve gerçek veriyle çalışıyor ✅ (tarayıcı önizlemesinde ve
gerçek kaynaklarla denendi). Ekran görüntüleri 4 temada ✅
([faz5-ana-ekran.md](test-raporu/faz5-ana-ekran.md)). 60 fps akıcılık telefonda APK ile
doğrulanacak.

> **Sonraya kalanlar:**
> - Grafikte para giriş/çıkış işaretleri, en yüksek/en düşük etiketleri, Değer/Getiri/K/Z anahtarı,
>   telefonu yan çevirince tam ekran: Faz 9 (Analiz) ile birlikte.
> - 1G gün içi eğrisi: gün içi değerler saklanmadığı için gerçek portföyde gün başından şimdiye
>   tek çizgi. Gün içi kayıt Faz 10'da.

## Faz 6: İşlem Ekranları ve Varlık Detayı ✅ (9 Kasım 2026, Faz 5'ten önce yapıldı)

- [x] Varlık seçimi: BIST / ABD / Kripto sekmeleri, son kullanılanlar ve izleme listesi, internetsiz arama; örnek portföyde yalnız örnek varlıklar
- [x] Al / Sat formu:
  - Tarih (ve isteğe bağlı saat), adet ya da TL tutarıyla giriş
  - Seçilen günün kapanış fiyatı ve kuru önerisi (yoksa bir kez indirilir), elle yazılan değer korunur
  - Otomatik komisyon (BIST ‰2, ABD $1, kripto %0,1), değiştirilebilir
  - Canlı özet tüm geçmiş yeniden oynatılarak: toplam, yeni ortalama maliyet, yeni adet, otomatik para girişi
  - Ödeme: portföy nakdi veya dışarıdan yeni para
  - Satış: eldeki adet, "Tümünü sat", tahmini gerçekleşen K/Z, "Hesaptan çek"
- [x] Temettü (toplam veya hisse başına, stopaj önerisi, kur) ve bölünme/bedelsiz formları; kayıtlar düzenlenebilir
- [x] Varlık detay:
  - Fiyat grafiği: alış ▲, satış ▼ (işlem fiyatında), kesikli ortalama maliyet çizgisi
  - Pozisyon kartı, ABD varlıklarında fiyat etkisi ve kur etkisi
  - Alışlar / Satışlar / Tümü, sabit AL ve SAT butonları, izleme listesi yıldızı
  - Kaynağın bildirdiği ama kaydedilmemiş bölünme için uyarı ve tek dokunuşla kayıt

**Bitiş kriteri:** Kendi alım-satımlarını girip gerçek fiyatlarla takip edebiliyorsun ✅
([faz6-islem-ekranlari.md](test-raporu/faz6-islem-ekranlari.md)).

> **Not:** Mum grafik ve grafikteki işarete dokununca detay açılması Faz 5'teki FinChart ile gelecek.

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
