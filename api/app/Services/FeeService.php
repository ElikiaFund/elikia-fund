<?php

namespace App\Services;

use App\Exceptions\FeeException;
use App\Models\Setting;

/**
 * Computes the fee withheld from every real money movement — tontine contributions, vault
 * deposits, vault withdrawals — split into Yabeto's tracked real cost and Elikia Fund's actual
 * kept margin. The two halves are independently admin-configurable (not one total with a fixed
 * internal ratio): either can change on its own — Yabeto renegotiating their rate, or Elikia
 * adjusting margin — without the other silently moving too.
 *
 * A fee is computed once, at movement/contribution creation time, and never recomputed later —
 * an admin changing rates mid-flight never retroactively touches an already-created row.
 *
 * Yabeto Connect (`$viaConnect`): Yabeto bills the connected merchant directly, so the provider
 * half must match what Yabeto actually withholds — its collection percentage plus the Connect
 * surcharge and a fixed collection fee — or the vault ledger drifts from the merchant's Yabeto
 * balance. Elikia's half is unchanged and travels to Yabeto as `application_fee_rate` (see
 * applicationFeeRate()). Connect payouts carry no fee at all: Yabeto charges none, and Elikia
 * has no way to withhold a commission on a payout.
 */
class FeeService
{
    private const DEFAULTS = [
        'contribution_yabeto_percent' => 3.5,
        'contribution_elikia_percent' => 1,
        'deposit_yabeto_percent' => 3.5,
        'deposit_elikia_percent' => 0.5,
        'deposit_yabeto_fixed' => 25,
        'deposit_elikia_fixed' => 75,
        'withdrawal_yabeto_percent' => 2,
        'withdrawal_elikia_percent' => 0.5,
        'connect_yabeto_percent' => 1,
        'connect_collection_fixed' => 25,
    ];

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     *
     * @throws FeeException if the fee would leave nothing (or less than nothing) to contribute
     */
    public function contribution(float $amount, bool $viaConnect = false): array
    {
        $rates = $this->rates();

        $providerFee = $viaConnect
            ? $this->connectCollectionFee($amount, $rates['contribution_yabeto_percent'], $rates)
            : round($amount * $rates['contribution_yabeto_percent'] / 100, 2);

        return $this->breakdown(
            $amount,
            $providerFee,
            round($amount * $rates['contribution_elikia_percent'] / 100, 2),
            'Le montant de la cotisation doit être supérieur aux frais applicables.',
        );
    }

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     *
     * @throws FeeException if the fee would leave nothing (or less than nothing) to deposit
     */
    public function deposit(float $amount, bool $viaConnect = false): array
    {
        $rates = $this->rates();

        $providerFee = $viaConnect
            ? $this->connectCollectionFee($amount, $rates['deposit_yabeto_percent'], $rates)
            : round($amount * $rates['deposit_yabeto_percent'] / 100, 2) + $rates['deposit_yabeto_fixed'];
        $platformFee = round($amount * $rates['deposit_elikia_percent'] / 100, 2) + $rates['deposit_elikia_fixed'];

        return $this->breakdown(
            $amount,
            $providerFee,
            $platformFee,
            'Le montant du dépôt doit être supérieur aux frais applicables.',
        );
    }

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     *
     * @throws FeeException if the fee would leave nothing (or less than nothing) to disburse
     */
    public function withdrawal(float $amount, bool $viaConnect = false): array
    {
        if ($viaConnect) {
            return ['fee_amount' => 0.0, 'provider_fee_amount' => 0.0, 'platform_fee_amount' => 0.0, 'net_amount' => round($amount, 2)];
        }

        $rates = $this->rates();

        return $this->breakdown(
            $amount,
            round($amount * $rates['withdrawal_yabeto_percent'] / 100, 2),
            round($amount * $rates['withdrawal_elikia_percent'] / 100, 2),
            'Le montant du retrait doit être supérieur aux frais applicables.',
        );
    }

    /**
     * Elikia's half of a breakdown expressed as a percentage of the gross — Connect only accepts a
     * rate, never a fixed amount, so a fixed Elikia fee is folded into this charge's own rate.
     *
     * @param  array{platform_fee_amount: float}  $fee
     */
    public function applicationFeeRate(array $fee, float $amount): float
    {
        return $amount > 0 ? round($fee['platform_fee_amount'] / $amount * 100, 4) : 0.0;
    }

    /** Raw rate map — used by the mobile fee-preview endpoint and the back-office settings form. */
    public function currentRates(): array
    {
        return $this->rates();
    }

    private function connectCollectionFee(float $amount, float $collectionPercent, array $rates): float
    {
        return round($amount * ($collectionPercent + $rates['connect_yabeto_percent']) / 100, 2) + $rates['connect_collection_fixed'];
    }

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     */
    private function breakdown(float $amount, float $providerFee, float $platformFee, string $insufficientMessage): array
    {
        $feeAmount = round($providerFee + $platformFee, 2);
        $netAmount = round($amount - $feeAmount, 2);

        if ($netAmount <= 0) {
            throw new FeeException($insufficientMessage);
        }

        return [
            'fee_amount' => $feeAmount,
            'provider_fee_amount' => $providerFee,
            'platform_fee_amount' => $platformFee,
            'net_amount' => $netAmount,
        ];
    }

    private function rates(): array
    {
        $configured = Setting::where('key', 'fees')->value('value') ?? [];

        $rates = [];
        foreach (self::DEFAULTS as $key => $default) {
            $rates[$key] = (float) ($configured[$key] ?? $default);
        }

        return $rates;
    }
}
