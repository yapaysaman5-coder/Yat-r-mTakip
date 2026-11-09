# Faz 8 Test Raporu: Fon (Hesabım)

> **Tarih:** 9 Kasım 2026
> **Kapsam:** Hesabım ekranı (`src/app/(tabs)/fon.tsx`), halka grafik (`src/ui/charts/Donut.tsx`)

## Özet

| | Sonuç |
|---|---|
| Projedeki tüm testler | **372 test** (368 başarılı, 4 canlı test CI'da atlanır) |
| Tip kontrolü, lint, biçim | Temiz |
| Bitiş kriteri | ✅ Tarayıcı önizlemesinde örnek portföyle denendi ([görsel](../onizleme/faz8/1-hesabim.jpg)) |

Bu fazda yeni hesap yok: ekran, ana ekranın ve Faz 7'nin test edilmiş rakamlarını (toplam değer,
maliyet, açık K/Z, bugün, dönemsel TWR, risk seviyesi) gösteriyor. Yeni olan, aşağıdaki
etkileşimler ve iki yeni türetilmiş rakam:

- **Başa baş fiyatı:** Varlığın bugünkü kurla maliyetini çıkaracağı fiyat (TL maliyet ÷ adet ÷
  bugünkü kur). TL varlıklarda ortalama maliyete eşittir. ABD varlıklarında kur yükseldiyse daha
  düşüktür. Örnek: AAPL'de ortalama maliyet $232,81, kur arttığı için başa baş $198,31.
- **Maliyet-değer çubukları:** Her varlıkta iki çubuk (maliyet gri, değer yeşil/kırmızı), tüm
  listede ortak ölçekle.

## Tarayıcı Önizlemesinde Denenen Akış

1. **Üst kart:** Toplam varlık ₺1.435.284,81; maliyet ₺1.164.330 (pozisyonlar + nakit); açık K/Z
   +₺270.954 (%23,27); bugün +₺12.383; risk 6/7.
2. **VARLIK:** Halka değer payına göre: BIST %42,2, ABD %29,9, Kripto %15,8, Nakit %12,1. Satırlarda
   fiyat, maliyet, pay ve K/Z %.
3. **Dilime dokunma:** BIST dilimine dokununca öteki dilimler soldu, liste THYAO, ASELS ve TUPRS'e
   indi; üstte "BIST" süzgeci, dokununca kalkıyor. Sağdaki piyasa adlarına dokunmak da aynı işi yapıyor.
4. **MALİYET:** Halka dilimleri maliyet paylarına aktı (BIST %43,1, ABD %27,3, Kripto %14,7, Nakit
   %14,9); ortadaki toplam ₺1,44 Mn'den ₺1,19 Mn'ye kayarak geçti. Satırlarda ortalama maliyet,
   başa baş, maliyet payı ve karşılaştırma çubukları; TUPRS'ün değer çubuğu kırmızı (−%15,7).
5. **Satıra dokunma:** Varlık detayına gidiyor.
6. **Dönemsel getiri ve yoğunlaşma:** 1A, 3A, 6A, YB, 1Y, Tümü (TWR); en büyük 5 pozisyonun payı.

## Test Sırasında Bulunan ve Düzeltilen Konu

| Konu | Düzeltme |
|---|---|
| Web'de dilime dokunma algılanmıyordu (dokunma konumu, tıklanan SVG parçasına göre geliyordu) | Konum, halkanın ekrandaki yerine göre sayfa koordinatlarından hesaplanıyor |
