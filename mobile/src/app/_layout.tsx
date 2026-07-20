import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { SyncProvider } from '@/context/sync-context';
import { VaultProvider } from '@/context/vault-context';
import { initDatabase } from '@/db/database';

// Must run once at module scope, before any component mounts, so a notification that arrives
// while the app is foregrounded still shows a banner instead of being silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <SyncProvider>
          <VaultProvider>
            <RootNavigator />
          </VaultProvider>
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const needsOnboarding = isAuthenticated && !user?.onboarding_completed_at;

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { group_id?: number } | undefined;

      if (data?.group_id) {
        router.push({ pathname: '/group/[id]', params: { id: String(data.group_id) } });
      } else {
        router.push('/notifications');
      }
    });

    return () => subscription.remove();
  }, [router]);

  if (isLoading) {
    return null;
  }

  return (
    // headerBackButtonDisplayMode: 'minimal' — otherwise the back button's label defaults to
    // the *previous* screen's title, and falls back to the literal route name ("(tabs)",
    // "group/[id]") for any screen that doesn't set an explicit title (most of the modal/detail
    // screens here use headerShown: false and rely on their own custom header instead).
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !needsOnboarding}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vault-activate" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="vault-unlock" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal', title: 'Nouvelle transaction' }} />
        <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
        <Stack.Screen name="vault-transaction" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="create-group" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="join-group" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Modifier le profil' }} />
        <Stack.Screen name="products" options={{ title: 'Produits & services' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="security-pin" options={{ title: 'Sécurité et code PIN' }} />
        <Stack.Screen name="group-report" options={{ title: 'Rapport de tontine' }} />
      </Stack.Protected>
    </Stack>
  );
}
