import { useRouter } from 'expo-router';
import { ScanFace } from 'lucide-react-native';
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
import type { AssetHistory } from '@/data/service/assetHistory';
import {
  activity,
  afterSales,
  behaviorGap,
  buysVsSells,
  disposition,
  TURNOVER_BANDS,
} from '@/data/view/behaviorView';
import type { PortfolioView } from '@/data/view/portfolioView';
import { useAnalysis, usePortfolioView } from '@/state/portfolio';
import { useAssetHistory } from '@/state/science';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { AssetAvatar, Card, PressableScale, Skeleton, Text } from '@/ui';
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/utils/format';

const pct = (r: number | null, decimals = 1, sign = true) =>
  r === null ? '—' : formatPercent(r, { decimals, sign: sign ? 'always' : 'auto' });
const pts = (r: number | null) =>
  r === null
    ? '—'
    : `${formatNumber(r * 100, { minDecimals: 1, maxDecimals: 1, sign: 'always' })} puan`;
const tone = (r: number | null) =>
  r === null || Math.abs(r) < 0.0005 ? 'primary' : r > 0 ? 'up' : 'down';
const HORIZON = { 30: '1 ay', 91: '3 ay', 182: '6 ay', 365: '1 yıl' } as const;

/**
 * Davranış Aynası (docs/01-PROJE-DOKUMANI.md §6.12): the person's own trades measured with
 * methods from behavioural-finance research. Measurements and their reading, never advice.
 */
export function Behavior() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const history = useAssetHistory(view);
  return (
    <View style={{ gap: space.lg }}>
      <Card variant="alt" style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ScanFace size={18} color={colors.accent} strokeWidth={2.4} />
          <Text variant="title3">Davranış Aynası</Text>
        </View>
        <Text variant="footnote" tone="secondary">
          İşlemlerin, davranış finansı araştırmalarında kullanılan yöntemlerle ölçülür. Bunlar öneri
          değil, ölçümdür; her kartın altında dayandığı araştırma var.
        </Text>
      </Card>
      {history ? (
        <>
          <DispositionCard view={view} history={history} />
          <BuysVsSellsCard view={view} history={history} />
          <AfterSalesCard view={view} history={history} />
        </>
      ) : (
        <Skeleton height={220} />
      )}
      <TimingCard />
      <ActivityCard view={view} />
    </View>
  );
}

function DispositionCard({ view, history }: { view: PortfolioView; history: AssetHistory }) {
  const { colors } = useTheme();
  const d = disposition(view, history);
  const gains = d.realizedGains + d.paperGains;
  const losses = d.realizedLosses + d.paperLosses;
  let verdict: { tone: 'up' | 'warning' | 'neutral'; title: string; text: string };
  if (d.saleDays === 0) {
    verdict = {
      tone: 'neutral',
      title: 'Henüz satış yok',
      text: 'Yatkınlık etkisi satış günlerinde ölçülür: o gün sattıkların ile elinde tuttukların karşılaştırılır.',
    };
  } else if (!d.enough) {
    verdict = {
      tone: 'neutral',
      title: 'Henüz yeterli gözlem yok',
      text: `Satış günlerinde ${gains} kâr ve ${losses} zarar gözlemi var; güvenilir bir okuma için en az 5’er gerekir.`,
    };
  } else if (d.difference! > 0 && (d.t ?? 0) >= 2) {
    verdict = {
      tone: 'warning',
      title: 'Kârdakileri belirgin biçimde daha kolay satıyorsun',
      text: `Fark ${pts(d.difference)}, istatistiksel olarak anlamlı (t = ${formatNumber(d.t!, { maxDecimals: 1 })}). Araştırmalardaki yatkınlık etkisiyle aynı yönde.`,
    };
  } else if (d.difference! > 0) {
    verdict = {
      tone: 'neutral',
      title: 'Kârdakileri biraz daha kolay satıyorsun',
      text: `Fark ${pts(d.difference)}; ama şansla açıklanabilecek büyüklükte (t = ${formatNumber(d.t ?? 0, { maxDecimals: 1 })}).`,
    };
  } else {
    verdict = {
      tone: 'up',
      title: 'Yatkınlık etkisi görülmüyor',
      text: 'Zarardaki pozisyonları en az kârdakiler kadar kolay satıyorsun.',
    };
  }
  const max = Math.max(0.2, d.pgr ?? 0, d.plr ?? 0);
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="YATKINLIK ETKİSİ" right={`${d.saleDays} satış günü`} />
      <MeterRow
        label="Kârdakileri satma oranı (PGR)"
        value={pct(d.pgr, 1, false)}
        ratio={(d.pgr ?? 0) / max}
        color={colors.up}
      />
      <MeterRow
        label="Zarardakileri satma oranı (PLR)"
        value={pct(d.plr, 1, false)}
        ratio={(d.plr ?? 0) / max}
        color={colors.down}
      />
      <Verdict {...verdict} />
      <Footnote>
        Satış yaptığın her gün, elindeki her pozisyon ortalama maliyetine göre kâr ya da zarar
        sayılır: satılanlar “gerçekleşen”, tutulanlar “kâğıt üzerinde”. Odean’ın (1998) 10.000
        hesaplık çalışmasında PGR %14,8, PLR %9,8 idi.
      </Footnote>
      <ScienceLink id="yatkinlik" />
    </Card>
  );
}

