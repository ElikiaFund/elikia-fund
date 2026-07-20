export const COMPANY_CATEGORY_LABELS: Record<string, string> = {
  commerce: 'Commerce',
  agriculture: 'Agriculture',
  artisanat: 'Artisanat',
  restauration: 'Restauration',
  transport: 'Transport',
  services: 'Services',
  beaute_bien_etre: 'Beauté & bien-être',
  sante: 'Santé',
  education: 'Éducation',
  technologie: 'Technologie',
  autre: 'Autre',
}

export const COMPANY_CATEGORY_OPTIONS = Object.entries(COMPANY_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

export function formatCompanyCategory(category: string, otherCategory?: string | null): string {
  const label = COMPANY_CATEGORY_LABELS[category] ?? category

  return category === 'autre' && otherCategory ? `${label} — ${otherCategory}` : label
}
