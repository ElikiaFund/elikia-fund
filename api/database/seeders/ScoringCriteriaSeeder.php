<?php

namespace Database\Seeders;

use App\Models\ScoringCriterion;
use Illuminate\Database\Seeder;

class ScoringCriteriaSeeder extends Seeder
{
    /**
     * The fixed, code-defined factor catalog — App\Services\CreditScoreService knows how to
     * compute the metric for each `key`. Admins may only retune weight/is_active/thresholds
     * (see Admin\ScoringCriterionController) — adding a new factor requires code, same
     * boundary as the permission catalog.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function catalog(): array
    {
        return [
            [
                'key' => 'account_age',
                'label' => 'Ancienneté du compte',
                'description' => 'Nombre de mois depuis l\'inscription.',
                'weight' => 20,
                'thresholds' => [
                    ['min' => 0, 'max' => 3, 'points' => 20],
                    ['min' => 3, 'max' => 12, 'points' => 60],
                    ['min' => 12, 'max' => null, 'points' => 100],
                ],
            ],
            [
                'key' => 'transaction_regularity',
                'label' => 'Régularité des transactions',
                'description' => 'Nombre de transactions sur les 90 derniers jours.',
                'weight' => 20,
                'thresholds' => [
                    ['min' => 0, 'max' => 5, 'points' => 20],
                    ['min' => 5, 'max' => 20, 'points' => 60],
                    ['min' => 20, 'max' => null, 'points' => 100],
                ],
            ],
            [
                'key' => 'savings_behavior',
                'label' => 'Comportement d\'épargne',
                'description' => 'Solde actuel du coffre (FCFA).',
                'weight' => 20,
                'thresholds' => [
                    ['min' => 0, 'max' => 20000, 'points' => 20],
                    ['min' => 20000, 'max' => 100000, 'points' => 60],
                    ['min' => 100000, 'max' => null, 'points' => 100],
                ],
            ],
            [
                'key' => 'income_expense_ratio',
                'label' => 'Ratio revenus / dépenses',
                'description' => 'Revenus totaux divisés par les dépenses totales (%).',
                'weight' => 15,
                'thresholds' => [
                    ['min' => 0, 'max' => 80, 'points' => 20],
                    ['min' => 80, 'max' => 120, 'points' => 60],
                    ['min' => 120, 'max' => null, 'points' => 100],
                ],
            ],
            [
                'key' => 'tontine_participation',
                'label' => 'Participation aux tontines',
                'description' => 'Nombre total de cotisations versées.',
                'weight' => 15,
                'thresholds' => [
                    ['min' => 0, 'max' => 1, 'points' => 0],
                    ['min' => 1, 'max' => 4, 'points' => 50],
                    ['min' => 4, 'max' => null, 'points' => 100],
                ],
            ],
            [
                'key' => 'company_profile',
                'label' => 'Profil entreprise renseigné',
                'description' => 'L\'utilisateur a configuré une entreprise.',
                'weight' => 10,
                'thresholds' => [
                    ['min' => 0, 'max' => 1, 'points' => 0],
                    ['min' => 1, 'max' => null, 'points' => 100],
                ],
            ],
        ];
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::catalog() as $criterion) {
            ScoringCriterion::updateOrCreate(['key' => $criterion['key']], $criterion);
        }
    }
}
