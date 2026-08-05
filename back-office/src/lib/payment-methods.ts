export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
}

export function paymentMethodLabel(value: string | null): string {
  return value ? (PAYMENT_METHOD_LABELS[value] ?? value) : '—'
}
