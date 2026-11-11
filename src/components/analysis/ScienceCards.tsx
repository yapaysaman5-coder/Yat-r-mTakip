import { View } from 'react-native';

import {
  CardTitle,
  Footnote,
  MeterRow,
  ScienceLink,
  Stat,
  Stats,
  Verdict,
} from '@/components/science/bits';
import { FACTOR_MIN_DAYS, FACTOR_TEXT, factorReport } from '@/data/view/factorsView';
import { HEALTH_MIN_DAYS, healthReport } from '@/data/view/healthView';
import { skillReport } from '@/data/view/skillView';
import { useAnalysis, usePortfolioView } from '@/state/portfolio';
import { useAssetHistory, useFactors } from '@/state/science';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AssetAvatar, Card, Skeleton, Text } from '@/ui';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';

const pct = (r: number | null, decimals = 1, sign = false) =>
  r === null ? '—' : formatPercent(r, { decimals, sign: sign ? 'always' : 'auto' });
const num = (n: number | null, d = 2) =>
  n === null ? '—' : formatNumber(n, { minDecimals: d, maxDecimals: d });
const years = (y: number) =>
  y < 1
    ? `${formatNumber(y * 12, { maxDecimals: 0 })} ay`
    : y > 99
      ? '100+ yıl'
      : `${formatNumber(y, { maxDecimals: y < 10 ? 1 : 0 })} yıl`;

/* ───────────────────── Beceri mi, şans mı? (Performans) ───────────────────── */

export function SkillCard() {
  const analysis = useAnalysis();
  const r = skillReport(analysis);
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="BECERİ Mİ, ŞANS MI?" right={`${r.n} günlük getiri`} />
      {!r.enough ? (
        <Verdict
          tone="neutral"
          title="Biraz daha geçmiş gerekiyor"
          text="Bu sınama en az 20 günlük getiriyle yapılır; güvenilir bir okuma için ise genellikle yıllar gerekir."
        />
      ) : (
        <>
          <Stats>
            <Stat
              label="Sharpe > 0 olasılığı"
              value={pct(r.psr, 0)}
              sub="Olasılıksal Sharpe (PSR)"
              tone={r.psr! >= 0.95 ? 'up' : r.psr! <= 0.5 ? 'down' : 'primary'}
            />
            <Stat
              label="%95 güven için gereken"
              value={r.minTrackYears === null ? '—' : years(r.minTrackYears)}
              sub={`şu an ${years(r.yearsSoFar)} · MinTRL`}
            />
            <Stat
              label="Alpha (yıllık, BIST 100)"
              value={pct(r.alphaAnnual, 1, true)}
              tone={r.alphaAnnual === null ? 'primary' : r.alphaAnnual > 0 ? 'up' : 'down'}
              sub={r.alphaT === null ? 'ölçüt fiyatı yok' : `t = ${num(r.alphaT, 1)}`}
            />
            <Stat
              label="Alpha > 0 olasılığı"
              value={pct(r.alphaProbability, 0)}
              sub={
                r.alphaYearsNeeded === null
                  ? 'alpha pozitif değil'
                  : `kanıt için ~${years(r.alphaYearsNeeded)}`
              }
            />
          </Stats>
          <Verdict
            tone={r.verdict === 'anlamli' ? 'up' : r.verdict === 'olumsuz' ? 'down' : 'neutral'}
            title={
              r.verdict === 'anlamli'
                ? 'Sonuç şansla açıklanamayacak kadar güçlü'
                : r.verdict === 'olumsuz'
                  ? 'Risk alındı ama karşılığı görülmüyor'
                  : 'Henüz beceriyi şanstan ayırmak mümkün değil'
            }
            text={
              r.verdict === 'anlamli'
                ? 'Getirinin riske oranı, %95 güvenle sıfırın üstünde. Geçmiş başarı geleceği garanti etmez.'
                : r.verdict === 'olumsuz'
                  ? 'Risksiz faizin üstünde kalıcı bir getiri görülmüyor. Kısa dönemde bu da şans olabilir.'
                  : 'Getiriler gürültülüdür; bugüne kadarki sonuç hem iyi hem kötü şansla açıklanabilir. Kayıt uzadıkça olasılık netleşir.'
            }
          />
          <Footnote>
            PSR, getirilerin çarpıklığını ve basıklığını da hesaba katar (Bailey ve López de Prado
            2012). Alpha, günlük fazla getirilerin BIST 100’e regresyonundandır; olasılık t
            istatistiğinden normal yaklaşımla bulunur. Risksiz faiz: Ayarlar › Hesaplama.
          </Footnote>
        </>
      )}
      <ScienceLink id="beceri-sans" />
    </Card>
  );
}

