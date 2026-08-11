import { apiService } from '@/services/apiService';
import type { ProductCategory } from '@/services/productCategoryService';

export type Product = {
  id: number;
  company_id: number;
  name: string;
  category_id: number | null;
  category?: ProductCategory | null;
  sell_price: string | null;
  cost_price: string | null;
  tracks_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: number;
  product_id: number;
  type: 'restock' | 'sale' | 'adjustment';
  quantity_change: number;
  unit_cost: string | null;
  transaction_id: number | null;
  note: string | null;
  created_at: string;
};

export type ProductFormPayload = {
  name: string;
  category_id?: number | null;
  sell_price?: number | null;
  cost_price?: number | null;
  tracks_stock?: boolean;
  low_stock_threshold?: number | null;
};

export type RestockPayload = {
  quantity: number;
  unit_cost: number;
  note?: string | null;
  create_expense: boolean;
};

export type AdjustStockPayload = {
  quantity_change: number;
  note?: string | null;
};

export const productService = {
  list() {
    return apiService.get<Product[]>('/products').then((r) => r.data);
  },

  get(id: number) {
    return apiService.get<Product>(`/products/${id}`).then((r) => r.data);
  },

  create(payload: ProductFormPayload & { stock_quantity?: number }) {
    return apiService.post<Product>('/products', payload).then((r) => r.data);
  },

  update(id: number, payload: ProductFormPayload) {
    return apiService.put<Product>(`/products/${id}`, payload).then((r) => r.data);
  },

  remove(id: number) {
    return apiService.delete(`/products/${id}`);
  },

  restock(id: number, payload: RestockPayload) {
    return apiService
      .post<{ product: Product; movement: StockMovement; transaction: unknown }>(`/products/${id}/restock`, payload)
      .then((r) => r.data);
  },

  adjustStock(id: number, payload: AdjustStockPayload) {
    return apiService
      .post<{ product: Product; movement: StockMovement }>(`/products/${id}/adjust-stock`, payload)
      .then((r) => r.data);
  },

  movements(id: number) {
    return apiService.get<StockMovement[]>(`/products/${id}/movements`).then((r) => r.data);
  },
};
