import * as SecureStore from 'expo-secure-store';

import { apiService } from '@/services/apiService';

export type ContactInfo = {
  support_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
};

const CACHE_KEY = 'elikia_contact_info';

export const contactService = {
  /**
   * Admin-configured in Paramètres > Général, not hardcoded — network-first so a change made
   * there reaches the app on next open, falling back to the last cached copy when offline.
   */
  async get(): Promise<ContactInfo | null> {
    try {
      const { data } = await apiService.get<ContactInfo>('/settings/contact');
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(data));
      return data;
    } catch {
      const cached = await SecureStore.getItemAsync(CACHE_KEY);
      return cached ? (JSON.parse(cached) as ContactInfo) : null;
    }
  },
};
