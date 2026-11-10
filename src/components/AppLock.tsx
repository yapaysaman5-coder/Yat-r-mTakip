import { Fingerprint, LockKeyhole } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';

import { setScreenProtection, unlock } from '@/lib/security';
import { create } from 'zustand';

import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button, IconWell, Text } from '@/ui';

/** Whether this run of the app was unlocked (not saved: every start begins locked). */
export const useLockStore = create<{ unlocked: boolean; setUnlocked: (v: boolean) => void }>()(
  (set) => ({ unlocked: false, setUnlocked: (unlocked) => set({ unlocked }) }),
);

/**
 * Kilit ekranı (docs/01-PROJE-DOKUMANI.md §6.11). With the lock on, the app opens locked and
 * locks again after the chosen time in the background; fingerprint / face, or the device PIN,
 * opens it. Also applies "start with amounts hidden" and the screen protection.
 */
export function AppLock() {
  const { colors } = useTheme();
  const lockEnabled = useSettings((s) => s.lockEnabled);
  const lockAfter = useSettings((s) => s.lockAfter);
  const secureScreen = useSettings((s) => s.secureScreen);
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  const unlocked = useLockStore((s) => s.unlocked);
  const setUnlocked = useLockStore((s) => s.setUnlocked);
  const [failed, setFailed] = useState(false);
  const leftAt = useRef<number | null>(null);
  const locked = hydrated && lockEnabled && !unlocked;

  // On start: hide amounts if asked (once the saved settings are read).
  useEffect(() => {
    const apply = () => {
      const s = useSettings.getState();
      if (s.startHidden && !s.privacyMode) s.togglePrivacyMode();
    };
    if (useSettings.persist.hasHydrated()) apply();
    return useSettings.persist.onFinishHydration(() => {
      setHydrated(true);
      apply();
    });
  }, []);

  useEffect(() => {
    if (hydrated) setScreenProtection(secureScreen).catch(() => undefined);
  }, [hydrated, secureScreen]);

  // Lock again after the chosen time in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!lockEnabled) return;
      if (next === 'background') leftAt.current = Date.now();
      if (next === 'active' && leftAt.current !== null) {
        if (Date.now() - leftAt.current >= lockAfter * 1000) setUnlocked(false);
        leftAt.current = null;
      }
    });
    return () => sub.remove();
  }, [lockEnabled, lockAfter, setUnlocked]);

  const tryUnlock = async () => {
    setFailed(false);
    const ok = await unlock().catch(() => false);
    if (ok) setUnlocked(true);
    else setFailed(true);
  };

  // Ask right away when the lock appears.
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => void tryUnlock(), 250);
    return () => clearTimeout(t);
  }, [locked]);

  if (!locked) return null;
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.lg,
        zIndex: 1000,
      }}>
      <IconWell background={colors.accentSoft} size={84}>
        <LockKeyhole size={40} color={colors.accent} strokeWidth={2.2} />
      </IconWell>
      <Text variant="title2" align="center">
        Yatırım Takip kilitli
      </Text>
      <Text variant="body" tone="secondary" align="center">
        Devam etmek için parmak izini, yüzünü veya telefonunun şifresini kullan.
      </Text>
      {failed ? (
        <Text variant="footnote" tone="down" align="center">
          Kilit açılamadı. Tekrar dene.
        </Text>
      ) : null}
      <Button label="Kilidi aç" icon={Fingerprint} onPress={tryUnlock} />
    </View>
  );
}
