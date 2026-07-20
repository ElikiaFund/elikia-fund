import { apiService, ApiError } from '@/services/apiService';

export type Vault = {
  id: number;
  balance: string;
  pin_set_at: string | null;
  created_at: string;
};

export type VaultMovement = {
  id: number;
  type: 'deposit' | 'withdraw';
  amount: string;
  note: string | null;
  status: string;
  created_at: string;
};

export type PaymentMethod = 'mtn_momo' | 'airtel_money';

export type VaultTransactionResult = {
  vault: Vault;
  movement: VaultMovement;
};

export const vaultService = {
  activate(pin: string) {
    return apiService.post('/vault/activate', { pin, pin_confirmation: pin }).then((r) => r.data);
  },

  verifyPin(pin: string) {
    return apiService.post('/vault/pin/verify', { pin }).then((r) => r.data);
  },

  /** Returns the vault, or null if the user hasn't activated one yet. */
  async getVault(): Promise<Vault | null> {
    try {
      const response = await apiService.get<Vault>('/vault');
      return response.data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return null;
      }
      throw e;
    }
  },

  getMovements() {
    return apiService.get<VaultMovement[]>('/vault/movements').then((r) => r.data);
  },

  deposit(amount: number, pin: string, paymentMethod: PaymentMethod, phone: string) {
    return apiService
      .post<VaultTransactionResult>('/vault/deposit', { amount, pin, payment_method: paymentMethod, phone })
      .then((r) => r.data);
  },

  withdraw(amount: number, pin: string, paymentMethod: PaymentMethod, phone: string) {
    return apiService
      .post<VaultTransactionResult>('/vault/withdraw', { amount, pin, payment_method: paymentMethod, phone })
      .then((r) => r.data);
  },
};
