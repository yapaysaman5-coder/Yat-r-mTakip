# Hesaplama Motoru

> Uygulamadaki her rakamın nasıl hesaplandığını tanımlar. Kod bu dokümana göre yazılır ve
> buradaki örnek hesaplar otomatik test olarak koda eklenir.
>
> **Durum (9 Kasım 2026):** Bu dokümanın tamamı `src/domain/` altında kodlandı ve test edildi
> (Faz 2). T1–T14 senaryoları ve 5 değişmez kural otomatik testlerde. Sonuçlar:
> [test raporu](test-raporu/faz2-hesaplama-motoru.md).
> Ana doküman: [01-PROJE-DOKUMANI.md](01-PROJE-DOKUMANI.md)

## İçindekiler

1. [Temel Kavramlar](#1-temel-kavramlar)
2. [Hareket Türleri](#2-hareket-türleri)
3. [Para Birimi Kuralları](#3-para-birimi-kuralları)
4. [Pozisyon ve Maliyet](#4-pozisyon-ve-maliyet)
5. [Kâr / Zarar](#5-kâr--zarar)
6. [Nakit ve Canlı Bütçe](#6-nakit-ve-canlı-bütçe)
7. [Portföy Değer Serisi (Grafik Verisi)](#7-portföy-değer-serisi)
8. [Zaman Ağırlıklı Getiri (TWR)](#8-zaman-ağırlıklı-getiri-twr)
9. [Para Ağırlıklı Getiri (XIRR)](#9-para-ağırlıklı-getiri-xirr)
10. [Risk Metrikleri](#10-risk-metrikleri)
11. [Reel Getiri (Enflasyon)](#11-reel-getiri)
12. ["Ya Olsaydı?" Simülasyonu](#12-ya-olsaydı-simülasyonu)
13. [Bölünme, Bedelsiz ve Temettü](#13-bölünme-bedelsiz-ve-temettü)
14. [Hassasiyet ve Yuvarlama](#14-hassasiyet-ve-yuvarlama)
15. [Doğrulama Kuralları ve Test Senaryoları](#15-doğrulama-kuralları-ve-test-senaryoları)

---

## 1. Temel Kavramlar

| Kavram | Tanım |
|---|---|
| **Ana para birimi** | Raporlamanın yapıldığı para birimi. Varsayılan ₺ (TRY), isteğe bağlı $ (USD) |
| **Varlık para birimi** | Varlığın fiyatlandığı para birimi: BIST → TRY, ABD → USD, kripto → USD (USDT) |
| **Dış para akışı** | Portföye dışarıdan giren (para yatırma) veya dışarı çıkan (para çekme) para. Alış ve satış dış akış **değildir**, portföy içi dönüşümdür |
| **Pozisyon** | Bir varlıktaki adet ve kalan maliyet. Her zaman işlemlerden **türetilir**, ayrıca saklanmaz |
| **Piyasa değeri** | Adet × güncel fiyat × kur |
| **Toplam değer** | Tüm pozisyonların piyasa değeri + nakit |

## 2. Hareket Türleri

| Tür | Kod | Adet | Maliyet | Nakit | Dış akış |
|---|---|---|---|---|---|
| Alış | `BUY` | + | + (adet × fiyat + komisyon) | − toplam tutar | — |
| Satış | `SELL` | − | − (satılan adedin maliyeti) | + (adet × fiyat − komisyon) | — |
| Para yatırma | `DEPOSIT` | — | — | + | **+ giriş** |
| Para çekme | `WITHDRAW` | — | — | − | **− çıkış** |
| Temettü | `DIVIDEND` | — | — | + net tutar | — (getiri sayılır) |
| Hesap ücreti | `FEE` | — | — | − | — (gider sayılır) |
| Bölünme / bedelsiz | `SPLIT` | × oran | değişmez | — | — |
| Portföyler arası transfer *(P2)* | `TRANSFER` | ± | taşınır | — | Tek portföy görünümünde ± |

**Bağlı (otomatik) kayıtlar:**

- **Alışta nakit yetmezse:** *Otomatik para yatırma* ayarı açıksa, eksik tutar kadar bir `DEPOSIT` kaydı alışla **aynı zaman damgasıyla** oluşturulur ve alışa bağlanır (`linkedTo`). Tutar **bir üst kuruşa yuvarlanır**; böylece gerçek bir para hareketine benzer ve nakit eksiye düşmez. Alış silinir veya düzenlenirse bağlı kayıt da güncellenir.
- **Yeniden üretim:** Otomatik kayıtlar elle düzenlenmez. Her değişiklikten sonra hepsi elle girilen işlemlerden baştan üretilir (`reconcileAutoRecords`).
- **Satışta "Hesaptan çek" seçilirse:** Satış tutarı kadar bir `WITHDRAW` kaydı oluşur ve satışa bağlanır.

## 3. Para Birimi Kuralları

- Her işlem kendi para biriminde ve **işlem anındaki kur** ile saklanır: `fxRate` = 1 birim varlık para birimi kaç ₺.
- **Nakit (v1):** Nakit, ana para biriminde tek bir hesap olarak tutulur.
  - ABD hissesi alışında `adet × fiyat × kur + komisyon × kur` kadar ₺ nakitten düşer.
  - Satışta da aynı mantıkla ₺ nakde eklenir.
  - Ayrı bir USD nakit hesabı P2'de gelir.
- **Dolar bazlı raporlama:** Ana birim $ seçilirse tüm ₺ akışlar kendi tarihlerindeki USD/TRY kuruyla dolara çevrilir. Böylece TL'nin değer kaybı getiriden ayrıştırılmış olur.
- **Kur kaynağı:**
  - Geçmiş tarihli işlemlerde o günün kapanış kuru önerilir, kullanıcı düzenleyebilir.
  - Canlı değerlemede anlık kur kullanılır.

## 4. Pozisyon ve Maliyet

İki yöntem desteklenir. Varsayılan **ağırlıklı ortalama**dır.

### 4.1 Ağırlıklı Ortalama Maliyet

```
Alış (q adet, p fiyat, f komisyon):
  adet'   = adet + q
  maliyet' = maliyet + q·p + f
  ortalama = maliyet / adet

Satış (q adet, p fiyat, f komisyon):
  satılanMaliyet = q · ortalama
  gerçekleşenKZ  = q·p − f − satılanMaliyet
  maliyet' = maliyet − satılanMaliyet
  adet'    = adet − q          (ortalama değişmez)
```

### 4.2 FIFO (İlk Giren İlk Çıkar)

- Her alış bir **lot** oluşturur. Lotun birim maliyeti `(q·p + f) / q` olur.
- Satış en eski lottan başlayarak lotları tüketir.
- Gerçekleşen K/Z, tüketilen lotların maliyetine göre hesaplanır.

### 4.3 Örnek (iki yöntem karşılaştırmalı)

| # | İşlem | Adet | Fiyat | Komisyon |
|---|---|---|---|---|
| 1 | Alış | 100 | 10,00 | 2,00 |
| 2 | Alış | 50 | 16,00 | 1,00 |
| 3 | Satış | 80 | 20,00 | 1,60 |

Güncel fiyat 18,00 kabul edilmiştir.

| Sonuç | Ağırlıklı Ortalama | FIFO |
|---|---|---|
| Alışlar sonrası toplam maliyet | 1.803,00 (ort. 12,02) | Lot1: 100 × 10,02 · Lot2: 50 × 16,02 |
| Satışın gerçekleşen K/Z'si | 1.598,40 − 80 × 12,02 = **636,80** | 1.598,40 − 80 × 10,02 = **796,80** |
| Kalan adet / kalan maliyet | 70 / 841,40 (ort. 12,02) | 70 / 1.001,40 (ort. 14,31) |
| Gerçekleşmemiş K/Z (70 × 18 = 1.260) | **418,60** | **258,60** |
| **Toplam K/Z** | **1.055,40** | **1.055,40** |

> Yöntem yalnızca K/Z'nin gerçekleşen ve gerçekleşmemiş arasındaki **dağılımını** değiştirir.
> Toplam K/Z her iki yöntemde de aynıdır. Bu eşitlik bir test kuralıdır.

### 4.4 Kurallar

- **Fazla satış engeli:** Bir tarihte, o tarihteki adetten fazla satış yapılamaz. Geçmişe dönük düzenlemelerde de kontrol edilir: geçmişteki bir alışı silmek sonraki bir satışı geçersiz kılıyorsa kullanıcı uyarılır.
- **Pozisyon kapanışı:** Adet sıfırlanınca pozisyon "kapalı" olur. Kapalı pozisyonlar listede gizlenir, geçmişte ve gerçekleşen K/Z'de görünür.
- **Hesaplama sırası:** İşlemler zaman damgasına göre sıralanarak hesaplanır. Aynı saniyede birden fazla işlem varsa sıra şöyledir: `SPLIT` → `DEPOSIT` → `BUY` → `SELL` → `DIVIDEND` → `FEE` → `WITHDRAW`. Bölünme önce uygulanır, para gelir, alınır, satılır, gelir ve giderler işlenir, en son para çıkar. Eşitlikte işlem kimliği belirleyicidir.

## 5. Kâr / Zarar

### 5.1 Pozisyon Düzeyinde (₺ bazında)

```
piyasaDeğeri₺    = adet × fiyat × kur_şimdi
maliyet₺         = Σ (alış tutarı × alış kuru) − satılan maliyet₺
gerçekleşmemiş₺  = piyasaDeğeri₺ − maliyet₺
gerçekleşmemiş%  = gerçekleşmemiş₺ / maliyet₺
başaBaşFiyatı    = maliyet / adet   (varlık para biriminde)
portföyPayı      = piyasaDeğeri₺ / toplamDeğer₺
```

### 5.2 Kur Etkisi Ayrıştırması (USD varlıklar)

Ortalama USD maliyeti `P₀`, etkin ortalama alış kuru `K₀ = maliyet₺ / maliyet$`,
güncel fiyat `P₁`, güncel kur `K₁`, adet `Q` olsun:

```
toplamKZ₺   = P₁·Q·K₁ − P₀·Q·K₀
fiyatEtkisi = (P₁ − P₀) · Q · K₀     → hissenin kendi kazancı
kurEtkisi   = P₁ · Q · (K₁ − K₀)     → doların TL karşısındaki kazancı
fiyatEtkisi + kurEtkisi = toplamKZ₺  (tam ayrışır, artık kalmaz)
```

**Örnek** (kurlar örnek amaçlıdır):

- Pozisyon: 10 adet AAPL, ort. maliyet $200, etkin alış kuru 32.
- Güncel: fiyat $240, kur 40.

| Kalem | Hesap | Tutar |
|---|---|---|
| Toplam K/Z | 96.000 − 64.000 | ₺32.000 |
| Fiyat etkisi | 40 × 10 × 32 | ₺12.800 |
| Kur etkisi | 240 × 10 × 8 | ₺19.200 |

### 5.3 Günlük Değişim

- **"Gün başı" tanımı:**
  - Hisseler için kendi piyasasının **önceki kapanışı**.
  - Kripto için TR saatiyle **00:00**. Ayarlardan "son 24 saat" seçilebilir.
- **Varlık günlük K/Z:**

  ```
  varlıkGünlükKZ₺ = adet_gün_başı × (fiyat_şimdi × kur_şimdi − öncekiKapanış × kur_önceki)
                    + bugünkü alışların (şimdiki değer − alış tutarı)
                    + bugünkü satışların (satış tutarı − gün başı değeri)
  ```
- **Portföy günlük K/Z:**

  ```
  portföyGünlükKZ₺ = Σ varlıkGünlükKZ₺
  günlük%          = portföyGünlükKZ₺ / gün başı toplam değer
  ```

## 6. Nakit ve Canlı Bütçe

```
Yatırılan       = Σ DEPOSIT              (otomatik oluşanlar dahil)
Çekilen         = Σ WITHDRAW
Net Yatırılan   = Yatırılan − Çekilen
Nakit           = Net Yatırılan − Σ alış tutarları + Σ satış tutarları
                  + Σ temettü (net) − Σ hesap ücretleri
Toplam Değer    = Σ piyasaDeğeri₺ + Nakit
Net K/Z         = Toplam Değer − Net Yatırılan
Basit Getiri %  = Net K/Z / Net Yatırılan   (Net Yatırılan ≤ 0 ise "—" gösterilir)
```

**Temel eşitlik.** Bu eşitlik bir test kuralıdır ve her hesaplamada doğrulanır:

```
Net K/Z = Σ gerçekleşmemiş + Σ gerçekleşen + Σ temettü − Σ hesap ücretleri
```

Canlı Bütçe kartında bu kalemler ayrı ayrı gösterilir.

## 7. Portföy Değer Serisi

Grafiğin ve tüm performans metriklerinin kaynağıdır.

```
Her gün d için (ilk işlemden bugüne):
  adet_i(d) = d gününün sonuna kadarki işlemlerden hesaplanan adet
  değer(d)  = Σ adet_i(d) × kapanış_i(d) × kur_i(d) + nakit(d)
  netYatırılan(d) = d'ye kadarki Σ DEPOSIT − Σ WITHDRAW
```

- **Tatil ve hafta sonu:** Fiyatı olmayan günlerde **son geçerli kapanış** kullanılır. Örneğin bayramda BIST fiyatı sabit kalır, kripto değişmeye devam eder.
- **Gün içi aralıklar (1G, 1H):**
  - Varlıkların 5 dk / 30 dk'lık fiyatları ortak bir zaman ızgarasına hizalanır.
  - Eksik noktalarda son fiyat taşınır.
- **Önbellek:**
  - Günlük değerler cihazda saklanır (`portfolio_snapshot`).
  - Geçmiş tarihli bir işlem eklenir veya düzenlenirse yalnızca **o tarihten sonraki** günler yeniden hesaplanır (artımlı hesap).
- **Görselleştirme:** Grafiğe gönderilmeden önce seri, LTTB algoritmasıyla şekli bozulmadan ~300 noktaya indirilir.

## 8. Zaman Ağırlıklı Getiri (TWR)

Yatırım fonlarının kullandığı **birimleştirme (unitization)** yöntemidir. Para giriş ve
çıkışlarının getiriyi bozmasını engeller.

> **Not:** Aşağıdaki "pay değeri" ve "pay sayısı" yalnızca **iç hesap** değişkenleridir.
> Uygulama bir fon değil, kişisel portföydür. Bu kavramlar hiçbir ekranda gösterilmez.
> Kullanıcı yalnızca sonuçları görür: TWR, dönemsel getiri tablosu, risk ölçüleri.

```
Başlangıç: ilk para girişi F₁ → payDeğeri = 1,000000 ; paySayısı = F₁

Her d günü sonunda, o gün F_d kadar dış akış varsa (giriş +, çıkış −):
  payDeğeri_d = (değer_d − F_d) / paySayısı_(d−1)     ← akış öncesi pay değeri
  paySayısı_d = paySayısı_(d−1) + F_d / payDeğeri_d

Akış olmayan günlerde:
  payDeğeri_d = değer_d / paySayısı_(d−1)

TWR[a, b] = payDeğeri_b / payDeğeri_a − 1
```

- **Gün sonu varsayımı:** Para akışı gün sonunda girmiş kabul edilir. Günün getirisi eski paylara yazılır. Günlük veriyle standart ve tutarlı bir yaklaşımdır.
- **Portföy tamamen boşalırsa** (pay sayısı 0): Sonraki ilk para girişi, son bilinen pay değerinden pay alır. Pay değeri serisi kesintisiz devam eder.

**Örnek:**

| Gün | Olay | Değer | Pay Değeri | Pay Sayısı |
|---|---|---|---|---|
| 0 | ₺1.000 yatırıldı | 1.000 | 1,000000 | 1.000,00 |
| 1 | Piyasa %10 yükseldi, gün sonu ₺500 yatırıldı | 1.600 | (1.600 − 500) / 1.000 = 1,100000 | 1.000 + 500/1,1 = 1.454,55 |
| 2 | Piyasa düştü | 1.500 | 1.500 / 1.454,55 = 1,031250 | 1.454,55 |

- **TWR** = 1,03125 / 1 − 1 = **%3,13**. Yatırımın kendisi önce %10 kazandı, sonra %6,25 kaybetti.
- **Basit getiri** = (1.500 − 1.500) / 1.500 = **%0**. Para girişinin zamanlaması kullanıcının aleyhine oldu.

> Her iki rakam da doğrudur, ama farklı sorulara cevap verir.
> TWR "yatırımlarım ne kadar iyi?", basit getiri ve XIRR "ben ne kazandım?" sorusunu yanıtlar.

**Dönemsel getiri tablosu** (1A, 3A, 6A, YB, 1Y, Tümü) TWR ile hesaplanır.
YB = geçen yılın son günündeki pay değerine göre.

## 9. Para Ağırlıklı Getiri (XIRR)

Kullanıcının para giriş-çıkış zamanlarını hesaba katan, yıllıklandırılmış iç verim oranıdır.

```
Σ  CF_i / (1 + r)^((t_i − t_0) / 365) = 0

CF: para yatırma → negatif (yatırımcının cebinden çıkar)
    para çekme   → pozitif
    dönem sonu   → toplam değer, pozitif
```

- **Çözüm yöntemi:** Newton-Raphson. Yakınsamazsa [−%99,99, +%10.000] aralığında ikiye bölme (bisection) yöntemine geçilir. Sonuçlar Excel'in `XIRR` fonksiyonuyla birebir aynı olmalıdır.
- **1 yıldan kısa dönemlerde:** Getiri **yıllıklandırılmaz**, dönemsel getiri gösterilir. Bu, GIPS performans standardının kuralıdır: kısa dönem getirisini yıllığa çevirmek yanıltıcı rakamlar üretir.
- **Örnek:**
  - 01.01.2025: −1.000
  - 01.07.2025: −500
  - 01.01.2026: +1.700 (değer)
  - Sonuç: **XIRR ≈ %16,09**

## 10. Risk Metrikleri

Tüm risk metrikleri **(iç) pay değeri serisinden** hesaplanır. Böylece para giriş/çıkışları riski
olduğundan yüksek göstermez.

```
günlükGetiri_d   = payDeğeri_d / payDeğeri_(d−1) − 1
volatilite       = std(günlükGetiri) × √k
                   k = 365 (portföyde kripto varsa), aksi halde 252
                   (yalnız hisse portföyünde piyasaların kapalı olduğu günler seriden çıkarılır)
maksimumDüşüş    = max_t ( 1 − payDeğeri_t / max_{s≤t} payDeğeri_s )
yıllıkGetiri     = (1 + TWR)^(365 / gün) − 1
sharpe           = (yıllıkGetiri − risksizFaiz) / volatilite
sortino          = (yıllıkGetiri − risksizFaiz) / aşağı yönlü sapma
beta             = kov(r_portföy, r_BIST100) / var(r_BIST100)
korelasyon       = kor(r_portföy, r_BIST100)
alpha (Jensen)   = R_p − [R_f + β × (R_m − R_f)]          (yıllık)
fazla getiri     = TWR_portföy − getiri_ölçüt               (aynı dönem)
```

- **Risksiz faiz:** Kullanıcı ayarlardan girer (ör. güncel politika faizi veya mevduat oranı). Girilmediyse %0 kabul edilir ve bu durum ekranda belirtilir.
- **Ölçüt:** Beta ve Alpha varsayılan olarak BIST 100'e göre hesaplanır, ayarlardan değiştirilebilir (S&P 500 TL, BIST 30 vb.).
- **Alpha yorumu:** Pozitif alpha, portföyün aldığı piyasa riskine göre ölçütten fazla kazandırdığını gösterir. Örnek: β = 0,5 olan bir portföy, endeks %8 kazandığında riskine göre %4 beklenir. Portföy %11,5 kazandıysa alpha ≈ +%7,5'tir.
- **Risk Değeri (1–7):** Yıllık volatiliteye göre Avrupa UCITS fon standardındaki (SRRI) bantlarla hesaplanır.

| Değer | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Yıllık volatilite | < %0,5 | %0,5–2 | %2–5 | %5–10 | %10–15 | %15–25 | ≥ %25 |

- **Yetersiz veri:** 90 günden kısa geçmişte risk metrikleri "Yetersiz veri" olarak gösterilir.

## 11. Reel Getiri

```
enflasyon[a, b] = TÜFE_b / TÜFE_a − 1
reelGetiri      = (1 + nominalGetiri) / (1 + enflasyon) − 1
```

- **Veri sıklığı:** TÜFE aylık açıklanır. Ay içi günler için iki ay arasında geometrik ara değer kullanılır.
- **Eksik ay:** Henüz açıklanmamış ay için son açıklanan aylık oran sabit varsayılır. Bu durum ekranda *"tahmini"* olarak belirtilir.

## 12. "Ya Olsaydı?" Simülasyonu

**Soru:** Portföye yaptığım her para girişini ve çıkışını, aynı tarihte ve aynı tutarda
ölçüt varlığa (ör. BIST 100) yapsaydım bugün ne olurdu?

### 12.1 Girdiler

- **Akışlar `F_i`** (tarih `t_i`, ₺ tutar), seçilen bazda:
  - **Para giriş/çıkışları** (varsayılan): `DEPOSIT` +, `WITHDRAW` −.
  - **Alım/satım tutarları:** `BUY` toplamı +, `SELL` tutarı −.
- **Dönem filtresi** (ör. 1Y): Dönem başındaki portföy değeri, dönemin ilk günü yapılmış bir para girişi gibi kabul edilir. Ardından dönem içindeki akışlar eklenir.
- **Ölçüt fiyat serisi `B(t)`**, ana para biriminde:

| Ölçüt | Seri |
|---|---|
| BIST 100 / BIST 30 | XU100 / XU030 kapanışı (₺) |
| Gram altın | Ons altın ($) × USD/TRY ÷ 31,1034768 |
| Gram gümüş | Ons gümüş ($) × USD/TRY ÷ 31,1034768 |
| S&P 500, Nasdaq 100, Russell 2000 | Endeks ($) × USD/TRY (aynı gün) |
| Bitcoin | BTC/USD × USD/TRY |
| Dolar/TL | USD/TRY |
| Euro/TL | EUR/TRY |
| TÜFE | TÜFE endeksi (günlük ara değerli) |
| Mevduat | Kullanıcının girdiği yıllık faizle günlük bileşik büyüyen sanal seri. Stopaj ayarlanabilir |

- **USD modunda:** Akışlar kendi tarihlerindeki kurla dolara çevrilir. Ölçütler de USD serisiyle çalışır.

### 12.2 Algoritma

```
pay = 0 ; gerçekleşenÇekiş = 0 ; karşılanamayan = 0
Akışları tarihe göre sırala. Her F_i için:
  fiyat = B(t_i)                         ← t_i gününün kapanışı; yoksa son geçerli kapanış
  F_i > 0 ise: pay += F_i / fiyat
  F_i < 0 ise:
      istenenPay = |F_i| / fiyat
      istenenPay > pay ise:
          karşılanamayan += (istenenPay − pay) × fiyat
          gerçekleşenÇekiş += pay × fiyat
          pay = 0
      değilse:
          pay -= istenenPay
          gerçekleşenÇekiş += |F_i|

değer(t)   = pay(t) × B(t)            ← grafik serisi
netKZ      = değer(bugün) + gerçekleşenÇekiş − Σ girişler
```

**Lig tablosu** ölçütleri **Net K/Z**'ye göre sıralar. Ölçüt, kullanıcının çektiği parayı
karşılayamadıysa (ölçüt çok değer kaybettiyse) değer sütunu tek başına yanıltıcı olur.
Net K/Z ise bu durumda da adil karşılaştırma sağlar.

### 12.3 Her Ölçüt için Hesaplanan Metrikler

| Metrik | Hesap |
|---|---|
| Bugünkü değer | `pay × B(bugün)` |
| Net K/Z ve toplam getiri | Bölüm 6 ile aynı formül |
| Yıllık getiri | Ölçütün akışlarıyla XIRR (Bölüm 9) |
| TWR | `B(son) / B(ilk akış) − 1` |
| Maksimum düşüş, volatilite, Sharpe | Ölçüt serisi üzerinden (Bölüm 10) |
| En iyi ve en kötü ay | Aylık getiriler |
| Portföye fark | Değer farkı (₺) ve yıllık getiri farkı (puan) |

### 12.4 Örnek

| Tarih | Akış | Ölçüt Fiyatı | İşlem | Ölçüt Payı |
|---|---|---|---|---|
| 01.01.2025 | +₺10.000 | 100 | 10.000 / 100 = 100 pay al | 100,0 |
| 01.04.2025 | +₺5.000 | 125 | 5.000 / 125 = 40 pay al | 140,0 |
| 01.07.2025 | −₺3.000 | 80 | 3.000 / 80 = 37,5 pay sat | 102,5 |
| 01.01.2026 (bugün) | — | 110 | — | 102,5 |

| Sonuç | Değer |
|---|---|
| Bugünkü değer | 102,5 × 110 = **₺11.275** |
| Net K/Z | 11.275 + 3.000 − 15.000 = **−₺725** |
| Ölçütün kendi getirisi (TWR) | 110 / 100 − 1 = **+%10,0** |
| Bu akışlarla yatırımcının yıllık getirisi (XIRR) | **≈ −%5,9** |

> Bu örnek, "BIST 100 bu dönemde %10 arttı" bilgisinin "aynı tarihlerde yatırsaydım kazanırdım"
> anlamına gelmediğini gösterir. Bu yüzden uygulama, basit endeks yüzdesi yerine para akışlarını
> bire bir simüle eder.

### 12.5 Bilinen Yaklaşımlar

- **Günlük kapanış:** Akışlar gün içi saatine bakılmaksızın o günün kapanışından işlenir. Piyasanın kapalı olduğu günlerde (hafta sonu, bayram) son kapanış kullanılır.
- **Kur zamanlaması:** ABD endeksleri ve USD/TRY aynı takvim gününün kapanışıyla çarpılır. Kapanış saatleri farklı olduğu için küçük bir zamanlama farkı oluşur. Bu yaklaşım ekranda bilgi notuyla belirtilir.
- **Masraflar:** Ölçütlere komisyon ve vergi uygulanmaz.
- **Temettü:** Endeksler fiyat endeksidir, temettü içermez. "Temettü dahil" ayarı açıksa, mümkün olan ölçütlerde temettüyle düzeltilmiş seri kullanılır (ör. S&P 500 için SPY düzeltilmiş kapanışı).

## 13. Bölünme, Bedelsiz ve Temettü

### 13.1 Bölünme / Bedelsiz (`SPLIT`)

`çarpan` = işlem sonrası adet / işlem öncesi adet. Örneğin %100 bedelsiz → çarpan = 2.

```
adet'      = adet × çarpan
ortalama'  = ortalama / çarpan
toplamMaliyet değişmez
FIFO'da her lotun adedi × çarpan, birim maliyeti ÷ çarpan
```

**Geçmiş değerleme tutarlılığı:** Veri kaynakları geçmiş fiyatları bölünmeye göre
**düzeltilmiş** verir. Bu yüzden geçmiş bir gündeki değer şöyle hesaplanır:

```
değer(d) = adet_ham(d) × kapanış_düzeltilmiş(d) × Π(d'den sonraki bölünme çarpanları)
```

**Otomatik tespit:** Veri kaynağındaki bölünme olayları kullanıcının işlemleriyle karşılaştırılır.
Kullanıcının elinde bulunduğu bir dönemde bölünme olmuş ama `SPLIT` kaydı yoksa şu öneri gösterilir:

> *"THYAO için 15.06.2026 tarihli %100 bedelsiz tespit edildi. Uygulansın mı?"*

Bu olmadan adet ve değer yanlış çıkar. BIST'te sık görüldüğü için **P0** önceliklidir.

### 13.2 Bedelli Sermaye Artırımı

Rüçhan fiyatından bir `BUY` işlemi olarak girilir. Veri kaynağının fiyat düzeltmesiyle
uyumsuzluk görülürse varlık detayında uyarı gösterilir.

### 13.3 Temettü (`DIVIDEND`)

- **Hesap:** Net tutar = brüt − stopaj. Net tutar nakde eklenir ve getiriye dahil olur.
- **Maliyet etkisi:** Maliyeti düşürmez. Temettü ayrı bir gelir kalemi olarak izlenir.
- **Varlık detayı:** Ek olarak "temettü dahil toplam getiri" gösterilir.

## 14. Hassasiyet ve Yuvarlama

- **Hesaplama:** Tüm para ve adet hesapları **ondalık sayı kütüphanesi** (decimal.js) ile yapılır, JavaScript'in kayan noktalı sayıları kullanılmaz. Örneğin `0,1 + 0,2 = 0,30000000000000004` hatası oluşmaz.
- **Saklama:** Veritabanında tutar ve adetler metin (TEXT) olarak, tam hassasiyetle saklanır.
- **Yuvarlama:** Yalnızca **ekranda gösterirken** yapılır. Yuvarlama kuralı: yarım yukarı (`ROUND_HALF_UP`).

| Değer | Gösterim hassasiyeti |
|---|---|
| ₺ tutarlar | 2 basamak |
| Hisse fiyatı | 2 basamak (₺1'in altındaysa 4) |
| Kripto fiyatı | Fiyata göre 2–8 basamak |
| Kripto adet | En fazla 10 basamak, sondaki sıfırlar atılır |
| Yüzdeler | 2 basamak |

## 15. Doğrulama Kuralları ve Test Senaryoları

### Değişmez Kurallar (her hesaplamada otomatik kontrol)

1. `Net K/Z = Σ gerçekleşmemiş + Σ gerçekleşen + Σ temettü − Σ ücretler`
2. Toplam K/Z, maliyet yönteminden (ortalama / FIFO) bağımsızdır.
3. Bölünme toplam maliyeti değiştirmez.
4. Otomatik para yatırma açıkken nakit hiçbir zaman negatif olmaz.
5. **Tek varlıklı portföy kuralı:** Portföy her an %100 tek bir ölçütten oluşuyorsa (ör. yalnız XU100 fonu, komisyonsuz) iki şey geçerlidir:
   - Portföyün TWR'si ölçütün getirisine eşittir.
   - "Ya Olsaydı?" o ölçüt için portföyle aynı değeri verir.

   Bu, iki motorun birbirini doğruladığı en güçlü testtir.

### Test Senaryoları

| # | Senaryo | Beklenen |
|---|---|---|
| T1 | Bölüm 4.3 örneği | Değerler tablo ile birebir |
| T2 | Bölüm 8 TWR örneği | TWR %3,125 (iç pay değeri 1,03125) |
| T3 | Bölüm 9 XIRR örneği | %16,09 (Excel ile aynı) |
| T4 | Bölüm 12.4 Ya Olsaydı örneği | Değer 11.275, Net K/Z −725 |
| T5 | Bölüm 5.2 kur ayrıştırması | 12.800 + 19.200 = 32.000 |
| T6 | Aynı gün al-sat | Gerçekleşen K/Z doğru, günlük K/Z doğru |
| T7 | Eldekinden fazla satış | Kayıt reddedilir |
| T8 | Geçmiş alışı silmek sonraki satışı geçersiz kılıyor | Uyarı, kayıt tutarlılığı korunur |
| T9 | %100 bedelsiz öncesi ve sonrası değerleme | Grafikte sıçrama yok |
| T10 | Tüm parayı çekip yıllar sonra yeniden yatırma | TWR serisi kesintisiz |
| T11 | Ölçütün karşılayamadığı çekiş | `karşılanamayan` doğru, Net K/Z adil |
| T12 | 8 ondalıklı kripto adetleri, 10.000 işlem | Kuruş hatası yok, hesap < 200 ms |
| T13 | Bayram tatili ve hafta sonu | Son geçerli kapanış kullanılır |
| T14 | USD bazlı raporlama | Akışlar tarihli kurla çevrilir |
