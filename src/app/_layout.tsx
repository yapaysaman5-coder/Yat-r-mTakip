import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DatabaseZap } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMarketStore } from '@/state/market';
import { usePortfolioStore } from '@/state/portfolio';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button, EmptyState, ToastHost } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;
  const dataStatus = usePortfolioStore((s) => s.status);
  const init = usePortfolioStore((s) => s.init);
  const ready = fontsReady && (dataStatus === 'ready' || dataStatus === 'error');

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Market data starts once the stored figures are on screen.
  const startMarket = useMarketStore((s) => s.start);
  useEffect(() => {
    if (dataStatus === 'ready') startMarket();
  }, [dataStatus, startMarket]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {dataStatus === 'error' ? <DataError /> : <RootStack />}
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}

function DataError() {
  const { colors } = useTheme();
  const error = usePortfolioStore((s) => s.error);
  const reload = usePortfolioStore((s) => s.reload);
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space.xl }}>
      <EmptyState
        icon={DatabaseZap}
        title="Veriler açılamadı"
        message={`Kayıtların güvende; sadece okunamadı. Tekrar dene, sorun sürerse uygulamayı yeniden başlat.\n\n${error ?? ''}`}
      />
      <Button label="Tekrar dene" onPress={() => reload()} />
    </View>
  );
}
