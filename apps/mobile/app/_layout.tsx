import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { initDb } from '../db';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';
import { useRouter } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const [dbReady, setDbReady] = useState(false);

  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const router = useRouter();

  useEffect(() => {
    if (hasShareIntent && shareIntent.value && shareIntent.type === 'text') {
      // Small delay to ensure navigation is ready
      const url = shareIntent.value;
      resetShareIntent();
      router.push({ pathname: '/add', params: { url } });
    }
  }, [hasShareIntent, shareIntent, router]);

  useEffect(() => {
    initDb()
      .then(() => {
        setDbReady(true);
        SplashScreen.hideAsync();
      })
      .catch(console.error);
  }, []);

  if (!dbReady) {
    return null;
  }

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Add Link', presentation: 'modal' }} />
        <Stack.Screen name="edit" options={{ title: 'Edit Link' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ShareIntentProvider>
        <RootLayoutContent />
      </ShareIntentProvider>
    </ThemeProvider>
  );
}
