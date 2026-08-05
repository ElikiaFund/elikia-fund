<?php

namespace App\Services;

use App\Models\Company;
use App\Models\ScoringCriterion;
use App\Models\Setting;

class CreditScoreService
{
    /**
     * Compute a company's credit/loan-admissibility score from the active, admin-configured
     * scoring criteria. Weights are normalized across active criteria, so admins don't need
     * to keep raw weights summing to exactly 100. Scored per-company, not per-user: a merchant
     * running two distinct businesses gets two distinct financial identities, not one blended
     * one — transaction/product-derived metrics come from the company itself, while
     * savings/tontine metrics come from its owner (see metricFor()).
     *
     * @return array{score: int, verdict: string, breakdown: array<int, array<string, mixed>>}
     */
    public function calculate(Company $company): array
    {
        $criteria = ScoringCriterion::where('is_active', true)->get();
        $totalWeight = $criteria->sum('weight');

        $breakdown = [];
        $score = 0.0;

        foreach ($criteria as $criterion) {
            $value = $this->metricFor($criterion->key, $company);
            $points = $this->pointsFor($criterion->thresholds, $value);
            $normalizedWeight = $totalWeight > 0 ? $criterion->weight / $totalWeight : 0;
            $weightedPoints = $points * $normalizedWeight;

            $score += $weightedPoints;

            $breakdown[] = [
                'key' => $criterion->key,
                'label' => $criterion->label,
                'value' => round($value, 1),
                'points' => $points,
                'weight' => $criterion->weight,
                'weighted_points' => round($weightedPoints, 1),
            ];
        }

        $score = (int) round($score);
        $thresholds = Setting::where('key', 'credit_scoring')->value('value') ?? [];
        $minEligible = $thresholds['min_score_eligible'] ?? 70;
        $minReview = $thresholds['min_score_review'] ?? 40;

        $verdict = match (true) {
            $score >= $minEligible => 'eligible',
            $score >= $minReview => 'review',
            default => 'not_eligible',
        };

        return [
            'score' => $score,
            'verdict' => $verdict,
            'breakdown' => $breakdown,
        ];
    }

    private function metricFor(string $key, Company $company): float
    {
        return match ($key) {
            // Company tenure, not the owner's account age — a second/third company genuinely
            // has no track record yet, which is the point of scoring per-company.
            'account_age' => (float) $company->created_at->diffInMonths(now()),
            'transaction_regularity' => (float) $company->transactions()->where('occurred_at', '>=', now()->subDays(90))->count(),
            'savings_behavior' => (float) ($company->user->vault?->balance ?? 0),
            'income_expense_ratio' => $this->incomeExpenseRatio($company),
            'tontine_participation' => (float) $company->user->contributions()->where('status', 'succeeded')->count(),
            // Vacuous now that calculate() always receives an existing company (used to be a
            // presence check: "does this user have a company at all?"). Left computing a
            // constant 1.0 rather than repurposed into a new metric — see ScoringCriteriaSeeder,
            // where this criterion is deactivated so it doesn't pad every score for nothing.
            'company_profile' => 1.0,
            default => 0.0,
        };
    }

    private function incomeExpenseRatio(Company $company): float
    {
        $income = (float) $company->transactions()->where('type', 'income')->sum('amount');
        $expense = (float) $company->transactions()->where('type', 'expense')->sum('amount');

        if ($expense <= 0) {
            return $income > 0 ? 300.0 : 0.0;
        }

        // Capped so a tiny denominator can't produce a runaway ratio.
        return round(min(($income / $expense) * 100, 300.0), 1);
    }

    /**
     * @param  array<int, array{min: float, max: float|null, points: int}>  $thresholds
     */
    private function pointsFor(array $thresholds, float $value): int
    {
        foreach ($thresholds as $band) {
            if ($value >= $band['min'] && ($band['max'] === null || $value < $band['max'])) {
                return (int) $band['points'];
            }
        }

        return (int) (end($thresholds)['points'] ?? 0);
    }
}
