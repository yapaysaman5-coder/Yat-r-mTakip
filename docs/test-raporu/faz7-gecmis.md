# Faz 7 Test Raporu: Geçmiş

> **Tarih:** 9 Kasım 2026
> **Kapsam:** Geçmiş sekmesi (`src/app/(tabs)/gecmis.tsx`, `src/components/history`), hesaplar
> (`src/data/view/historyView.ts`)

## Özet

| | Sonuç |
|---|---|
| Yeni testler | **5 test** (gerçekleşen K/Z, elde tutma süresi, nakit toplamları, aylık ekstre, örnek portföyde tutarlılık) |
| Projedeki tüm testler | **372 test** (368 başarılı, 4 canlı test CI'da atlanır) |
| Tip kontrolü, lint, biçim | Temiz |
| Bitiş kriteri | ✅ Dört alt sekme tarayıcı önizlemesinde örnek portföyle denendi (aşağıda) |

## Elle Kontrol Edilen Örnek

TL, komisyonsuz bir portföy, rakamlar kâğıt üzerinde hesaplandı:

| Tarih | Kayıt |
|---|---|
| 01.09 | +₺10.000 para girişi |
| 02.09 | 50 THYAO alış, ₺100 |
| 15.10 | 20 THYAO satış, ₺120 |
| 20.10 | ₺300 temettü, ₺45 stopaj |
| 03.11 | ₺1.000 para çekme |
| 04.11 | ₺50 hesap ücreti |
| 05.11 | 10 THYAO satış, ₺90 |

Kapanışlar: 02.09 ₺100 · 30.09 ₺110 · 15.10 ₺120 · 31.10 ₺120 · 09.11 ₺130.

| Test | Beklenen | Sonuç |
|---|---|---|
| Gerçekleşen K/Z | 15.10 satışı: maliyet ₺2.000, satış ₺2.400, +₺400 (%20), 43 gün. 05.11 satışı: −₺100 | ✅ |
| Toplam ve başarı oranı | +₺300; 1 kazanan, 1 kaybeden, %50 | ✅ |
| Nakit toplamları | Yatırılan ₺10.000; çekilen ₺1.000; temettü net ₺255, stopaj ₺45; hesap ücreti ₺50; net yatırılan ₺9.000 | ✅ |
| Eylül ekstresi | Ay başı 0, giren ₺10.000, ay sonu ₺10.500, piyasa +₺500, getiri %5 | ✅ |
| Ekim ekstresi | Ay başı ₺10.500, ay sonu ₺11.255 (30 × ₺120 + ₺7.655 nakit), piyasa +₺755 (temettü dahil), gerçekleşen +₺400 | ✅ |
| Kasım ekstresi (sürüyor) | Ay başı ₺11.255, çıkan ₺1.000, ücret ₺50, bugünkü değer ₺10.105, piyasa −₺150 | ✅ |
| Elde tutma süresi yazısı | aynı gün · 12 gün · 3 ay · 1 yıl 1 ay · 2 yıl | ✅ |

## Örnek Portföyde Tutarlılık

Örnek portföy (Ocak 2025'ten bugüne, 23 ay) üzerinde:

- Her ayın açılışı bir önceki ayın kapanışına eşit.
- Her ayda: ay sonu = ay başı + giren − çıkan + piyasa K/Z.
- Tüm ayların giren − çıkan toplamı = net yatırılan.
- Tüm ayların piyasa K/Z toplamı = Net K/Z (ana ekrandaki).
- Aylık getiriler birbirine çarpılınca tüm dönemin zaman ağırlıklı getirisi çıkıyor.
- Gerçekleşen K/Z, yatırılan, çekilen, temettü, komisyon ve hesap ücreti toplamları ana ekranın Canlı Bütçe rakamlarıyla aynı.

## Tarayıcı Önizlemesinde Denenen Akış

Örnek portföy, kurgusal fiyatlar ([görsel 1](../onizleme/faz7/1-islemler.jpg), [görsel 2](../onizleme/faz7/2-kz-nakit-ekstre.jpg)):

1. **İşlemler:** Kayıtlar ay ay gruplanmış, her ayın nakde etkisi başlıkta.
2. **Kaydırma:** Sola çekince Sil, sağa çekince Düzenle çıktı. Otomatik kayıtlar kaydırılamaz, yalnızca ayrıntısı açılır.
3. **Arama:** "thyao" yazılınca yalnız THYAO kayıtları (alış, temettü) kaldı.
4. **Filtre:** Kripto + Bu yıl → "1 kayıt gösteriliyor" (Şubat'taki BTC satışı). Seçilen filtreler listenin üstünde, tek dokunuşla kaldırılabilir.
5. **K/Z:** +₺7.034,76 (%15,71), 2 kazanan / 0 kaybeden, ortalama elde tutma 11 ay; yıl seçimi.
6. **Nakit:** Net yatırılan ₺1.150.555,37 ve zaman içindeki basamak grafiği. Yatırılanın ₺30.873'ü otomatik, temettüden ₺924 stopaj kesilmiş. Altında yıllara göre tablo ve tüm hareketler.
7. **Ekstre:** 2026 yıl getirisi %22,89. Kasım "sürüyor" olarak işaretli. Ekim'e dokununca: ay başı ₺1.463.439,12, çıkan ₺20.000, piyasa −₺89.350,60, ay sonu ₺1.354.088,53, getiri −%6,15 ve ayın kayıtları.

## Bilinen Sınırlar

- Ekstreyi PDF olarak paylaşma P2'de (doküman §6.5).
- Hesap ücreti kaydını düzenleme formu Faz 10'da; şimdilik silinip yeniden girilebilir.
- Ay detayındaki kayıtlara dokununca ayrıntı açılmıyor; ayrıntı İşlemler listesinden açılır.
