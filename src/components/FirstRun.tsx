import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { getDatabase } from '@/data/database';
import { hasOwnRecords } from '@/data/service/portfolios';
import { useSettings } from '@/state/settings';

/**
 * Shows the welcome (docs/01-PROJE-DOKUMANI.md §6.10) on the first start. People who already
 * have records (an update from an older version) are marked as welcomed instead.
 */
export function FirstRun() {
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  const onboarded = useSettings((s) => s.onboarded);
  useEffect(() => useSettings.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (!hydrated || onboarded) return;
    let alive = true;
    getDatabase()
      .then(hasOwnRecords)
      .then((existing) => {
        if (!alive) return;
        if (existing) useSettings.getState().setOnboarded(true);
        else router.replace('/hosgeldin');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [hydrated, onboarded]);
  return null;
}
