/**
 * Bilim Rehberi (docs/01-PROJE-DOKUMANI.md §6.12): findings from peer-reviewed research and
 * long-running public studies, each with its sources, the strength of the evidence and where
 * the app measures it on the person's own portfolio. General knowledge, not advice: nothing
 * here tells anyone what to buy or sell (SPK rules on investment advice).
 *
 * Numbers are quoted only when checked against the source (see docs/test-raporu/bilim-*.md).
 */

export type GuideCategory = 'davranis' | 'getiri' | 'risk' | 'maliyet' | 'plan';
/** güçlü: replicated across markets and decades · orta: well documented, some debate ·
 *  tartışmalı: real but disputed or weakened lately. */
export type Evidence = 'güçlü' | 'orta' | 'tartışmalı';

export interface GuideSource {
  text: string;
  url?: string;
}

export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideEntry {
  id: string;
  category: GuideCategory;
  title: string;
  /** One sentence: the finding. */
  claim: string;
  body: string;
  /** What it means in practice, as general knowledge. */
  meaning: string;
  evidence: Evidence;
  sources: GuideSource[];
  link?: GuideLink;
}

export const GUIDE_CATEGORIES: { key: GuideCategory; label: string }[] = [
  { key: 'davranis', label: 'Davranış' },
  { key: 'getiri', label: 'Getiri' },
  { key: 'risk', label: 'Risk' },
  { key: 'maliyet', label: 'Maliyet' },
  { key: 'plan', label: 'Plan' },
];

export const EVIDENCE_TEXT: Record<Evidence, string> = {
  güçlü: 'Birçok piyasada ve dönemde tekrar tekrar doğrulandı.',
  orta: 'İyi belgelenmiş; büyüklüğü ve yorumu tartışılıyor.',
  tartışmalı: 'Gerçek bir bulgu, ama son yıllarda zayıfladı ya da tartışmalı.',
};

const ANALIZ = (bolum: string) => `/(tabs)/analiz?bolum=${bolum}`;

