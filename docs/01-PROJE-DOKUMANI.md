# Yatırım Takip: Proje Dokümanı

> **Sürüm:** 1.1 (onaylandı)
> **Tarih:** 8 Kasım 2026
> **Platform:** Android telefon (kod iOS ile de uyumlu), tamamen cihaz üzerinde çalışır
> **Durum:** Kararlar onaylandı ([Bölüm 13](#13-onaylanan-kararlar)). Geliştirme [Yol Haritası](04-YOL-HARITASI.md) sırasıyla ilerliyor.
> **Tasarım tonu:** Profesyonel ve sade yazı tipi; renkler ve şekiller biraz neşeli, biraz yumuşak.

Diğer dokümanlar:

| Dosya | İçerik |
|---|---|
| **01-PROJE-DOKUMANI.md** (bu dosya) | Vizyon, rakip analizi, özellikler, ekranlar, tasarım, temalar |
| [02-HESAPLAMA-MOTORU.md](02-HESAPLAMA-MOTORU.md) | Maliyet, kâr/zarar, getiri, risk ve "Ya Olsaydı?" formülleri, örnek hesaplar |
| [03-TEKNIK-MIMARI.md](03-TEKNIK-MIMARI.md) | Teknoloji seçimi, veri modeli, piyasa veri kaynakları, klasör yapısı |
| [04-YOL-HARITASI.md](04-YOL-HARITASI.md) | Fazlar, her fazın teslimatı ve bitiş kriteri |

---

## İçindekiler

1. [Vizyon](#1-vizyon)
2. [Dünyadaki En Başarılı Uygulamaların Analizi](#2-dünyadaki-en-başarılı-uygulamaların-analizi)
3. [Taleplerinizin Karşılığı](#3-taleplerinizin-karşılığı)
4. [Tamamlanan Eksikler: Eklenen Özellikler](#4-tamamlanan-eksikler-eklenen-özellikler)
5. [Navigasyon ve Ekran Haritası](#5-navigasyon-ve-ekran-haritası)
6. [Ekranlar (Tel Kafes Çizimleriyle)](#6-ekranlar)
7. [Grafik Tasarımı](#7-grafik-tasarımı)
8. [Tema Sistemi (4 Tema)](#8-tema-sistemi)
9. [Tasarım Dili](#9-tasarım-dili)
10. [Varlık Kapsamı ve Canlı Veri](#10-varlık-kapsamı-ve-canlı-veri)
11. [Gizlilik ve Güvenlik](#11-gizlilik-ve-güvenlik)
12. [Kalite Hedefleri](#12-kalite-hedefleri)
13. [Onaylanan Kararlar](#13-onaylanan-kararlar)
14. [Yasal Uyarı](#14-yasal-uyarı)

---

## 1. Vizyon

**Tek cümleyle:** Türk yatırımcı için BIST, ABD borsaları ve kripto paraları tek yerde
toplayan, **profesyonel yatırım ölçülerini (TWR, XIRR, Alpha, risk) kişisel portföye uygulayan**,
tamamen telefonda çalışan ve verisi cihazda kalan bir portföy takip uygulaması.

### Temel İlkeler

1. **Önce doğruluk.** Maliyet, kâr/zarar ve getiri hesapları kurumsal standartlara (TWR, XIRR) göre yapılır ve otomatik testlerle doğrulanır. Yanlış rakam gösteren güzel bir ekran işe yaramaz.
2. **Akıcılık.** Grafikler ve listeler GPU ile çizilir, 60/120 fps hedeflenir. Her dokunuşa anında ve titreşimli (haptic) geri bildirim verilir.
3. **Türk yatırımcıya özel.** TL ve USD bazında çift bakış, kur etkisi ayrıştırması, enflasyona (TÜFE) göre reel getiri, bedelsiz sermaye artırımı desteği ve `1.234.567,89 ₺` sayı biçimi.
4. **Gizlilik.** Hesap açma ve sunucu gerekmez. Bütün veri telefonda kalır ve telefonun kendi şifrelemesiyle korunur. Yayın sürümünde veritabanı ayrıca şifrelenir. Yedekleme tamamen kullanıcının kontrolündedir.
5. **Profesyonel ölçüler, kişisel portföy.** Bu bir fon değil, kişisel portföydür. Fon raporlarındaki işe yarar ölçüler (TWR, XIRR, Alpha, Beta, risk seviyesi, dönemsel getiri tablosu) kişisel portföye uygulanır. Pay değeri, pay sayısı gibi fon kavramları gösterilmez.

### Kapsam Dışı (v1)

- Alım-satım emri iletme. Bu bir aracı kurum uygulaması değildir, işlemler **manuel** girilir.
- Aracı kurum hesaplarıyla otomatik senkronizasyon. İleride CSV içe aktarma ile kolaylaştırılacak.
- Sosyal özellikler (portföy paylaşma, topluluk).

---

## 2. Dünyadaki En Başarılı Uygulamaların Analizi

İncelenen uygulamalar ve her birinden alınacak en iyi fikir:

| Uygulama | Öne çıktığı alan | Bizim alacağımız fikir |
|---|---|---|
| **Delta (eToro)** | Hisse, kripto ve emtia tek uygulamada. Temiz arayüz | Satırdaki değişim rozetine dokununca % / ₺ / toplam K/Z arasında geçiş. Piyasa durumu göstergesi |
| **getquin** | TTWROR ve IRR getiri, bölge/sektör/varlık sınıfı dağılımı, endeks karşılaştırması | Portföyü endekslerle kıyaslama, dağılım analizleri, ısı haritası (heatmap) |
| **Snowball Analytics** | Zaman ağırlıklı (TWR) ve para ağırlıklı (IRR) getiri, birden çok endeksle aynı anda kıyas, çoklu para birimi | Aynı anda 10 ölçütle karşılaştırma, çift getiri metriği |
| **Sharesight** | Vergi raporlama, döviz kazancını ayrıştırma | Kâr/zararı **fiyat etkisi** ve **kur etkisi** olarak ikiye ayırma. İleride yurt dışı hisse beyan raporu |
| **Kubera** | Tüm net varlığın tek ekranda görünmesi, sade ve premium his | Kraliyet teması. İleride nakit, altın ve mevduat gibi diğer varlık türleri |
| **Robinhood / Revolut** | Grafikte parmakla gezinme, iki parmakla aralık ölçme, titreşim | Grafik etkileşim modeli (bkz. [Bölüm 7](#7-grafik-tasarımı)) |
| **Stock Events** | Temettü takvimi, olay akışı | Faz 2'de temettü takvimi ve bildirimleri |
| **Portfolio Performance / Ghostfolio** (açık kaynak) | Fon mantığıyla performans hesabı, FIFO ve ortalama maliyet seçimi | Para akışından arındırılmış getiri (TWR) hesabı, maliyet yöntemi ayarı |
| **CoinStats / CoinGecko** | 7/24 canlı kripto fiyatları, çok sayıda coin | Gerçek zamanlı kripto akışı (WebSocket) |
| **Midas** | Türk kullanıcıya uygun sade "Hesabım" ekranı | "Fon" sekmesinde hesap özeti mantığı |
| **Fintables** | BIST ve fon karşılaştırma, haftalık, aylık, 3 aylık ve yıllık getiri karşılaştırması | Getiri tablosu dönemleri, Türk piyasasına özgü veri sunumu |

### Analizden Çıkan Dersler

1. **En iyi uygulamalar iki ayrı getiri gösterir.** *Zaman ağırlıklı getiri (TWR)* yatırım becerisini, *para ağırlıklı getiri (XIRR)* kullanıcının gerçekte ne kazandığını ölçer. Biz ikisini de göstereceğiz.
2. **Karşılaştırma, para akışlarına göre yapılmalı.** "Aynı tutarı aynı tarihlerde yatırsaydım" sorusunun doğru cevabı, her para girişini ve çıkışını o tarihteki ölçüt fiyatından simüle etmekle bulunur. Basit "başlangıçtan bugüne endeks % değişimi" bu soruyu yanıltıcı biçimde cevaplar.
3. **Gizlilik modu standarttır.** Göz simgesine dokununca tüm tutarlar `••••` olur.
4. **Ana ekran sade olmalı.** Büyük bakiye, tek grafik, kısa özet ve liste yeterlidir. Detay analiz ayrı sekmede durur.
5. **Grafikte "yatırılan para" çizgisi gösterilmeli.** Kullanıcı, değerin ne kadarının kendi koyduğu para, ne kadarının kazanç olduğunu bir bakışta görür.
6. **Türk yatırımcıya özgü boşluk:** İncelenen yabancı uygulamaların hiçbiri TL/USD çift bakış, enflasyon karşılaştırması, bedelsiz ve gram altın kıyasını birlikte sunmuyor. Bu bizim farkımız olacak.

---

## 3. Taleplerinizin Karşılığı

| # | Sizin isteğiniz | Karşılığı | Ekran / Bölüm |
|---|---|---|---|
| 1 | Alış ve satışları manuel ekleme | Profesyonel işlem formu: tarih, adet, fiyat, komisyon, kur, not | [6.4](#64-al--sat-formu) |
| 2 | TR borsa, ABD borsa, kripto | BIST hisseleri, ABD hisse ve ETF'leri, kripto paralar. Hepsi tek portföyde | [10](#10-varlık-kapsamı-ve-canlı-veri) |
| 3 | Varlığı sağa/sola çekip düzenle, sil ve diğer ayrıntılar | Sağa çek: Düzenle + Al. Sola çek: Sat + Sil. Uzun bas: tam menü. Silmede geri al | [6.2](#62-varlık-satırı-kaydırma-hareketleri) |
| 4 | Üstüne tıklayınca alış ve satış ekranları | Varlık detayı açılır: o varlığın alış/satış kayıtları listelenir, altta büyük **AL** ve **SAT** butonları bulunur | [6.3](#63-varlık-detay-ekranı) |
| 5 | Geçmiş ekranları | Geçmiş sekmesi: İşlemler, Gerçekleşen K/Z, Nakit Hareketleri, Aylık Ekstre | [6.5](#65-geçmiş-sekmesi) |
| 6 | 3-4 tema, biri mavi tonlarında | 4 tema: **Okyanus (mavi)**, Gece, Gün, Kraliyet. Bunlara ek olarak sistem ayarına uyan otomatik mod | [8](#8-tema-sistemi) |
| 7 | Ekranda portföy ve üstte canlı bakiye | Her temada üstte sabit canlı bakiye, altında portföy listesi | [6.1](#61-portföy-ana-ekran) |
| 8 | Alt barda fon ekranı, hesabım + varlık/maliyet, iki ayrı tuş | **Fon** sekmesi: kişisel portföyün "Hesabım" özeti. **Varlık** ve **Maliyet** iki ayrı tuş | [6.6](#66-fon-sekmesi-hesabım) |
| 9 | Aynı tutarı aynı tarihlerde BIST100, BIST30, altın, gümüş, S&P500, Russell, BTC, Dolar/TL, NASDAQ'a yatırsaydım | **Ya Olsaydı?** ekranı: para akışlarınız bire bir simüle edilir. Lig tablosu, çoklu grafik ve fon düzeyinde metrikler sunulur | [6.7](#67-analiz-sekmesi) |
| 10 | Ayarlar ekranı | Görünüm, para birimi, hesaplama, veri, güvenlik, bildirim ve yedekleme ayarları | [6.8](#68-ayarlar) |
| 11 | Ana ekranda canlı bütçe: yatırılan ve çekilen para | **Canlı Bütçe** kartı: Yatırılan, Çekilen, Net Yatırılan, Nakit ve Net K/Z | [6.1](#61-portföy-ana-ekran) |
| 12 | 1G, 1H, 1A, 3A, 6A, 1Y ve özel tarih aralığında bakiye grafiği | Parmakla gezinilen kendi grafiğimiz (FinChart). Ek olarak YB (yılbaşından beri) ve Tümü seçenekleri | [7](#7-grafik-tasarımı) |
| 13 | Tamamen telefonda çalışma | Expo / React Native ile iOS ve Android. Sunucu yok, veri cihazda | [03-TEKNIK-MIMARI](03-TEKNIK-MIMARI.md) |

---

## 4. Tamamlanan Eksikler: Eklenen Özellikler

Profesyonel uygulamalarda olan ama isteklerinizde geçmeyen özellikler aşağıda. Öncelik:
**P0** = ilk sürümde mutlaka, **P1** = ilk sürümde olması iyi, **P2** = sonraki sürümler.

### Hesaplama ve Doğruluk

| Özellik | Neden gerekli | Öncelik |
|---|---|---|
| **Nakit / para yatırma-çekme kayıtları** | "Yatırılan ve çekilen para" bilgisinin doğru olması için gerekli. Alım yaparken nakit yetmezse **otomatik para yatırma kaydı** oluşur, ekstra iş çıkmaz | P0 |
| **Komisyon desteği** | BIST, ABD ve kripto için varsayılan komisyon oranları. Maliyete otomatik eklenir | P0 |
| **Ağırlıklı ortalama ve FIFO maliyet** | Türk aracı kurumları ortalama maliyet gösterir, vergi hesabı FIFO kullanır. İkisi de ayarlanabilir | P0 |
| **TWR ve XIRR getiri** | Profesyonel performans ölçümü (bkz. Bölüm 2, ders 1) | P0 |
| **Alpha, Beta, Sharpe, Sortino, maks. düşüş** | Riske göre performans ve ölçüte (BIST 100) göre fazla getiri. Analiz > Performans Karnesi | P0 |
| **Kur etkisi ayrıştırması** | ABD hissesinde kazancın ne kadarı hisseden, ne kadarı dolardan geldi? | P1 |
| **Bedelsiz / bölünme işlemi** | BIST'te çok sık görülür. Desteklenmezse adet ve maliyet yanlış çıkar. Veri kaynağından tespit edilip uygulama önerilir | P0 |
| **Temettü kaydı** | Getiriyi doğru hesaplamak için gerekli. İlk sürümde manuel girilir | P1 |
| **Reel getiri (TÜFE)** | Türkiye'de nominal getiri tek başına yanıltıcıdır | P1 |
| **Ondalık hassasiyetli hesap** | Kripto adetleri 8+ basamaklı olabilir. Kayan nokta hatası olmaması için ondalık kütüphanesi kullanılır | P0 |

### Arayüz ve Deneyim

| Özellik | Açıklama | Öncelik |
|---|---|---|
| **Gizlilik modu** | Göz simgesine dokununca tüm tutarlar `••••` olur. İsteğe bağlı olarak uygulama hep gizli açılır | P0 |
| **Çoklu portföy** | Örneğin "Ana Portföy", "Kripto", "Emeklilik" ve hepsini birleştiren "Tümü" görünümü | P0 |
| **Piyasa durumu göstergesi** | BIST açık/kapalı, ABD seans öncesi/sonrası, kripto 7/24, veri gecikmesi rozeti | P0 |
| **Geri alma (Undo)** | Silme sonrası 5 saniye "Geri Al" çubuğu | P0 |
| **Sıralama ve filtre** | Değer, günlük %, toplam K/Z, ada göre sıralama. Piyasaya göre filtreleme | P0 |
| **Satırda mini grafik (sparkline)** | Son 7 günün eğilimi | P1 |
| **Yatay tam ekran grafik** | Telefonu yan çevirince eksenli, detaylı grafik ve mum grafik | P1 |
| **İzleme listesi** | Sahip olunmayan ama takip edilen varlıklar | P1 |
| **Hedef dağılım ve dengeleme** | "BIST %50 / ABD %30 / Kripto %20" hedefi koyup sapmayı görme | P2 |
| **Fiyat alarmları ve günlük özet bildirimi** | Uygulama arka plandayken sınırlı çalışır (bkz. 03-TEKNIK-MIMARI) | P2 |
| **Ana ekran widget'ı** | iOS/Android widget | P2 |
| **Temettü takvimi** | Beklenen temettüler ve yıllık temettü geliri | P2 |
| **Ek varlık türleri** | Gram altın, döviz, TEFAS fonları, mevduat, manuel fiyatlı özel varlık | P2 |
| **Yurt dışı hisse vergi raporu** | FIFO + Yİ-ÜFE endekslemesi ile beyan yardımcısı | P2 |

### Güvenlik ve Veri

| Özellik | Açıklama | Öncelik |
|---|---|---|
| **Face ID / parmak izi kilidi** | Açılışta ve arka plandan dönüşte | P0 |
| **Yedekle / geri yükle** | Tek dosya (JSON) dışa ve içe aktarma, telefonun paylaş menüsüyle | P0 |
| **CSV dışa aktarma** | İşlem listesini Excel'de açmak için | P1 |
| **CSV içe aktarma** | Aracı kurum ekstresinden toplu işlem girme | P2 |
| **Bulut senkronizasyonu** | İsteğe bağlı, uçtan uca şifreli | P2 |

---

## 5. Navigasyon ve Ekran Haritası

### Alt Bar (Tab Bar)

```
┌──────────────────────────────────────┐
│ Portföy  Analiz   (＋)   Fon  Geçmiş │
└──────────────────────────────────────┘
```

| Sekme | Görev |
|---|---|
| **Portföy** | Canlı bakiye, grafik, canlı bütçe, varlık listesi |
| **Analiz** | Ya Olsaydı? karşılaştırması, performans, risk, dağılım |
| **＋ (orta tuş)** | Hızlı işlem: Al, Sat, Para Yatır, Para Çek, Temettü |
| **Fon** | Hesabım: toplam varlık, maliyet, K/Z. **Varlık** ve **Maliyet** tuşları |
| **Geçmiş** | İşlemler, Gerçekleşen K/Z, Nakit Hareketleri, Aylık Ekstre |

**Ayarlar**, Portföy ekranının sağ üst köşesindeki ⚙ simgesinden açılır. Bu, Revolut ve
getquin'deki yerleşimle aynıdır ve alt barda yer kazandırır. Bu yerleşim onaylandı (bkz. [Bölüm 13](#13-onaylanan-kararlar)).

### Ekran Ağacı

```
Kilit Ekranı (Face ID)
└── Ana Gezinme (Tab Bar)
    ├── Portföy
    │   ├── Portföy Seçici (alt sayfa)
    │   ├── Varlık Detay
    │   │   ├── Al / Sat Formu
    │   │   ├── İşlem Düzenle
    │   │   └── Varlık Ayarları (not, alarm, etiket)
    │   ├── Sıralama ve Filtre (alt sayfa)
    │   ├── Tam Ekran Grafik (yatay)
    │   └── Ayarlar
    │       ├── Görünüm (Tema)
    │       ├── Para Birimi ve Biçim
    │       ├── Portföyleri Yönet
    │       ├── Hesaplama
    │       ├── Veri ve Bağlantı
    │       ├── Güvenlik ve Gizlilik
    │       ├── Bildirimler
    │       ├── Yedekleme
    │       └── Hakkında ve Yasal
    ├── Analiz
    │   ├── Ya Olsaydı? → Ölçüt Detayı
    │   ├── Performans
    │   ├── Risk
    │   └── Dağılım (Isı Haritası)
    ├── ＋ Hızlı İşlem (alt sayfa)
    │   ├── Al / Sat Formu
    │   ├── Para Yatır / Çek Formu
    │   └── Temettü Formu
    ├── Fon (Hesabım)
    │   ├── [Varlık] görünümü
    │   └── [Maliyet] görünümü
    └── Geçmiş
        ├── İşlemler → İşlem Detay / Düzenle
        ├── Gerçekleşen K/Z
        ├── Nakit Hareketleri
        └── Aylık Ekstre → Ay Detayı
```

---

## 6. Ekranlar

> Aşağıdaki çizimler yerleşimi gösteren **tel kafes (wireframe)** taslaklardır. Renk ve stil,
> seçili temaya göre değişir. Tutarlar örnektir.

### 6.1 Portföy (Ana Ekran)

```
┌──────────────────────────────────────┐
│ Ana Portföy ▾              👁  🔔  ⚙ │
│                                      │
│ TOPLAM DEĞER               ● CANLI   │
│ ₺1.284.562,40                        │
│ ▲ ₺12.430  %0,98  bugün              │
│ ▲ ₺214.880 %20,09 toplam             │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │                 ╱╲      ╱‾‾╲╱    │ │
│ │     ╱╲   ╱‾‾‾‾‾╯  ╲╱╲╱╱          │ │
│ │ ╱‾‾╯  ╲╱  - - - - - - - - - - -  │ │
│ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ ╰──────────────────────────────────╯ │
│ 1G 1H [1A] 3A 6A 1Y YB Tümü  📅      │
│                                      │
│ ┌ CANLI BÜTÇE ─────────────────────┐ │
│ │ Yatırılan          ₺1.150.000,00 │ │
│ │ Çekilen               ₺80.318,00 │ │
│ │ Net Yatırılan      ₺1.069.682,00 │ │
│ │ Nakit                 ₺24.150,00 │ │
│ │ Net K/Z    ▲ ₺214.880   %20,09   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ████████████▓▓▓▓▓▓▓▓░░░░░            │
│ BIST %48 · ABD %34 · Kripto %18      │
│                                      │
│ [Tümü] BIST  ABD  Kripto   ⇅ Değer   │
│ ──────────────────────────────────── │
│ (TH) THYAO       ⌇⌇⌇    ₺312.400,00  │
│      1.000 ad · ₺312,40 ▲%1,20 ▲%8,8 │
│ (AP) AAPL        ⌇⌇⌇    ₺198.230,00  │
│      25 ad · $241,30    ▼%0,40 ▲%31  │
│ (₿)  BTC         ⌇⌇⌇    ₺142.800,00  │
│      0,042 · $98.410    ▲%2,10 ▲%54  │
├──────────────────────────────────────┤
│ Portföy  Analiz   (＋)   Fon  Geçmiş │
└──────────────────────────────────────┘
```

**Davranışlar:**

- **Canlı bakiye:** Fiyatlar güncellendikçe rakamlar kayan sayaç animasyonuyla değişir. Yanındaki nokta durumu gösterir:
  - 🟢 **yeşil:** canlı
  - 🟡 **sarı:** gecikmeli veri var (ör. BIST 15 dk)
  - ⚪ **gri:** piyasalar kapalı veya çevrimdışı
  - Noktaya dokununca son güncelleme saati ve kaynak bilgisi görünür.
- **Başlık sabitlenir:** Liste kaydırıldığında büyük bakiye küçülüp üst bara yapışır, böylece canlı bakiye **her zaman görünür** kalır.
- **Grafiğe dokunup sürükleyince** üstteki bakiye o anın değerini, o tarihi ve dönem başına göre değişimi gösterir (bkz. [Bölüm 7](#7-grafik-tasarımı)).
- **Canlı Bütçe kartı** dokununca genişler ve şunları gösterir:
  - Bu ay yatırılan ve çekilen
  - Gerçekleşen ve gerçekleşmemiş K/Z ayrımı
  - Alınan temettü
  - Ödenen toplam komisyon
- **Dağılım çubuğu:** Dokununca Analiz > Dağılım ekranına gider.
- **Varlık satırı:**
  - Sol: logo, sembol, adet ve anlık fiyat.
  - Sağ: piyasa değeri, günlük % ve toplam %.
  - Rozete dokununca % → ₺ → toplam K/Z arasında geçiş yapar. Seçim hatırlanır.
- **Aşağı çekince** fiyatlar yenilenir.
- **Portföy seçici** (başlıktaki ▾): Portföyler arasında geçiş, "Tümü" birleşik görünümü ve yeni portföy ekleme.

### 6.2 Varlık Satırı: Kaydırma Hareketleri

```
 Sağa çek (soldan sağa) →
┌──────────┬──────────┬────────────────┐
│ ✏ DÜZENLE│  ＋ AL   │ (TH) THYAO ... │
└──────────┴──────────┴────────────────┘

 ← Sola çek (sağdan sola)
┌────────────────┬──────────┬──────────┐
│ ... THYAO (TH) │   SAT    │  🗑 SİL  │
└────────────────┴──────────┴──────────┘
```

| Hareket | Sonuç |
|---|---|
| **Sağa çek** | Düzenle (mavi) + Al (yeşil) tuşları çıkar. Sonuna kadar çekilirse doğrudan **Düzenle** açılır |
| **Sola çek** | Sat (turuncu) + Sil (kırmızı) tuşları çıkar. Sonuna kadar çekilirse **Sil** onayı açılır |
| **Dokun** | Varlık Detay ekranı açılır (alış/satış kayıtları + AL/SAT butonları) |
| **Uzun bas** | Menü: Al, Sat, Düzenle, Fiyat Alarmı Kur, En Üste Sabitle, Listeden Gizle, Sil |

- **Düzenle**, varlığın işlem listesini ve varlık ayarlarını açar: görünen ad, not, etiket, hedef oran.
  Pozisyon, işlemlerden hesaplandığı için adet ve maliyet doğrudan değil, işlemler üzerinden düzenlenir.
  Bu, kayıtların her zaman tutarlı kalmasını sağlar.
- **Sil**, varlığa ait tüm işlemleri silmeden önce şu onayı ister:
  *"THYAO ve 5 işlemi silinecek. Gerçekleşen K/Z ve geçmiş grafik değişecek."*
  Silme sonrası ekranın altında 5 saniyelik **Geri Al** çubuğu çıkar.
- Her eşik geçişinde hafif titreşim verilir (haptic).
- Aynı kaydırma hareketleri Geçmiş ekranındaki işlem satırlarında da geçerlidir.

### 6.3 Varlık Detay Ekranı

```
┌──────────────────────────────────────┐
│ ‹  THYAO                       ★  ⋯  │
│    Türk Hava Yolları                 │
│    BIST · 15 dk gecikmeli · ● Açık   │
│                                      │
│ ₺312,40   ▲ ₺3,70  %1,20             │
│ ╭──────────────────────────────────╮ │
│ │   ▲alış            ╱╲    ╱‾╲     │ │
│ │ ╱‾‾╲   ╱‾‾╲  ▼satış  ╲╱╱   ╲╱    │ │
│ │╱    ╲╱     ╲╱                    │ │
│ ╰──────────────────────────────────╯ │
│ 1G 1H 1A 3A 6A [1Y] 5Y Tümü  〰/🕯   │
│                                      │
│ POZİSYONUM                           │
│ Adet           1.000                 │
│ Ort. Maliyet   ₺287,10               │
│ Piyasa Değeri  ₺312.400,00           │
│ Toplam Maliyet ₺287.100,00           │
│ K/Z            ▲ ₺25.300  %8,81      │
│ Bugün          ▲ ₺3.700   %1,20      │
│ Gerçekleşen    ▲ ₺4.120              │
│ Portföy Payı   %24,3                 │
│ Başa Baş Fiyat ₺287,10               │
│                                      │
│ [Alışlar (4)] Satışlar (1)   Tümü    │
│ 12.03.2026  Alış  500 × ₺270,00      │
│ 02.05.2026  Alış  500 × ₺304,20      │
│ ...                                  │
│                                      │
│ ┌────────────────┐┌────────────────┐ │
│ │       AL       ││      SAT       │ │
│ └────────────────┘└────────────────┘ │
└──────────────────────────────────────┘
```

- **Fiyat grafiği:**
  - Alış noktaları ▲ yeşil, satış noktaları ▼ kırmızı işaretlenir. İşarete dokununca işlem detayı açılır.
  - Ortalama maliyet kesikli yatay çizgiyle gösterilir. Fiyatın maliyetin üstünde mi altında mı olduğu bir bakışta görülür.
  - Çizgi ve mum grafik arasında geçiş yapılabilir.
- **ABD hisselerinde** ek satırlar bulunur:
  - Kur etkisi ve fiyat etkisi ayrımı. Örnek: *"Kazancın ₺18.200'ü hisseden, ₺9.400'ü dolardan."*
  - Bunlara ek olarak USD bazında K/Z.
- **Alt butonlar sabittir:** **AL** (yeşil) ve **SAT** (kırmızı). Sahip olunmayan varlıkta **SAT** pasif görünür.
- **Sağ üst ⋯ menüsü:** Fiyat alarmı, not ekle, izleme listesine ekle, varlığı sil.

### 6.4 Al / Sat Formu

```
┌──────────────────────────────────────┐
│ ✕            İşlem Ekle              │
│ ┌─────────[  AL  ]────┬──── SAT ───┐ │
│                                      │
│ Varlık    (TH) THYAO · BIST       ›  │
│ Tarih     08.11.2026 · 14:32      📅 │
│ Adet      [ 100                    ] │
│ Fiyat     [ 312,40              ₺  ] │
│           Seçilen gün kapanışı:      │
│           ₺311,90  [Kullan]          │
│ Komisyon  [ 62,48               ₺  ] │
│           ‰2 otomatik · değiştir     │
│ ──────────────────────────────────── │
│ Toplam Tutar             ₺31.302,48  │
│ Yeni Ort. Maliyet           ₺289,46  │
│ Yeni Adet                     1.100  │
│ Ödeme   Portföy nakdinden (₺24.150)▾ │
│         ⚠ Nakit yetersiz: ₺7.152,48  │
│         otomatik para yatırma eklenir│
│ Not     [                          ] │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │          ALIŞI KAYDET            │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Alanlar ve kurallar:**

- **Al / Sat anahtarı:** Üst kısımdadır. Ekranın vurgu rengi AL'da yeşil, SAT'ta kırmızıdır.
- **Varlık seçimi:**
  - Arama ekranında BIST / ABD / Kripto sekmeleri ve son kullanılanlar bulunur.
  - Sembol ya da şirket adı yazılabilir.
  - Varlık detayından açılırsa bu alan önceden doludur.
- **Tarih ve saat:**
  - Varsayılan "şimdi"dir, geçmiş tarih seçilebilir, gelecek tarih seçilemez.
  - Tarih seçilince o günün kapanış fiyatı getirilir ve **Kullan** ile fiyat alanına aktarılır.
- **Adet:**
  - Kripto için 8+ ondalık basamak girilebilir.
  - Türkçe virgül ve nokta otomatik algılanır.
  - "Tutar ile gir" seçeneği vardır: ₺10.000'lik BTC al → adet otomatik hesaplanır.
- **Fiyat:**
  - Para birimi varlığa göre otomatik seçilir: BIST ₺, ABD $, kripto $ veya ₺.
  - **ABD ve kripto işlemlerinde** ek bir **Kur (USD/TRY)** alanı çıkar. Bu alan işlem tarihinin kuruyla dolar, düzenlenebilir.
- **Komisyon:** Ayarlardaki varsayılan orana göre otomatik hesaplanır, elle değiştirilebilir.
- **Özet:** Toplam tutar, yeni ortalama maliyet ve yeni adet canlı hesaplanır.
- **Ödeme kaynağı:**
  - Seçenekler: "Portföy nakdinden" veya "Dışarıdan yeni para".
  - Nakit yetmezse aradaki fark için otomatik **para yatırma** kaydı oluşur.

**SAT moduna özel:**

- **Eldeki adet:** "1.000 adet [Tümünü Sat]" gösterilir. Seçilen tarihte eldekinden fazla satış engellenir.
- **K/Z önizlemesi:** "Tahmini gerçekleşen K/Z: ▲ ₺2.530 (%8,8)".
- **Satış tutarı:** "Nakitte tut" (varsayılan) veya "Hesaptan çek".
  - "Hesaptan çek" seçilirse otomatik **para çekme** kaydı da oluşur ve Canlı Bütçe'de "Çekilen" artar.

**Kaydetme:** Başarı titreşimi verilir ve kısa bir onay animasyonu oynar. Ardından detay
ekranına dönülür ve yeni işlem listede vurgulanır.

### 6.5 Geçmiş Sekmesi

```
┌──────────────────────────────────────┐
│ Geçmiş                        🔍  ⚲  │
│ [İşlemler] Gerç.K/Z  Nakit  Ekstre   │
│ Tümü · Alış · Satış · Para · Temettü │
│                                      │
│ ── KASIM 2026 ──────── Net -₺31.302 ─│
│ 08.11  ▲ Alış  THYAO                 │
│        100 × ₺312,40     -₺31.302,48 │
│ 05.11  ▼ Satış BTC                   │
│        0,01 × $98.100    +₺42.110,00 │
│                          K/Z ▲ %12,4 │
│ 01.11  ↓ Para Yatırma    +₺50.000,00 │
│                                      │
│ ── EKİM 2026 ──────── Net +₺120.000 ─│
│ 28.10  ◆ Temettü TUPRS   +₺4.850,00  │
│ ...                                  │
└──────────────────────────────────────┘
```

Geçmiş sekmesi dört alt sekmeden oluşur:

1. **İşlemler:**
   - Tüm kayıtlar zaman tüneli halinde ve aylara göre gruplanmış olarak listelenir.
   - Filtreler: işlem türü, piyasa, varlık, portföy, tarih aralığı. Arama da yapılabilir.
   - Kaydırma hareketleri: sağa → düzenle, sola → sil (geri al ile).
2. **Gerçekleşen K/Z:**
   - Kapanan satışların listesi.
   - Her satır: alış maliyeti, satış tutarı, K/Z, % ve elde tutma süresi.
   - Üstte yıllık toplam ve kazanan/kaybeden işlem oranı.
3. **Nakit Hareketleri:** Para yatırma ve çekme kayıtları, temettüler, komisyon toplamları ve kümülatif net yatırılan grafiği.
4. **Aylık Ekstre:** Banka ve fon ekstresi formatında her ay için:
   - Ay başı değer
   - Giren para / çıkan para
   - Piyasa K/Z
   - Ay sonu değer
   - Aylık getiri %

   Bir aya dokununca o ayın detayı açılır. Ekstre PDF olarak paylaşılabilir (P2).

### 6.6 Fon Sekmesi (Hesabım)

Bu ekran **kişisel portföyünüzün hesap özetidir**, bir yatırım fonu değildir. Pay değeri ve
pay sayısı gibi fon kavramları **gösterilmez**. Fon raporlarından yalnızca işe yarayan
özellikler alınır: dönemsel getiri tablosu, risk seviyesi, yoğunlaşma ölçüsü.

```
┌──────────────────────────────────────┐
│ ANA PORTFÖY                          │
│ Hesabım                              │
│                                      │
│ TOPLAM VARLIK             ● CANLI    │
│ ₺1.284.562,40                        │
│ ┌──────────┬──────────┬──────────┐   │
│ │ Maliyet  │ Kâr/Zarar│ Bugün    │   │
│ │₺1.017.759│+₺266.803 │+₺10.119  │   │
│ │poz.+nakit│ ▲%26,2   │ ▲%0,79   │   │
│ └──────────┴──────────┴──────────┘   │
│ Risk Seviyesi  ■■■■■■□  6 / 7        │
│                                      │
│ ┌─────────────────┬────────────────┐ │
│ │  [  VARLIK  ]   │    MALİYET     │ │
│ └─────────────────┴────────────────┘ │
│                                      │
│        ╭─────────╮   ● BIST   %48    │
│      ╱   ₺1,26   ╲   ● ABD    %34    │
│      ╲    Mn     ╱   ● Kripto %18    │
│        ╰─────────╯                   │
│                                      │
│ Varlık      Değer       Pay    K/Z   │
│ THYAO    ₺312.400   %24,8  ▲%8,8     │
│ NVDA     ₺224.655   %17,8  ▲%52,7    │
│ ...                                  │
│                                      │
│ DÖNEMSEL GETİRİ (TWR)                │
│ 1A    3A    6A    YB    1Y    Tümü   │
│ %3,4  %2,3  %21,4 %26,8 %28,3 %18,5  │
│                                      │
│ EN BÜYÜK 5 POZİSYONUN PAYI  %86,1    │
└──────────────────────────────────────┘
```

**İki ayrı tuş:**

| | **VARLIK** görünümü | **MALİYET** görünümü |
|---|---|---|
| Halka grafik | Güncel piyasa değerine göre dağılım | Ödenen maliyete göre dağılım |
| Liste sütunları | Değer, portföy payı %, K/Z % | Ort. maliyet, toplam maliyet, maliyet payı %, başa baş fiyatı |
| Özet | Toplam varlık | Toplam maliyet, değer farkı (₺ ve %) |
| Ek | Dönemsel getiri, en büyük 5 pozisyon, risk seviyesi | Maliyet ve değer karşılaştırma çubukları (her varlık için yan yana) |

Ek detaylar:

- Tuşlar arasında geçiş yaparken halka grafik dilimleri yeni oranlara **animasyonla** akar.
- Halkanın bir dilimine dokununca ilgili piyasa (BIST, ABD, Kripto) vurgulanır ve liste o piyasaya filtrelenir.
- **Dönemsel getiri:** Zaman ağırlıklı (TWR) hesaplanır, yani para yatırıp çekmeniz yüzdeyi bozmaz. Hesap yöntemi [02-HESAPLAMA-MOTORU §8](02-HESAPLAMA-MOTORU.md)'de.
- **Risk seviyesi (1-7):** Portföyün yıllık dalgalanmasından (volatilite) hesaplanır. Avrupa fon standardındaki (UCITS SRRI) bantlar kullanılır.

### 6.7 Analiz Sekmesi

Analiz sekmesi üç bölümden oluşur. En üstte her zaman görünen bir **Performans Karnesi**
bulunur, altında üç alt sekme yer alır: **Ya Olsaydı?**, **Performans** ve **Dağılım**.

#### Performans Karnesi

Profesyonel yatırım uygulamalarındaki dört temel ölçü tek bakışta görünür. Her birine
dokununca sade Türkçe bir açıklama, güncel değer ve hesap formülü açılır.

| Ölçü | Ne anlatır |
|---|---|
| **Bugün** | Dünkü kapanışa göre bugünkü değişim (₺ ve %) |
| **TWR** (zaman ağırlıklı getiri) | Para yatırıp çekmenin etkisi çıkarılmış getiri. Seçimlerinizin başarısını ölçer, fon ve endekslerle adil karşılaştırma sağlar |
| **XIRR** (yıllık para ağırlıklı getiri) | Paranızın ne zaman girip çıktığını hesaba katan, cebinize giren gerçek yıllık getiri. Excel XIRR ile aynı |
| **Alpha** (yıllık, Jensen alfası) | Aldığınız piyasa riskine (beta) göre ölçütün (varsayılan BIST 100) ne kadar üstünde getiri sağladığınız. Pozitif = ölçütü yendiniz |

#### Ya Olsaydı?

Cevapladığı soru: **"Portföyüme yatırdığım her parayı, aynı tarihlerde ve aynı tutarlarda
başka bir yatırım aracına yatırsaydım bugün ne kadarım olurdu?"**

```
┌──────────────────────────────────────┐
│ PERFORMANS KARNESİ                   │
│ Bugün +%0,79   TWR +%18,5            │
│ XIRR +%13,1    Alpha +%7,5           │
│                                      │
│ [Ya Olsaydı?]  Performans  Dağılım   │
│                                      │
│ 1A 3A 6A YB 1Y [Tümü]                │
│ [₺ Değer]  % Getiri                  │
│ ╭──────────────────────────╮         │
│ │   ┊08.12.2025┊           │ 1,5 Mn  │
│ │   ┊Altın ₺1,15 Mn       ╱│         │
│ │  ╱┊Portföy ₺1,05 Mn ╱‾‾╯ │ 1 Mn    │
│ │ ╱ ┊ ...         ╱‾‾╯     │         │
│ │╱─ ┊─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ 500 B   │
│ ╰──────────────────────────╯         │
│ Oca '25   Ağu '25   Nis '26  Kas '26 │
│ - - Net yatırılan · dokun ve kaydır  │
│                                      │
│ GRAFİKTE GÖSTER                      │
│ [●Portföyüm] [●BIST 100] [●Altın]    │
│ [●S&P 500] [●Dolar/TL] ○Bitcoin ...  │
│                                      │
│ LİG TABLOSU          Bugünkü Değer   │
│ 🥇 Gram Altın   ₺1.412.300 ▲₺127.738 │
│ 🥈 Bitcoin      ₺1.398.120 ▲₺113.558 │
│ 🥉 Mevduat      ₺1.358.500  ▲₺73.938 │
│ 4  TÜFE         ₺1.315.700  ▲₺31.138 │
│ 5  PORTFÖYÜM    ₺1.284.562     SEN   │
│ ...                                  │
│                                      │
│ ✦ 12 seçenekten 8'ini geride bıraktın│
│ ✦ En iyi seçenek Gram Altın olurdu   │
│ ✦ Enflasyona göre reel getirin -%2,4 │
└──────────────────────────────────────┘
```

**Grafik (profesyonel karşılaştırma grafiği):**

| Özellik | Açıklama |
|---|---|
| **Dokun ve kaydır** | Dikey imleç çıkar. Bilgi kutusunda o tarih ve görünen her serinin değeri büyükten küçüğe sıralı listelenir. Her tarih geçişinde hafif titreşim verilir |
| **₺ Değer / % Getiri** | Değer modunda tutarlar ve net yatırılan para çizgisi gösterilir. Getiri modunda seriler 0 çizgisine göre yüzde olarak karşılaştırılır. Seçilen dönemin başına göre yeniden hesaplanır, para girişleri dikkate alınır |
| **Dönem** | 1A, 3A, 6A, YB, 1Y, Tümü (özel aralık Faz 9) |
| **Seri seçimi** | 13 seçenekten en fazla 6'sı aynı anda gösterilir. Portföyüm her zaman görünür ve kalın çizgiyle, altında yumuşak dolguyla çizilir |
| **Eksenler** | Sağda yuvarlak değerli fiyat ekseni (veriye sıkı oturan aralık), altta tarih ekseni, ince kesikli ızgara |
| **Renkler** | Her ölçütün sabit bir rengi vardır. Örneğin Gram Altın her grafikte aynı altın rengindedir. Açık temada daha koyu tonlar kullanılır |

**Ölçütler (13 seçenek):**

| Ölçüt | Açıklama |
|---|---|
| BIST 100 / BIST 30 | XU100 / XU030 endeksleri |
| Gram Altın / Gram Gümüş | Ons fiyatı × USD/TRY ÷ 31,1035 |
| S&P 500, Nasdaq 100, Russell 2000 | ABD endeksleri (₺'ye çevrilmiş) |
| Bitcoin | BTC (₺'ye çevrilmiş) |
| Dolar/TL, Euro/TL | Parayı dövize çevirip bekletmek |
| TÜFE | Paranın alım gücünü koruması için gereken değer |
| Mevduat | Kullanıcının girdiği yıllık faiz oranıyla |

**Ayarlar (Faz 9):**

- **Para birimi:** TL veya USD. USD seçilince tüm akışlar dolar bazında simüle edilir.
- **Karşılaştırma bazı:** *Para giriş/çıkışları* (varsayılan) veya *alım/satım tutarları*.
- **Temettü dahil:** Mümkün olan ölçütlerde temettü dahil (toplam getiri) seri kullanılır.

#### Performans

| Bölüm | İçerik |
|---|---|
| **Risk ve getiri kutuları** | Beta, volatilite (yıllık) ve risk seviyesi, Sharpe, Sortino, maksimum düşüş, en iyi ay, en kötü ay. Hepsi dokununca açıklanır |
| **Dönemsel getiri tablosu** | 1A, 3A, 6A, YB, 1Y ve Tümü için portföy (TWR), BIST 100 ve aradaki fark (puan) |
| **Aylık getiri haritası** | Yıl × ay ızgarası. Yeşil kazanç, kırmızı kayıp, renk koyuluğu hareketin büyüklüğü |
| *Sonra (Faz 9)* | Düşüş grafiği, en çok kazandıran ve kaybettiren varlıklar, gerçekleşen/gerçekleşmemiş K/Z dağılımı, yoğunlaşma uyarısı |

#### Dağılım (Faz 9)

- Piyasa, para birimi, sektör ve varlık bazında dağılım.
- **Isı haritası:** Kutu büyüklüğü = ağırlık, renk = günlük veya toplam değişim.

### 6.8 Ayarlar

| Grup | Ayarlar |
|---|---|
| **Görünüm** | Tema: Okyanus, Gece, Gün, Kraliyet veya Sistem (otomatik açık/koyu). Yükseliş/düşüş renkleri: yeşil/kırmızı veya renk körü dostu mavi/turuncu. Sparkline göster. Kompakt liste. Varsayılan grafik aralığı |
| **Para Birimi ve Biçim** | Ana para birimi (₺ veya $). İkincil para birimini satırlarda göster. Kripto fiyat birimi ($ veya ₺). Büyük sayıları kısalt (₺1,28 Mn) |
| **Portföyler** | Ekle, yeniden adlandır, renk ve simge seç, sırala, arşivle, sil. Varsayılan portföy |
| **Hesaplama** | Maliyet yöntemi: Ağırlıklı Ortalama / FIFO. Varsayılan komisyonlar (BIST ‰, ABD $ veya %, Kripto %). Otomatik para yatırma kaydı (açık/kapalı). Ana getiri göstergesi: Basit / TWR / XIRR. Risksiz faiz oranı (Sharpe için). Ya Olsaydı ölçüt listesi (seç ve sırala). Mevduat faizi oranı |
| **Veri ve Bağlantı** | Fiyat yenileme: Canlı / 15 sn / 30 sn / 1 dk / Elle. Mobil veride canlı akış. Gelişmiş: veri kaynağı ve API anahtarları (EVDS, CoinGecko vb.). Önbelleği temizle |
| **Güvenlik ve Gizlilik** | Face ID / parmak izi kilidi. Otomatik kilit süresi (hemen / 1 dk / 5 dk). Uygulamayı tutarlar gizli aç. Ekran görüntüsünü engelle. Uygulama değiştiricide içeriği bulanıklaştır |
| **Bildirimler** | Fiyat alarmları. Günlük kapanış özeti (saat seçimi). Büyük hareket uyarısı (%X üzeri). *(P2)* |
| **Yedekleme** | Yedeği dışa aktar (JSON). Yedekten geri yükle. İşlemleri CSV olarak dışa aktar. CSV'den içe aktar *(P2)*. Tüm verileri sil (çift onaylı) |
| **Hakkında** | Sürüm. Veri kaynakları ve gecikme bilgileri. Yasal uyarı. Gizlilik politikası. Lisanslar |

### 6.9 Para Yatır / Çek, Temettü Formları

- **Para Yatır / Çek:**
  - Alanlar: tutar, para birimi, tarih, hedef portföy, not.
  - Çekilen tutar nakitten düşer. Nakit yetersizse uyarı verilir.
- **Temettü:**
  - Alanlar: varlık, tarih, brüt tutar, stopaj (vergi kesintisi), net tutar (otomatik), para birimi ve kur.
  - Temettü portföy nakdine eklenir.
- **Bölünme / Bedelsiz:**
  - Alanlar: varlık, tarih, oran (ör. %100 bedelsiz = 1 hisseye 1 yeni hisse).
  - Adet artar, ortalama maliyet orantılı düşer, toplam maliyet değişmez.
  - Veri kaynağı bölünme tespit ederse uygulama şu öneriyi gösterir: *"THYAO için 15.06.2026 tarihli %100 bedelsiz tespit edildi. Uygulansın mı?"*

### 6.10 İlk Açılış ve Boş Durumlar

- **İlk açılış akışı** (3 adım):
  1. Hoş geldin
  2. Tema seçimi (canlı önizlemeyle)
  3. Ana para birimi ve ilk portföy adı

  Son adımda iki seçenek sunulur: **"İlk işlemimi ekle"** veya **"Örnek portföyle keşfet"**.
  Örnek veri tek dokunuşla silinebilir.
- **Boş durumlar:** Her ekranda açıklayıcı bir çizim ve tek bir ana eylem butonu bulunur.
  Örnek: Ya Olsaydı ekranında *"Karşılaştırma için en az bir para girişi gerekli."*
- **Yükleniyor durumları:** Boş ekran yerine iskelet (skeleton) parıltı animasyonu.
  Ekran her zaman önce cihazdaki önbellekten anında açılır, canlı veri arkadan gelir.

### 6.11 Kilit Ekranı

- Uygulama logosu, Face ID / parmak izi istemi ve yedek olarak cihaz şifresi.
- Arka plana alındığında uygulama içeriği bulanıklaştırılır. Bu sayede uygulama değiştiricide tutarlar görünmez.

---

## 7. Grafik Tasarımı

Uygulamanın imza öğesi, bakiye grafiğidir. Hedef: Robinhood ve Revolut akıcılığında,
profesyonel bir yatırım uygulaması ciddiyetinde bir grafik.

### Görsel Yapı

| Katman | Açıklama |
|---|---|
| **Ana çizgi** | Portföy değeri. 2,5 pt kalınlık, yumuşatılmış eğri. Rengi temanın vurgu rengidir. İsteğe bağlı olarak dönem kazançtaysa yeşil, kayıptaysa kırmızı olur |
| **Alan dolgusu** | Çizginin altında, vurgu renginden şeffafa doğru dikey gradyan |
| **Net yatırılan çizgisi** | Kesikli, ince, basamaklı çizgi. Ana çizgiyle arasındaki alan **kazancı** gösterir. Fikir getiri ile yatırımı görsel olarak ayırmaktır |
| **Önceki kapanış çizgisi** | Yalnızca 1G görünümünde, noktalı yatay referans çizgisi |
| **Para giriş/çıkış işaretleri** | Para girişinde küçük ↓ nokta, çekişte ↑ nokta. Dokununca tutar görünür |
| **En yüksek / en düşük etiketleri** | Dönemin zirvesi ve dibi, ilgili noktalarda küçük etiketle. Izgara çizgisi kullanılmaz, sade görünüm korunur |
| **Ölçüt katmanı** *(isteğe bağlı)* | Seçilen bir ölçüt (ör. BIST 100) ince ikinci çizgi olarak üst üste bindirilir. Bu modda eksen % getiriye döner |

### Zaman Aralıkları

`1G` · `1H` · `1A` · `3A` · `6A` · `1Y` · `YB` (yılbaşından beri) · `Tümü` · `📅 Özel`

| Aralık | Veri sıklığı |
|---|---|
| 1G | 5 dakikalık |
| 1H | 30 dakikalık |
| 1A | Saatlik / günlük |
| 3A, 6A, 1Y, YB | Günlük |
| Tümü (2 yıldan uzun) | Günlük veri, ekranda ~300 noktaya akıllı seyreltme (LTTB algoritması) |

- **Özel aralık:** Takvimden başlangıç-bitiş seçimi. Hazır kısayollar da bulunur: "Geçen ay", "Geçen yıl", "İlk işlemden beri".
- **Aralık değişiminde** eski çizgi yeni çizgiye 300 ms'lik akıcı bir **şekil dönüşümüyle** (morph) geçer. Rakamlar kayan sayaçla güncellenir.

### Etkileşim

1. **Dokun ve sürükle:**
   - Dikey imleç çizgisi ve parlayan nokta çıkar.
   - Üstteki büyük bakiye o noktanın değerine, tarih/saatine ve dönem başına göre değişimine döner.
   - Her veri noktasında hafif seçim titreşimi verilir.
2. **İki parmakla dokun:** İki nokta arası ölçüm yapılır. Aradaki alan renklenir ve iki tarih arası değişim (₺ ve %) gösterilir.
3. **Parmağı kaldır:** Değerler yumuşak animasyonla canlı duruma döner.
4. **Mod anahtarı:** `Değer ₺` · `Getiri %` · `K/Z ₺`.
5. **Telefonu yan çevir:** Tam ekran detay modu açılır. Bu modda eksenler, ızgara ve (varlıklar için) mum grafik bulunur, yakınlaştırma ve kaydırma yapılabilir.

### Teknik

- **Çizim:** SVG + Reanimated (Faz 5'te Skia yerine seçildi, gerekçe Teknik Mimari §2'de). Eğri UI iş parçacığında üretilir, animasyonlar Reanimated ile yapılır. Animasyon UI iş parçacığında çalıştığı için JavaScript meşgulken bile 60/120 fps korunur.
- **Ekran okuyucu:** Grafik için "Son 1 ayda %3,1 yükseliş, en yüksek ₺1.301.200" gibi bir özet metin sağlanır.

---

## 8. Tema Sistemi

4 tema ve sistem ayarına uyan otomatik mod sunulur. **Tüm temalarda yerleşim aynıdır:** üstte
canlı bakiye, altında portföy. Temalar yalnızca renk, gölge ve vurgu karakterini değiştirir.
Varsayılan tema **Okyanus**'tur.

**Tasarım tonu:** Profesyonel. Yazı tipi sade (Inter), renk ve şekiller **biraz neşeli, biraz yumuşak**:

- Bakiye kartı canlı bir degrade ile öne çıkar.
- Köşeler cömert yuvarlaklıktadır, gölgeler dağınık ve yumuşaktır.
- Simgeler renkli, yumuşak zeminler üzerinde durur.
- Dokunuşlara hafif yaylanan animasyonlar eşlik eder.

| Renk | 🌊 **Okyanus** (Mavi) | 🌑 **Gece** (OLED) | ☀️ **Gün** (Açık) | 👑 **Kraliyet** |
|---|---|---|---|---|
| Karakter | Derin lacivert, canlı mavi bakiye kartı | Saf siyah, nane yeşili ve lavanta vurgular | Ferah, aydınlık, gündüz okunaklı | Sıcak antrasit ve yumuşak altın |
| Arka plan | `#0B1830` | `#000000` | `#F3F6FC` | `#13110E` |
| Yüzey (kart) | `#132544` | `#111214` | `#FFFFFF` | `#1E1B16` |
| Yükseltilmiş yüzey | `#1A3056` | `#1A1B1F` | `#EEF2FB` | `#27231D` |
| Ana metin | `#F3F7FF` | `#FFFFFF` | `#15203A` | `#F7F0E3` |
| İkincil metin | `#A6B8DA` | `#A3A3AE` | `#536180` | `#C2B6A0` |
| Vurgu | `#6AA6FF` | `#3EE0A1` | `#2F5BE0` | `#E6C15A` |
| Vurgu 2 | `#7BD8F9` | `#B49CFF` | `#0A719B` | `#F2D995` |
| Yükseliş | `#4BE0A6` | `#3EE0A1` | `#08794F` | `#72D99C` |
| Düşüş | `#FF8097` | `#FF6F86` | `#C92A47` | `#F28A7E` |
| Bakiye kartı | Mavi degrade `#2453E0 → #1A68C2` | Grafit, nane çizgili | Mavi degrade `#2B5BE3 → #1F6BC4` | Altın-kahve degrade |

- **Piyasa renkleri** her temada aynı anlamı taşır: BIST mercan, ABD mavi, Kripto kehribar, Nakit nane.
- **Renk körü dostu mod** her temada çalışır: yükseliş mavi, düşüş turuncu olur.
- **Kontrast:** Tüm metin/zemin çiftleri WCAG AA kontrast oranını (4,5:1) sağlar. Bu, her temada otomatik testle doğrulanır (`src/theme/__tests__/themes.test.ts`). Renk körü modu da teste dahildir. Bakiye kartı üzerindeki beyaz yazılar da bu teste girer.
- **Tema geçişi** anında uygulanır. Ayarlar > Tema ekranında 4 temanın gerçek renkli mini önizlemesi gösterilir.
- **Teknik:** Renkler tek bir "tasarım jetonu" (design token) dosyasından gelir (`src/theme/themes.ts`). Yeni tema eklemek tek bir dosyaya renk listesi eklemek kadar kolaydır.

---

## 9. Tasarım Dili

### Tipografi

- **Yazı tipi:** **Inter**. Sade, nötr ve finans uygulamalarında standart bir yazı tipidir.
  Türkçe karakterler ve ₺ işareti tamdır. *(İlk denemedeki yuvarlak hatlı Nunito "fazla
  yumuşak" bulunduğu için 9 Kasım 2026'da değiştirildi.)*
- **Rakamlar:** Tüm yazı stillerinde **eşit genişlikli rakam** (tabular figures, `tnum`) açıktır. Canlı değişen fiyatlarda rakamlar titremez, sütunlar hizalı kalır. Android bunu yazı tipi özelliği olarak uygular.

| Ölçek | Boyut / Kalınlık | Kullanım |
|---|---|---|
| Büyük bakiye | 36 / Inter Bold, sıkı harf aralığı | Toplam değer |
| Başlık 1 | 28 / Inter Bold | Ekran başlıkları |
| Başlık 2–3 | 22–17 / Inter Bold–SemiBold | Bölüm ve kart başlıkları |
| Gövde | 15 / Inter Regular | Liste satırları |
| Tutar | 20–12,5 / Inter SemiBold | Değerler, rozetler |
| Alt bilgi | 13–12 / Inter Regular–Medium | Adet, fiyat, açıklamalar |
| Etiket | 11 / Inter SemiBold, BÜYÜK HARF, geniş aralık | "TOPLAM DEĞER", "CANLI BÜTÇE" |

### Düzen ve Ritim

- **Boşluk sistemi:** 4 pt tabanlı (4, 8, 12, 16, 24, 32).
- **Kenar boşluğu:** Ekran kenarlarında 16 pt.
- **Köşe yuvarlaklığı:** Bakiye kartı 28, kartlar 22, butonlar 12–22, seçiciler ve rozetler tam yuvarlak (hap biçimi).
- **Dokunma alanı:** En az 44×44 pt.

### Hareket ve Geri Bildirim

- **Animasyon süreleri:** 150 ms (mikro), 250 ms (geçiş), 350 ms (sayfa). Yay (spring) eğrisi kullanılır.
- **Titreşim (haptic):**
  - Seçim değişimi: hafif
  - Kaydırma eşiği: orta
  - Kayıt başarılı: başarı titreşimi
  - Silme: uyarı titreşimi
- **Sayılar:** Değişen rakamlar kayan sayaç efektiyle güncellenir. Fiyat değişince satırın arka planı 600 ms boyunca soluk yeşil veya kırmızı yanıp söner. Bu, borsa ekranlarındaki "tik" efektidir.

### Sayı ve Tarih Biçimi

| Tür | Biçim |
|---|---|
| Para | `₺1.284.562,40` · `$241,30` |
| Kısaltma | `₺1,28 Mn` · `₺12,4 B` (bin) · `₺2,1 Mr` (milyar) |
| Yüzde | `%8,81` · yükselişte ▲, düşüşte ▼ işareti ve renk |
| Tarih | `08.11.2026` · göreli: "Bugün 14:32", "Dün" |
| Kripto adet | Gerektiği kadar ondalık (`0,04215` BTC), sondaki sıfırlar atılır |

Renk tek başına anlam taşımaz. Yön her zaman ▲/▼ işaretiyle de gösterilir (erişilebilirlik).

---

## 10. Varlık Kapsamı ve Canlı Veri

| Piyasa | Kapsam | Fiyat birimi | Canlılık | Seans (TR saati) |
|---|---|---|---|---|
| **BIST** | Tüm BIST hisseleri, endeksler (XU100, XU030), BIST'te işlem gören ETF ve varantlar *(P2)* | ₺ | **15 dk gecikmeli** (ücretsiz kaynak). Lisanslı gerçek zamanlı kaynak ileride eklenebilir | 10:00 – 18:00 |
| **ABD** | NYSE ve Nasdaq hisseleri, ETF'ler | $ | Neredeyse gerçek zamanlı (15–30 sn yenileme) | Kışın 17:30 – 00:00, yazın 16:30 – 23:00. Seans öncesi ve sonrası ayrıca belirtilir |
| **Kripto** | Popüler 500+ coin | $ veya ₺ | **Gerçek zamanlı** (WebSocket akışı) | 7/24 |
| **Döviz ve Emtia** (ölçüt olarak) | USD/TRY, EUR/TRY, ons altın, ons gümüş | ₺ / $ | 15–60 sn | Neredeyse 7/24 |

- **Varlık logoları:** Kripto logoları kaynaktan gelir. Hisseler için renkli harf rozeti (monogram) kullanılır. Ücretsiz ve lisans uygun bir logo kaynağı bulunursa eklenir.
- **Çevrimdışı mod:** Son bilinen fiyatlar "eski veri" rozetiyle gösterilir ve işlem girişi her zaman çalışır.
- **Veri kaynakları, yedek kaynaklar ve riskler:** Detaylar [03-TEKNIK-MIMARI](03-TEKNIK-MIMARI.md) dokümanında.

---

## 11. Gizlilik ve Güvenlik

- **Veri depolama:** Tüm veri cihazdaki yerel veritabanında tutulur. Kayıt veya hesap gerekmez, sunucu yoktur.
- **Ağ trafiği:** Uygulama internete yalnızca **piyasa fiyatı** çekmek için çıkar. Portföy bilgileriniz (adet, tutar) hiçbir sunucuya gönderilmez. Fiyat isteklerinde yalnızca sembol adı gider.
- **Kilit:** Face ID / parmak izi kilidi, otomatik kilit süresi.
- **API anahtarları:** Varsa, cihazın güvenli anahtar deposunda (Keychain / Keystore) saklanır.
- **Yedek dosyası:** Kullanıcının kontrolündedir. İsteğe bağlı şifreleme yapılabilir (P1).
- **Tüm verileri silme:** Çift onay ister ve geri alınamaz.

---

## 12. Kalite Hedefleri

| Alan | Hedef |
|---|---|
| Açılış | Soğuk açılışta 1,5 sn içinde önbellekten dolu ana ekran |
| Akıcılık | Liste ve grafiklerde 60 fps (destekleyen cihazda 120 fps). 200+ varlık ve 10.000+ işlemde takılma yok |
| Doğruluk | Hesaplama motorunda kapsamlı birim testleri ve el hesabıyla doğrulanmış örnek senaryolar |
| Dayanıklılık | Veri kaynağı çökerse yedek kaynağa geçiş. Hiçbir durumda veri kaybı yok |
| Erişilebilirlik | Dinamik yazı boyutu, ekran okuyucu etiketleri, AA kontrast |
| Platform | iOS ve Android, Expo SDK 58'in desteklediği minimum sürümler |

---

## 13. Onaylanan Kararlar

8 Kasım 2026'da tüm öneriler onaylandı. Ek olarak telefonun **Android** olduğu ve tasarımın
**profesyonel, biraz neşeli, biraz yumuşak** olması istendi.

| # | Karar | Sonuç |
|---|---|---|
| 1 | **Telefon** | Android. Testler ve kurulum (APK) Android'e göre yapılır. Kod iOS ile de uyumlu kalır |
| 2 | **Teknoloji** | Expo (React Native) + TypeScript |
| 3 | **Alt bar düzeni** | Portföy · Analiz · ＋ · Fon · Geçmiş. Ayarlar sağ üstte ⚙ |
| 4 | **"Fon" ekranı** | Kişisel portföyün Hesabım özeti (Varlık/Maliyet tuşları). Fon kavramları (pay değeri vb.) gösterilmez, bkz. 9 Kasım revizyonu |
| 5 | **Varsayılan tema** | Okyanus (mavi) |
| 6 | **Maliyet yöntemi** | Ağırlıklı ortalama varsayılan, FIFO ayardan seçilebilir |
| 7 | **Nakit takibi** | Otomatik para yatırma açık |
| 8 | **BIST verisi** | Ücretsiz kaynakla 15 dk gecikmeli başlanır, lisanslı canlı kaynak sonra eklenebilir |
| 9 | **Ek ölçütler** | TÜFE, Euro/TL ve Mevduat eklendi |
| 10 | **Uygulama adı** | Çalışma adı "Yatırım Takip". Kesin ad yayın öncesi seçilecek |

### 9 Kasım 2026 revizyonu (Faz 1 geri bildirimi)

| # | İstek | Karar |
|---|---|---|
| 11 | APK'yı GitHub'dan indirmek | GitHub Actions her uygulama değişikliğinde APK derler ve "Android · son sürüm" sayfasında yayınlar ([README](../README.md#android-telefonda-kurulum)) |
| 12 | Yazı stili daha normal olsun | Nunito → **Inter** |
| 13 | Analiz grafiği daha profesyonel olsun | Dokun-kaydır imleç ve bilgi kutusu, eksenler, ₺/% modu, dönem seçimi, seri seçimi, net yatırılan çizgisi ([6.7](#67-analiz-sekmesi)) |
| 14 | Pay adedi, pay tutarı olmasın, bu bir fon değil | Hesabım ekranında pay değeri ve pay sayısı kaldırıldı. Yerine Maliyet, Kâr/Zarar ve Bugün gösterilir. TWR hesabı arka planda aynı yöntemle yapılır ama pay kavramı ekranda görünmez |
| 15 | Alpha, TWR, XIRR, Bugün | Analiz'in en üstüne **Performans Karnesi** eklendi. Performans sekmesine Beta, Sharpe, Sortino, volatilite, maks. düşüş, en iyi/kötü ay, dönemsel tablo ve aylık harita eklendi. Hesap fonksiyonları yazıldı ve test edildi |

### 9 Kasım 2026: Faz 3'te verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 16 | **İlk açılış** | Boş bir "Ana Portföy" (kendi kayıtların) ve ayrı bir "Örnek Portföy" (kurgusal fiyatlar) oluşturulur. İkisi asla karışmaz. Örnek, Ayarlar › Veri ve Yedekleme'den kaldırılabilir veya bugüne taşınabilir. İlk açılış akışı Faz 10'da gelecek |
| 17 | **Geçmişe dönük tutarsız değişiklik** | Uyarıyla bırakılmaz, **yapılmaz**. Kullanıcıya hangi satışın veya çekişin etkilendiği söylenir. Böylece kayıtlar her zaman tutarlı kalır (T8) |
| 18 | **Otomatik kayıtlar** | Saklanmaz, her seferinde türetilir. Elle silinemez ve düzenlenemez. Bağlı olduğu alış veya satış değişince kendiliğinden güncellenir |
| 19 | **Silme** | Onay penceresi yerine anında silme ve 5 saniye **GERİ AL**. Toplu ve geri dönüşsüz işlemlerde (tüm verileri silme, yedekten geri yükleme) ise açık onay istenir |

### 9 Kasım 2026: Faz 4'te verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 20 | **Veri kaynakları** | Anahtarsız, gerçek isteklerle denenmiş kaynaklar: Yahoo, Binance, CoinGecko, İş Yatırım, TCMB. Bot korumalı kaynaklar (Stooq) kullanılmaz; uygulama kimlik taklidi yapmaz |
| 21 | **Gram altın** | 7/24 ve anlık olduğu için birincil kaynak Binance PAXG/TRY ÷ 31,1035; yedek Yahoo vadeli altın × Dolar/TL |
| 22 | **"Ya Olsaydı?" ölçütleri** | Kendi portföyün için ilk kayıttan bugüne gerçek günlük fiyatlar indirilir. ABD endeksleri her günün kuruyla TL'ye çevrilir (Türkiye'den yatıran birinin göreceği değer). TÜFE ve mevduat Faz 9'da |
| 23 | **Piyasalar ekranı** | İzleme listesi (varsayılan: BIST 100, Dolar/TL, Euro/TL, gram altın, Bitcoin, S&P 500, Nasdaq 100, gram gümüş, BIST 30, Ethereum), arama ile ekleme |
| 24 | **TWR kuralı** | Para girişi günün başında, çıkışı günün sonunda sayılır. Büyük girişlerde sonucu bozabilen eski "gün sonu" kuralının yerine geçti |
| 25 | **Web önizlemesi** | Tarayıcılar bu kaynakları engellediği için web önizlemesi kurgusal fiyat kullanır ve bunu ekranda açıkça yazar |

### 9 Kasım 2026: Faz 6'da verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 26 | **Sıra** | Fiyatlar geldiği için işlem ekranları (Faz 6), ana ekrandan (Faz 5) önce yapıldı |
| 27 | **Varsayılan komisyon** | BIST ‰2, ABD işlem başına $1, kripto %0,1. Formda değiştirilebilir; ayarı Faz 10'da |
| 28 | **Geçmiş tarihli işlem saati** | Saat yazılmazsa piyasanın seans içi bir saati: BIST 11:00, ABD 18:00, diğerleri 12:00 (İstanbul) |
| 29 | **Önizleme** | Formdaki her rakam, kaydedilecek kayıtla tüm geçmiş yeniden oynatılarak hesaplanır; kaydedilen ile gösterilen aynıdır |
| 30 | **Stopaj önerisi** | BIST temettülerinde %15, ABD'de %20; değiştirilebilir |

### 9 Kasım 2026: Faz 5'te verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 31 | **Grafik çizimi** | SVG + Reanimated; şekil UI iş parçacığında, 96 noktaya örneklenerek dönüşür. Skia gerekirse aynı arayüzle eklenir |
| 32 | **Satırdan silme** | Varlığın tüm kayıtları tek değişiklik olarak silinir, onay sorulmaz; 5 saniye içinde "GERİ AL" hepsini geri getirir |
| 33 | **Net K/Z ayrıntısı** | Gerçekleşmemiş + gerçekleşen + temettü − hesap ücretleri. Komisyonlar zaten maliyette ve satış gelirinde olduğu için ayrıca düşülmez, bilgi olarak gösterilir |
| 34 | **Kripto canlı akışı** | Binance WebSocket'ten yalnız son fiyat; "bugün" yine İstanbul gece yarısına göre |
| 35 | **Sıralama** | Değer · Bugün % · Toplam % · Ad, tek düğmeyle sırayla; seçim saklanır |
| 36 | **Katalog dışı coin** | Önce Binance paritesi, yoksa CoinGecko'da arama; aynı sembollü coinler ad, sıra ve fiyatla listelenir, kişi seçer. Seçim varlık kaydında saklanır |
| 37 | **Fiyatı olmayan varlık** | Sessizce son işlem fiyatıyla değerlenmez: satırda "fiyat yok", detayda uyarı ve sonradan "Coini eşleştir" |

### 9 Kasım 2026: Faz 7'de verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 38 | **Aylık getiri** | Zaman ağırlıklı (ay içindeki para giriş/çıkışı getiriyi bozmaz); yıl getirisi ayların bileşiği |
| 39 | **Piyasa K/Z (ekstre)** | Ay sonu − ay başı − (giren − çıkan). Temettü ve hesap ücretleri bunun içinde; ay detayında ayrıca gösterilir |
| 40 | **Elde tutma süresi** | Satılan adetlerin, maliyet ağırlıklı ortalama süresi (önce en eski alışlar) |
| 41 | **Otomatik kayıtlar** | Geçmişte kaydırılamaz; bağlı oldukları kayıtla birlikte değişir |

### 9 Kasım 2026: Faz 9'da verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 42 | **TÜFE kaynağı** | TCMB sayfasındaki resmi TÜİK aylık değişimleri; uydurma veya tahmini rakam kullanılmaz. Yayımlanmamış ay sabit tutulur |
| 43 | **Mevduat** | Kişinin girdiği yıllık net faiz, günlük bileşik; varsayılan %40, Ya Olsaydı'dan değiştirilir |
| 44 | **Dolar ile karşılaştırma** | Her tutar o günün Dolar/TL kuruyla çevrilir; reel (TÜFE) getiri cümlesi yalnız TL'de gösterilir |
| 45 | **Yoğunlaşma uyarısı** | Tek varlık hesabın %25'ini veya en büyük 3 varlık %60'ını geçince |
| 46 | **Sektör** | BIST: İş Yatırım listesi; ABD: GICS sektörleri (katalogdaki hisseler), ETF'ler türüne göre |

### 10 Kasım 2026: Faz 10'da verilen kararlar

| # | Konu | Karar |
|---|---|---|
| 47 | **Otomatik para girişi** | Kapatılamaz: geçmiş alışların nakit tutarlılığı buna dayanıyor |
| 48 | **Kilit** | Açmak için önce doğrulama; her açılış kilitli; yedek olarak telefon şifresi. Ekran kilidi olmayan telefonda açılmaz |
| 49 | **Ekran koruması** | Android'de tek ayar: ekran görüntüsü engeli ve uygulama değiştiricide boş kart birlikte (FLAG_SECURE) |
| 50 | **CSV biçimi** | Türkçe Excel için ";" ayraç, ondalık virgül, UTF-8 BOM; otomatik kayıtlar işaretli |
| 51 | **Portföy silme** | Kayıtlarıyla birlikte, onaylı; son kendi portföyü silinemez |

---

## 14. Yasal Uyarı

Uygulama, kullanıcının kendi girdiği verilerle kişisel takip amacıyla çalışır. Gösterilen
fiyatlar gecikmeli olabilir ve hata içerebilir. Hiçbir ekran yatırım tavsiyesi niteliği
taşımaz. "Ya Olsaydı?" karşılaştırmaları geçmiş verilere dayanan varsayımsal hesaplardır ve
gelecekteki getirilerin göstergesi değildir. Bu uyarı Hakkında ekranında ve ilk açılışta
gösterilir.
