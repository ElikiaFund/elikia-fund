<?php

namespace App\Services\Payment;

use App\Models\YabetoSetting;
use Illuminate\Support\Carbon;

/**
 * Resolves the *effective* Yabeto configuration: the admin-managed `yabeto_settings` row takes
 * priority, falling back to `.env`/`config/services.php` for anything not set from the back-office.
 * This is what lets an admin flip mode/keys from Paramètres > Paiements without a redeploy, while
 * still working out of the box for local dev/CI off plain env vars.
 */
readonly class YabetoConfig
{
    /**
     * Elikia's chosen Connect fee mode (docs/fr/connect/pricing). Decided once, immutable at
     * Yabeto's end — we refuse to call Connect endpoints unless the cached activation matches.
     */
    public const EXPECTED_CONNECT_MODE = 'account';

    public function __construct(
        public string $mode,
        public ?string $secretKey,
        public ?string $accountId,
        public ?string $webhookSecret,
        public bool $isEnabled,
        public ?string $relayUrl,
        public ?string $relaySecret,
        public ?string $connectMode,
        public ?Carbon $connectActivationCheckedAt,
        public float $defaultApplicationFeeRate,
        public bool $connectEnabled,
    ) {}

    public static function resolve(): self
    {
        $setting = YabetoSetting::current();

        return new self(
            mode: $setting->mode ?: config('services.yabeto.mode', 'sandbox'),
            secretKey: $setting->secret_key ?: config('services.yabeto.secret_key'),
            accountId: $setting->account_id ?: config('services.yabeto.account_id'),
            webhookSecret: $setting->webhook_secret ?: config('services.yabeto.webhook_secret'),
            isEnabled: $setting->is_enabled,
            relayUrl: config('services.yabeto.relay_url'),
            relaySecret: config('services.yabeto.relay_secret'),
            connectMode: $setting->connect_mode,
            connectActivationCheckedAt: $setting->connect_activation_checked_at,
            defaultApplicationFeeRate: (float) $setting->default_application_fee_rate,
            connectEnabled: (bool) $setting->connect_enabled,
        );
    }

    /**
     * The Cloudflare Worker relay (cloudflare-relay/) only ever proxies to the live API — sandbox
     * calls happen from local dev/CI, which aren't behind the blocked LWS network path, so they
     * never need it. A relay URL configured while in sandbox mode is ignored, not misrouted.
     */
    public function usesRelay(): bool
    {
        return ! $this->isSandbox() && ! empty($this->relayUrl);
    }

    public function isSandbox(): bool
    {
        return $this->mode !== 'live';
    }

    /**
     * Whether Yabeto can actually be called — enabled *and* has a secret key. An admin can
     * toggle "enabled" on before pasting real keys (e.g. while testing the connection panel);
     * callers should treat that as "not ready", not attempt a request with a null key.
     */
    public function isReady(): bool
    {
        return $this->isEnabled && ! empty($this->secretKey);
    }

    /**
     * Whether Connect-specific routing (per-company connected accounts, direct charges with
     * on_behalf_of) can be used. Requires: Yabeto is callable at all, Connect is toggled on by
     * the admin, and the cached activation mode matches Elikia's chosen fee_payer. The cached
     * mode is refreshed by Admin\YabetoSettingController::connectStatus().
     */
    public function isConnectReady(): bool
    {
        return $this->isReady()
            && $this->connectEnabled
            && $this->connectMode === self::EXPECTED_CONNECT_MODE;
    }
}
