export type CongoDepartment =
  | 'sangha'
  | 'likouala'
  | 'congo_oubangui'
  | 'cuvette'
  | 'cuvette_ouest'
  | 'nkeni_alima'
  | 'plateaux'
  | 'djoue_lefini'
  | 'brazzaville'
  | 'pool'
  | 'bouenza'
  | 'lekoumou'
  | 'niari'
  | 'kouilou'
  | 'pointe_noire';

/**
 * The Republic of Congo's 15 current departments — restructured from 12 in October 2024
 * (Congo-Oubangui split from Cuvette, Nkéni-Alima from Plateaux, Djoué-Léfini from Pool).
 * Deliberately NOT a full commune/arrondissement list — that data is genuinely incomplete even
 * in authoritative sources this soon after the reform. The capital is offered as a one-tap
 * default; onboarding.tsx also reveals an "Autre ville" free-text field, mirroring how this same
 * screen already handles Company's category/other_category pair.
 */
export const CONGO_DEPARTMENTS: { value: CongoDepartment; label: string; capital: string }[] = [
  { value: 'brazzaville', label: 'Brazzaville', capital: 'Brazzaville' },
  { value: 'pointe_noire', label: 'Pointe-Noire', capital: 'Pointe-Noire' },
  { value: 'bouenza', label: 'Bouenza', capital: 'Madingou' },
  { value: 'congo_oubangui', label: 'Congo-Oubangui', capital: 'Mossaka' },
  { value: 'cuvette', label: 'Cuvette', capital: 'Owando' },
  { value: 'cuvette_ouest', label: 'Cuvette-Ouest', capital: 'Ewo' },
  { value: 'djoue_lefini', label: 'Djoué-Léfini', capital: 'Odziba' },
  { value: 'kouilou', label: 'Kouilou', capital: 'Loango' },
  { value: 'lekoumou', label: 'Lékoumou', capital: 'Sibiti' },
  { value: 'likouala', label: 'Likouala', capital: 'Impfondo' },
  { value: 'niari', label: 'Niari', capital: 'Dolisie' },
  { value: 'nkeni_alima', label: 'Nkéni-Alima', capital: 'Gamboma' },
  { value: 'plateaux', label: 'Plateaux', capital: 'Djambala' },
  { value: 'pool', label: 'Pool', capital: 'Kinkala' },
  { value: 'sangha', label: 'Sangha', capital: 'Ouesso' },
];

/**
 * Brazzaville and Pointe-Noire are the only two cities in the Republic of Congo formally
 * subdivided into arrondissements — every other department is subdivided into communes/districts
 * instead, none of which have a settled, sourceable list the way these two do. Keyed by the exact
 * `capital` string above so onboarding.tsx can look this up directly off the selected city; any
 * other city falls back to a free-text "Quartier" field instead of this preset picker.
 *
 * Brazzaville's 9 arrondissements: official numbered order (Makélékélé is n°1 through Djiri n°9).
 * Pointe-Noire's 6 arrondissements: official numbered order (Lumumba is n°1 through Ngoyo n°6),
 * Pointe-Noire became its own department (no longer part of Kouilou) with this same six-way split.
 */
export const ARRONDISSEMENTS_BY_CITY: Record<string, string[]> = {
  Brazzaville: ['Makélékélé', 'Bacongo', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Mfilou', 'Madibou', 'Djiri'],
  'Pointe-Noire': ['Lumumba', 'Mvoumvou', 'Tié-Tié', 'Loandjili', 'Mongo-Mpoukou', 'Ngoyo'],
};