export const GUIDE: GuideEntry[] = [
  // ── Davranış ──────────────────────────────────────────────────────────────
  {
    id: 'yatkinlik',
    category: 'davranis',
    title: 'Kazananı erken satmak, kaybedeni tutmak',
    claim:
      'Yatırımcılar kârdaki hisseleri, zarardakilere göre belirgin biçimde daha kolay satar (yatkınlık etkisi).',
    body: 'Odean, 10.000 aracı kurum hesabını inceledi: satış yapılan günlerde kârdaki pozisyonların %14,8’i satılırken zarardakilerin yalnızca %9,8’i satılmıştı. Borsa İstanbul’da 283.913 yatırımcıyla yapılan bir çalışma da her yatırımcı türünde aynı eğilimi buldu; sık işlem yapanlarda ve kurumsal yatırımcılarda daha zayıftı. Zarar etmenin acısını ertelemek ve kârı “cebe koyma” isteği bu davranışın en yaygın açıklaması.',
    meaning:
      'Satış kararında alış fiyatı değil, varlığın bundan sonraki beklentisi belirleyicidir. Uygulama bu eğilimi senin satışların üzerinde ölçer.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Shefrin, H. & Statman, M. (1985). The disposition to sell winners too early and ride losers too long. Journal of Finance, 40(3).',
        url: 'https://doi.org/10.1111/j.1540-6261.1985.tb05002.x',
      },
      {
        text: 'Odean, T. (1998). Are investors reluctant to realize their losses? Journal of Finance, 53(5).',
        url: 'https://doi.org/10.1111/0022-1082.00072',
      },
      {
        text: 'Kahya, E. H. & Ekinci, C. (2022). Disposition bias among Borsa Istanbul investors: What do we know about type, size and trading frequency? Journal of Behavioral and Experimental Finance, 35.',
        url: 'https://ideas.repec.org/a/eee/beexfi/v35y2022ics2214635022000351.html',
      },
    ],
    link: { label: 'Davranış › Yatkınlık', href: ANALIZ('davranis') },
  },
  {
    id: 'asiri-islem',
    category: 'davranis',
    title: 'Çok işlem, az getiri',
    claim: 'En sık işlem yapan bireysel yatırımcılar, piyasanın belirgin biçimde gerisinde kaldı.',
    body: '66.465 hanenin 1991–1996 hesaplarında, en çok işlem yapan beşte birlik grup yılda net %11,4 kazanırken piyasa %17,9 getirdi. Fark büyük ölçüde komisyon ve alış-satış makasından geliyordu; seçilen hisseler kötü değildi, işlem sayısı fazlaydı.',
    meaning:
      'Her işlemin bir maliyeti var ve bu maliyet bileşik olarak birikir. Uygulama portföy devir hızını ve maliyetlerin getiriden aldığı payı gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Barber, B. M. & Odean, T. (2000). Trading is hazardous to your wealth. Journal of Finance, 55(2).',
        url: 'https://doi.org/10.1111/0022-1082.00226',
      },
    ],
    link: { label: 'Davranış › İşlem sıklığı', href: ANALIZ('davranis') },
  },
  {
    id: 'aldigin-sattigin',
    category: 'davranis',
    title: 'Satılan, alınandan iyi gitti',
    claim:
      'Bireysel yatırımcıların sattıkları hisseler, sonraki bir yılda yerine aldıklarından daha iyi performans gösterdi.',
    body: 'Odean, bir hisseyi satıp kısa süre içinde başka bir hisse alan yatırımcıları izledi. Satılan hisseler, alınanları sonraki 12 ayda ortalama 3,2 puan, 24 ayda 3,6 puan geçti. Yani işlem maliyetleri bir yana, değişikliğin kendisi de kayıptı.',
    meaning:
      'Bir varlığı başka biriyle değiştirmek, ikisinin sonraki getirileri arasındaki farka yapılan bir bahistir. Uygulama aldıklarınla sattıklarının sonraki seyrini yan yana koyar.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Odean, T. (1999). Do investors trade too much? American Economic Review, 89(5).',
        url: 'https://doi.org/10.1257/aer.89.5.1279',
      },
    ],
    link: { label: 'Davranış › Aldıkların ve sattıkların', href: ANALIZ('davranis') },
  },
  {
    id: 'davranis-farki',
    category: 'davranis',
    title: 'Fonun getirisi ≠ yatırımcının getirisi',
    claim:
      'Yatırımcılar, para giriş-çıkış zamanlamaları yüzünden yatırdıkları fonların getirisinin gerisinde kalıyor.',
    body: 'Morningstar her yıl fonların zaman ağırlıklı getirisini, yatırımcıların para ağırlıklı getirisiyle karşılaştırır. 2024 sonuna kadarki 10 yılda ABD’de yatırımcılar yılda yaklaşık %7,0 kazanırken fonları %8,2 getirdi: yılda 1,2 puanlık fark. Yükselişten sonra alıp düşüşten sonra satmak bu farkı yaratıyor.',
    meaning:
      'Zaman ağırlıklı getiri (TWR) seçimlerini, para ağırlıklı getiri (XIRR) zamanlamanı da içerir. İkisi arasındaki fark, paranın giriş-çıkış zamanlamasının etkisidir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Morningstar (2025). Mind the Gap: A report on investor returns in the US.',
        url: 'https://www.morningstar.com/lp/mind-the-gap',
      },
    ],
    link: { label: 'Davranış › Zamanlama farkı', href: ANALIZ('davranis') },
  },
  {
    id: 'kayiptan-kacinma',
    category: 'davranis',
    title: 'Kayıp, kazançtan iki kat acıtır',
    claim:
      'İnsanlar aynı büyüklükteki kaybı, kazancın yaklaşık iki katı şiddetle hisseder (kayıptan kaçınma).',
    body: 'Kahneman ve Tversky’nin beklenti teorisi, kararların toplam servete göre değil bir referans noktasına göre verildiğini ve kayıpların daha ağır bastığını gösterdi. Sonraki ölçümlerde kayıp katsayısı yaklaşık 2,25 bulundu. Yatkınlık etkisi ve düşüşte panikle satış bu eğilimle açıklanır.',
    meaning:
      'Bir yatırımın alış fiyatı, geleceği açısından bir anlam taşımaz; ama zihin onu referans alır. Düşüş grafiği ve risk ölçüleri, kaybı önceden görünür kılmak içindir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Kahneman, D. & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. Econometrica, 47(2).',
        url: 'https://doi.org/10.2307/1914185',
      },
      {
        text: 'Tversky, A. & Kahneman, D. (1992). Advances in prospect theory. Journal of Risk and Uncertainty, 5.',
        url: 'https://doi.org/10.1007/BF00122574',
      },
    ],
  },
  {
    id: 'sik-bakmak',
    category: 'davranis',
    title: 'Sık bakmak riski büyütür',
    claim:
      'Portföyünü sık değerlendiren biri, aynı yatırımı daha riskli algılar ve daha temkinli davranır (miyopik kayıptan kaçınma).',
    body: 'Benartzi ve Thaler, kısa aralıklarla bakıldığında hisse senetlerinin çok daha sık “zararda” göründüğünü ve bunun yatırımcıyı hisseden uzaklaştırdığını gösterdi. Günlük bakışta yükseliş ve düşüş günleri neredeyse eşit; yıllık bakışta yükselen yıllar belirgin biçimde fazla.',
    meaning:
      'Kısa vadeli dalgalanma, uzun vadeli sonucu pek az anlatır. Uygulamanın dönem seçicileri (1G–Tümü) aynı portföyü farklı ufuklardan görmek için vardır.',
    evidence: 'orta',
    sources: [
      {
        text: 'Benartzi, S. & Thaler, R. H. (1995). Myopic loss aversion and the equity premium puzzle. Quarterly Journal of Economics, 110(1).',
        url: 'https://doi.org/10.2307/2118511',
      },
    ],
  },
  {
    id: 'asiri-guven',
    category: 'davranis',
    title: 'Aşırı güven işlem sayısını artırır',
    claim: 'Kendine daha çok güvenen yatırımcılar daha çok işlem yapar ve bu getirilerini düşürür.',
    body: 'Barber ve Odean, 35.000 hanede erkeklerin kadınlardan %45 daha fazla işlem yaptığını buldu. İşlem yapmak erkeklerin yıllık net getirisini 2,65 puan, kadınlarınkini 1,72 puan düşürdü. Çalışma cinsiyetin değil, aşırı güvenin bir göstergesi olarak tasarlanmıştı.',
    meaning:
      'Bir işlemin gerekçesi, maliyetini karşılayacak kadar güçlü olmalı. İşlem sıklığı kartı, aylık işlem sayını ve devir hızını gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Barber, B. M. & Odean, T. (2001). Boys will be boys: Gender, overconfidence, and common stock investment. Quarterly Journal of Economics, 116(1).',
        url: 'https://doi.org/10.1162/003355301556400',
      },
    ],
    link: { label: 'Davranış › İşlem sıklığı', href: ANALIZ('davranis') },
  },
  {
    id: 'dikkat',
    category: 'davranis',
    title: 'Gündemdeki hisseyi almak',
    claim:
      'Bireysel yatırımcılar, haberlerde çıkan, işlem hacmi patlayan ya da sert hareket eden hisselerin net alıcısıdır.',
    body: 'Binlerce hisse arasından seçim yapmak zordur; dikkat çeken hisseler kısa listeye girer. Barber ve Odean, bu “dikkat çeken” günlerde bireysel yatırımcıların sattığından çok aldığını gösterdi. Kurumsal yatırımcılarda aynı eğilim görülmedi.',
    meaning:
      'Bir hissenin gündemde olması, onun iyi bir yatırım olduğu anlamına gelmez; çoğu zaman fiyat haberi çoktan yansıtmıştır.',
    evidence: 'orta',
    sources: [
      {
        text: 'Barber, B. M. & Odean, T. (2008). All that glitters: The effect of attention and news on the buying behavior of individual and institutional investors. Review of Financial Studies, 21(2).',
        url: 'https://doi.org/10.1093/rfs/hhm079',
      },
    ],
  },

  // ── Getiri ───────────────────────────────────────────────────────────────
  {
    id: 'aktif-pasif',
    category: 'getiri',
    title: 'Endeksi yenmek zor',
    claim:
      'Aktif yönetilen hisse fonlarının büyük çoğunluğu, uzun vadede kendi endeksinin gerisinde kalıyor.',
    body: 'S&P’nin SPIVA raporlarına göre ABD büyük şirket fonlarının yaklaşık %90’ı, 2024 sonuna kadarki 15 yılda S&P 500’ün gerisinde kaldı. Sharpe’ın aritmetiği nedenini açıklar: tüm aktif yatırımcılar toplamda piyasanın kendisidir; maliyetlerden önce ortalama piyasa getirisini, maliyetlerden sonra daha azını alırlar.',
    meaning:
      'Bir portföyün başarısı, aynı riskteki basit bir endeks alternatifiyle karşılaştırılarak ölçülür. “Ya Olsaydı?” bunu senin para giriş-çıkışlarınla yapar.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'S&P Dow Jones Indices (2025). SPIVA U.S. Scorecard, Year-End 2024.',
        url: 'https://www.spglobal.com/spdji/en/research-insights/spiva/',
      },
      {
        text: 'Sharpe, W. F. (1991). The arithmetic of active management. Financial Analysts Journal, 47(1).',
        url: 'https://doi.org/10.2469/faj.v47.n1.7',
      },
    ],
    link: { label: 'Analiz › Ya Olsaydı?', href: ANALIZ('whatif') },
  },
  {
    id: 'az-hisse',
    category: 'getiri',
    title: 'Getiriyi az sayıda hisse taşır',
    claim:
      'ABD borsasının 1926’dan bu yana yarattığı net servetin tamamı, hisselerin yaklaşık %4’ünden geldi.',
    body: 'Bessembinder, 1926–2016 arasında işlem gören tüm ABD hisselerini inceledi. Hisselerin yarıdan fazlası, ömrü boyunca bir aylık hazine bonosundan daha az getirdi. Net servet artışının tamamını yaklaşık %4’lük küçük bir grup sağladı. Tek tek hisse getirileri çok çarpık dağılır.',
    meaning:
      'Az sayıda hisseden oluşan bir portföyün, o küçük kazanan grubu kaçırma olasılığı yüksektir. Bu, çeşitlendirmenin getiri tarafındaki gerekçesidir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Bessembinder, H. (2018). Do stocks outperform Treasury bills? Journal of Financial Economics, 129(3).',
        url: 'https://doi.org/10.1016/j.jfineco.2018.06.004',
      },
    ],
    link: { label: 'Dağılım › Portföy sağlığı', href: ANALIZ('allocation') },
  },
  {
    id: 'uzun-vade',
    category: 'getiri',
    title: '125 yılın reel getirileri',
    claim:
      'Dünya hisse senetleri 1900–2024 arasında enflasyondan arındırılmış olarak yılda %5,2 getirdi; tahviller %1,7, bonolar %0,5.',
    body: 'Dimson, Marsh ve Staunton’un 35 ülkeyi kapsayan veri seti, uzun vadede hisse primini açıkça gösteriyor. Ama aynı veri, onlarca yıl süren zayıf dönemlerin de olduğunu gösterir: bu yüzyılın ilk çeyreğinde dünya hisselerinin reel getirisi yılda %3,5’te kaldı.',
    meaning:
      'Hedef planlamadaki varsayımlar bu uzun dönem verilerine yakın seçildi ve reel (bugünün lirasıyla) ifade edilir. Gelecek geçmişi tekrarlamak zorunda değildir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Dimson, E., Marsh, P. & Staunton, M. (2025). UBS Global Investment Returns Yearbook 2025.',
        url: 'https://www.ubs.com/global/en/investment-bank/insights-and-data/2025/global-investment-returns-yearbook-2025.html',
      },
    ],
    link: { label: 'Plan › Hedefler', href: '/plan' },
  },
  {
    id: 'beceri-sans',
    category: 'getiri',
    title: 'Beceriyi kanıtlamak yıllar ister',
    claim:
      'Birkaç yıllık iyi bir getiri, beceriyi şanstan ayırmaya çoğu zaman yetmez; gereken süre istatistikle hesaplanabilir.',
    body: 'Getiriler gürültülüdür: yıllık %20 oynaklıktaki bir portföyün yılda 5 puanlık fazla getirisini istatistiksel olarak kanıtlamak onlarca yıl alabilir. Bailey ve López de Prado’nun Olasılıksal Sharpe Oranı (PSR), getirinin çarpıklığını ve basıklığını da hesaba katarak “gerçek Sharpe sıfırın üstünde mi?” sorusuna bir olasılık verir; Asgari Kayıt Uzunluğu (MinTRL) ise %95 güven için gereken süreyi.',
    meaning:
      'Kısa bir dönemdeki başarı da başarısızlık da büyük ölçüde şans olabilir. Performans sekmesi bu olasılıkları senin verinle hesaplar.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Bailey, D. H. & López de Prado, M. (2012). The Sharpe ratio efficient frontier. Journal of Risk, 15(2).',
        url: 'https://ssrn.com/abstract=1821643',
      },
    ],
    link: { label: 'Performans › Beceri mi şans mı?', href: ANALIZ('performance') },
  },
  {
    id: 'faktorler',
    category: 'getiri',
    title: 'Getirinin çoğu birkaç faktörle açıklanır',
    claim:
      'Hisse portföylerinin getiri farklarının büyük kısmı piyasa, büyüklük, değer, kârlılık, yatırım ve momentum faktörleriyle açıklanır.',
    body: 'Fama ve French önce üç, sonra beş faktörlü modeli geliştirdi; Carhart momentumu ekledi. Bir fonun “alfa” sandığı getirinin önemli bir kısmı, çoğu zaman bu faktörlere maruz kalmaktan gelir. Değer ve büyüklük primleri son 15–20 yılda zayıfladı; faktörler bir getiri garantisi değil, bir ölçme aracıdır.',
    meaning:
      'Faktör analizi, ABD hisselerinin hangi “tarzda” olduğunu gösterir: büyük mü küçük mü, değer mi büyüme mi. Bir tavsiye değil, bir röntgendir.',
    evidence: 'orta',
    sources: [
      {
        text: 'Fama, E. F. & French, K. R. (1993). Common risk factors in the returns on stocks and bonds. Journal of Financial Economics, 33(1).',
        url: 'https://doi.org/10.1016/0304-405X(93)90023-5',
      },
      {
        text: 'Fama, E. F. & French, K. R. (2015). A five-factor asset pricing model. Journal of Financial Economics, 116(1).',
        url: 'https://doi.org/10.1016/j.jfineco.2014.10.010',
      },
      {
        text: 'Carhart, M. M. (1997). On persistence in mutual fund performance. Journal of Finance, 52(1).',
        url: 'https://doi.org/10.1111/j.1540-6261.1997.tb03808.x',
      },
      {
        text: 'Kenneth R. French Data Library (veri kaynağı).',
        url: 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html',
      },
    ],
    link: { label: 'Dağılım › Faktör analizi', href: ANALIZ('allocation') },
  },
  {
    id: 'momentum',
    category: 'getiri',
    title: 'Momentum: yükselen bir süre daha yükselir',
    claim:
      'Son 3–12 ayda en çok yükselen hisseler, sonraki aylarda da en çok düşenlerden daha iyi gitme eğiliminde oldu.',
    body: 'Jegadeesh ve Titman’ın bulgusu birçok ülkede ve varlık sınıfında tekrarlandı. Ama momentum ani ve sert çöküşler yaşayabilir; ayrıca sık işlem gerektirdiği için maliyeti yüksektir. Yatkınlık etkisi (kazananı erken satmak) momentumun bir nedeni olarak da önerilmiştir.',
    meaning:
      'Faktör analizindeki momentum yüklemesi, ABD hisselerinin son bir yılda yükselenlere mi düşenlere mi benzediğini gösterir.',
    evidence: 'orta',
    sources: [
      {
        text: 'Jegadeesh, N. & Titman, S. (1993). Returns to buying winners and selling losers. Journal of Finance, 48(1).',
        url: 'https://doi.org/10.1111/j.1540-6261.1993.tb04702.x',
      },
    ],
    link: { label: 'Dağılım › Faktör analizi', href: ANALIZ('allocation') },
  },

  // ── Risk ─────────────────────────────────────────────────────────────────
  {
    id: 'cesitlendirme',
    category: 'risk',
    title: 'Çeşitlendirme: tek bedava öğle yemeği',
    claim:
      'Birlikte hareket etmeyen varlıkları bir araya getirmek, getiriyi azaltmadan toplam dalgalanmayı düşürür.',
    body: 'Markowitz, portföy riskinin tek tek varlıkların riskinden değil, birbirleriyle nasıl hareket ettiklerinden (korelasyon) belirlendiğini gösterdi. Önemli olan varlık sayısı değil, risk katkısıdır: ağırlığı %20 olan oynak bir varlık, riskin yarısını taşıyabilir. Çeşitlendirme oranı 1’den ne kadar büyükse, çeşitlendirmeden o kadar fayda sağlanıyordur.',
    meaning:
      'Portföy sağlığı kartı her varlığın riske katkısını, korelasyonları ve “etkin pozisyon sayısını” gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Markowitz, H. (1952). Portfolio selection. Journal of Finance, 7(1).',
        url: 'https://doi.org/10.1111/j.1540-6261.1952.tb01525.x',
      },
    ],
    link: { label: 'Dağılım › Portföy sağlığı', href: ANALIZ('allocation') },
  },
  {
    id: 'korelasyon-krizde',
    category: 'risk',
    title: 'Krizde korelasyonlar yükselir',
    claim:
      'Sakin dönemlerde ayrı hareket eden varlıklar, sert düşüşlerde birlikte düşme eğilimindedir.',
    body: 'Uluslararası piyasalar üzerine yapılan çalışmalar, piyasa çöküşlerinde ülke borsaları arasındaki korelasyonun belirgin biçimde arttığını buldu. Bu yüzden geçmiş korelasyonlar, çeşitlendirmenin faydasını sakin dönemlerde olduğundan büyük gösterebilir.',
    meaning:
      'Korelasyon matrisi son bir yılın ölçümüdür; zor bir dönemde değerler 1’e yaklaşabilir. Hisse dışı varlıklar (nakit, mevduat, altın) bu yüzden ayrıca önemlidir.',
    evidence: 'orta',
    sources: [
      {
        text: 'Longin, F. & Solnik, B. (2001). Extreme correlation of international equity markets. Journal of Finance, 56(2).',
        url: 'https://doi.org/10.1111/0022-1082.00340',
      },
    ],
    link: { label: 'Dağılım › Korelasyon', href: ANALIZ('allocation') },
  },
  {
    id: 'piyango',
    category: 'risk',
    title: 'Piyango benzeri hisseler',
    claim:
      'Bir ay içinde çok sert tek günlük yükselişler yaşayan hisseler, sonraki ay ortalamada daha düşük getirdi.',
    body: 'Bali, Çakıcı ve Whitelaw, yatırımcıların küçük bir olasılıkla büyük kazanç sunan “piyango” hisselerine fazla ödeme yaptığını ve bunun sonraki getirileri düşürdüğünü gösterdi. Büyük bir kazanç olasılığı, beklenen getiriden daha çekici görünebiliyor.',
    meaning:
      'Bir varlığın geçmişteki sıçramaları, gelecekte de sıçrayacağı anlamına gelmez; oynaklık riskin kendisidir.',
    evidence: 'orta',
    sources: [
      {
        text: 'Bali, T. G., Cakici, N. & Whitelaw, R. F. (2011). Maxing out: Stocks as lotteries and the cross-section of expected returns. Journal of Financial Economics, 99(2).',
        url: 'https://doi.org/10.1016/j.jfineco.2010.08.014',
      },
    ],
  },
  {
    id: 'yerel-agirlik',
    category: 'risk',
    title: 'Yerel ağırlık (ev yanlılığı)',
    claim:
      'Yatırımcılar, servetlerinin büyük kısmını kendi ülkelerinin hisselerine yatırır; çeşitlendirmenin ima ettiğinden çok daha fazla.',
    body: 'French ve Poterba, ABD, Japonya ve İngiltere’deki yatırımcıların hisse portföylerinin büyük çoğunluğunu kendi ülkelerinde tuttuğunu ve bunun, yerel piyasalar hakkında aşırı iyimser beklentilerle açıklanabileceğini gösterdi. Tanıdık olanı daha güvenli algılamak bu eğilimin en yaygın açıklamasıdır.',
    meaning:
      'Dağılım sekmesindeki piyasa ve para birimi kırılımı, portföyünün ne kadarının tek bir ülkeye ve tek bir para birimine bağlı olduğunu gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'French, K. R. & Poterba, J. M. (1991). Investor diversification and international equity markets. American Economic Review, 81(2).',
      },
    ],
    link: { label: 'Analiz › Dağılım', href: ANALIZ('allocation') },
  },
  {
    id: 'reel-getiri',
    category: 'risk',
    title: 'Nominal kazanç, reel kayıp olabilir',
    claim:
      'Yüksek enflasyonda bir yatırımın TL olarak artması, alım gücünün arttığı anlamına gelmez.',
    body: 'Fisher’in ayrımına göre reel getiri, nominal getiriden enflasyonun etkisi çıkarılarak bulunur: (1 + nominal) ÷ (1 + enflasyon) − 1. Yıllık %50 enflasyonda %40 nominal getiri, yaklaşık %7 reel kayıptır. Türkiye gibi yüksek enflasyonlu ekonomilerde portföyleri TÜFE ve mevduatla karşılaştırmak bu yüzden temeldir.',
    meaning:
      '“Ya Olsaydı?” bölümünde TÜFE ve mevduat seçenekleri, aynı parayı enflasyona ve faize yatırmış olsaydın ne olacağını gösterir.',
    evidence: 'güçlü',
    sources: [{ text: 'Fisher, I. (1930). The Theory of Interest. Macmillan.' }],
    link: { label: 'Analiz › Ya Olsaydı?', href: ANALIZ('whatif') },
  },

  // ── Maliyet ──────────────────────────────────────────────────────────────
  {
    id: 'maliyet',
    category: 'maliyet',
    title: 'Küçük maliyetler büyük farklar yaratır',
    claim:
      'Yıllık %1’lik bir maliyet, 30 yılda nihai servetin yaklaşık %26’sını alır; çünkü maliyet de bileşik işler.',
    body: 'Matematik basit: her yıl servetin %1’i giderse 30 yıl sonra kalan oran 0,99³⁰ ≈ 0,74’tür. French, ABD’de yatırımcıların 1980–2006 arasında piyasayı yenmeye çalışmak için her yıl toplam piyasa değerinin yaklaşık %0,67’sini harcadığını hesapladı; toplamda bu harcama piyasa getirisinden pay almaktan başka bir şey üretmez.',
    meaning:
      'Davranış sekmesi komisyon ve hesap ücretlerinin yıllık oranını ve 20 yıllık birikimli etkisini gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'French, K. R. (2008). Presidential address: The cost of active investing. Journal of Finance, 63(4).',
        url: 'https://doi.org/10.1111/j.1540-6261.2008.01373.x',
      },
    ],
    link: { label: 'Davranış › Maliyet yükü', href: ANALIZ('davranis') },
  },
  {
    id: 'toplu-para',
    category: 'maliyet',
    title: 'Toplu yatırım mı, parça parça mı?',
    claim:
      'Elde toplu para varken, onu hemen yatırmak geçmişte vakaların yaklaşık üçte ikisinde parça parça yatırmaktan iyi sonuç verdi.',
    body: 'Vanguard’ın ABD, İngiltere ve Avustralya verileriyle yaptığı analizlerde toplu yatırım, 12 aya yayılan kademeli yatırımı vakaların yaklaşık %68’inde geçti; çünkü piyasalar çoğu dönemde yükselir ve bekleyen para nakitte kalır. Kademeli yatırımın değeri, kötü bir zamanlamanın yaratacağı pişmanlığı azaltmasıdır.',
    meaning:
      'Bu bir olasılık bulgusudur, garanti değildir. Düzenli maaştan yapılan aylık yatırım ise bir tercih değil, paranın geliş biçimidir; bu karşılaştırma onun için geçerli değildir.',
    evidence: 'orta',
    sources: [
      {
        text: 'Vanguard Research (2023). Cost averaging: Invest now or temporarily hold your cash?',
      },
    ],
  },

  // ── Plan ─────────────────────────────────────────────────────────────────
  {
    id: 'yeniden-dengeleme',
    category: 'plan',
    title: 'Yeniden dengeleme: kural koy, takvime bağla',
    claim:
      'Yeniden dengelemenin amacı getiriyi artırmak değil, riski planlanan düzeyde tutmaktır; yılda bir-iki kontrol ve ~5 puanlık bant makul bir kuraldır.',
    body: 'Vanguard’ın analizine göre hiç dengelenmeyen bir portföy zamanla hisse ağırlığı artarak planlanandan daha riskli hale gelir. Çok sık dengelemek ise risk açısından pek bir şey katmadan maliyet ve vergi yükü getirir. Yıllık ya da altı aylık kontrolle, hedeften 5 puandan fazla sapan varlık sınıflarını düzeltmek makul bir denge sunar. Yeni parayı eksik kalan sınıfa yönlendirmek, satış yapmadan dengeleme sağlar.',
    meaning:
      'Yatırım planı ekranı hedeflerini, bantlarını ve sapmaları gösterir; yeni parayı nereye koyarsan planına yaklaşacağını hesaplar.',
    evidence: 'orta',
    sources: [
      {
        text: 'Jaconetti, C. M., Kinniry, F. M. & Zilbering, Y. (2010). Best practices for portfolio rebalancing. Vanguard Research.',
      },
    ],
    link: { label: 'Yatırım planı', href: '/plan' },
  },
  {
    id: 'otomatik-plan',
    category: 'plan',
    title: 'Önceden verilen karar daha iyi uygulanır',
    claim:
      'Kararı önceden ve otomatik hale getirmek, insanların uzun vadeli hedeflerine uymasını belirgin biçimde artırır.',
    body: 'Thaler ve Benartzi’nin “Yarın Daha Çok Biriktir” programında, gelecekteki maaş artışlarından tasarrufu önceden kabul eden çalışanların tasarruf oranı 40 ayda %3,5’ten %13,6’ya çıktı. Karar anında değil sakin bir anda verilen kurallar, panik ve coşku anlarında rehberlik eder.',
    meaning:
      'Yazılı bir yatırım planı (hedef dağılım, bantlar, gözden geçirme takvimi) bu önceden bağlanmanın bir biçimidir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Thaler, R. H. & Benartzi, S. (2004). Save More Tomorrow: Using behavioral economics to increase employee saving. Journal of Political Economy, 112(S1).',
        url: 'https://doi.org/10.1086/380085',
      },
    ],
    link: { label: 'Yatırım planı', href: '/plan' },
  },
  {
    id: 'olasilik',
    category: 'plan',
    title: 'Hedefe tek sayı değil, olasılık',
    claim:
      'Getiriler belirsiz olduğu için bir hedefe ulaşma, tek bir tahminle değil bir olasılık ve aralıkla ifade edilmelidir.',
    body: 'Monte Carlo simülasyonu binlerce olası piyasa yolu üretir ve her birinde hedefe ulaşılıp ulaşılmadığına bakar. “%7 getiriyle 10 yılda X olur” gibi tek sayılı hesaplar, ortalama getiriyle bile hedefin kaçırılabileceğini gizler. Sonuç, varsayımlar kadar iyidir: getiri ve oynaklık varsayımları değiştikçe olasılık da değişir.',
    meaning:
      'Hedef planlama ekranı, seçtiğin varsayımlarla hedefe ulaşma olasılığını ve %10–%90 aralığını bugünün lirasıyla gösterir.',
    evidence: 'güçlü',
    sources: [
      {
        text: 'Dimson, E., Marsh, P. & Staunton, M. (2025). UBS Global Investment Returns Yearbook 2025 (varsayımlar için).',
        url: 'https://www.ubs.com/global/en/investment-bank/insights-and-data/2025/global-investment-returns-yearbook-2025.html',
      },
    ],
    link: { label: 'Plan › Hedefler', href: '/plan' },
  },
];

export const guideEntry = (id: string) => GUIDE.find((g) => g.id === id);

/** "Barber, B. M. & Odean, T. (2000). …" → "Barber & Odean 2000" (three or more: "Dimson vd."). */
export function shortCite(text: string): string {
  const head = /^(.*?)\s*\((\d{4})\)/.exec(text);
  if (!head) return text.replace(/\s*\(.*$/, '').replace(/\.$/, '');
  const names = [
    ...head[1].matchAll(/([A-ZÇŞĞÜÖİÁ][^\s,&]*(?:\s(?:de|van|von)\s[A-Z][^\s,&]*)?),\s+[A-Z]\./g),
  ].map((m) => m[1]);
  const who =
    names.length === 0
      ? head[1].replace(/\.$/, '')
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} & ${names[1]}`
          : `${names[0]} vd.`;
  return `${who} ${head[2]}`;
}
