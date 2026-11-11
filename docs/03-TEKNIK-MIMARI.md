# Teknik Mimari

> Ana doküman: [01-PROJE-DOKUMANI.md](01-PROJE-DOKUMANI.md) · Formüller: [02-HESAPLAMA-MOTORU.md](02-HESAPLAMA-MOTORU.md)

## İçindekiler

1. [Platform Seçimi](#1-platform-seçimi)
2. [Kütüphaneler](#2-kütüphaneler)
3. [Katmanlı Mimari](#3-katmanlı-mimari)
4. [Klasör Yapısı](#4-klasör-yapısı)
5. [Veri Modeli (SQLite)](#5-veri-modeli-sqlite)
6. [Piyasa Veri Kaynakları](#6-piyasa-veri-kaynakları)
7. [Canlı Güncelleme Mekanizması](#7-canlı-güncelleme-mekanizması)
8. [Performans Stratejisi](#8-performans-stratejisi)
9. [Güvenlik](#9-güvenlik)
10. [Test Stratejisi](#10-test-stratejisi)
11. [Geliştirme, Önizleme ve Dağıtım](#11-geliştirme-önizleme-ve-dağıtım)
12. [Kod Standartları](#12-kod-standartları)

---

## 1. Platform Seçimi

| Seçenek | Artıları | Eksileri | Karar |
|---|---|---|---|
| **Expo (React Native) + TypeScript** | Tek kodla iOS ve Android. Telefonda QR kodla anında test (Expo Go). Skia ile GPU grafik. Mağazaya girmeden güncelleme (OTA). Geniş ekosistem | Widget gibi bazı yerel özellikler için ayrı derleme gerekir | ✅ **Seçildi** |
| Flutter | Çok iyi performans, güçlü grafik | Dart ekosistemi daha dar. Web önizlemeyle ekran doğrulaması daha zahmetli | Alternatif |
| PWA (web uygulaması) | Kurulumsuz | Face ID, titreşim ve arka plan yetenekleri zayıf. "Gerçek uygulama" hissi vermez | ✗ |
| Yerel (Swift + Kotlin) | En iyi platform uyumu | İki ayrı kod tabanı, iki kat süre | ✗ |

**Sürüm:** Expo SDK 58 (React Native 0.88, Yeni Mimari varsayılan). Kasım 2026 itibarıyla en
güncel kararlı sürüm.

**Expo Go uyumluluğu:** Mümkün olduğunca uzun süre yalnızca Expo Go'da çalışan modüller
kullanılacak. Böylece uygulamayı telefonunuzda QR kodla, derleme beklemeden deneyebilirsiniz.
Widget ve veritabanı şifrelemesi gibi özellikler yayın hazırlığı fazında "geliştirme derlemesi"ne
geçilince eklenecek.

## 2. Kütüphaneler

Sürümler 8 Kasım 2026'da npm'den kontrol edilmiştir. Yerel modüller `npx expo install` ile SDK
58'e uygun sürümlere sabitlenir. ✅ işaretliler Faz 1'de kuruldu, diğerleri ilgili fazda eklenecek.

| Amaç | Kütüphane | Sürüm |
|---|---|---|
| Çatı ✅ | `expo` (React Native 0.88, React 19.3) | 58.0.x |
| Gezinme (dosya tabanlı, alt bar) ✅ | `expo-router` | 58.x |
| GPU çizim (FinChart, Faz 5) | `@shopify/react-native-skia` | 2.14 |
| Statik grafikler ve simgeler ✅ | `react-native-svg` | 15.16 |
| Grafik ölçek ve eğri hesapları | Kendi `monotonePath` yardımcımız ✅, gerekirse `d3-scale` | — |
| Animasyon (UI iş parçacığında) ✅ | `react-native-reanimated` + `react-native-worklets` | 4.7 / 0.13 |
| Dokunma hareketleri, kaydırmalı satır ✅ | `react-native-gesture-handler` (v3 kanca API'si) | 3.3 |
| Yüksek performanslı liste | `@shopify/flash-list` | 2.3 |
| Alt sayfa (bottom sheet) ✅ | Kendi `Sheet` bileşenimiz (Reanimated + Gesture Handler v3) | — |
| Degrade ✅ | `expo-linear-gradient` | SDK 58 |
| Yerel veritabanı ✅ | `expo-sqlite` (ayarlar için `kv-store`), ince SQL katmanı (bkz. §5) | SDK 58 |
| Uygulama durumu ✅ | `zustand` (kalıcı ayarlar) | 5.1 |
| Ağ verisi önbelleği | `@tanstack/react-query` | 5.x |
| Hassas ondalık hesap ✅ | `decimal.js` | 10.6 |
| Tarih | `date-fns` (tr yerel ayarı) | 4.4 |
| Titreşim ✅ | `expo-haptics` | SDK 58 |
| Face ID / parmak izi | `expo-local-authentication` | SDK 58 |
| Güvenli anahtar deposu | `expo-secure-store` | SDK 58 |
| Ekran görüntüsü engeli | `expo-screen-capture` | SDK 58 |
| Bulanıklaştırma | `expo-blur` | SDK 58 |
| Dosya, paylaşma, belge seçici ✅ | `expo-file-system`, `expo-sharing`, `expo-document-picker` (yedekleme) | SDK 58 |
| Yazı tipi ✅ | `@expo-google-fonts/inter` (Inter 400–800, eşit genişlikli rakamlar) | 0.4 |
| Simgeler ✅ | `lucide-react-native` | 1.70 |
| Test ✅ | `jest`, `jest-expo`, `@testing-library/react-native` | 30 / 58 |
| Kod kalitesi ✅ | `eslint` + `eslint-config-expo`, `prettier` | 9 / 3 |

**Grafik kararı:** Bakiye grafiği uygulamanın imza öğesi olduğu için hazır bir grafik kütüphanesi
yerine **kendi grafik bileşenimiz (`FinChart`)** yazıldı. Bunu gerektiren
özellikler: net yatırılan çizgisi, para akışı işaretleri, iki parmakla ölçüm, şekil dönüşümü
animasyonu, ölçüt katmanı. Tam kontrol ancak kendi bileşenimizle mümkün.

**Faz 1 notu:** Önizleme ekranlarındaki statik grafikler (alan, çoklu çizgi, mini trend, halka)
`react-native-svg` ile çizildi. Mini trend ve halka grafik bu haliyle kalır. Ana ekrandaki büyük
grafik Faz 5'te parmakla gezinilen FinChart ile değiştirildi.

**FinChart (Faz 5):** Skia yerine `react-native-svg` + Reanimated ile yazıldı. Neden: çizgi her
aralıkta 96 noktaya örneklenir; bu boyutta SVG yolu UI iş parçacığında (worklet) üretilip
`animatedProps` ile verilebiliyor. Böylece şekil dönüşümü JavaScript'i beklemeden çalışıyor, web
önizlemesi de aynı kodla çiziliyor ve Skia'nın yerel kütüphanesi uygulamaya eklenmiyor.
Dokunuşlar Gesture Handler'ın `onTouchesMove` olayından okunuyor (tek parmak okuma, iki parmak
ölçüm); yalnızca gösterilen gün değişince JavaScript'e haber veriliyor. Telefonda akıcılık
yetersiz kalırsa aynı arayüzle Skia'ya geçilebilir.

**Karşılaştırma grafiği (Faz 1.1):** Analiz ekranındaki `ComparisonChart` `react-native-svg` +
Gesture Handler v3 ile yazıldı. Özellikleri: dokun-kaydır imleç, sıralı bilgi kutusu, sıkı değer
ekseni, tarih ekseni, ızgara, referans çizgisi. Çizgiler en fazla 140 noktaya seyreltilir.
İmleç yalnızca tarih değiştiğinde yeniden çizilir. Android'de akıcılık telefonda doğrulanacak.
Gerekirse aynı arayüzle Skia'ya taşınır.

**Alt sayfa kararı:** `@gorhom/bottom-sheet`'in Gesture Handler v3 ile uyumu belirsiz olduğu için
alt sayfa kendi bileşenimiz olarak yazıldı. Özellikleri: yay animasyonu, aşağı çekerek kapatma,
Android geri tuşu desteği.

## 3. Katmanlı Mimari

```
┌──────────────────────────────────────────┐
│ ARAYÜZ   app/ (ekranlar) · src/ui/       │
├──────────────────────────────────────────┤
│ DURUM    hooks · Zustand · React Query   │
├──────────────────────────────────────────┤
│ ALAN (DOMAIN): saf TypeScript            │
│ pozisyon · K/Z · nakit · TWR · XIRR ·    │
│ risk · ya-olsaydı · seri üretimi         │
├────────────────────┬─────────────────────┤
│ KALICILIK          │ PİYASA VERİSİ       │
│ SQLite + Drizzle   │ Sağlayıcı adaptörü  │
│ Repository'ler     │ + önbellek + akış   │
└────────────────────┴─────────────────────┘
```

- **Alan katmanının** React Native'e hiçbir bağımlılığı yoktur. Girdi olarak işlem listesi ve fiyat serisi alır, sonuç döndürür. Bu sayede binlerce test saniyeler içinde çalışır ve hesaplar arayüzden bağımsız doğrulanır.
- **Piyasa verisi** tek bir arayüz (`MarketDataProvider`) üzerinden alınır. Kaynak değişirse yalnızca adaptör değişir.
- **Ekranlar** hesap yapmaz. Hazır sonuçları gösterir.

## 4. Klasör Yapısı

✅ = oluşturuldu (Faz 1–3).

```
src/
  app/                       expo-router ekranları
    _layout.tsx              yazı tipleri, tema, sağlayıcılar ✅
    (tabs)/_layout.tsx       yüzen alt bar, orta ＋ tuşu ✅
    (tabs)/index.tsx         Portföy ✅
    (tabs)/analiz.tsx        Analiz ✅
    (tabs)/fon.tsx           Fon (Hesabım) ✅
    (tabs)/gecmis.tsx        Geçmiş ✅
    ayarlar/index.tsx        Ayarlar ✅
    ayarlar/gorunum.tsx      Tema seçimi ✅
    ayarlar/vitrin.tsx       Tasarım vitrini ✅
    ayarlar/veri.tsx         Veri ve Yedekleme ✅
    ayarlar/kaynaklar.tsx    Veri Kaynakları ✅
    piyasalar.tsx            Piyasalar (izleme listesi, arama) ✅
    varlik/[id].tsx          Varlık detay ✅
    islem/nakit.tsx          Para Yatır / Para Çek formu ✅
    islem/al-sat.tsx         Al / Sat formu ✅
    islem/temettu.tsx        Temettü formu ✅
    islem/bolunme.tsx        Bölünme / bedelsiz formu ✅
    kilit.tsx                Kilit ekranı (Faz 10)
    baslangic/               İlk açılış akışı (Faz 10)
  components/                uygulamaya özel parçalar ✅
                             (TabBar, QuickActionSheet, HoldingRow, PreviewNote,
                             PortfolioSheet, TxnDetailSheet, EmptyPortfolio, MarketTicker,
                             form/: AssetPicker, DateChoice)
  ui/                        tasarım sistemi bileşenleri ✅
  ui/charts/                 AreaChart, LineChart, Sparkline, Donut, path ✅
  theme/                     types, themes, tokens, ThemeProvider, contrast ✅
  state/                     Zustand store'ları (settings ✅, portfolio ✅: aktif portföy görünümü,
                             market ✅: canlı döngü, izleme listesi, çevrimdışı durumu)
  lib/                       storage (kalıcı ayarlar), haptics, backupFile (paylaş/seç) ✅
  i18n/tr.ts                 arayüz metinleri ✅ (rejections.ts: reddedilen değişikliklerin açıklaması)
  utils/format.ts            Türkçe biçimlendiriciler ✅
  domain/                    hesaplama motoru + testler ✅ (Faz 2)
                             ledger · valuation · autoRecords · series · twr · metrics
                             whatIf · inflation · splits · validate · lttb · decimal
  data/                      veri katmanı ✅ (Faz 3)
    db/                      SQL sürücüsü (expo-sqlite; testte Node SQLite), migration'lar
    repo/                    portfolios · assets · transactions · prices · snapshots
    service/                 kayıt kaydet/sil (kontrollü) · değer önbelleği · yükleme ·
                             yedek · bakım (istatistik, tümünü sil, hız testi)
    demo/                    örnek portföy: kurgusal piyasa, geçmiş, ölçütler, yazma
    view/                    ekran modeli (saf): özet, varlıklar, geçmiş, grafik, analiz
    trade.ts                 işlem formu: komisyon, saat, ön izleme (geçmişi yeniden oynatarak)
  data/market/               piyasa verisi ✅ (Faz 4): providers/ (yahoo · binance · coingecko ·
                             isyatirim · tcmb · mock) · instruments · router · session ·
                             search + catalog/ (BIST, kripto, ABD) · http
  hooks/                     useQuotes (Faz 4–5)
docs/                        dokümanlar ve önizleme görselleri
```

## 5. Veri Modeli (SQLite)

> **Durum (Faz 4 ✅):** Şema sürüm 2 (`src/data/db/migrations.ts`). Sürüm 1'den 2'ye geçiş,
> mevcut veriye dokunmadan otomatik yapılır (testle doğrulandı). İşaretsiz tablolar ilgili fazda
> yeni migration'la eklenecek.

**Saklama kuralları:**

- Kullanıcının girdiği tutar ve adetler (adet, fiyat, komisyon, kur, tutar, stopaj) **TEXT** olarak, tam ondalık hassasiyetle saklanır (bkz. Hesaplama Motoru §14).
- Fiyat geçmişi ve günlük değer önbelleği **türetilmiş veridir** ve REAL (ondalıklı sayı) olarak tutulur. Kaybolsa yeniden indirilir veya hesaplanır.
- Zaman damgaları UTC ISO-8601'dir. Gün sınırları İstanbul saatine göredir.
- **Otomatik kayıtlar saklanmaz.** Otomatik para yatırma ve satış tutarını çekme kayıtları, her okumada elle girilen kayıtlardan türetilir. Böylece hiçbir zaman bağlı oldukları kayıtla çelişemezler.

| Tablo | Sütunlar | Not |
|---|---|---|
| `portfolio` ✅ | id, name, kind (`user`/`demo`), color, sort_order, meta_json, series_dirty_from, created_at | `series_dirty_from`: değer önbelleğinin yeniden hesaplanacağı ilk gün |
| `asset` ✅ | id, market, symbol, provider_symbol, name, currency, meta_json, created_at | Döviz kurları da varlıktır (`FX:USDTRY`). Örnek portföyün varlıkları `demo:` ile başlar |
| `txn` ✅ | id, portfolio_id, asset_id, type, ts, quantity, price, fee, fx_rate, amount, tax, split_ratio, withdraw_proceeds, note, created_at, updated_at | Yalnızca elle girilen kayıtlar. İndeks: (portfolio_id, ts), (asset_id, ts). Portföy silinince kayıtları da silinir |
| `price_daily` ✅ | asset_id, date, close | Günlük kapanış (varlıklar, kurlar, ölçütler). Faz 4'te açılış/yüksek/düşük eklenecek |
| `portfolio_snapshot` ✅ | portfolio_id, date, value, cash, net_invested, flow | Günlük değer önbelleği. TWR'nin iç birim değerleri buradan anında hesaplanır, ayrıca saklanmaz |
| `quote` ✅ | asset_id, price, prev_close, time, source, delay_minutes, end_of_day, fetched_at | Son canlı fiyat ve nereden/ne zaman geldiği (şema 2) |
| `price_sync` ✅ | asset_id, first_date, last_date, source, synced_at, error | Hangi tarih aralığının indirildiği; sadece eksik kısım istenir (şema 2) |
| `watchlist` ✅ | asset_id, sort_order | Piyasalar ekranındaki liste (şema 2, varsayılan 10 enstrüman) |
| `price_intraday` | provider_symbol, ts, close | 1G/1H için, süreli önbellek (Faz 4) |
| `corporate_action` ✅ | asset_id, date, type, value, source | Kaynağın bildirdiği bölünmeler (şema 2) |
| `inflation_monthly` | yyyymm, index | TÜFE (Faz 9) |
| `alert` | | Fiyat alarmı (sonraki sürümler) |

- **Şema değişiklikleri:** Numaralı migration'larla yapılır. Veritabanı son uygulananı `PRAGMA user_version` ile bilir; açılışta eksik olanlar sırayla, her biri kendi işleminde (transaction) uygulanır. Yarıda kalan bir migration tamamen geri alınır. Uygulamanın daha yeni bir sürümüyle yazılmış veritabanı açılmaz (veri bozulmasın diye).
- **Ayarlar:** Görünüm ayarları ve aktif portföy `kv-store`'da (küçük anahtar-değer deposu) kalır.
- **Kayıt kontrolleri:** Her ekleme, düzenleme ve silme yazılmadan önce tüm geçmiş yeniden oynatılarak denetlenir: alan kuralları, fazla satış (geçmişe dönük dahil) ve nakdin eksiye düşmesi. Sorun varsa hiçbir şey yazılmaz ve Türkçe açıklama gösterilir.
- **Değer önbelleği:** Bir değişiklik, önbelleği değişen ilk günden itibaren "eski" olarak işaretler. Bir sonraki okumada yalnızca o günden bugüne hesaplanır.
- **Örnek portföy:** Kendi kurgusal fiyatlarıyla (`demo:` varlıkları) veritabanına yazılır, gerçek piyasa verisiyle karışmaz. Geçmişi oluşturulduğu gün biter; Ayarlar › Veri'den bugüne taşınabilir veya kaldırılabilir.
- **Yedek dosyası:** `{ format, schemaVersion, exportedAt, portfolios, assets, transactions, settings }` biçiminde tek JSON dosyası.
  - Fiyat geçmişi yedeğe girmez, yeniden indirilir. Örnek portföyün fiyatları, bitiş gününden birebir aynı üretilir.
  - Geri yüklemeden önce dosya baştan sona denetlenir (biçim, sürüm, alanlar, kayıt tutarlılığı). Sorun varsa hiçbir şey değişmez.
  - Geri yükleme tek işlemde yapılır: ya tamamı ya hiçbiri.
- **Neden Drizzle değil:** Plan `drizzle-orm` kullanmaktı. Sorgular küçük ve elle yazılmış SQL ile yazıldı. Böylece aynı kod testlerde Node'un yerleşik SQLite'ı ile **gerçek SQLite üzerinde** çalışıyor; derleme sırasında SQL paketleme ve ek bağımlılık gerekmiyor.
- **Web önizleme:** `expo-sqlite` web'de WebAssembly ile çalışır. Metro'ya `wasm` uzantısı eklendi. Sunucunun `Cross-Origin-Opener-Policy: same-origin` ve `Cross-Origin-Embedder-Policy: require-corp` başlıklarını göndermesi gerekir.

## 6. Piyasa Veri Kaynakları

> **Durum (Faz 4 ✅, 9 Kasım 2026):** Tüm kaynaklar gerçek isteklerle denendi. Testlerdeki
> örnek yanıtların hepsi bu kaynaklardan kaydedildi (`src/data/market/__tests__/fixtures`).

### 6.1 Sağlayıcı Arayüzü

```ts
interface MarketSource {
  id: 'yahoo' | 'binance' | 'coingecko' | 'isyatirim' | 'tcmb' | 'mock';
  quotes(refs: string[], http: Http): Promise<Map<string, SourceQuote>>;
  history(ref: string, from: string, to: string, http: Http): Promise<SourceHistory>;
}
// SourceQuote: fiyat, önceki kapanış, zaman, gecikme (dk), gün sonu mu
// SourceHistory: günlük kapanışlar (İstanbul günleri), bölünmeler, temettüler
```

- **Enstrüman tanımı** (`instruments.ts`): her varlık için kaynaklar tercih sırasıyla listelenir. Bir kaynak değeri ölçeklenebilir (ons → gram) veya başka bir enstrümanın fiyatıyla çarpılabilir (EUR/USDT × USD/TRY).
- **Yönlendirici** (`router.ts`):
  - İstekleri kaynağa göre toplu yapar.
  - Hata veren veya sembolü bilmeyen kaynakta sıradakine geçer.
  - Hata veren kaynağı **dinlendirir**: 30 sn, her hatada iki katı, en çok 15 dk.
  - Bütün istekler bağlantı hatasıyla düşerse durumu "çevrimdışı" olarak bildirir.
- **Aynı tür kapanış:** Yahoo'nun bölünmeye göre düzeltilmiş kapanışları, işlem gören fiyatlara geri çevrilir (NVDA 10:1 bölünmesiyle doğrulandı). İş Yatırım'ın düzeltilmemiş kapanışı kullanılır. Böylece her kaynak aynı tür fiyat yazar; kullanıcının kendi bölünme kayıtları defteri doğru tutar.

### 6.2 Kaynak Tablosu

| Veri | Birincil | Yedekler | Canlılık | Doğrulama |
|---|---|---|---|---|
| **BIST hisseleri** | Yahoo (`THYAO.IS`) | İş Yatırım günlük kapanış | 15 dk gecikmeli / gün sonu | ✅ İkisi de |
| **BIST 100** | Yahoo (`XU100.IS`) | İş Yatırım (her hisse satırındaki endeks değeri) | 15 dk / gün sonu | ✅ |
| **BIST 30** | Yahoo (`XU030.IS`) | — | 15 dk | ✅ |
| **ABD hisse, ETF, endeks** | Yahoo (`AAPL`, `^GSPC`, `^NDX`, `^RUT`) | — | Anlık | ✅ |
| **Kripto** | Binance (`BTCUSDT`, İstanbul gününe göre `timeZone=3`) | CoinGecko | Anlık, 7/24 | ✅ İkisi de |
| **Dolar/TL** | Yahoo (`USDTRY=X`) | Binance `USDTTRY` → İş Yatırım → TCMB | Anlık / gün sonu | ✅ Hepsi |
| **Euro/TL** | Yahoo (`EURTRY=X`) | Binance `EURUSDT` × Dolar/TL → TCMB | Anlık | ✅ |
| **Gram altın** | Binance `PAXGTRY` ÷ 31,1035 | Yahoo `GC=F` × Dolar/TL ÷ 31,1035 | Anlık, 7/24 | ✅ |
| **Gram gümüş** | Yahoo `SI=F` × Dolar/TL ÷ 31,1035 | — | Anlık | ✅ (biçim) |
| **TÜFE, mevduat** | Gömülü aylık tablo *(Faz 9)* | — | Aylık | — |
| **Sembol arama** | Telefondaki katalog: 629 BIST şirketi (İş Yatırım listesi), 248 kripto (CoinGecko + Binance), 88 popüler ABD hisse/fonu | Katalogda olmayan sembol de eklenebilir; kripto için Binance ve CoinGecko'da çevrimiçi arama (§6.4) | — | ✅ |
| **Bölünmeler** | Yahoo olayları | İş Yatırım düzeltilmiş/düzeltilmemiş fiyat oranı (öneri) | — | ✅ |

**Denemede çıkan önemli bulgular:**

- `api.binance.com` bazı bölgelerde **451** (yasal engel) döndürüyor. Bu yüzden birincil adres, Binance'in yalnız piyasa verisi sunan ve her yerden çalışan `data-api.binance.vision` adresi; diğeri yedek.
- **Stooq** artık tarayıcı doğrulaması (JavaScript bulmacası) istiyor. Bu tür bir korumayı aşmak doğru olmadığı için kaynak listesinden çıkarıldı.
- **İş Yatırım** bir istekte en fazla yaklaşık bir yıllık veriyi eksiksiz veriyor. Uzun geçmiş takvim yılı yılı istenir.
- **Yahoo**, uygulamanın normal istemcisine yanıt veriyor; komut satırı araçlarına zaman zaman "çok fazla istek" (429) diyor. Uygulama hiçbir kimlik taklidi yapmaz. Yahoo yanıt vermezse yedekler devreye girer.
- **Anahtar gerekmez:** Hiçbir kaynak kullanıcı anahtarı istemez. İstekler doğrudan telefondan gider; araya sunucu girmez.

### 6.3 Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| Yahoo resmi bir API sunmuyor. Uç nokta değişebilir veya sınırlanabilir | Yedek kaynaklar (BIST için İş Yatırım, kripto ve kurlar için Binance, TCMB), kaynak dinlendirme, yerel fiyat deposu. İstekler her kullanıcının kendi telefonundan gider, hacim düşük kalır |
| ABD hisseleri ve BIST 30 için doğrulanmış ikinci kaynak yok | Fiyat gelmezse son kaydedilen fiyat gösterilir ve "çevrimdışı/son güncelleme" belirtilir. Anahtarlı yedekler (Finnhub, Twelve Data) ileride eklenebilir |
| Ücretsiz BIST verisi 15 dk gecikmeli | Gecikme her satırda yazılır ("15 dk gecikme"). Gerçek zamanlı veri için lisanslı bir dağıtıcı ileride adaptör olarak eklenebilir |
| Uygulama mağazada ticari olarak dağıtılırsa veri lisansı gerekir | Kişisel kullanım için sorun yok. Ticari yayında lisanslı sağlayıcıya geçilir *(P2)* |
| Bedelli ve bedelsiz düzeltmelerinin kaynakta farklı işlenmesi | Tüm kaynaklar düzeltilmemiş fiyat yazar. Bölünmeler ayrı saklanır ve kayıt dışı bölünme önerisinde kullanılır (Hesaplama Motoru §13) |
| Web önizlemede tarayıcı CORS engeli | Web önizlemesi kurgusal fiyatlarla çalışır ve bunu ekranda açıkça yazar. Telefonda CORS engeli yoktur |
| Seans takvimi hatası (tatil listesi) | Takvim yalnızca yenileme sıklığını ve "Açık/Kapalı" yazısını etkiler; fiyatın kendisini değil. 2026–2027 BIST ve NYSE tatilleri gömülü, yıllık güncellenir |

**Canlı deneme:** `npm run test:live`, internete erişimi olan bir bilgisayardan tüm kaynakları
gerçek isteklerle dener (CI'da çalışmaz; kaynakların sınırlarına takılmamak için).

### 6.4 Katalogda Olmayan Coinler

Telefondaki kripto kataloğu 248 coin içerir. Listede olmayan bir sembol yazılınca (yazmayı
bıraktıktan 0,6 sn sonra) iki kaynağa sorulur:

| Kaynak | İstek | Sonuç |
|---|---|---|
| Binance | `GET /api/v3/ticker/price?symbol=<SEMBOL>USDT` | Parite varsa coin katalogdakiler gibi fiyatlanır: canlı akış, sorgu, geçmiş |
| CoinGecko | `GET /api/v3/search?query=…`, ardından tek istekte `simple/price` | Sembolü veya adı eşleşen en fazla 8 coin; önce sembolü tam tutanlar (piyasa değeri sırasına göre). Katalogdakiler tekrar gösterilmez |

- **Aynı sembol, farklı coin:** Örneğin "BOB" sembolünü 8 ayrı coin kullanıyor (9 Kasım 2026). Liste ad, CoinGecko sırası ve fiyatla gösterilir; doğru olanı kişi seçer.
- **Seçimin saklanması:** CoinGecko'dan seçilen coin varlık kaydında `provider_symbol = "coingecko:<id>"` olarak tutulur. Böylece yedeğe girer, uygulama açılınca okunur. Bu varlık yalnızca CoinGecko'dan fiyatlanır: 15 sn'de bir sorgu, en fazla 1 yıllık geçmiş.
- **Çakışma:** Bir sembol kayıtlı bir coine aitse, aynı sembollü başka bir coin seçilemez. İstisna: kayıtlı varlığın hiç fiyat kaynağı yoksa (Binance'te paritesi olmayan eski bir kayıt) yeni seçimle eşleştirilebilir.
- **Kaynak değişince:** Eski kaynaktan gelen fiyatlar, canlı fiyat ve indirme durumu silinir; geçmiş yeni kaynaktan baştan indirilir, portföyün değer önbelleği ilk kayıt gününden yenilenir.
- **Hiçbir kaynakta yoksa:** "Fiyatsız ekle" ile eklenebilir. Fiyat elle girilir, varlık son işlem fiyatıyla değerlenir. Satırda "fiyat yok" etiketi, detayda uyarı ve "Coini eşleştir" düğmesi görünür.
- **İnternet yoksa:** Arama yapılamadığı söylenir. Sembol yine eklenebilir, fiyatı internet gelince Binance'te aranır.
- **İstek sınırı:** CoinGecko'nun ücretsiz sürümü dakikada yaklaşık 5–15 istek kabul ediyor. Sınır aşılırsa kaynak kısa süre dinlendirilir, fiyat bir sonraki turda gelir.

### 6.5 TÜFE ve Mevduat (Faz 9)

- **TÜFE:** Kaynak `www.tcmb.gov.tr` "Tüketici Fiyatları" sayfası. Sayfadaki tabloda TÜİK'in aylık ve yıllık
  değişimleri Ocak 2005'ten beri yer alır. Aylık değişimler zincirlenerek bir endeks kurulur (Ocak 2005 başı = 100).
  Her ayın değişimi o ayın günlerine geometrik olarak yayılır. Henüz yayımlanmamış ayın günleri son seviyede
  sabit tutulur. Bu enstrümanın (`MACRO:CPI`) son 62 günü her yenilemede yeniden indirilir: ay başındaki yeni
  yayın, sabit tutulan günlerin yerine geçer. Tablo yoksa veya bir ay eksikse veri kabul edilmez.
- **Mevduat:** Fiyat kaynağı yok. Kişinin Analiz › Ya Olsaydı'da girdiği yıllık net faizle (varsayılan %40)
  günlük bileşik seri olarak, portföy yüklenirken hesaplanır. Faiz değişince yeniden hesaplanır.

### 6.6 Fama–French Faktörleri ve Bilim Verisi (11 Kasım 2026)

- **Kaynak:** Kenneth R. French Data Library (`mba.tuck.dartmouth.edu`), herkese açık iki zip:
  `F-F_Research_Data_5_Factors_2x3_daily_CSV.zip` ve `F-F_Momentum_Factor_daily_CSV.zip`. Telefon
  dosyaları doğrudan indirir, `fflate` ile açar (`providers/french.ts`). Yüzde değerler ondalığa,
  `YYYYMMDD` tarihler güne çevrilir; iki dosya ortak günlerde birleştirilir.
- **Saklama:** Son 5 yıl, `price_daily` tablosunda `FACTOR:Mkt-RF`, `FACTOR:SMB`, … `FACTOR:RF`
  kimlikleriyle (değer = o günün getirisi). İndirme durumu `price_sync`'te `FACTOR:FF` satırında.
  Kütüphane ayda bir güncellendiği için haftada bir kontrol; hata olursa 6 saat sonra yeniden.
- **Ne zaman:** Yalnızca Analiz › Dağılım açıldığında ve portföyde ABD hissesi varsa. Örnek
  portföyde ve web önizlemesinde kurgusal faktörler kullanılır.
- **Varlık geçmişi:** Risk ve faktör analizleri için fiyatlar ilk kayıttan geriye de indirilir:
  her varlıkta bugünden 400 gün, ABD hisselerinde 1100 gün (`marketNeeds`). Ekranlar bu fiyatları
  `useAssetHistory` ile bir kez yükler (portföy görünümü başına önbellek).
- **Plan ve hedefler:** Ayarlar deposunda portföy başına (`plans`, `goals`); yedek dosyasına
  hesaplama ayarlarıyla birlikte girer.

## 7. Canlı Güncelleme Mekanizması (Faz 4 ✅)

| Pazar | Seans içinde | Seans dışında |
|---|---|---|
| Kripto | Anlık akış (WebSocket, 3 sn'de bir yazılır); akış yokken 15 sn'de bir toplu sorgu | — (7/24) |
| ABD | 15 sn | 5 dk |
| BIST | 60 sn (veri zaten 15 dk gecikmeli) | Kapanıştan 20 dk sonra bir kez (son kapanış için), sonra sorgu yok |
| Döviz ve emtia | 30 sn | 5 dk (hafta sonu) |

- **Açılış:** Ekran önce telefonda kayıtlı son fiyatlarla çizilir. Ardından eksik geçmiş indirilir ve canlı fiyatlar alınır.
- **Arka plan:** Uygulama arka plana geçince sorgular durur, öne gelince vadesi gelenler hemen yenilenir.
- **Yalnızca gerekenler:** Sorgulananlar şunlar: kendi portföylerindeki varlıklar, onların para birimleri ve izleme listesi. Ölçütlerin yalnızca geçmişi indirilir. Örnek portföy hiçbir zaman piyasa verisine dokunmaz.
- **Tek fiyat kaynağı:** Canlı fiyat aynı zamanda o günün kapanışı olarak saklanır. Grafik, günlük değer önbelleği ve "bugün" aynı fiyatları okur. Fiyat değişince etkilenen portföylerin önbelleği o günden itibaren yeniden hesaplanır.
- **Geçmiş:** Sadece eksik kısım indirilir. Son birkaç gün 6 saatte bir tazelenir; hata olursa 10 dk sonra yeniden denenir.
- **Seans takvimi:**
  - BIST hafta içi 10:00–18:00 (arife günleri 12:30'a kadar). NYSE 09:30–16:00 New York saati; yaz saati geçişleri hesaplanır.
  - 2026–2027 tatilleri gömülü.
- **Hata durumunda:** Kaynak dinlendirilir, yedek kaynağa geçilir. İnternet yoksa "ÇEVRİMDIŞI" rozeti ve son güncelleme saati gösterilir.
- **Mobil veri ayarı:** Ayarlar › Veri ve bağlantı'da (Faz 10).

### 7.3 Kripto Canlı Akışı (Faz 5 ✅)

- **Bağlantı:** Tek WebSocket, birleşik akış: `wss://data-stream.binance.vision/stream?streams=btcusdt@miniTicker/…`
  (yalnız piyasa verisi sunan, her bölgede açık adres; yedek `stream.binance.com:9443`).
- **Kapsam:** Fiyatı doğrudan bir Binance paritesinden gelen kriptolar (portföydekiler ve izleme listesi).
  Gram altın gibi türetilmiş fiyatlar sorguyla güncellenir.
- **Kullanılan alan:** Yalnız son fiyat (`c`). Akışın açılış fiyatı kayan 24 saatlik olduğu için
  "bugün" karşılaştırması sorgudaki İstanbul gece yarısı fiyatıyla yapılır. Gece yarısı geçince,
  ilk sorguya kadar dünün son fiyatı başlangıç sayılır.
- **Yazma:** Gelen fiyatlar toplanır, 3 saniyede bir tek seferde kaydedilir (canlı fiyat + günün
  kapanışı + önbellek işareti); ana ekran en fazla 4 saniyede bir yeniden hesaplanır.
- **Sorguyla birlikte:** Akış açıkken bu kriptolar 5 dakikada bir sorgulanır (günün başlangıç
  fiyatı için). Akış kesilirse sorgu 15 saniyelik aralığa kendiliğinden döner.
- **Kopma:** 1 sn'den başlayıp iki katına çıkan, en fazla 1 dk bekleme ile yeniden bağlanma,
  adresler sırayla denenir. 30 sn mesaj gelmezse bağlantı ölü sayılıp yenilenir. Arka planda kapanır.
- **Durum:** Ayarlar › Veri kaynakları'nda "Kripto canlı akış: Bağlı (anlık) · N coin".

## 8. Performans Stratejisi

- **Anında açılış:** Ekran önce SQLite'taki son değer ve fiyatlarla anında çizilir. Canlı veri arkadan gelir.
- **Satır bazlı güncelleme:** Her fiyat değişikliği yalnızca ilgili satırı yeniden çizer. Bunu Zustand'ın sembol bazlı seçicileri ve hafızaya alınmış (memoized) satırlar sağlar.
- **Grafik:** Grafik etkileşimi (sürükleme, imleç, animasyon) Reanimated paylaşılan değerleriyle UI iş parçacığında çalışır. JavaScript meşgul olsa bile takılmaz.
- **Ağır hesaplar:** Değer serisi ve Ya Olsaydı gibi hesaplar artımlı yapılır, sonuçları önbelleğe alınır ve etkileşimi bloklamayacak şekilde parçalanır.
- **Listeler:** FlashList ile 10.000+ satırda bile akıcı kaydırma.

## 9. Güvenlik

- **Kilit:** Face ID / parmak izi (`expo-local-authentication`), cihaz şifresi yedeği.
- **Uygulama değiştirici:** Uygulama arka plana geçerken içerik bulanıklaştırılır.
- **Ekran görüntüsü:** İsteğe bağlı olarak engellenir (`expo-screen-capture`).
- **API anahtarları:** Keychain/Keystore'da saklanır (`expo-secure-store`), yedek dosyasına girmez.
- **Veritabanı şifrelemesi:** Şifreli SQLite (SQLCipher) yayın hazırlığı fazında, geliştirme derlemesine geçince açılır. O zamana kadar veri, iOS ve Android'in yerleşik dosya şifrelemesiyle korunur.
- **Telemetri yok:** Hiçbir kullanım verisi veya portföy bilgisi dışarı gönderilmez.

## 10. Test Stratejisi

| Katman | Araç | Hedef |
|---|---|---|
| Hesaplama motoru | Jest | Hesaplama Motoru §15'teki tüm senaryolar. `src/domain` için ≥ %95 kod kapsamı ✅ |
| Piyasa verisi | Jest + kaydedilmiş gerçek yanıtlar; `npm run test:live` ile canlı deneme | Her kaynağın ayrıştırıcısı, yedeğe geçiş, dinlendirme, seans takvimi, eşitleme ✅ |
| Veri katmanı | Jest + Node'un yerleşik SQLite'ı | Migration, kayıt kuralları, artımlı önbellek = baştan hesap, yedek → geri yükleme = birebir aynı. `src/data` için ≥ %90 satır kapsamı ✅ |
| Biçimlendiriciler | Jest | `tr-TR` para, yüzde, tarih ve kısaltma çıktıları |
| Bileşenler | Testing Library | Form doğrulamaları, kaydırma eylemleri |
| Tema erişilebilirliği | Jest | Her temada tüm metin/zemin çiftleri ≥ 4,5:1 kontrast (WCAG AA) ✅ |
| Görsel kontrol | Expo web + Playwright | Her ekranın 4 temada ekran görüntüsü (her faz sonunda paylaşılır) |
| Cihaz testi | Expo Go | Sizin telefonunuzda gerçek veriyle deneme |
| Sürekli entegrasyon | GitHub Actions | Her gönderimde tip kontrolü, lint ve testler |

## 11. Geliştirme, Önizleme ve Dağıtım

**Komutlar:**

| Komut | İş |
|---|---|
| `npm start` | Geliştirme sunucusu (Expo Go ile QR) |
| `npm run android` | Bağlı Android cihaz veya emülatörde aç |
| `npm run web` | Tarayıcıda önizleme |
| `npm run check` | Tip kontrolü + lint + testler |
| `npm run format` | Kodu Prettier ile biçimlendir |

**Telefonda deneme (önerilen): GitHub'dan APK.**

`.github/workflows/android-apk.yml` iş akışı uygulama kodu her değiştiğinde çalışır:

1. Kontroller (tip, lint, test)
2. `expo prebuild` ile yerel Android projesi
3. `gradlew assembleRelease` (arm64)
4. APK, iş akışı çıktısı olarak ve **"android-latest"** sürüm sayfasında yayınlanır

Özellikler:

- `versionCode` derleme numarasından gelir, böylece yeni APK eskisinin üzerine güncelleme olarak kurulur.
- İmza şimdilik şablonun sabit hata ayıklama anahtarıyla yapılır. Kişisel kurulum için yeterlidir. Play Store için gizli anahtarla imzalama Faz 11'de eklenecek.

**Diğer seçenekler:**

1. **Expo Go (bilgisayarla geliştirme):**
   - Bilgisayarınızda depoyu açıp `npx expo start` çalıştırırsınız.
   - Telefondaki Expo Go uygulamasıyla QR kodu okutursunuz.
2. **EAS (Expo bulut derlemesi):**
   - Expo hesabınızla bulutta derleme yapılır.
   - Android için doğrudan kurulabilir APK, iOS için TestFlight (Apple Developer hesabı gerekir) üretilir.
   - Bilgisayar gerekmez.

**Ekran önizlemeleri:** Her fazın sonunda ekranların tüm temalardaki görüntüleri sizinle
paylaşılır. Böylece kod yazılırken tasarımı adım adım onaylayabilirsiniz.

**Güncellemeler:** Mağaza onayı beklemeden küçük güncellemeler uygulamaya doğrudan gönderilebilir (`expo-updates`).

## 12. Kod Standartları

- **TypeScript:** `strict` mod. `any` kullanılmaz.
- **Dil:** Kod, değişken ve dosya adları İngilizce (sektör standardı). Arayüz metinleri Türkçe ve tek dosyada (`src/i18n/tr.ts`). İleride İngilizce dil desteği eklemek kolay olur.
- **Biçim:** ESLint + Prettier. Her commit tip kontrolünden ve testlerden geçer.
- **Commit:** Her faz anlamlı, küçük commit'lerle ilerler. Commit mesajları ne yapıldığını açıkça anlatır.
