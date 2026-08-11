import { apiService } from '@/services/apiService';

export type ProductCategory = {
  id: number;
  company_id: number;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryPayload = {
  name: string;
  icon?: string | null;
  color?: string | null;
};

export const productCategoryService = {
  list() {
    return apiService.get<ProductCategory[]>('/product-categories').then((r) => r.data);
  },

  create(payload: ProductCategoryPayload) {
    return apiService.post<ProductCategory>('/product-categories', payload).then((r) => r.data);
  },

  update(id: number, payload: ProductCategoryPayload) {
    return apiService.put<ProductCategory>(`/product-categories/${id}`, payload).then((r) => r.data);
  },

  remove(id: number) {
    return apiService.delete(`/product-categories/${id}`);
  },
};
