import { apiService } from '@/services/apiService';

export const vaultService = {
  activate(pin: string) {
    return apiService.post('/vault/activate', { pin, pin_confirmation: pin }).then((r) => r.data);
  },

  verifyPin(pin: string) {
    return apiService.post('/vault/pin/verify', { pin }).then((r) => r.data);
  },
};
