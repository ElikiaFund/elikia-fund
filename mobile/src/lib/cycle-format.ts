import type { GroupFrequency } from '@/services/groupService';

const dayMonthYearFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const monthYearFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/**
 * Human-readable French label for a cycle's date range, e.g. "10 au 17 mai 2026" for a weekly
 * cycle or "Mai 2026" for a monthly one — shared by the group detail cycle list and the cycle
 * report screen so both describe the same cycle the same way.
 */
export function formatCycleLabel(cycle: { starts_at: string; ends_at: string }, frequency: GroupFrequency) {
  const start = new Date(cycle.starts_at);
  const end = new Date(cycle.ends_at);

  if (frequency === 'monthly') {
    const label = monthYearFormatter.format(start);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth ? `${start.getDate()} au ${dayMonthYearFormatter.format(end)}` : `${dayMonthFormatter.format(start)} au ${dayMonthYearFormatter.format(end)}`;
}
