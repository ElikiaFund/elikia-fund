import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiService } from '@/services/apiService';

/**
 * Requests notification permission (if not already decided) and registers this device's Expo
 * push token with the backend. Best-effort by design — a denied permission, a simulator with
 * no push capability, or a network hiccup should never block login/app start, so failures are
 * swallowed by the caller rather than surfaced here.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await apiService.post('/me/push-token', { push_token: pushToken });
}
