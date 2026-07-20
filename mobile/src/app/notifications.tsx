import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationService, type AppNotification } from '@/services/notificationService';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const TYPE_ICONS: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  contribution_reminder: 'time-outline',
  late_payment: 'alert-circle-outline',
  late_payment_summary: 'alert-circle-outline',
  cycle_report: 'document-text-outline',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    notificationService
      .list()
      .then(setNotifications)
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handlePress(notification: AppNotification) {
    if (!notification.read_at) {
      setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)));
      notificationService.markRead(notification.id).catch(() => {});
    }

    if (!notification.group_id) {
      return;
    }

    if (notification.type === 'cycle_report') {
      router.push({
        pathname: '/group-report',
        params: { id: String(notification.group_id), cycle: notification.cycle_period ?? '' },
      });
    } else {
      router.push({ pathname: '/group/[id]', params: { id: String(notification.group_id) } });
    }
  }

  async function handleMarkAllRead() {
    setNotifications((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await notificationService.markAllRead().catch(() => {});
  }

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () =>
            hasUnread ? (
              <Pressable onPress={handleMarkAllRead} hitSlop={8}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Tout marquer lu
                </ThemedText>
              </Pressable>
            ) : null,
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={28} color={theme.textSecondary} />
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Aucune notification pour l&apos;instant.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handlePress(notification)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: theme.border, backgroundColor: notification.read_at ? theme.background : theme.backgroundElement },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name={TYPE_ICONS[notification.type]} size={18} color={theme.tint} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText type="smallBold">{notification.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {notification.body}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.rowDate}>
                  {dateFormatter.format(new Date(notification.created_at))}
                </ThemedText>
              </View>
              {!notification.read_at && <View style={[styles.unreadDot, { backgroundColor: theme.tint }]} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    marginTop: Spacing.one,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.one,
  },
});
