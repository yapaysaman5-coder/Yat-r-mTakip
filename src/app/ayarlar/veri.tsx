import {
  Database,
  Download,
  Gauge,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { getDatabase } from '@/data/database';
import { removeDemo, seedDemo } from '@/data/demo/seed';
import {
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  type BackupError,
  type BackupFile,
  type BackupSummary,
} from '@/data/service/backup';
import { dataStats, engineSpeedTest, wipeAll, type DataStats } from '@/data/service/maintenance';
import { pickBackupFile, shareBackupFile } from '@/lib/backupFile';
import { usePortfolioStore } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Button,
  Card,
  IconWell,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  StackHeader,
  Text,
  toast,
} from '@/ui';
import { formatDateTime, formatNumber } from '@/utils/format';

const BACKUP_ERRORS: Record<BackupError, string> = {
  NOT_JSON: 'Bu dosya bir yedek dosyası değil (okunamadı).',
  NOT_A_BACKUP: 'Bu dosya Yatırım Takip yedeği değil.',
  NEWER_VERSION: 'Yedek, uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelle.',
  MALFORMED: 'Yedek dosyası bozuk görünüyor; hiçbir şey değiştirilmedi.',
  INVALID_RECORDS: 'Yedekte geçersiz bir kayıt var; hiçbir şey değiştirilmedi.',
  INCONSISTENT:
    'Yedekteki kayıtlar tutarsız (eldekinden fazla satış gibi); hiçbir şey değiştirilmedi.',
};

/** Settings kept in a backup (appearance and preferences; not the active portfolio). */
function settingsSnapshot() {
  const s = useSettings.getState();
  return {
    themePreference: s.themePreference,
    colorBlindSafe: s.colorBlindSafe,
    privacyMode: s.privacyMode,
    hapticsEnabled: s.hapticsEnabled,
    changeDisplay: s.changeDisplay,
  };
}

