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
| Yerel veritabanı | `expo-sqlite` (ayarlar için `kv-store` ✅) + `drizzle-orm` | SDK 58 / 0.45 |
| Uygulama durumu ✅ | `zustand` (kalıcı ayarlar) | 5.1 |
| Ağ verisi önbelleği | `@tanstack/react-query` | 5.x |
| Hassas ondalık hesap ✅ | `decimal.js` | 10.6 |
| Tarih | `date-fns` (tr yerel ayarı) | 4.4 |
| Titreşim ✅ | `expo-haptics` | SDK 58 |
| Face ID / parmak izi | `expo-local-authentication` | SDK 58 |
| Güvenli anahtar deposu | `expo-secure-store` | SDK 58 |
| Ekran görüntüsü engeli | `expo-screen-capture` | SDK 58 |
| Bulanıklaştırma | `expo-blur` | SDK 58 |
| Dosya, paylaşma, belge seçici | `expo-file-system`, `expo-sharing`, `expo-document-picker` | SDK 58 |
| Yazı tipi ✅ | `@expo-google-fonts/inter` (Inter 400–800, eşit genişlikli rakamlar) | 0.4 |
| Simgeler ✅ | `lucide-react-native` | 1.70 |
| Test ✅ | `jest`, `jest-expo`, `@testing-library/react-native` | 30 / 58 |
| Kod kalitesi ✅ | `eslint` + `eslint-config-expo`, `prettier` | 9 / 3 |

**Grafik kararı:** Bakiye grafiği uygulamanın imza öğesi olduğu için hazır bir grafik kütüphanesi
yerine **Skia üzerine kendi grafik bileşenimiz (`FinChart`)** yazılacak. Bunu gerektiren
özellikler: net yatırılan çizgisi, para akışı işaretleri, iki parmakla ölçüm, şekil dönüşümü
animasyonu, ölçüt katmanı. Tam kontrol ancak kendi bileşenimizle mümkün.

**Faz 1 notu:** Önizleme ekranlarındaki statik grafikler (alan, çoklu çizgi, mini trend, halka)
`react-native-svg` ile çizildi. Mini trend ve halka grafik bu haliyle kalır. Ana ekrandaki büyük
grafik Faz 5'te Skia tabanlı, parmakla gezinilen FinChart ile değiştirilecek.

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

✅ = Faz 1'de oluşturuldu.

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
    varlik/[id].tsx          Varlık detay (Faz 6)
    islem/yeni.tsx           Al / Sat / Para / Temettü formu (Faz 6)
    kilit.tsx                Kilit ekranı (Faz 10)
    baslangic/               İlk açılış akışı (Faz 10)
  components/                uygulamaya özel parçalar ✅
                             (TabBar, QuickActionSheet, HoldingRow, PreviewNote)
  ui/                        tasarım sistemi bileşenleri ✅
  ui/charts/                 AreaChart, LineChart, Sparkline, Donut, path ✅
  theme/                     types, themes, tokens, ThemeProvider, contrast ✅
  state/                     Zustand store'ları (settings ✅)
  lib/                       storage (kalıcı ayarlar), haptics ✅
  i18n/tr.ts                 arayüz metinleri ✅
  utils/format.ts            Türkçe biçimlendiriciler ✅
  demo/                      önizleme için örnek veri ✅ (gerçek veri gelince kalkar)
                             analysis.ts: nakit akışları gerçek formüllerle simüle edilir
  domain/                    hesaplama motoru + testler
                             (metrics.ts, whatIf.ts ✅ · gerisi Faz 2)
  data/db/                   şema, migration, repository (Faz 3)
  data/market/               yahoo · binance · coingecko · tcmb · mock (Faz 4)
  hooks/                     usePortfolio, useQuotes, useSeries (Faz 3–5)
