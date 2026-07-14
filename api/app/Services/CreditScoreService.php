<?php

namespace App\Services;

use App\Models\ScoringCriterion;
use App\Models\Setting;
use App\Models\User;

class CreditScoreService
{
    /**
     * Compute a user's credit/loan-admissibility score from the active, admin-configured
     * scoring criteria. Weights are normalized across active criteria, so admins don't need
     * to keep raw weights summing to exactly 100.
     *
     * @return array{score: int, verdict: string, breakdown: array<int, array<string, mixed>>}
     */
    public function calculate(User $user): array
    {
        $criteria = ScoringCriterion::where('is_active', true)->get();
        $totalWeight = $criteria->sum('weight');

        $breakdown = [];
        $score = 0.0;

        foreach ($criteria as $criterion) {
            $value = $this->metricFor($criterion->key, $user);
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

    private function metricFor(string $key, User $user): float
    {
        return match ($key) {
            'account_age' => (float) $user->created_at->diffInMonths(now()),
            'transaction_regularity' => (float) $user->transactions()->where('occurred_at', '>=', now()->subDays(90))->count(),
            'savings_behavior' => (float) ($user->vault?->balance ?? 0),
            'income_expense_ratio' => $this->incomeExpenseRatio($user),
            'tontine_participation' => (float) $user->contributions()->count(),
            'company_profile' => $user->company()->exists() ? 1.0 : 0.0,
            default => 0.0,
        };
    }

    private function incomeExpenseRatio(User $user): float
    {
        $income = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $expense = (float) $user->transactions()->where('type', 'expense')->sum('amount');

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
