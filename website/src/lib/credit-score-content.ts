/**
 * The 6 factor keys are ported from api/app/Services/CreditScoreService.php::metricFor() and the
 * 3 verdict states from mobile/src/services/creditScoreService.ts + (tabs)/index.tsx's
 * VERDICT_LABELS. Deliberately qualitative only — weights and score thresholds are
 * admin-configurable (ScoringCriterion/Setting), so hardcoding numbers here would go stale.
 */
export const CREDIT_SCORE_FACTORS = [
  {
    key: "account_age",
    label: "Ancienneté du compte",
    description: "Depuis combien de temps vous utilisez Elikia Fund.",
  },
  {
    key: "transaction_regularity",
    label: "Régularité des transactions",
    description: "La constance avec laquelle vous enregistrez vos revenus et dépenses.",
  },
  {
    key: "savings_behavior",
    label: "Comportement d'épargne",
    description: "Votre usage du Coffre pour mettre de l'argent de côté.",
  },
  {
    key: "income_expense_ratio",
    label: "Ratio revenus / dépenses",
    description: "L'équilibre entre ce que vous gagnez et ce que vous dépensez.",
  },
  {
    key: "tontine_participation",
    label: "Participation aux tontines",
    description: "Votre régularité dans les cotisations de vos groupes d'épargne.",
  },
  {
    key: "company_profile",
    label: "Profil d'entreprise",
    description: "La complétude de votre profil professionnel.",
  },
] as const;

export type CreditVerdict = "eligible" | "review" | "not_eligible";

export const VERDICT_CONTENT: Record<CreditVerdict, { label: string; colorVar: string }> = {
  eligible: { label: "Éligible au crédit", colorVar: "var(--color-income)" },
  review: { label: "À examiner", colorVar: "var(--color-primary)" },
  not_eligible: { label: "Non éligible", colorVar: "var(--color-danger)" },
};