export default function DataScreen() {
  const { colors } = useTheme();
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const loadMs = usePortfolioStore((s) => s.loadMs);
  const reload = usePortfolioStore((s) => s.reload);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restore, setRestore] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(
    null,
  );
  const [wipeStep, setWipeStep] = useState(false);
  const [speed, setSpeed] = useState<{ count: number; ms: number }[] | null>(null);
  const demo = portfolios.find((p) => p.kind === 'demo');

  // Counts refresh whenever the portfolio list changes (restore, example, wipe).
  useEffect(() => {
    let alive = true;
    getDatabase()
      .then(dataStats)
      .then((s) => {
        if (alive) setStats(s);
      });
    return () => {
      alive = false;
    };
  }, [portfolios]);

  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const onExport = () =>
    run('export', async () => {
      const file = await exportBackup(await getDatabase(), { settings: settingsSnapshot() });
      await shareBackupFile(backupFileName(), JSON.stringify(file, null, 1));
    });

  const onPick = () =>
    run('import', async () => {
      const picked = await pickBackupFile();
      if (!picked) return;
      const parsed = parseBackup(picked.text);
      if (!parsed.ok) {
        toast.show({ message: BACKUP_ERRORS[parsed.error], tone: 'danger' });
        return;
      }
      setRestore({ backup: parsed.backup, summary: parsed.summary });
    });

  const onRestore = () =>
    run('restore', async () => {
      if (!restore) return;
      await importBackup(await getDatabase(), restore.backup);
      const s = restore.backup.settings;
      if (s) useSettings.setState({ ...s, activePortfolioId: null });
      setRestore(null);
      await reload();
      toast.show({ message: 'Yedek geri yüklendi', tone: 'success' });
    });

  const onDemo = (action: 'add' | 'remove') =>
    run(`demo-${action}`, async () => {
      const db = await getDatabase();
      if (action === 'add') await seedDemo(db, { now: new Date() });
      else await removeDemo(db);
      await reload();
      toast.show({
        message:
          action === 'add'
            ? 'Örnek portföy bugüne göre yeniden oluşturuldu'
            : 'Örnek portföy kaldırıldı',
        tone: 'success',
      });
    });

  const onWipe = () =>
    run('wipe', async () => {
      await wipeAll(await getDatabase());
      useSettings.getState().setActivePortfolioId(null);
      setWipeStep(false);
      await reload();
      toast.show({ message: 'Tüm veriler silindi' });
    });

  const onSpeed = () =>
    run('speed', async () => {
      setSpeed(null);
      // Let the "Ölçülüyor…" state paint before the busy work.
      await new Promise((r) => setTimeout(r, 50));
      setSpeed([engineSpeedTest(1000), engineSpeedTest(10_000)]);
    });

  const icon = (Icon: LucideIcon, color: string, bg: string) => (
    <IconWell background={bg} size={34}>
      <Icon size={17} color={color} strokeWidth={2.4} />
    </IconWell>
  );

  return (
    <Screen header={<StackHeader title="Veri ve Yedekleme" />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {icon(Database, colors.accent, colors.accentSoft)}
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Veriler bu telefonda</Text>
            <Text variant="caption" tone="secondary">
              Hesap ya da sunucu yok. Kayıtlar telefonun kendi şifrelemesiyle korunur.
            </Text>
          </View>
        </View>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg }}>
          <Stat label="Portföy" value={stats ? String(stats.portfolios) : '…'} />
          <Stat label="Kayıt" value={stats ? formatNumber(stats.transactions) : '…'} />
          <Stat label="Günlük fiyat" value={stats ? formatNumber(stats.closes) : '…'} />
          <Stat label="Açılış hesabı" value={`${formatNumber(loadMs)} ms`} />
        </View>
        <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
          Veritabanı şeması: sürüm {stats?.schemaVersion ?? '…'} · Uygulama güncellense de veriler
          korunur.
        </Text>
      </Card>

      <Group title="YEDEKLEME">
        <ListRow
          title="Yedeği dışa aktar"
          subtitle="Tek dosya (JSON): Drive’a, e-postaya veya dosyalara kaydet"
          leading={icon(Upload, colors.accent, colors.accentSoft)}
          showChevron
          onPress={onExport}
        />
        <ListRow
          title="Yedekten geri yükle"
          subtitle="Önce dosya kontrol edilir, sonra onayınla tüm veriler değişir"
          leading={icon(Download, colors.accent2, colors.accent2Soft)}
          showChevron
          onPress={onPick}
        />
      </Group>

      <Group title="ÖRNEK PORTFÖY">
        {demo ? (
          <>
            <ListRow
              title="Örneği bugüne taşı"
              subtitle="Kurgusal geçmiş bugün bitecek şekilde yeniden oluşturulur"
              leading={icon(RefreshCw, colors.accent2, colors.accent2Soft)}
              showChevron
              onPress={() => onDemo('add')}
            />
            <ListRow
              title="Örnek portföyü kaldır"
              subtitle="Kendi portföylerine dokunulmaz"
              leading={icon(Trash2, colors.textSecondary, colors.neutralSoft)}
              showChevron
              onPress={() => onDemo('remove')}
            />
          </>
        ) : (
          <ListRow
            title="Örnek portföy ekle"
            subtitle="Uygulamayı kurgusal bir geçmişle keşfet"
            leading={icon(Sparkles, colors.accent2, colors.accent2Soft)}
            showChevron
            onPress={() => onDemo('add')}
          />
        )}
      </Group>

      <Group title="HIZ TESTİ">
        <ListRow
          title="Hesaplama hız testi"
          subtitle="Bu telefonda 1.000 ve 10.000 kaydı baştan hesaplar (hedef: 10.000 kayıt < 200 ms)"
          leading={icon(Gauge, colors.accent, colors.accentSoft)}
          showChevron
          onPress={onSpeed}
        />
        {busy === 'speed' || speed ? (
          <View style={{ paddingBottom: space.md, gap: space.xs }}>
            {speed ? (
              speed.map((r) => (
                <View
                  key={r.count}
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="subhead" tone="secondary">
                    {formatNumber(r.count)} kayıt
                  </Text>
                  <Text variant="numM">{formatNumber(r.ms)} ms</Text>
                </View>
              ))
            ) : (
              <Text variant="subhead" tone="secondary">
                Ölçülüyor…
              </Text>
            )}
          </View>
        ) : null}
      </Group>

      <Group title="TEHLİKELİ BÖLGE">
        <ListRow
          title="Tüm verileri sil"
          subtitle="Bütün portföyler, kayıtlar ve fiyatlar silinir"
          leading={icon(Trash2, colors.down, colors.downSoft)}
          showChevron
          onPress={() => setWipeStep(true)}
        />
      </Group>

      <Sheet
        visible={!!restore}
        onClose={() => setRestore(null)}
        title="Yedekten geri yükle"
        subtitle="Bu telefondaki tüm portföyler ve kayıtlar, yedektekilerle değişecek.">
        {restore ? (
          <View style={{ gap: space.lg }}>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.lg,
                padding: space.lg,
                gap: space.sm,
              }}>
              <Line
                label="Yedek tarihi"
                value={
                  restore.summary.exportedAt ? formatDateTime(restore.summary.exportedAt) : '—'
                }
              />
              <Line label="Portföy" value={String(restore.summary.portfolios)} />
              <Line label="Kayıt" value={formatNumber(restore.summary.transactions)} />
              <Line label="Varlık" value={formatNumber(restore.summary.assets)} />
            </View>
            <Text variant="footnote" tone="secondary">
              Dosya kontrol edildi: biçimi doğru, kayıtları tutarlı. Fiyat geçmişi yedekte tutulmaz;
              piyasa verisi geldiğinde (Faz 4) yeniden indirilir.
            </Text>
            <Button
              label="Geri Yükle"
              onPress={onRestore}
              disabled={busy === 'restore'}
              fullWidth
            />
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={wipeStep}
        onClose={() => setWipeStep(false)}
        title="Tüm veriler silinsin mi?"
        subtitle="Bu işlem geri alınamaz. İstersen önce yedeğini al.">
        <View style={{ gap: space.sm }}>
          <Button label="Önce yedeği dışa aktar" variant="secondary" onPress={onExport} fullWidth />
          <Button
            label="Evet, hepsini sil"
            variant="danger"
            onPress={onWipe}
            disabled={busy === 'wipe'}
            fullWidth
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title={title} style={{ paddingHorizontal: space.xs }} />
      <Card padding={0} style={{ paddingHorizontal: space.lg }}>
        {children}
      </Card>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        gap: 2,
      }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="numM">{value}</Text>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="subhead" tone="secondary">
        {label}
      </Text>
      <Text variant="numM">{value}</Text>
    </View>
  );
}