/* ───────────────────── Portföy sağlığı (Dağılım) ───────────────────── */

export function HealthCards() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const history = useAssetHistory(view);
  if (!history) return <Skeleton height={240} radius={radius.lg} />;
  const h = healthReport(view, history);
  if (view.holdings.length === 0) return null;
  if (!h.enough) {
    return (
      <Card style={{ gap: space.md }}>
        <CardTitle title="PORTFÖY SAĞLIĞI" />
        <Verdict
          tone="neutral"
          title="Fiyat geçmişi bekleniyor"
          text={`Riske katkı ve korelasyon, tüm pozisyonların ortak en az ${HEALTH_MIN_DAYS} günlük fiyatıyla hesaplanır (şu an ${h.days} gün).`}
        />
        <ScienceLink id="cesitlendirme" />
      </Card>
    );
  }
  const top = h.assets.slice(0, 8);
  const maxShare = Math.max(...top.map((a) => Math.max(a.riskShare, a.weight)), 0.01);
  const concentrated = h.assets[0] && h.assets[0].riskShare > 0.4;
  const dr = h.diversificationRatio ?? 1;
  return (
    <>
      <Card style={{ gap: space.md }}>
        <CardTitle title="PORTFÖY SAĞLIĞI" right={`son ${h.days} gün`} />
        <Stats>
          <Stat
            label="Yıllık oynaklık"
            value={pct(h.volatility, 1)}
            sub="bugünkü ağırlıklarla, TL"
          />
          <Stat
            label="Çeşitlendirme oranı"
            value={num(h.diversificationRatio)}
            sub="1 = fayda yok, yüksek = iyi"
            tone={dr >= 1.3 ? 'up' : dr < 1.1 ? 'warning' : 'primary'}
          />
          <Stat
            label="Etkin pozisyon"
            value={formatNumber(h.effectivePositions, { maxDecimals: 1 })}
            sub={`${h.assets.length} pozisyon, ağırlığa göre`}
          />
          <Stat
            label="Riski taşıyan"
            value={
              h.effectiveRiskPositions === null
                ? '—'
                : formatNumber(h.effectiveRiskPositions, { maxDecimals: 1 })
            }
            sub="etkin pozisyon, riske göre"
          />
        </Stats>
        <Text variant="overline" tone="tertiary">
          RİSKE KATKI · AĞIRLIK
        </Text>
        {top.map((a) => (
          <View
            key={a.assetId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <AssetAvatar symbol={a.symbol} market={a.market} size={28} />
            <View style={{ flex: 1, gap: 4 }}>
              <MeterRow
                label={`${a.symbol} · oynaklık ${pct(a.volatility, 0)}`}
                value={`${pct(a.riskShare, 0)} · ${pct(a.weight, 0)}`}
                ratio={Math.max(0, a.riskShare) / maxShare}
                marker={a.weight / maxShare}
                color={a.riskShare > a.weight * 1.25 ? colors.warning : colors.accent}
              />
            </View>
          </View>
        ))}
        <Verdict
          tone={concentrated ? 'warning' : dr >= 1.3 ? 'up' : 'neutral'}
          title={
            concentrated
              ? `Riskin ${pct(h.assets[0].riskShare, 0)}’i tek pozisyondan: ${h.assets[0].symbol}`
              : dr >= 1.3
                ? 'Pozisyonlar birbirinin dalgalanmasını belirgin biçimde dengeliyor'
                : 'Çeşitlendirmenin riski azaltma etkisi sınırlı'
          }
          text="Çubuk riske katkıyı, siyah çizgi ağırlığı gösterir. Turuncu çubuk: ağırlığından çok daha fazla risk taşıyan pozisyon."
        />
        <Footnote>
          Son bir yılın günlük TL getirileriyle; nakit risksiz sayılır. Riske katkı: wᵢ·(Σw)ᵢ ÷ σₚ².
          Çeşitlendirme oranı: Σwᵢσᵢ ÷ σₚ.
        </Footnote>
        <ScienceLink id="cesitlendirme" />
      </Card>
      {h.matrixIds.length >= 2 ? (
        <CorrelationCard ids={h.matrixIds} matrix={h.matrix} average={h.averageCorrelation} />
      ) : null}
    </>
  );
}

