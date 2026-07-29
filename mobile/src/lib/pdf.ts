import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { computeJournalStats } from '@/lib/journal-stats';

// Fixed light palette for generated documents — a financial statement should read like paper
// regardless of the app's current theme, so this deliberately doesn't follow dark mode.
const INK = '#1A1A17';
const INK_SECONDARY = '#6B675E';
const PAPER = '#FAF8F4';
const SURFACE = '#F1EEE7';
const BORDER = '#DEDACD';
const TINT = '#A069DA';
const INCOME = '#4C7A63';
const DANGER = '#B5544A';
const TINT_SOFT = '#F4EDFB';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const plainNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const shortDateYearFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayNameFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

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
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; page-break-inside: auto; }
    thead { display: table-header-group; }
    thead th {
      text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
      color: ${INK_SECONDARY}; padding: 8px 10px; border-bottom: 1.5px solid ${INK};
    }
    thead th.amount { text-align: right; }
    tbody tr { page-break-inside: avoid; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid ${BORDER}; font-size: 11px; vertical-align: top; }
    tbody tr:nth-child(even) { background: ${SURFACE}; }
    td.amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.amount.income { color: ${INCOME}; }
    td.amount.expense { color: ${DANGER}; }
    .note { color: ${INK_SECONDARY}; font-size: 10px; }
    .footer {
      margin-top: 28px; padding-top: 12px; border-top: 1px solid ${BORDER};
      font-size: 9px; color: ${INK_SECONDARY}; display: flex; justify-content: space-between;
      page-break-inside: avoid;
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
      <span>elikiafund.com</span>
    </div>
  `;
}

export type JournalEntry = {
  occurred_at: string;
  category_label: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  type: 'income' | 'expense';
  amount: number;
};

function journalStyles(): string {
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
      padding-bottom: 14px;
      border-bottom: 2px solid ${TINT};
      margin-bottom: 18px;
    }
    .brand-name { font-size: 17px; font-weight: 800; color: ${TINT}; }
    .doc-meta { font-size: 10px; color: ${INK_SECONDARY}; }
    .doc-type { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: ${TINT}; margin-bottom: 6px; }
    .title { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
    .subtitle { font-size: 12px; color: ${INK_SECONDARY}; margin: 0 0 18px; }
    .stat-grid {
      display: flex; background: ${SURFACE}; border: 1px solid ${BORDER};
      border-radius: 12px; padding: 16px 18px; margin-bottom: 12px;
    }
    .stat-box { flex: 1; }
    .stat-number { font-size: 22px; font-weight: 800; line-height: 1.15; }
    .stat-number.income { color: ${INCOME}; }
    .stat-number.expense { color: ${DANGER}; }
    .stat-unit { font-size: 11px; font-weight: 700; color: ${INK_SECONDARY}; }
    .stat-unit.income { color: ${INCOME}; }
    .stat-unit.expense { color: ${DANGER}; }
    .stat-label { font-size: 10px; color: ${INK_SECONDARY}; margin-top: 2px; }
    .balance-grid {
      display: flex; background: ${TINT_SOFT}; border-radius: 12px;
      padding: 12px 18px; margin-bottom: 22px; gap: 24px;
    }
    .balance-box { flex: 1; }
    .balance-value { font-size: 13px; font-weight: 800; }
    .balance-label { font-size: 10px; color: ${INK_SECONDARY}; margin-top: 1px; }
    .section-title {
      font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px;
      color: ${TINT}; margin-bottom: 8px;
      page-break-after: avoid;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 22px; page-break-inside: auto; }
    thead { display: table-header-group; }
    thead th {
      text-align: left; font-size: 10px; font-weight: 700; color: #FFFFFF;
      background: ${TINT}; padding: 8px 10px;
    }
    thead th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
    thead th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
    thead th.amount { text-align: right; }
    tbody tr { page-break-inside: avoid; page-break-after: auto; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid ${BORDER}; font-size: 11px; vertical-align: top; }
    td.amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.amount.income { color: ${INCOME}; }
    td.amount.expense { color: ${DANGER}; }
    td.amount.muted { color: ${INK_SECONDARY}; font-weight: 500; }
    td.label { font-weight: 700; }
    td.muted { color: ${INK_SECONDARY}; }
    td .time { color: ${INK_SECONDARY}; font-size: 9px; margin-top: 1px; }
    /* Narrower money columns (competing with the wider Libellé/Catégorie columns) wrap "FCFA"
       onto its own line, exactly like the reference document. */
    .entries-table { table-layout: fixed; }
    .entries-table th:nth-child(1), .entries-table td:nth-child(1) { width: 12%; }
    .entries-table th:nth-child(2), .entries-table td:nth-child(2) { width: 28%; }
    .entries-table th:nth-child(3), .entries-table td:nth-child(3) { width: 20%; }
    .entries-table th:nth-child(4), .entries-table td:nth-child(4),
    .entries-table th:nth-child(5), .entries-table td:nth-child(5),
    .entries-table th:nth-child(6), .entries-table td:nth-child(6) { width: 13.33%; }
    .entries-table td.amount { white-space: normal; }
    .empty { text-align: center; padding: 30px 0; color: ${INK_SECONDARY}; }
    .footer {
      margin-top: 24px; text-align: center; font-size: 9px; font-style: italic;
      color: ${INK_SECONDARY}; line-height: 1.6; page-break-inside: avoid;
    }
  `;
}

