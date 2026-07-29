export type JournalStatsEntry = {
  type: 'income' | 'expense';
  amount: number;
};

export type JournalStats = {
  totalIncome: number;
  totalExpense: number;
  net: number;
  closingBalance: number;
  count: number;
};

/**
 * Shared income/expense/net rollup over a set of cash-flow entries — used by both the journal PDF
 * (lib/pdf.ts#buildJournalCaisseHtml) and the cash-session close screen, so the summary a user
 * sees on screen before closing is always the same arithmetic as what ends up in the document.
 */
export function computeJournalStats(entries: JournalStatsEntry[], openingBalance: number): JournalStats {
  const totalIncome = entries.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const net = totalIncome - totalExpense;

  return { totalIncome, totalExpense, net, closingBalance: openingBalance + net, count: entries.length };
}
