<?php

namespace App\Services\Payment;

use App\Models\YabetoSetting;

/**
 * Resolves the *effective* Yabeto configuration: the admin-managed `yabeto_settings` row takes
 * priority, falling back to `.env`/`config/services.php` for anything not set from the back-office.
 * This is what lets an admin flip mode/keys from Paramètres > Paiements without a redeploy, while
 * still working out of the box for local dev/CI off plain env vars.
 */
readonly class YabetoConfig
{
    public function __construct(
        public string $mode,
        public ?string $secretKey,
        public ?string $accountId,
        public ?string $webhookSecret,
        public bool $isEnabled,
        public ?string $relayUrl,
        public ?string $relaySecret,
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
}
