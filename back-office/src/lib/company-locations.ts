// The Republic of Congo's 15 current departments (restructured from 12 in October 2024) — mirrors
// api/app/Models/Company.php's DEPARTMENTS/DEPARTMENT_CAPITALS consts and
// mobile/src/constants/congo-locations.ts. Labeled by capital/city name, not the formal department
// name (e.g. "Mossaka" not "Congo-Oubangui") — same relabeling mobile's onboarding location
// picker uses, so admins see the same city-first vocabulary merchants pick from.
export const DEPARTMENT_LABELS: Record<string, string> = {
  sangha: 'Ouesso',
  likouala: 'Impfondo',
  congo_oubangui: 'Mossaka',
  cuvette: 'Owando',
  cuvette_ouest: 'Ewo',
  nkeni_alima: 'Gamboma',
  plateaux: 'Djambala',
  djoue_lefini: 'Odziba',
  brazzaville: 'Brazzaville',
  pool: 'Kinkala',
  bouenza: 'Madingou',
  lekoumou: 'Sibiti',
  niari: 'Dolisie',
  kouilou: 'Loango',
  pointe_noire: 'Pointe-Noire',
}

export const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))

export function formatCompanyLocation(department: string | null, city: string | null): string {
  if (!department) {
    return 'Non renseigné'
  }

  const label = DEPARTMENT_LABELS[department] ?? department

  // Most companies use the capital as their city (mobile's one-tap default), which is now the
  // exact same string as `label` above — only append `city` when it actually adds information
  // (a custom "Autre ville" entry), same convention as formatCompanyCategory's "autre" handling.
  return city && city !== label ? `${label} — ${city}` : label
}
