export type TransactionPaymentMethod = 'cash' | 'mtn_momo' | 'airtel_money';

export const TRANSACTION_PAYMENT_METHODS: { value: TransactionPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'airtel_money', label: 'Airtel Money' },
];

export function paymentMethodLabel(value: string | null): string {
  return TRANSACTION_PAYMENT_METHODS.find((method) => method.value === value)?.label ?? '—';
}
