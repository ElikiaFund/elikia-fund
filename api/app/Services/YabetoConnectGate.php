<?php

namespace App\Services;

use App\Exceptions\IdentityVerificationRequiredException;
use App\Models\Company;
use App\Services\Payment\YabetoConfig;

/**
 * The single place that decides, per company, how money may move under Yabeto Connect:
 *
 * - legacy company                      → today's flow on Elikia's own account
 * - Connect company, KYC approved       → its own connected account (no custody by Elikia)
 * - Connect company, KYC not approved   → refused until approved, so funds never sit in a
 *                                         pending balance Yabeto could refund on rejection
 *
 * Every rule is conditional on Connect being live: an admin switching `connect_enabled` off
 * sends every company back to the legacy flow (rollback), blocked ones included.
 */
class YabetoConnectGate
{
    public function __construct(private readonly YabetoConfig $config) {}

    public function routesThroughConnect(?Company $company): bool
    {
        return $this->config->isConnectReady() && $company?->isConnectReady() === true;
    }

    public function requiresVerification(?Company $company): bool
    {
        return $this->config->isConnectReady()
            && $company !== null
            && $company->requiresConnect()
            && ! $company->isConnectReady();
    }

    /** @throws IdentityVerificationRequiredException */
    public function assertCanMoveMoney(?Company $company, string $message): void
    {
        if ($this->requiresVerification($company)) {
            throw new IdentityVerificationRequiredException($message, $company->id);
        }
    }
}
