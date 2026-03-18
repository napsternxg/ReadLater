import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { initDb } from '../db';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';
import { useRouter } from 'expo-router';
import { AppState } from 'react-native';
import { syncPush, syncPull } from '../utils/sync';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const [dbReady, setDbReady] = useState(false);

  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        syncPull();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        syncPush();
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (hasShareIntent && shareIntent && dbReady) {
      // expo-share-intent v5+ uses text, files, type properties
      // The shared URL is typically in shareIntent.value or shareIntent.text
      const sharedValue = (shareIntent as any).value || (shareIntent as any).text;
      
      if (sharedValue) {
        resetShareIntent();
        
        // Use a slightly longer delay and router.replace to ensure it takes effect
        setTimeout(() => {
          router.push({ pathname: '/add', params: { url: sharedValue } });
        }, 500);
      }
    }
  }, [hasShareIntent, shareIntent, dbReady, error, router]);

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
        <Stack.Screen name="sql-runner" options={{ title: 'SQL Query Runner' }} />
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
