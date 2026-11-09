# Faz 9 Test Raporu: Analiz

> **Tarih:** 9 Kasım 2026
> **Kapsam:** Analiz sekmesi (`src/app/(tabs)/analiz.tsx`, `src/components/analysis`), TÜFE kaynağı
> (`src/data/market/providers/tcmbCpi.ts`), mevduat ölçütü (`src/data/service/load.ts`), seçenekli
> "Ya Olsaydı?" (`src/data/view/analysisView.ts`), dağılım ve performans ekleri (`src/data/view/insightsView.ts`)

## Özet

| | Sonuç |
|---|---|
| Yeni testler | **14 test**: TÜFE (5), "Ya Olsaydı?" seçenekleri (3), düşüş, varlık sonuçları, yoğunlaşma, dağılım, sektör, ısı haritası yerleşimi (6) |
| Projedeki tüm testler | **386 test** (382 başarılı, 4 canlı test CI'da atlanır) |
| Canlı test (gerçek kaynaklar) | ✅ TÜFE dahil 14 enstrümanın geçmişi hatasız indi |
| Tip kontrolü, lint, biçim | Temiz |

## Ölçütler

12 ölçütün hepsi artık gerçek veriyle çalışıyor:

| Ölçüt | Kaynak |
|---|---|
| BIST 100, BIST 30, S&P 500, Nasdaq 100, Russell 2000, Bitcoin, Gram Altın, Gram Gümüş, Dolar/TL, Euro/TL | Faz 4'teki kaynaklar |
| **TÜFE (yeni)** | TCMB "Tüketici Fiyatları" sayfası: TÜİK aylık ve yıllık değişimleri, Ocak 2005'ten bugüne |
| **Mevduat (yeni)** | Kişinin girdiği yıllık net faiz (varsayılan %40), günlük bileşik |

| TÜFE testi | Beklenen | Sonuç |
|---|---|---|
| Tablo okuma (kayıtlı gerçek sayfa) | 262 ay; ilk Ocak 2005 (aylık %0,55, yıllık %9,24), son Ekim 2026 (aylık %2,58, yıllık %29,77) | ✅ |
| Zincirleme | Son 12 ayın aylık değişimleri çarpılınca yayımlanan yıllık %29,77 (iki ondalık yuvarlama payıyla) | ✅ |
| Günlere yayma | Ekim boyunca tam %2,58; ayın ortasında geometrik yarısı; Kasım yayımlanmadığı için sabit | ✅ |
| Hatalı sayfa | Tablo yoksa veya bir ay eksikse veri kabul edilmez | ✅ |
| Yeni yayın | Son iki ay her yenilemede yeniden indirilir: sabit tutulan günler yeni rakamla düzelir | ✅ |

## "Ya Olsaydı?" Seçenekleri

| Test | Beklenen | Sonuç |
|---|---|---|
| Dolar ile | Her tutar o günün Dolar/TL kuruyla dolara çevrilir. "Dolar/TL" seçeneği dolarda düz kalır ve değeri, dolar olarak yatırılan paraya eşit olur | ✅ |
| Alım/satımlar | Yatırılan = alışlar − satışlar; portföy tarafı yalnızca pozisyonlar (nakit hariç) | ✅ |
| Dolar/TL geçmişi yoksa | TL'ye döner, uyarı gösterir | ✅ |

## Performans ve Dağılım

| Test | Beklenen | Sonuç |
|---|---|---|
| Düşüş | 1 → 1,2 → 0,9 → 1,3 → 1,17: −%25, sonra −%10 | ✅ |
| Varlık sonuçları | Her varlıkta gerçekleşmemiş + gerçekleşen + temettü; satılmış varlıklar dahil. Toplam − hesap ücretleri = Net K/Z | ✅ |
| Yoğunlaşma | Örnek portföyde en büyük THYAO %21,8, ilk 3 %51,7 → uyarı yok. Tek varlık %78 olunca uyarı | ✅ |
| Dağılım | Piyasa, para birimi ve sektör dilimlerinin toplamı = toplam değer | ✅ |
| Sektörler | ASELS → Savunma, NVDA → Teknoloji, QQQ → Endeks fonu, BTC → Kripto | ✅ |
| Isı haritası yerleşimi | Her kutunun alanı değeriyle orantılı, kutular çerçeveden taşmıyor | ✅ |

## Tarayıcı Önizlemesinde Denenen Akış

Örnek portföy, kurgusal fiyatlar ([1](../onizleme/faz9/1-ya-olsaydi.jpg), [2](../onizleme/faz9/2-performans.jpg), [3](../onizleme/faz9/3-dagilim.jpg)):

1. **Ya Olsaydı ayarları:** Para birimi (₺ TL / $ Dolar), karşılaştırma (para giriş/çıkışı / alım/satımlar), mevduat faizi (yıllık net %40, dokununca değişir).
2. **Dolar ile:** Grafik ve tutarlar dolara döndü, eksen "$30 B" gibi.
3. **Lig tablosu:** Bitcoin, Gram Altın ve Mevduat öndeydi; Portföyüm 4. sırada. Satıra dokununca ölçüt detayı açıldı. Örneğin Gram Altın: bugünkü değer ₺1.519.078, portföye göre +₺83.793, getiri %36,0, en büyük düşüş −%12,8, yıllık oynaklık %17,9.
4. **Performans:** Düşüş grafiği (en derin −%10,1, 30.04.2025; şu an zirvenin %4,6 altında). En çok kazandıranlar NVDA ve THYAO, kaybettirenler TUPRS ve ETH. Net K/Z'nin kaynakları ve yoğunlaşma kartı da burada.
5. **Aylık getiri haritası:** Ekim 2026'ya dokununca ay dökümü açıldı: −₺20.000 çekiş, piyasa K/Z, −%5,86.
6. **Dağılım:** Isı haritasında kutu büyüklüğü değer, renk bugünkü değişim; "Toplam"a geçince maliyete göre değişim. Piyasa (BIST %42, ABD %30, Kripto %16, Nakit %12), para birimi (TL %54, dolar %46) ve sektör (Teknoloji %29,9, Havayolları %21,8…).

## Test Sırasında Bulunan ve Düzeltilen Konular

| Konu | Düzeltme |
|---|---|
| Biçimlendirici, testteki kayıtlı HTML sayfasını değiştirmeye çalıştı | Test kayıtları biçimlendirme dışında bırakıldı; sayfa birebir korunuyor |
| TÜFE gerekli olunca eski bir test "TÜFE yok" bekliyordu | Beklenti yeni davranışa göre güncellendi; mevduat serisi de doğrulanıyor |
| Isı haritasındaki Bugün/Toplam düğmesi sıkışıktı, "En büyük" etiketi kesiliyordu | Düğmeye genişlik verildi; sembol ayrı satıra alındı |

## Bilinen Sınırlar

- **Mevduat:** Gerçek mevduat vadeye göre faiz öder; burada günlük bileşik eşdeğeri kullanılıyor. Faiz oranı tek, dönem boyunca sabit.
- **Temettü dahil endeksler:** Endeks serileri fiyat endeksi; temettü dahil (toplam getiri) seri yok.
- **Sektör:** Katalog dışı ABD hisseleri "Diğer (ABD)" olarak görünür.
