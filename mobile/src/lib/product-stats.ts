import type { Product } from '@/services/productService';

export type ProductStats = {
  totalInventoryValue: number;
  lowStockCount: number;
  averageMarginPercent: number | null;
};

/** (sell_price - cost_price) / sell_price, as a whole percentage — null when either price is missing. */
export function productMarginPercent(product: Product): number | null {
  const sellPrice = product.sell_price ? Number(product.sell_price) : null;
  const costPrice = product.cost_price ? Number(product.cost_price) : null;

  if (!sellPrice || costPrice === null) {
    return null;
  }

  return ((sellPrice - costPrice) / sellPrice) * 100;
}

export function isLowStock(product: Product): boolean {
  return product.tracks_stock && product.low_stock_threshold !== null && product.stock_quantity <= product.low_stock_threshold;
}

/** Mirrors lib/journal-stats.ts's pure-function shape — computed entirely from the already-fetched Product[]. */
export function computeProductStats(products: Product[]): ProductStats {
  const totalInventoryValue = products
    .filter((p) => p.tracks_stock)
    .reduce((sum, p) => sum + p.stock_quantity * (p.cost_price ? Number(p.cost_price) : 0), 0);

  const lowStockCount = products.filter(isLowStock).length;

  const margins = products.map(productMarginPercent).filter((m): m is number => m !== null);
  const averageMarginPercent = margins.length ? margins.reduce((sum, m) => sum + m, 0) / margins.length : null;

  return { totalInventoryValue, lowStockCount, averageMarginPercent };
}
