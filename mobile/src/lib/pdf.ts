import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Fixed light palette for generated documents — a financial statement should read like paper
// regardless of the app's current theme, so this deliberately doesn't follow dark mode.
const INK = '#1A1A17';
const INK_SECONDARY = '#6B675E';
const PAPER = '#FAF8F4';
const SURFACE = '#F1EEE7';
const BORDER = '#DEDACD';
const TINT = '#1B6F52';
const INCOME = '#4C7A63';
const DANGER = '#B5544A';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

function baseStyles(): string {
  return `
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: ${INK};
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 2px solid ${TINT};
      margin-bottom: 20px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-mark {
      width: 32px; height: 32px; border-radius: 10px;
      background: ${TINT}; color: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 15px;
    }
    .brand-name { font-size: 15px; font-weight: 800; }
    .brand-name .accent { color: ${TINT}; }
    .doc-meta { text-align: right; font-size: 10px; color: ${INK_SECONDARY}; }
    .title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .subtitle { font-size: 12px; color: ${INK_SECONDARY}; margin: 0 0 20px; }
    .info-grid {
      display: flex; gap: 12px; margin-bottom: 20px;
    }
    .info-box {
      flex: 1; background: ${SURFACE}; border: 1px solid ${BORDER};
      border-radius: 10px; padding: 12px 14px;
    }
    .info-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: ${INK_SECONDARY}; margin-bottom: 4px; }
    .info-value { font-size: 15px; font-weight: 700; }
    .info-value.income { color: ${INCOME}; }
    .info-value.expense { color: ${DANGER}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th {
      text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
      color: ${INK_SECONDARY}; padding: 8px 10px; border-bottom: 1.5px solid ${INK};
    }
    thead th.amount { text-align: right; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid ${BORDER}; font-size: 11px; vertical-align: top; }
    tbody tr:nth-child(even) { background: ${SURFACE}; }
    td.amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.amount.income { color: ${INCOME}; }
    td.amount.expense { color: ${DANGER}; }
    .note { color: ${INK_SECONDARY}; font-size: 10px; }
    .footer {
      margin-top: 28px; padding-top: 12px; border-top: 1px solid ${BORDER};
      font-size: 9px; color: ${INK_SECONDARY}; display: flex; justify-content: space-between;
    }
    .empty { text-align: center; padding: 40px 0; color: ${INK_SECONDARY}; }
  `;
}

function documentHeader(title: string, subtitle: string): string {
  return `
    <div class="header">
      <div class="brand">
        <div class="brand-mark">E</div>
        <div class="brand-name"><span class="accent">Elikia</span> Fund</div>
      </div>
      <div class="doc-meta">Généré le ${dateTimeFormatter.format(new Date())}</div>
    </div>
    <div class="title">${title}</div>
    <div class="subtitle">${subtitle}</div>
  `;
}

function documentFooter(): string {
  return `
    <div class="footer">
      <span>Elikia Fund, document généré automatiquement, à titre informatif.</span>
      <span>elikia-fund.test</span>
    </div>
  `;
}

export type StatementTransaction = {
  occurred_at: string;
  category_label: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  type: 'income' | 'expense';
  amount: number;
};