function BuysVsSellsCard({ view, history }: { view: PortfolioView; history: AssetHistory }) {
  const { colors } = useTheme();
  const rows = buysVsSells(view, history);
  const measured = [...rows].reverse().find((r) => r.difference !== null);
  if (!rows.some((r) => r.boughtCount > 0 || r.soldCount > 0)) return null;
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="ALDIKLARIN VE SATTIKLARIN" right="işlem sonrası" />
      <View style={{ flexDirection: 'row', paddingBottom: 2 }}>
        <Text variant="overline" tone="tertiary" style={{ flex: 1 }}>
          SÜRE
        </Text>
        {['ALINAN', 'SATILAN', 'FARK'].map((h) => (
          <Text key={h} variant="overline" tone="tertiary" align="right" style={{ width: 84 }}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View
          key={r.horizon}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: i ? space.sm : 0,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}>
          <Text variant="subhead" style={{ flex: 1 }}>
            {HORIZON[r.horizon]}
          </Text>
          <Text variant="numS" tone={tone(r.bought)} align="right" style={{ width: 84 }}>
            {pct(r.bought)}
            <Text variant="caption" tone="tertiary">
              {r.boughtCount ? ` ·${r.boughtCount}` : ''}
            </Text>
          </Text>
          <Text variant="numS" tone={tone(r.sold)} align="right" style={{ width: 84 }}>
            {pct(r.sold)}
            <Text variant="caption" tone="tertiary">
              {r.soldCount ? ` ·${r.soldCount}` : ''}
            </Text>
          </Text>
          <Text variant="numS" tone={tone(r.difference)} align="right" style={{ width: 84 }}>
            {r.difference === null ? '—' : pts(r.difference).replace(' puan', ' p')}
          </Text>
        </View>
      ))}
      {measured ? (
        <Verdict
          tone={measured.difference! < 0 ? 'warning' : 'up'}
          title={
            measured.difference! < 0
              ? `Sattıkların, aldıklarından ${HORIZON[measured.horizon]}da daha iyi gitti`
              : `Aldıkların, sattıklarından ${HORIZON[measured.horizon]}da daha iyi gitti`
          }
          text={`Ortalama fark ${pts(measured.difference)} (${measured.boughtCount} alış, ${measured.soldCount} satış). Az sayıda işlemde sonuç şansa çok bağlıdır.`}
        />
      ) : (
        <Verdict
          tone="neutral"
          title="Karşılaştırma için zaman gerekiyor"
          text="Alışlarının ve satışlarının üzerinden en az bir ay geçince fiyatların sonraki seyri burada karşılaştırılır."
        />
      )}
      <Footnote>
        Fiyat değişimi TL olarak, işlem fiyatından itibaren ölçülür (bölünmeler dahil). Sağdaki
        küçük sayı ölçülen işlem adedi. Odean (1999): satılan hisseler, yerine alınanları sonraki 12
        ayda ortalama 3,2 puan geçti.
      </Footnote>
      <ScienceLink id="aldigin-sattigin" />
    </Card>
  );
}