/**
 * Local calendar-day key for `iso` — deliberately NOT toISOString().slice(0, 10), which reads
 * back in UTC and can disagree with the local-time cursor iteration below (an entry at
 * 22:00 local can be a different UTC calendar day), silently bucketing it under the wrong day.
 */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildJournalCaisseHtml(options: {
  userName: string;
  phone: string | null;
  periodLabel: string;
  rangeStart: string;
  rangeEnd: string;
  /** Whether this period is exactly one calendar week — controls the document's title. */
  isWeekly: boolean;
  /** Net balance carried in from before rangeStart. */
  openingBalance: number;
  entries: JournalEntry[];
}): string {
  const { userName, phone, periodLabel, rangeStart, rangeEnd, isWeekly, openingBalance, entries } = options;

  const sorted = [...entries].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  const { totalIncome, totalExpense, net, closingBalance } = computeJournalStats(sorted, openingBalance);

  let runningBalance = openingBalance;
  const entryRows = sorted.map((entry) => {
    runningBalance += entry.type === 'income' ? entry.amount : -entry.amount;

    const label = entry.product_name ? `${entry.quantity ? `${entry.quantity} ` : ''}${entry.product_name}` : (entry.note ?? entry.category_label);
    const occurred = new Date(entry.occurred_at);

    return { entry, label, occurred, balanceAfter: runningBalance };
  });

  const entryRowsHtml = entryRows.length
    ? entryRows
        .map(
          ({ entry, label, occurred, balanceAfter }) => `
        <tr>
          <td>${shortDateFormatter.format(occurred)}<div class="time">${timeFormatter.format(occurred)}</div></td>
          <td class="label">${escapeHtml(label)}</td>
          <td class="muted">${escapeHtml(entry.category_label)}</td>
          <td class="amount income">${entry.type === 'income' ? currency.format(entry.amount) : '—'}</td>
          <td class="amount expense">${entry.type === 'expense' ? currency.format(entry.amount) : '—'}</td>
          <td class="amount">${currency.format(balanceAfter)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="6" class="empty">Aucune écriture pour cette période.</td></tr>`;

  // One row per calendar day in [rangeStart, rangeEnd] — "—" across the board for days with no
  // activity, matching the reference journal's day-by-day recap.
  const dayRowsHtml: string[] = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);
  let guard = 0;

  while (cursor <= end && guard < 62) {
    const key = dayKey(cursor.toISOString());
    const dayEntries = entryRows.filter(({ occurred }) => dayKey(occurred.toISOString()) === key);
    const dayIncome = dayEntries.filter(({ entry }) => entry.type === 'income').reduce((sum, { entry }) => sum + entry.amount, 0);
    const dayExpense = dayEntries.filter(({ entry }) => entry.type === 'expense').reduce((sum, { entry }) => sum + entry.amount, 0);
    const dayNet = dayIncome - dayExpense;
    const dayName = dayNameFormatter.format(cursor);

    dayRowsHtml.push(`
        <tr>
          <td>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${shortDateFormatter.format(cursor)}</td>
          <td class="amount">${dayEntries.length ? currency.format(dayIncome) : '—'}</td>
          <td class="amount">${dayEntries.length ? currency.format(dayExpense) : '—'}</td>
          <td class="amount ${dayNet > 0 ? 'income' : dayNet < 0 ? 'expense' : 'muted'}">${
            dayEntries.length ? `${dayNet > 0 ? '+' : ''}${currency.format(dayNet)}` : '—'
          }</td>
          <td class="amount">${dayEntries.length || '—'}</td>
        </tr>`);

    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  const docType = isWeekly ? 'Journal de caisse hebdomadaire' : 'Journal de caisse';
  const subtitleParts = [phone ? `Téléphone : ${phone}` : null, periodLabel].filter(Boolean);

  return `
    <html>
      <head><meta charset="utf-8" /><style>${journalStyles()}</style></head>
      <body>
        <div class="header">
          <div class="brand-name">ElikiaFund</div>
          <div class="doc-meta">Émis le ${shortDateYearFormatter.format(new Date())}</div>
        </div>
        <div class="doc-type">${docType.toUpperCase()}</div>
        <div class="title">${escapeHtml(userName)}</div>
        <div class="subtitle">${escapeHtml(subtitleParts.join(' · '))}</div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-number">${plainNumber.format(totalIncome)}</div>
            <div class="stat-unit">FCFA</div>
            <div class="stat-label">Total ventes</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${plainNumber.format(totalExpense)}</div>
            <div class="stat-unit">FCFA</div>
            <div class="stat-label">Total dépenses</div>
          </div>
          <div class="stat-box">
            <div class="stat-number ${net >= 0 ? 'income' : 'expense'}">${plainNumber.format(net)}</div>
            <div class="stat-unit ${net >= 0 ? 'income' : 'expense'}">FCFA</div>
            <div class="stat-label">Bénéfice net</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${sorted.length}</div>
            <div class="stat-label">Écritures</div>
          </div>
        </div>

        <div class="balance-grid">
          <div class="balance-box">
            <div class="balance-value">${currency.format(openingBalance)}</div>
            <div class="balance-label">Solde en début de ${isWeekly ? 'semaine' : 'période'}</div>
          </div>
          <div class="balance-box">
            <div class="balance-value">${currency.format(closingBalance)}</div>
            <div class="balance-label">Solde en fin de ${isWeekly ? 'semaine' : 'période'}</div>
          </div>
        </div>

        <div class="section-title">Récapitulatif jour par jour</div>
        <table>
          <thead><tr><th>Jour</th><th class="amount">Ventes</th><th class="amount">Dépenses</th><th class="amount">Solde net</th><th class="amount">Écritures</th></tr></thead>
          <tbody>${dayRowsHtml.join('')}</tbody>
        </table>

        <div class="section-title">Détail des écritures</div>
        <table class="entries-table">
          <thead><tr><th>Date /<br />Heure</th><th>Libellé</th><th>Catégorie</th><th class="amount">Entrée</th><th class="amount">Sortie</th><th class="amount">Solde</th></tr></thead>
          <tbody>${entryRowsHtml}</tbody>
        </table>

        <div class="footer">
          Document généré par ElikiaFund — Plateforme de simulation financière.<br />
          Les montants présentés sont issus d'une simulation et ne constituent pas une preuve d'avoirs réels.<br />
          Ce relevé ${isWeekly ? 'hebdomadaire ' : ''}vise à appuyer le suivi de l'activité et la discipline financière.
        </div>
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
