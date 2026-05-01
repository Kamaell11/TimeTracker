import '../src/i18n';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { getSettings } from '../src/storage';
import i18n from '../src/i18n';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal', title: 'Calculator', headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' } }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      i18n.changeLanguage(s.language);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  );
}