export function buildTransactionsStatementHtml(options: {
  userName: string;
  periodLabel: string;
  transactions: StatementTransaction[];
}): string {
  const { userName, periodLabel, transactions } = options;

  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const net = incomeTotal - expenseTotal;

  const rows = transactions.length
    ? transactions
        .map((t) => {
          const detail = [t.product_name ? `${t.product_name}${t.quantity ? ` × ${t.quantity}` : ''}` : null, t.note]
            .filter(Boolean)
            .join(' · ');

          return `
        <tr>
          <td>${dateFormatter.format(new Date(t.occurred_at))}</td>
          <td>${t.category_label}${detail ? `<div class="note">${escapeHtml(detail)}</div>` : ''}</td>
          <td class="amount ${t.type}">${t.type === 'income' ? '+' : '−'} ${currency.format(t.amount)}</td>
        </tr>`;
        })
        .join('')
    : `<tr><td colspan="3" class="empty">Aucune transaction pour cette période.</td></tr>`;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${baseStyles()}</style></head>
      <body>
        ${documentHeader('Relevé de trésorerie', `${escapeHtml(userName)} · ${escapeHtml(periodLabel)}`)}
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Revenus</div>
            <div class="info-value income">${currency.format(incomeTotal)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Dépenses</div>
            <div class="info-value expense">${currency.format(expenseTotal)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Solde net</div>
            <div class="info-value">${currency.format(net)}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Catégorie</th><th class="amount">Montant</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${documentFooter()}
      </body>
    </html>
  `;
}

export type StatementMovement = {
  created_at: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  note: string | null;
};

export function buildVaultStatementHtml(options: {
  userName: string;
  periodLabel: string;
  balance: number;
  movements: StatementMovement[];
}): string {
  const { userName, periodLabel, balance, movements } = options;

  const depositsTotal = movements.filter((m) => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
  const withdrawalsTotal = movements.filter((m) => m.type === 'withdraw').reduce((sum, m) => sum + m.amount, 0);

  const rows = movements.length
    ? movements
        .map(
          (m) => `
        <tr>
          <td>${dateFormatter.format(new Date(m.created_at))}</td>
          <td>${m.type === 'deposit' ? 'Dépôt' : 'Retrait'}${m.note ? `<div class="note">${escapeHtml(m.note)}</div>` : ''}</td>
          <td class="amount ${m.type === 'deposit' ? 'income' : 'expense'}">${m.type === 'deposit' ? '+' : '−'} ${currency.format(m.amount)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">Aucun mouvement pour cette période.</td></tr>`;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${baseStyles()}</style></head>
      <body>
        ${documentHeader('Relevé du coffre', `${escapeHtml(userName)} · ${escapeHtml(periodLabel)}`)}
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Solde actuel</div>
            <div class="info-value">${currency.format(balance)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Dépôts</div>
            <div class="info-value income">${currency.format(depositsTotal)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Retraits</div>
            <div class="info-value expense">${currency.format(withdrawalsTotal)}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Mouvement</th><th class="amount">Montant</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${documentFooter()}
      </body>
    </html>
  `;
}

export type ReportContribution = {
  user_name: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  paid_at: string;
};

export function buildTontineReportHtml(options: {
  groupName: string;
  cyclePeriod: string;
  membersCount: number;
  paidCount: number;
  lateCount: number;
  totalCollected: number;
  totalFees: number;
  totalNet: number;
  contributions: ReportContribution[];
  lateMembers: string[];
}): string {
  const {
    groupName,
    cyclePeriod,
    membersCount,
    paidCount,
    lateCount,
    totalCollected,
    totalFees,
    totalNet,
    contributions,
    lateMembers,
  } = options;

  const rows = contributions.length
    ? contributions
        .map(
          (c) => `
        <tr>
          <td>${escapeHtml(c.user_name)}</td>
          <td>${dateFormatter.format(new Date(c.paid_at))}</td>
          <td class="amount">${currency.format(c.amount)}</td>
          <td class="amount">${currency.format(c.fee_amount)}</td>
          <td class="amount income">${currency.format(c.net_amount)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="5" class="empty">Aucune cotisation pour ce cycle.</td></tr>`;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${baseStyles()}</style></head>
      <body>
        ${documentHeader('Rapport de tontine', `${escapeHtml(groupName)} · Cycle ${escapeHtml(cyclePeriod)}`)}
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Cotisé (net)</div>
            <div class="info-value income">${currency.format(totalNet)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Frais de gestion</div>
            <div class="info-value">${currency.format(totalFees)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Membres à jour</div>
            <div class="info-value">${paidCount} / ${membersCount}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Membre</th><th>Date</th><th class="amount">Montant</th><th class="amount">Frais</th><th class="amount">Net</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${
          lateCount > 0
            ? `<div class="subtitle" style="margin-top: -8px; margin-bottom: 20px;">
                 <strong>${lateCount} membre${lateCount > 1 ? 's' : ''} en retard :</strong> ${escapeHtml(lateMembers.join(', '))}
               </div>`
            : ''
        }
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Total collecté (brut)</div>
            <div class="info-value">${currency.format(totalCollected)}</div>
          </div>
        </div>
        ${documentFooter()}
      </body>
    </html>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function printAndShareHtml(html: string, filename: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const isAvailable = await Sharing.isAvailableAsync();

  if (isAvailable) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
  }
}
