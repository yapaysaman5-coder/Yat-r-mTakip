# Faz 2 Test Raporu: Hesaplama Motoru

> **Tarih:** 9 Kasım 2026
> **Kapsam:** `src/domain/` (saf TypeScript, arayüzden bağımsız)
> **Şartname:** [02-HESAPLAMA-MOTORU.md](../02-HESAPLAMA-MOTORU.md)
> **Çalıştırma:** `npm run test:coverage` (GitHub'da her gönderimde otomatik çalışır)

## Özet

| | Sonuç |
|---|---|
| Hesaplama motoru testleri | **100 test, hepsi başarılı** |
| Projedeki tüm testler | **267 test, hepsi başarılı** (tema kontrastı, biçimlendiriciler ve örnek verinin motordan hatasız geçtiğini doğrulayan testler dahil) |
| Kod kapsamı (satır) | **%99,8** (hedef ≥ %95) |
| Kod kapsamı (dal / branch) | **%96,0** (hedef ≥ %90) |
| Belge senaryoları T1–T14 | **14/14 doğru sonuç** |
| T12 hız hedefi | **Tam karşılanmadı:** 10.000 işlem ~270 ms (hedef 200 ms). Ayrıntı aşağıda |
| Değişmez kurallar (1–5) | **5/5 doğrulandı** |

## Belgedeki Senaryolar

| # | Senaryo | Beklenen | Sonuç | Test |
|---|---|---|---|---|
| T1 | Ortalama maliyet ve FIFO örneği (§4.3) | 636,80 / 796,80 gerçekleşen. Toplam K/Z ikisinde de 1.055,40 | ✅ Birebir | `ledger.test.ts` |
| T2 | TWR örneği (§8) | %3,125 | ✅ | `series.test.ts` |
| T3 | XIRR örneği (§9) | %16,09 (Excel ile aynı) | ✅ %16,094 | `metrics.test.ts` |
| T4 | Ya Olsaydı örneği (§12.4) | Değer 11.275, Net K/Z −725 | ✅ | `metrics.test.ts` |
| T5 | Kur etkisi ayrıştırması (§5.2) | 12.800 + 19.200 = 32.000 | ✅ | `valuation.test.ts` |
| T6 | Aynı gün al-sat | Gerçekleşen ve günlük K/Z doğru | ✅ (4 alt durum: dünden kalan, bugün alınan, bugün al-sat, bugün satılan) | `ledger.test.ts`, `valuation.test.ts` |
| T7 | Eldekinden fazla satış | Kayıt reddedilir | ✅ `OVERSELL` uyarısı, defter tutarlı kalır | `ledger.test.ts` |
| T8 | Geçmiş alışı silmek sonraki satışı bozar | Uyarı | ✅ İlgili satış işaretlenir | `ledger.test.ts` |
| T9 | %100 bedelsiz öncesi ve sonrası | Grafikte sıçrama yok | ✅ Veri kaynağı düzeltmesiyle değer sabit kalır | `series.test.ts` |
| T10 | Hepsini çekip sonra tekrar yatırma | TWR serisi kesintisiz | ✅ | `series.test.ts` |
| T11 | Ölçütün karşılayamadığı çekiş | Eksik tutar doğru, Net K/Z adil | ✅ | `metrics.test.ts` |
| T12 | 8 ondalıklı kripto, 10.000 işlem | Kuruş hatası yok, < 200 ms | ✅ Satoshi düzeyinde tam doğru · ⚠️ süre ~270 ms | `scenarios.test.ts` |
| T13 | Hafta sonu ve bayram | Son geçerli kapanış kullanılır | ✅ | `series.test.ts` |
| T14 | USD bazlı raporlama | Akışlar kendi günlerinin kuruyla çevrilir | ✅ | `series.test.ts` |

## Değişmez Kurallar

| # | Kural | Nasıl doğrulandı |
|---|---|---|
| 1 | Net K/Z = gerçekleşmemiş + gerçekleşen + temettü − ücretler | Gerçekçi bir yıllık senaryoda **fark tam olarak 0**. 10.000 işlemde fark < 10⁻²⁰ ₺ |
| 2 | Toplam K/Z maliyet yönteminden bağımsız | Ortalama ve FIFO aynı toplamı veriyor (T1 ve yıllık senaryo) |
| 3 | Bölünme toplam maliyeti değiştirmez | İki yöntemde de test edildi |
| 4 | Otomatik para yatırma açıkken nakit eksiye düşmez | 10.000 işlemli senaryo dahil |
| 5 | %100 tek varlıklı portföy = o ölçüt | Portföy değer serisi, Ya Olsaydı simülasyonuyla her gün aynı. TWR, varlığın kendi getirisine eşit |

## Kod Kapsamı

| Dosya | İçerik | Satır | Dal |
|---|---|---|---|
| `ledger.ts` | İşlem defteri: maliyet (ortalama/FIFO), gerçekleşen K/Z, nakit, bölünme, temettü | %100 | %96,8 |
| `valuation.ts` | Değerleme, bugünkü değişim, kur etkisi, temel eşitlik | %100 | %93,3 |
| `autoRecords.ts` | Otomatik para yatırma, satış tutarını çekme | %100 | %100 |
| `series.ts` | Günlük değer serisi, bölünme düzeltmesi, USD raporlama | %100 | %95,1 |
| `twr.ts` | Zaman ağırlıklı getiri, dönemsel getiri tablosu | %100 | %92,6 |
| `metrics.ts` | XIRR, volatilite, Sharpe, Sortino, Beta, Alpha, risk seviyesi | %98,6 | %95,7 |
| `whatIf.ts` | Ya Olsaydı simülasyonu (ondalık hassasiyetli) | %100 | %91,7 |
| `inflation.ts` | TÜFE ara değeri, reel getiri | %100 | %100 |
| `splits.ts` | Kaydedilmemiş bedelsiz/bölünme tespiti | %100 | %100 |
| `validate.ts` | Alan doğrulamaları | %100 | %96,6 |
| `lttb.ts`, `order.ts`, `decimal.ts` | Grafik seyreltme, sıralama, ondalık yardımcıları | %100 | %94–100 |
| **Toplam** | | **%99,8** | **%96,0** |

## Hız (T12)

| İşlem sayısı | Süre (yeniden oynatma + değerleme) | Not |
|---|---|---|
| ~1.150 | **25–35 ms** | Gerçekçi bir kişisel portföyün birkaç yıllık geçmişi |
| ~11.100 | **265–310 ms** | Belgedeki hedef 200 ms |

- **Ölçüm ortamı:** Node.js, bu geliştirme sunucusu. Telefonda (Hermes) daha yavaş olabilir. Gerçek ölçüm Faz 3'te telefonda yapılacak.
- **Testte bulunan ve düzeltilen yavaşlık:** İlk sürüm 530 ms sürüyordu. Her satışta tüm lot listesi kopyalanıyordu, bu da işlem sayısıyla karesel büyüyordu. Düzeltilince süre 270 ms'ye indi. Lotlar artık toplam maliyet tutuyor; bu, gereksiz bölmeleri de kaldırdı ve sonuçları daha kesin yaptı.
- **Kalan farkın nedeni:** Ondalık kütüphanesinin işlem başına maliyeti. Hassasiyeti 40'tan 28 basamağa düşürmek kayda değer hız kazandırmadı, bu yüzden 40'ta kalındı.
- **Plan:** Faz 3'te günlük değerler veritabanında önbelleğe alınacak (`portfolio_snapshot`). Bir işlem eklenince sadece o tarihten sonrası yeniden hesaplanacak, tüm geçmiş her seferinde baştan oynatılmayacak. Bu yüzden 10.000 işlemlik baştan hesap, uygulamada nadiren (örneğin yedekten geri yüklemede) çalışır.

## Test Sırasında Bulunan ve Düzeltilen Konular

1. **Satış hızı:** Lot listesinin her satışta kopyalanması (yukarıda).
2. **TÜFE ay sonu:** Ayın son günü, önceki ayın endeksi olmadan hesaplanamıyordu. Ay sonu artık doğrudan o ayın endeksidir.
3. **İsim çakışması:** İki ayrı "dönem getirisi" fonksiyonu vardı. Biri `stepReturns` olarak yeniden adlandırıldı.
4. **Otomatik para yatırma tutarı:** Kur ve fiyat çarpımından ₺8.641,1101489 gibi kuruş altı tutarlar çıkıyordu. Artık bir üst kuruşa yuvarlanıyor (gerçek bir para hareketi gibi). Nakit yine eksiye düşmüyor.
5. **Önizleme açılış süresi:** Analiz ekranının örnek verisi uygulama açılırken 2,1 saniye hesaplanıyordu (ölçüt eğrileri için ondalıklı simülasyon 600 kez çalışıyordu). Kurgusal ölçüt eğrileri artık sade sayılarla ayarlanıyor ve sadece para giriş-çıkış günleri hesaplanıyor. Örnek verinin tamamı artık ~100 ms. Gerçek "Ya Olsaydı?" hesabı ondalıklı motorda kalıyor.
6. **Test beklentisi hataları:** Dört testte yanlış olan **benim yazdığım beklenen değerlerdi**, motor değildi; elle hesap yapılıp düzeltildi. Örnek: 2001 × 32 × 6/10 = 38.419,2.

## Motorun Kapsadıkları

- **İşlem türleri:** Alış, satış, para yatırma, para çekme, temettü (stopajlı), hesap ücreti, bölünme/bedelsiz.
- **Maliyet yöntemleri:** Ağırlıklı ortalama ve FIFO. Pozisyon tamamen kapanınca maliyet kuruşu kuruşuna sıfırlanır.
- **Kur:** Her işlem kendi kuruyla TL'ye çevrilir. Kâr fiyat etkisi ve kur etkisi olarak ayrışır.
- **Otomatik kayıtlar:** Nakit yetmezse otomatik para yatırma, istenirse satış tutarını çekme. Her değişiklikten sonra yeniden üretilir.
- **Kontroller:** Fazla satış ve eksi nakit uyarıları, alan doğrulamaları (Türkçe arayüz mesajları Faz 6'da).
- **Hesaplar:** Günlük değer serisi, TWR, XIRR, Alpha/Beta/Sharpe/Sortino, dönemsel getiri, reel getiri, Ya Olsaydı.

## Uygulamadaki Karşılığı

Önizleme ekranları artık elle yazılmış rakamlar yerine bu motoru kullanıyor:

1. Örnek bir 2 yıllık işlem geçmişi motordan geçer: 7 varlık, alım-satım, temettü, hesap ücreti, para giriş-çıkışı.
2. Bu geçmişten şunlar hesaplanır:
   - **Portföy:** Canlı Bütçe, bugünkü değişim, varlık listesi
   - **Hesabım:** maliyet, açık K/Z, nakit, dönemsel getiri
   - **Geçmiş:** gerçekleşen K/Z yüzdeleriyle işlem listesi
   - **Analiz:** TWR, XIRR, Alpha, Beta, Ya Olsaydı?
3. Ayrı bir test, örnek verinin motordan uyarısız geçtiğini, hesapların denk olduğunu ve grafiğin son noktasının ana ekrandaki toplamla aynı olduğunu doğrular.

