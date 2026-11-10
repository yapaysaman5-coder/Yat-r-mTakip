# Faz 10 Test Raporu: Ayarlar, Güvenlik ve Cila

> **Tarih:** 10 Kasım 2026
> **Kapsam:** Ayarlar (`src/app/ayarlar`), kilit ve ekran koruması (`src/components/AppLock.tsx`,
> `src/lib/security.ts`), ilk açılış (`src/app/hosgeldin.tsx`, `src/components/FirstRun.tsx`),
> portföy yönetimi (`src/data/service/portfolios.ts`), CSV (`src/data/view/csv.ts`), hesap ücreti formu

## Özet

| | Sonuç |
|---|---|
| Yeni testler | **6 test**: ayarlanabilir komisyonlar, CSV, portföy ekle/yeniden adlandır/sil (3), ilk açılış kararı |
| Projedeki tüm testler | **392 test** (388 başarılı, 4 canlı test CI'da atlanır) |
| Tip kontrolü, lint, biçim | Temiz |
| Telefonda denenecekler | Parmak izi / yüz kilidi, otomatik kilit süresi, ekran koruması (web'de bu özellikler yok) |

## Birim Testleri

| Test | Beklenen | Sonuç |
|---|---|---|
| Komisyon ayarı | BIST ‰1,5 → ₺10.000'de ₺15; ABD $0,5; kripto %0,075 → ₺7,5. Formdaki yazı "‰1,5 otomatik" | ✅ |
| CSV | Türkçe Excel için ";" ve ondalık virgül, BOM; en eski kayıt önce; komisyon, stopaj, nakde etkisi, gerçekleşen K/Z sütunları; dosya adı `yatirim-takip-ana-islemler-2026-11-09.csv` | ✅ |
| Portföy ekleme | Ad boşlukları temizlenir; aynı ad (büyük/küçük harf ve Türkçe harf farkı gözetmeden) reddedilir | ✅ |
| Yeniden adlandırma | Boş veya alınmış ad reddedilir | ✅ |
| Silme | Kayıtlarıyla birlikte silinir; son kendi portföyü silinemez; örnek portföy sayılmaz | ✅ |
| İlk açılış | Kendi portföyünde kaydı olan (eski sürümden gelen) kişi karşılama ekranını görmez | ✅ |

## Ayarlar

| Grup | Ne var |
|---|---|
| **Hesaplama** | Maliyet yöntemi: ağırlıklı ortalama / FIFO (değiştirince her şey yeniden hesaplanır). Varsayılan komisyonlar. Risksiz faiz (Sharpe, Sortino, Alpha). Mevduat faizi |
| **Güvenlik ve gizlilik** | Uygulama kilidi (parmak izi / yüz, yedek olarak telefon şifresi). Otomatik kilit: hemen / 1 dk / 5 dk. Tutarları gizli aç. Ekran koruması (ekran görüntüsü engeli, uygulama değiştiricide boş kart) |
| **Portföyler** | Ekle, yeniden adlandır, sil (onaylı), seç. Ana ekrandaki portföy seçicide "Portföyleri yönet" |
| **Veri ve Yedekleme** | Yeni: işlemleri CSV olarak dışa aktar |
| **Hakkında** | Sürüm, veri kaynakları ve gecikmeler, gizlilik, yasal uyarı, açık kaynak lisansları |

**Kilit tasarımı:**
- Kilidi açmak için önce bir kez doğrulama istenir; böylece kimse kendini dışarıda bırakmaz.
- Her açılış kilitli başlar. Arka plandan dönüşte, seçilen süre geçmişse yeniden kilitlenir.
- Telefonda ekran kilidi yoksa kilit açılmaz ve nedeni yazılır.

## Tarayıcı Önizlemesinde Denenen Akış

[Görsel 1](../onizleme/faz10/1-ilk-acilis.jpg), [2](../onizleme/faz10/2-ayarlar.jpg), [3](../onizleme/faz10/3-portfoy-ucret-hakkinda.jpg):

1. **İlk açılış:** Boş tarayıcıda uygulama karşılama ekranıyla açıldı.
   - Gün temasına dokununca ekran anında açık temaya döndü.
   - Portföy adı adımında "Örnek portföyle keşfet" seçildi; ana ekrana geçildi ve karşılama bir daha gösterilmedi.
2. **Ayarlar:** "Yakında" grubunun yerinde Portföyler, Hesaplama, Güvenlik ve gizlilik var. Sonraki sürümlere kalanlar ayrı grupta.
3. **Hesaplama:** Ortalama/FIFO seçimi, komisyon ve oran alanları.
4. **Portföyler:** "Uzun Vade" eklendi ve seçili oldu.
5. **Hesap ücreti:** Nakit formunda üçüncü seçenek "Ücret". Hesap ücreti kayıtları artık düzenlenebiliyor.

## Bilinen Sınırlar ve Sonraya Kalanlar

- **Yatay tam ekran grafik ve mum grafik:** Mum grafik için açılış, en yüksek ve en düşük fiyatlar gerekir; uygulama şu an yalnız kapanışı saklıyor. Bu, şema değişikliği ve yeni indirme gerektirdiği için sonraki sürüme kaldı.
- **İskelet (yükleniyor) animasyonları:** Ekranlar telefondaki kayıtlı verilerden anında açıldığı için ayrıca eklenmedi.
- **Ana para birimini dolar yapma, bildirimler, CSV'den içe aktarma, ekstreyi PDF olarak paylaşma:** Sonraki sürümler.
- **Otomatik para girişi kapatılamıyor:** Geçmiş alışların tutarlılığı buna bağlı (karar 47).