function AfterSalesCard({ view, history }: { view: PortfolioView; history: AssetHistory }) {
  const { colors } = useTheme();
  const router = useRouter();
  const s = afterSales(view, history);
  if (s.sales.length === 0) return null;
  const diff = s.heldDifference;
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="SATTIKTAN SONRA NE OLDU?" right={`${s.sales.length} satış`} />
      <Verdict
        tone={Math.abs(diff) < 1 ? 'neutral' : diff > 0 ? 'warning' : 'up'}
        title={
          Math.abs(diff) < 1
            ? 'Sattıkların bugün aynı değerde'
            : diff > 0
              ? `Satmasaydın bugün ${formatMoney(diff, { decimals: 0 })} daha fazla ederdi`
              : `Satman ${formatMoney(-diff, { decimals: 0 })} kayıptan korudu`
        }
        text="Sattığın adetlerin bugünkü değeri, satıştan eline geçen tutarla karşılaştırılır (temettüler ve satıştan sonra o parayla yaptıkların hariç)."
      />
      {s.measured3m > 0 ? (
        <Text variant="footnote" tone="secondary">
          Satıştan 3 ay sonra sattıkların ortalama {pct(s.avg3m)} değişti; aynı sürede portföyün{' '}
          {pct(s.portfolio3m)}.
        </Text>
      ) : null}
      {s.sales.slice(0, 5).map((x, i) => {
        const after = x.after[91] ?? x.after[30];
        const label =
          x.after[91] !== null ? '3 ay sonra' : x.after[30] !== null ? '1 ay sonra' : '';
        return (
          <PressableScale
            key={x.item.id}
            onPress={() =>
              x.item.assetId && router.push(`/varlik/${encodeURIComponent(x.item.assetId)}`)
            }
            haptic="selection"
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={`${x.item.symbol} satışı, ${formatDate(x.item.ts)}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingTop: i ? space.md : 0,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <AssetAvatar symbol={x.item.symbol ?? '?'} market={x.item.market ?? 'bist'} size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="callout">{x.item.symbol}</Text>
              <Text variant="caption" tone="secondary">
                {formatDate(x.item.ts)} · {formatMoney(x.proceeds, { decimals: 0 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text variant="numS" tone={tone(after)}>
                {after === null ? 'bekleniyor' : pct(after)}
              </Text>
              <Text variant="caption" tone="tertiary">
                {label || 'henüz 1 ay olmadı'}
              </Text>
            </View>
          </PressableScale>
        );
      })}
      <ScienceLink id="kayiptan-kacinma" />
    </Card>
  );
}

function TimingCard() {
  const analysis = useAnalysis();
  const g = behaviorGap(analysis.metrics);
  if (g.gap === null) return null;
  const small = Math.abs(g.gap) < 0.005;
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle
        title="ZAMANLAMA FARKI"
        right={g.yearly ? 'yıllık' : `${analysis.metrics?.days ?? 0} gün`}
      />
      <Stats>
        <Stat
          label="Para ağırlıklı"
          value={pct(g.moneyWeighted)}
          tone={tone(g.moneyWeighted)}
          sub={g.yearly ? 'XIRR · senin getirin' : 'dönem · senin getirin'}
        />
        <Stat
          label="Zaman ağırlıklı"
          value={pct(g.timeWeighted)}
          tone={tone(g.timeWeighted)}
          sub="TWR · seçimlerin"
        />
      </Stats>
      <Verdict
        tone={small ? 'neutral' : g.gap > 0 ? 'up' : 'warning'}
        title={
          small
            ? 'Para giriş-çıkışlarının zamanlaması getiriyi pek etkilemedi'
            : g.gap > 0
              ? `Zamanlaman getiriye ${pts(g.gap)} ekledi`
              : `Zamanlaman getiriden ${pts(-g.gap)} götürdü`
        }
        text="Fark, paranın yükselişten önce mi sonra mı girdiğinden gelir. Morningstar’ın ölçümünde ABD’li fon yatırımcıları, 10 yılda bu yüzden yılda ortalama 1,2 puan kaybetti."
      />
      <ScienceLink id="davranis-farki" />
    </Card>
  );
}

function ActivityCard({ view }: { view: PortfolioView }) {
  const a = activity(view);
  if (a.trades === 0) return null;
  const levelTone = a.level === 'yüksek' ? 'warning' : a.level === 'orta' ? 'neutral' : 'up';
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="İŞLEM SIKLIĞI VE MALİYET" right={`${a.trades} işlem`} />
      <Stats>
        <Stat
          label="Aylık işlem"
          value={formatNumber(a.tradesPerMonth, { maxDecimals: 1 })}
          sub="alış + satış"
        />
        <Stat
          label="Devir hızı (yıllık)"
          value={a.turnover === null ? '—' : formatPercent(a.turnover, { decimals: 0 })}
          sub={a.level ? `${a.level} · portföyün yılda ne kadarı el değiştirdi` : undefined}
        />
        <Stat
          label="Yıllık maliyet oranı"
          value={a.costRatio === null ? '—' : formatPercent(a.costRatio, { decimals: 2 })}
          sub={`${formatMoney(a.commissions + a.accountFees, { decimals: 0 })} komisyon ve ücret`}
        />
        <Stat
          label="20 yılda maliyet payı"
          value={a.cost20y === null ? '—' : formatPercent(a.cost20y, { decimals: 1 })}
          sub="bu oran sürseydi servetten giden"
        />
      </Stats>
      {a.level ? (
        <Verdict
          tone={levelTone}
          title={`Devir hızın ${a.level}`}
          text={`Yıllık devir %${formatNumber(TURNOVER_BANDS.low * 100)} altı düşük, %${formatNumber(TURNOVER_BANDS.high * 100)} üstü yüksek sayılır (kaba bir ölçek). Barber ve Odean’ın çalışmasında en sık işlem yapanlar yılda %11,4, piyasa %17,9 getirdi.`}
        />
      ) : null}
      <Footnote>
        Devir hızı: yıl içindeki alış ve satışlardan küçük olanın ortalama portföy değerine oranı
        (fonlarda kullanılan tanım). {a.years < 1 ? 'Bir yıldan kısa geçmiş yıllığa çevrildi.' : ''}
      </Footnote>
      <ScienceLink id="asiri-islem" />
    </Card>
  );
}
