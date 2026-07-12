export const COMPANY_CATEGORY_LABELS: Record<string, string> = {
  commerce: 'Commerce',
  agriculture: 'Agriculture',
  services: 'Services',
  transport: 'Transport',
  artisanat: 'Artisanat',
  autre: 'Autre',
}

export const COMPANY_CATEGORY_OPTIONS = Object.entries(COMPANY_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
