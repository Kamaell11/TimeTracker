import '../src/i18n';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { getSettings } from '../src/storage';
import i18n from '../src/i18n';

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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal', title: 'Calculator' }} />
    </Stack>
  );
}
