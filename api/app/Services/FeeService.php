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
    ];

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     *
     * @throws FeeException if the fee would leave nothing (or less than nothing) to contribute
     */
    public function contribution(float $amount): array
    {
        $rates = $this->rates();

        return $this->breakdown(
            $amount,
            round($amount * $rates['contribution_yabeto_percent'] / 100, 2),
            round($amount * $rates['contribution_elikia_percent'] / 100, 2),
            'Le montant de la cotisation doit être supérieur aux frais applicables.',
        );
    }

    /**
     * @return array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}
     *
     * @throws FeeException if the fee would leave nothing (or less than nothing) to deposit
     */
    public function deposit(float $amount): array
    {
        $rates = $this->rates();

        $providerFee = round($amount * $rates['deposit_yabeto_percent'] / 100, 2) + $rates['deposit_yabeto_fixed'];
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
    public function withdrawal(float $amount): array
    {
        $rates = $this->rates();

        return $this->breakdown(
            $amount,
            round($amount * $rates['withdrawal_yabeto_percent'] / 100, 2),
            round($amount * $rates['withdrawal_elikia_percent'] / 100, 2),
            'Le montant du retrait doit être supérieur aux frais applicables.',
        );
    }

    /** Raw 8-key rate map — used by the mobile fee-preview endpoint and the back-office settings form. */
    public function currentRates(): array
    {
        return $this->rates();
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

        return [
            'contribution_yabeto_percent' => (float) ($configured['contribution_yabeto_percent'] ?? self::DEFAULTS['contribution_yabeto_percent']),
            'contribution_elikia_percent' => (float) ($configured['contribution_elikia_percent'] ?? self::DEFAULTS['contribution_elikia_percent']),
            'deposit_yabeto_percent' => (float) ($configured['deposit_yabeto_percent'] ?? self::DEFAULTS['deposit_yabeto_percent']),
            'deposit_elikia_percent' => (float) ($configured['deposit_elikia_percent'] ?? self::DEFAULTS['deposit_elikia_percent']),
            'deposit_yabeto_fixed' => (float) ($configured['deposit_yabeto_fixed'] ?? self::DEFAULTS['deposit_yabeto_fixed']),
            'deposit_elikia_fixed' => (float) ($configured['deposit_elikia_fixed'] ?? self::DEFAULTS['deposit_elikia_fixed']),
            'withdrawal_yabeto_percent' => (float) ($configured['withdrawal_yabeto_percent'] ?? self::DEFAULTS['withdrawal_yabeto_percent']),
            'withdrawal_elikia_percent' => (float) ($configured['withdrawal_elikia_percent'] ?? self::DEFAULTS['withdrawal_elikia_percent']),
        ];
    }
}
