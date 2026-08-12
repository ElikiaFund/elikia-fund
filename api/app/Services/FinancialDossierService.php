<?php

namespace App\Services;

use App\Models\Company;

/**
 * Aggregates everything the "Dossier de crédibilité financière" PDF needs — the credit score
 * breakdown (CreditScoreService) plus the narrative activity/vault/tontine stats sections shown
 * around it. Kept separate from CreditScoreService since this is presentation-layer aggregation
 * for one specific document, not part of the scoring model itself. Reads the company's own
 * vault/contributions directly (Vault and Group/Contribution are both company-owned) — nothing
 * here goes through the owning user, unlike the pre-company-isolation version of this file.
 */
class FinancialDossierService
{
    public function __construct(private readonly CreditScoreService $creditScore) {}

    /**
     * @return array{
     *   company_name: string, phone: ?string, tenure_days: int,
     *   score: int, verdict: string, verdict_badge: string, narrative: string,
     *   breakdown: array<int, array{key: string, label: string, points: float, max: float}>,
     *   activity: array{entries_count: int, total_income: float, total_expense: float, net_profit: float, avg_daily_income: float},
     *   vault: array{balance: float, total_deposits: float, total_withdrawals: float, movements_count: int},
     *   tontine: array{groups_joined: int, contributions_count: int, total_contributed: float, total_received: float},
     * }
     */
    public function build(Company $company): array
    {
        $tenureDays = max(1, (int) $company->created_at->diffInDays(now()));

        $score = $this->creditScore->calculate($company);

        $totalIncome = (float) $company->transactions()->where('type', 'income')->sum('amount');
        $totalExpense = (float) $company->transactions()->where('type', 'expense')->sum('amount');

        $vault = $company->vault;
        // Vault movements use 'completed' for the simulated/no-Yabeto path, 'succeeded' for real
        // Yabeto — both count as real money moved (see finance.tsx's identical filter).
        $settledMovements = $vault ? $vault->movements()->whereIn('status', ['succeeded', 'completed']) : null;

        $succeededContributions = $company->contributions()->where('status', 'succeeded');

        return [
            'company_name' => $company->name,
            'phone' => $company->user->phone,
            'tenure_days' => $tenureDays,
            'score' => $score['score'],
            'verdict' => $score['verdict'],
            'verdict_badge' => $this->verdictBadge($score['verdict']),
            'narrative' => $this->narrative($score['verdict']),
            'breakdown' => array_map(
                fn (array $item) => ['key' => $item['key'], 'label' => $item['label'], 'points' => $item['weighted_points'], 'max' => $item['max']],
                $score['breakdown'],
            ),
            'activity' => [
                'entries_count' => (int) $company->transactions()->count(),
                'total_income' => $totalIncome,
                'total_expense' => $totalExpense,
                'net_profit' => $totalIncome - $totalExpense,
                'avg_daily_income' => round($totalIncome / $tenureDays, 2),
            ],
            'vault' => [
                'balance' => (float) ($vault->balance ?? 0),
                // Net (post-fee) for deposits — what actually landed in the vault, matching how
                // resolveMovementStatus() credits the balance.
                'total_deposits' => $settledMovements ? (float) (clone $settledMovements)->where('type', 'deposit')->sum('net_amount') : 0,
                // Gross for withdrawals — what actually left the balance (the fee is deducted
                // from the payout, not the balance decrement itself).
                'total_withdrawals' => $settledMovements ? (float) (clone $settledMovements)->where('type', 'withdraw')->sum('amount') : 0,
                'movements_count' => $settledMovements ? (clone $settledMovements)->whereIn('type', ['deposit', 'withdraw'])->count() : 0,
            ],
            'tontine' => [
                'groups_joined' => (int) $company->groups()->count(),
                'contributions_count' => (int) (clone $succeededContributions)->count(),
                // Gross — what was actually paid out of pocket, not the post-management-fee
                // net that lands in the tontine pot.
                'total_contributed' => (float) (clone $succeededContributions)->sum('amount'),
                'total_received' => $settledMovements ? (float) (clone $settledMovements)->where('type', 'tontine_payout')->sum('amount') : 0,
            ],
        ];
    }

    private function verdictBadge(string $verdict): string
    {
        return match ($verdict) {
            'eligible' => 'Très fiable',
            'review' => 'Fiabilité modérée',
            default => 'Fiabilité à renforcer',
        };
    }

    private function narrative(string $verdict): string
    {
        return match ($verdict) {
            'eligible' => 'Profil de référence. Excellente régularité, épargne disciplinée et participation active aux tontines. Éligible aux meilleures conditions de financement.',
            'review' => "Profil en développement. L'activité enregistrée montre des signes encourageants, mais gagnerait à être consolidée sur une période plus longue avant une évaluation définitive.",
            default => "Profil encore limité. Peu d'historique disponible pour établir une évaluation fiable — une utilisation plus régulière du journal de caisse, du coffre et des tontines permettra d'affiner ce score.",
        };
    }
}