function CorrelationCard({
  ids,
  matrix,
  average,
}: {
  ids: string[];
  matrix: number[][];
  average: number | null;
}) {
  const { colors } = useTheme();
  const n = ids.length;
  const label = 46;
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="KORELASYON" right={`ortalama ${num(average)}`} />
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: 'row', gap: 3, marginLeft: label + 3 }}>
          {ids.map((id) => (
            <Text
              key={id}
              variant="caption"
              tone="tertiary"
              align="center"
              numberOfLines={1}
              style={{ flex: 1, fontSize: 9 }}>
              {id.slice(0, 5)}
            </Text>
          ))}
        </View>
        {matrix.map((row, i) => (
          <View key={ids[i]} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text variant="caption" tone="secondary" numberOfLines={1} style={{ width: label }}>
              {ids[i]}
            </Text>
            {row.map((c, j) => {
              const strength = Math.min(1, Math.abs(c));
              return (
                <View
                  key={j}
                  accessible
                  accessibilityLabel={`${ids[i]} ile ${ids[j]}: ${num(c)}`}
                  style={{
                    flex: 1,
                    aspectRatio: n > 5 ? 1 : 1.3,
                    borderRadius: 5,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}>
                  {i !== j ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        backgroundColor: c >= 0 ? colors.warning : colors.accent,
                        opacity: 0.12 + 0.88 * strength,
                      }}
                    />
                  ) : null}
                  {n <= 8 ? (
                    <Text
                      variant="caption"
                      style={{
                        fontSize: n > 6 ? 9 : 10,
                        color:
                          i === j || strength < 0.55 ? colors.textSecondary : colors.textOnAccent,
                      }}>
                      {i === j ? '—' : formatNumber(c, { maxDecimals: 1, minDecimals: 1 })}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Footnote>
        +1: hep birlikte hareket · 0: ilişkisiz · −1: ters yönde. Turuncu pozitif, mavi negatif
        korelasyon; renk koyulaştıkça ilişki güçlenir. Sert düşüşlerde korelasyonlar genellikle
        artar.
      </Footnote>
      <ScienceLink id="korelasyon-krizde" />
    </Card>
  );
}

/* ───────────────────── Faktör analizi (Dağılım) ───────────────────── */

export function FactorCard() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const history = useAssetHistory(view);
  const factors = useFactors(view, history);
  if (!view.holdings.some((h) => h.market === 'us')) return null;
  if (!history || factors.status === 'loading') return <Skeleton height={200} radius={radius.lg} />;
  if (factors.status === 'failed' || factors.status === 'none') {
    return (
      <Card style={{ gap: space.md }}>
        <CardTitle title="FAKTÖR ANALİZİ · ABD" />
        <Verdict
          tone="neutral"
          title="Faktör verisi indirilemedi"
          text={`Fama–French verisi Kenneth French’in Dartmouth’taki kütüphanesinden indirilir; internet gelince yeniden denenecek.${factors.error ? ` (${factors.error})` : ''}`}
        />
        <ScienceLink id="faktorler" />
      </Card>
    );
  }
  const r = factorReport(view, history, factors.rows);
  if (!r.enough) {
    return (
      <Card style={{ gap: space.md }}>
        <CardTitle title="FAKTÖR ANALİZİ · ABD" />
        <Verdict
          tone="neutral"
          title="Ortak geçmiş yetersiz"
          text={`ABD hisselerinin fiyatları ile faktör verisinin en az ${FACTOR_MIN_DAYS} ortak işlem günü gerekir (şu an ${r.n}). Faktör verisi aylık güncellenir.`}
        />
        <ScienceLink id="faktorler" />
      </Card>
    );
  }
  const maxAbs = Math.max(1.2, ...r.loadings.map((l) => Math.abs(l.beta)));
  const notable = r.loadings.filter((l) => l.significant && l.key !== 'Mkt-RF');
  const market = r.loadings.find((l) => l.key === 'Mkt-RF')!;
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="FAKTÖR ANALİZİ · ABD" right={`${r.n} işlem günü`} />
      <Text variant="footnote" tone="secondary">
        ABD hisselerinin (portföyün {pct(r.coverage, 0)}’i) bugünkü ağırlıklarıyla, Fama–French 5
        faktör + momentum modeline göre.
      </Text>
      {r.loadings.map((l) => {
        const w = Math.min(1, Math.abs(l.beta) / maxAbs) / 2;
        return (
          <View key={l.key} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="footnote" tone={l.significant ? 'primary' : 'tertiary'}>
                {FACTOR_TEXT[l.key].name}
                <Text variant="caption" tone="tertiary">
                  {'  '}
                  {l.key}
                </Text>
              </Text>
              <Text variant="numS" tone={l.significant ? 'primary' : 'tertiary'}>
                {num(l.beta)}
                <Text variant="caption" tone="tertiary">
                  {'  '}t {num(l.t, 1)}
                </Text>
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.surfaceAlt,
                flexDirection: 'row',
              }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                {l.beta < 0 ? (
                  <View
                    style={{
                      width: `${w * 200}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: l.significant ? colors.accent2 : colors.borderStrong,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ width: 2, backgroundColor: colors.textTertiary }} />
              <View style={{ flex: 1 }}>
                {l.beta >= 0 ? (
                  <View
                    style={{
                      width: `${w * 200}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: l.significant ? colors.accent : colors.borderStrong,
                    }}
                  />
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
      <Verdict
        tone="neutral"
        title={`Piyasa betası ${num(market.beta)}: ${market.beta >= 1 ? FACTOR_TEXT['Mkt-RF'].up : FACTOR_TEXT['Mkt-RF'].down}`}
        text={
          notable.length
            ? `Belirgin eğilimler: ${notable
                .map((l) => (l.beta > 0 ? FACTOR_TEXT[l.key].up : FACTOR_TEXT[l.key].down))
                .join('; ')}.`
            : 'Diğer faktörlerde istatistiksel olarak belirgin (|t| ≥ 2) bir eğilim yok.'
        }
      />
      <Stats>
        <Stat
          label="Açıklanan (R²)"
          value={pct(r.r2, 0)}
          sub="getirinin faktörlerle açıklanan payı"
        />
        <Stat
          label="Alpha (yıllık, $)"
          value={pct(r.alphaAnnual, 1, true)}
          tone={
            r.alphaT !== null && Math.abs(r.alphaT) >= 2
              ? r.alphaAnnual! > 0
                ? 'up'
                : 'down'
              : 'primary'
          }
          sub={`t = ${num(r.alphaT, 1)}${r.alphaT !== null && Math.abs(r.alphaT) < 2 ? ' · şans olabilir' : ''}`}
        />
      </Stats>
      <Footnote>
        Soluk satırlar istatistiksel olarak belirgin değil (|t| &lt; 2). Getiriler dolar cinsinden,
        risksiz faiz düşülerek. Veri: Kenneth R. French Data Library
        {factors.lastDate ? `, son veri ${formatDate(`${factors.lastDate}T12:00:00Z`)}` : ''}
        {factors.demo ? ' · örnek portföyde faktörler de örnektir' : ''}.
      </Footnote>
      <ScienceLink id="faktorler" />
    </Card>
  );
}
