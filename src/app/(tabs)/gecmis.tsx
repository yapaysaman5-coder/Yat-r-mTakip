import { Search } from 'lucide-react-native';
import { useState } from 'react';

import { Cash } from '@/components/history/Cash';
import { Realized } from '@/components/history/Realized';
import { Statement } from '@/components/history/Statement';
import { Transactions } from '@/components/history/Transactions';
import { IconButton, Screen, SegmentedControl, TabHeader } from '@/ui';

type Section = 'txns' | 'realized' | 'cash' | 'statement';

/**
 * Geçmiş (docs/01-PROJE-DOKUMANI.md §6.5): İşlemler, Gerçekleşen K/Z, Nakit Hareketleri and
 * Aylık Ekstre of the active portfolio.
 */
export default function HistoryScreen() {
  const [section, setSection] = useState<Section>('txns');
  const [searching, setSearching] = useState(false);
  return (
    <Screen
      withTabBar
      header={
        <TabHeader
          title="Geçmiş"
          right={
            <IconButton
              icon={Search}
              accessibilityLabel="İşlem ara"
              onPress={() => {
                setSection('txns');
                setSearching((s) => !s);
              }}
            />
          }
        />
      }>
      <SegmentedControl
        value={section}
        onChange={setSection}
        options={[
          { key: 'txns', label: 'İşlemler' },
          { key: 'realized', label: 'K/Z' },
          { key: 'cash', label: 'Nakit' },
          { key: 'statement', label: 'Ekstre' },
        ]}
      />
      {section === 'txns' ? (
        <Transactions searching={searching} onCloseSearch={() => setSearching(false)} />
      ) : null}
      {section === 'realized' ? <Realized /> : null}
      {section === 'cash' ? <Cash /> : null}
      {section === 'statement' ? <Statement /> : null}
    </Screen>
  );
}
