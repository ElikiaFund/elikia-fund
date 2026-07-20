import { apiService } from '@/services/apiService';

export type Product = {
  id: number;
  user_id: number;
  name: string;
  category: string | null;
  unit_price: string | null;
  created_at: string;
  updated_at: string;
};

/** Company categories that get a product/service catalog step during onboarding and a manager screen. */
export const CATALOG_ENABLED_CATEGORIES = ['commerce', 'restauration', 'services'] as const;

export const productService = {
  list() {
    return apiService.get<Product[]>('/products').then((r) => r.data);
  },

  create(name: string, category?: string, unitPrice?: number) {
    return apiService
      .post<Product>('/products', { name, category: category || null, unit_price: unitPrice ?? null })
      .then((r) => r.data);
  },

  update(id: number, name: string, category?: string, unitPrice?: number) {
    return apiService
      .put<Product>(`/products/${id}`, { name, category: category || null, unit_price: unitPrice ?? null })
      .then((r) => r.data);
  },

  remove(id: number) {
    return apiService.delete(`/products/${id}`);
  },
};
