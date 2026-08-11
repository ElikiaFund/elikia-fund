import * as SecureStore from 'expo-secure-store';

import { apiService } from '@/services/apiService';

export type FeeRates = {
  contribution_yabeto_percent: number;
  contribution_elikia_percent: number;
  deposit_yabeto_percent: number;
  deposit_elikia_percent: number;
  deposit_yabeto_fixed: number;
  deposit_elikia_fixed: number;
  withdrawal_yabeto_percent: number;
  withdrawal_elikia_percent: number;
};

/** Matches the confirmed defaults seeded server-side — used only if a brand-new install has never synced once. */
export const FALLBACK_FEE_RATES: FeeRates = {
  contribution_yabeto_percent: 3.5,
  contribution_elikia_percent: 1,
  deposit_yabeto_percent: 3.5,
  deposit_elikia_percent: 0.5,
  deposit_yabeto_fixed: 25,
  deposit_elikia_fixed: 75,
  withdrawal_yabeto_percent: 2,
  withdrawal_elikia_percent: 0.5,
};

const CACHE_KEY = 'elikia_fee_rates';

export const feeService = {
  /** Admin-configured in Paramètres > Frais, not hardcoded — network-first so a rate change reaches the app on next open, falling back to the last cached copy when offline, then to FALLBACK_FEE_RATES. */
  async get(): Promise<FeeRates> {
    try {
      const { data } = await apiService.get<FeeRates>('/settings/fees');
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(data));
      return data;
    } catch {
      const cached = await SecureStore.getItemAsync(CACHE_KEY);
      return cached ? (JSON.parse(cached) as FeeRates) : FALLBACK_FEE_RATES;
    }
  },
};

export function contributionPercent(rates: FeeRates): number {
  return rates.contribution_yabeto_percent + rates.contribution_elikia_percent;
}

export function depositPercent(rates: FeeRates): number {
  return rates.deposit_yabeto_percent + rates.deposit_elikia_percent;
}

export function withdrawalPercent(rates: FeeRates): number {
  return rates.withdrawal_yabeto_percent + rates.withdrawal_elikia_percent;
}

export function depositFixed(rates: FeeRates): number {
  return rates.deposit_yabeto_fixed + rates.deposit_elikia_fixed;
}