docs/                        dokümanlar ve önizleme görselleri
```

## 5. Veri Modeli (SQLite)

Tutar ve adetler **TEXT** olarak, tam ondalık hassasiyetle saklanır (bkz. Hesaplama Motoru §14).
Zaman damgaları UTC ISO-8601'dir, gösterimde Europe/Istanbul'a çevrilir.

| Tablo | Sütunlar | Not |
|---|---|---|
| `portfolio` | id, name, color, icon, sort_order, archived, created_at | Çoklu portföy |
| `asset` | id, market (`BIST`/`US`/`CRYPTO`/`FX`/`COMMODITY`/`INDEX`/`CUSTOM`), symbol, provider_symbol (ör. `THYAO.IS`), name, currency, logo_url, price_decimals, meta_json | Varlık tanımı |
| `txn` | id, portfolio_id, asset_id (nakit işlemlerinde boş), type, ts, quantity, price, fee, fx_rate, amount, tax, split_ratio, note, linked_txn_id, is_auto, created_at, updated_at | Tüm işlemler. İndeks: (portfolio_id, ts), (asset_id, ts) |
| `quote` | provider_symbol, price, prev_close, change_pct, market_state, ts | Son fiyat önbelleği |
| `price_daily` | provider_symbol, date, open, high, low, close, adj_close, volume | Günlük fiyat önbelleği |
| `price_intraday` | provider_symbol, ts, close | 1G/1H için, süreli önbellek |
| `fx_daily` | pair, date, rate | USD/TRY, EUR/TRY |
| `corporate_action` | provider_symbol, date, type (`SPLIT`/`DIVIDEND`), ratio, amount | Bölünme tespiti |
| `portfolio_snapshot` | portfolio_id, date, value, cash, net_invested, nav, units | Günlük değer önbelleği. `nav`/`units` yalnızca TWR iç hesabı içindir, ekranda gösterilmez |
| `inflation_monthly` | yyyymm, index | TÜFE |
| `watchlist` | asset_id, sort_order | İzleme listesi |
| `alert` *(P2)* | id, asset_id, condition, value, active | Fiyat alarmı |
| `setting` | key, value_json | Tüm ayarlar |

- **Şema değişiklikleri:** Numaralı migration dosyalarıyla yapılır. Uygulama güncellense de veri kaybolmaz.
- **Yedek dosyası:** `{ schemaVersion, exportedAt, portfolios, assets, transactions, settings }` biçiminde JSON. Fiyat önbellekleri yedeğe girmez, yeniden indirilir.

## 6. Piyasa Veri Kaynakları

### 6.1 Sağlayıcı Arayüzü

```ts
interface MarketDataProvider {
  id: string;
  supports(market: Market): boolean;
  quotes(symbols: string[]): Promise<Quote[]>;
  history(symbol: string, range: Range, interval: Interval): Promise<Bar[]>;
  search(query: string, market?: Market): Promise<SymbolInfo[]>;
  corporateActions?(symbol: string, from: Date): Promise<CorporateAction[]>;
  stream?(symbols: string[], onTick: (t: Tick) => void): Unsubscribe;
}
```

Her pazar için öncelik sıralı bir sağlayıcı listesi tutulur. Birincil sağlayıcı hata verirse
veya sağlık kontrolünden geçemezse otomatik olarak yedeğe geçilir.

### 6.2 Kaynak Tablosu

| Veri | Birincil | Yedek | Canlılık | Anahtar |
|---|---|---|---|---|
| **BIST hisse ve endeks** (`THYAO.IS`, `XU100.IS`, `XU030.IS`) | Yahoo Finance grafik uç noktası (`/v8/finance/chart`) | İş Yatırım geçmiş veri uç noktası *(doğrulanacak)* | 15 dk gecikmeli | Yok |
| **ABD hisse, ETF ve endeks** (`AAPL`, `^GSPC`, `^NDX`, `^IXIC`, `^RUT`) | Yahoo Finance | Finnhub veya Twelve Data (ücretsiz katman) | Neredeyse gerçek zamanlı | Yedekler için kullanıcı anahtarı |
| **Kripto canlı** | Binance WebSocket (`miniTicker`) | CoinGecko Demo API | Gerçek zamanlı | Yok / CoinGecko anahtarı |
| **Kripto geçmiş** | Binance REST (`/api/v3/klines`) | Yahoo (`BTC-USD`), CoinGecko (1 yıl) | — | Yok |
| **Döviz** (`USDTRY=X`, `EURTRY=X`) | Yahoo Finance | TCMB günlük kur XML'i (`/kurlar/today.xml`, arşiv) | 15–60 sn / günlük | Yok |
| **Altın ve gümüş (ons)** | Yahoo (spot veya vadeli sembol, doğrulanacak) | — | 15–60 sn | Yok |
| **TÜFE** | TCMB EVDS 3 | Uygulamaya gömülü aylık tablo (güncellemeyle yenilenir) | Aylık | EVDS anahtarı (kullanıcı) |
| **Sembol arama** | BIST ve kripto için gömülü katalog, ABD için Yahoo arama | — | — | Yok |
| **Bölünme ve temettü olayları** | Yahoo grafik uç noktası (`events=split,div`) | — | — | Yok |

### 6.3 Riskler ve Önlemler

| Risk | Önlem |
|---|---|
| Yahoo resmi bir API sunmuyor. Uç nokta değişebilir veya sınırlanabilir | Sağlayıcı soyutlaması, otomatik yedeğe geçiş, agresif önbellek. İstekler her kullanıcının kendi telefonundan gider, hacim düşük kalır |
| Ücretsiz BIST verisi 15 dk gecikmeli | Gecikme rozetle açıkça gösterilir. Gerçek zamanlı veri için lisanslı bir veri dağıtıcısı (ücretli) ileride adaptör olarak eklenebilir |
| Uygulama mağazada ticari olarak dağıtılırsa veri lisansı gerekir | Kişisel kullanım için sorun yok. Ticari yayında lisanslı sağlayıcıya ve anahtarları saklayan küçük bir ara sunucuya geçilir *(P2)* |
| Bedelli ve bedelsiz düzeltmelerinin kaynakta farklı işlenmesi | Bölünme tespiti ve uyarı mekanizması (Hesaplama Motoru §13), bilinen BIST örnekleriyle test |
| Web önizlemede tarayıcı CORS engeli | Geliştirme sırasında web önizlemesi sahte (mock) sağlayıcıyla çalışır. Telefonda CORS engeli yoktur |

> Bu geliştirme ortamının internet erişimi piyasa veri sitelerine kapalı. Bu yüzden uç noktaların
> güncel davranışı (yanıt biçimi, sınırlar) Faz 4'te telefonda test edilerek doğrulanacak. O
> zamana kadar geliştirme sahte veriyle ilerler.

## 7. Canlı Güncelleme Mekanizması

| Pazar | Seans içinde | Seans dışında |
|---|---|---|
| Kripto | WebSocket akışı (anlık) | — (7/24) |
| ABD | 15 sn'de bir toplu sorgu | 5 dk (seans öncesi/sonrası fiyatlar) |
| BIST | 60 sn (veri zaten gecikmeli) | Sorgu yok |
| Döviz ve emtia | 30 sn | 5 dk |

- **Arka plan:** Uygulama arka plana geçince tüm sorgular ve akışlar durur, öne gelince anında yenilenir.
- **Yalnızca gerekenler:** Sadece portföydeki ve ekranda görünen semboller sorgulanır. Sorgular toplu yapılır.
- **Seans takvimi:**
  - BIST: hafta içi 10:00–18:00, Europe/Istanbul.
  - NYSE/Nasdaq: 09:30–16:00, America/New_York. Yaz saati geçişleri otomatik hesaplanır.
  - Tatiller sağlayıcının piyasa durumu bilgisinden alınır.
- **Hata durumunda:** Üstel geri çekilme (exponential backoff) uygulanır, yedek sağlayıcıya geçilir ve "eski veri" rozeti gösterilir.
- **Mobil veri:** Ayarlarda kapatılırsa mobil veride canlı akış yerine 1 dk sorgu kullanılır.

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
| Hesaplama motoru | Jest | Hesaplama Motoru §15'teki tüm senaryolar. `src/domain` için ≥ %95 kod kapsamı |
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
