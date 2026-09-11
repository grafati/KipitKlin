import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ensureSignedIn } from '@/services/auth';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    ensureSignedIn()
      .catch((error) => console.error("❌ Auth error:", error))
      .finally(() => {
        setAuthReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  if (!authReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}