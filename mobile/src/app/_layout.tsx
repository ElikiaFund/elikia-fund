import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { VaultProvider } from '@/context/vault-context';
import { initDatabase } from '@/db/database';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <VaultProvider>
          <RootNavigator />
        </VaultProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const needsOnboarding = isAuthenticated && !user?.onboarding_completed_at;

  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !needsOnboarding}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vault-activate" options={{ presentation: 'modal', title: 'Activer le coffre' }} />
        <Stack.Screen name="vault-unlock" options={{ presentation: 'modal', title: 'Déverrouiller le coffre' }} />
      </Stack.Protected>
    </Stack>
  );
}
