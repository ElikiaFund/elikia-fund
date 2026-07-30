// The Republic of Congo's 15 current departments (restructured from 12 in October 2024) —
// mirrors api/app/Models/Company.php's DEPARTMENTS/DEPARTMENT_CAPITALS consts and
// mobile/src/constants/congo-locations.ts.
export const DEPARTMENT_LABELS: Record<string, string> = {
  sangha: 'Sangha',
  likouala: 'Likouala',
  congo_oubangui: 'Congo-Oubangui',
  cuvette: 'Cuvette',
  cuvette_ouest: 'Cuvette-Ouest',
  nkeni_alima: 'Nkéni-Alima',
  plateaux: 'Plateaux',
  djoue_lefini: 'Djoué-Léfini',
  brazzaville: 'Brazzaville',
  pool: 'Pool',
  bouenza: 'Bouenza',
  lekoumou: 'Lékoumou',
  niari: 'Niari',
  kouilou: 'Kouilou',
  pointe_noire: 'Pointe-Noire',
}

export const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))

export function formatCompanyLocation(department: string | null, city: string | null): string {
  if (!department) {
    return 'Non renseigné'
  }

  const label = DEPARTMENT_LABELS[department] ?? department

  return city ? `${label} — ${city}` : label
}
