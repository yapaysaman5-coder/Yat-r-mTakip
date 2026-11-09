/** Plain-language explanations shown when a metric is tapped (Turkish UI copy). */
export interface MetricInfo {
  title: string;
  short: string;
  body: string;
  formula: string;
}

export const METRIC_INFO = {
  today: {
    title: 'Bugün',
    short: 'Dünkü kapanışa göre değişim',
    body: 'Portföyünün bugün ne kadar değiştiğini gösterir. Her varlık kendi piyasasının önceki kapanışına göre hesaplanır; kripto için Türkiye saatiyle gece yarısı esas alınır. Gün içinde yaptığın alım-satımlar sonucu bozmaz.',
    formula: 'Şimdiki değer − gün başı değer (gün içi işlemler ayıklanır)',
  },
  twr: {
    title: 'TWR · Zaman ağırlıklı getiri',
    short: 'Yatırım seçimlerinin başarısı',
    body: 'Para yatırma ve çekmenin etkisini çıkarır; yalnızca seçtiğin varlıkların ne kadar iyi gittiğini ölçer. Fonlar ve endekslerle adil karşılaştırma bu ölçüyle yapılır.',
    formula:
      'Para hareketleri arasındaki dönem getirileri zincirlenir:\n(1 + r₁) × (1 + r₂) × … − 1',
  },
  xirr: {
    title: 'XIRR · Yıllık gerçek getiri',
    short: 'Paranın giriş-çıkış zamanına göre getirin',
    body: 'Paranın ne zaman girip çıktığını hesaba katar; cebine giren gerçek yıllık getiriyi gösterir. Yükselişten hemen önce çok para yatırdıysan XIRR, TWR’den yüksek; düşüşten önce yatırdıysan düşük çıkar. Excel’deki XIRR ile aynı sonucu verir.',
    formula: 'Σ akış ÷ (1 + r)^(gün ÷ 365) = 0 eşitliğini sağlayan r',
  },
  alpha: {
    title: 'Alpha · Riske göre fazla getiri',
    short: 'Ölçütü riske göre ne kadar geçtin',
    body: 'Aldığın piyasa riskine (beta) göre beklenen getirinin üzerinde ne kadar kazandığını gösterir. Pozitif alpha: seçimlerin ölçütü yendi. Negatif alpha: aynı riski bir endeks fonuyla alsaydın daha iyi olurdu.',
    formula: 'α = Rp − [Rf + β × (Rm − Rf)]  (yıllık)\nRp: portföy, Rm: ölçüt, Rf: risksiz faiz',
  },
  beta: {
    title: 'Beta · Piyasaya duyarlılık',
    short: 'Ölçüt %1 oynarken sen ne kadar oynuyorsun',
    body: 'Beta 1 ise portföyün ölçütle aynı oranda hareket eder; 0,5 ise yarısı kadar, 1,5 ise bir buçuk katı. Düşük beta, piyasa düşüşlerinde daha az etkilendiğin anlamına gelir.',
    formula: 'β = kovaryans(portföy, ölçüt) ÷ varyans(ölçüt)\n(günlük getiriler)',
  },
  volatility: {
    title: 'Volatilite · Dalgalanma',
    short: 'Getirilerin ne kadar inip çıktığı',
    body: 'Portföy değerinin ne kadar dalgalı olduğunu yıllık olarak gösterir. %20 volatilite, değerin bir yılda kabaca ±%20 aralığında oynayabileceği anlamına gelir.',
    formula: 'Günlük getirilerin standart sapması × √365',
  },
  sharpe: {
    title: 'Sharpe oranı',
    short: 'Alınan risk başına getiri',
    body: 'Her birim dalgalanma için ne kadar getiri elde ettiğini ölçer. 1’in üzeri iyi, 2’nin üzeri çok iyi kabul edilir. Risksiz faiz Ayarlar > Hesaplama’dan girilir.',
    formula: '(Yıllık getiri − risksiz faiz) ÷ volatilite',
  },
  sortino: {
    title: 'Sortino oranı',
    short: 'Yalnızca düşüş riskine göre getiri',
    body: 'Sharpe gibidir ama sadece aşağı yönlü dalgalanmayı risk sayar. Yukarı sıçramalar cezalandırılmaz.',
    formula: '(Yıllık getiri − risksiz faiz) ÷ aşağı yönlü sapma',
  },
  maxDrawdown: {
    title: 'Maksimum düşüş',
    short: 'Zirveden görülen en büyük kayıp',
    body: 'Portföyün bir zirveden sonraki en derin düşüşünü gösterir. Kötü bir dönemde ne kadar kayba dayanman gerektiğini anlatır.',
    formula: 'max (1 − değer ÷ o güne kadarki zirve)',
  },
  risk: {
    title: 'Risk seviyesi (1–7)',
    short: 'Yıllık volatiliteye göre risk sınıfı',
    body: 'Avrupa fon standardındaki ölçek kullanılır: 1 çok düşük, 7 çok yüksek risk. Portföyün volatilitesine göre otomatik belirlenir.',
    formula: '<%0,5 →1 · <%2 →2 · <%5 →3 · <%10 →4 · <%15 →5 · <%25 →6 · üstü →7',
  },
  bestMonth: {
    title: 'En iyi ve en kötü ay',
    short: 'Aylık getiri uçları',
    body: 'Takvim ayı bazında en çok kazandırdığın ve en çok kaybettirdiğin aylar. Para giriş-çıkışlarının etkisi çıkarılmıştır.',
    formula: 'Ay sonu ÷ önceki ay sonu − 1 (zaman ağırlıklı)',
  },
} satisfies Record<string, MetricInfo>;

export type MetricKey = keyof typeof METRIC_INFO;
