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
        );
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
