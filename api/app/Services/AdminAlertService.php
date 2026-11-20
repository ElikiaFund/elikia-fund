<?php

namespace App\Services;

use App\Mail\AdminAlertRaised;
use App\Models\AdminAlert;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Raises something staff must act on: stored for the back-office bell and e-mailed to the support
 * address configured in Paramètres > Général (the same one support tickets go to). The e-mail is
 * best effort — a mail outage must never break the money flow that raised the alert, and the
 * back-office copy is still there.
 */
class AdminAlertService
{
    public function raise(string $type, string $title, string $body, array $data = [], ?int $vaultMovementId = null): AdminAlert
    {
        $alert = AdminAlert::create([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data ?: null,
            'vault_movement_id' => $vaultMovementId,
        ]);

        try {
            Mail::to($this->supportEmail())->send(new AdminAlertRaised($alert));
        } catch (Throwable $e) {
            Log::error('Admin alert e-mail could not be sent', ['alert_id' => $alert->id, 'message' => $e->getMessage()]);
        }

        return $alert;
    }

    private function supportEmail(): string
    {
        $platform = Setting::firstWhere('key', 'platform')?->value ?? [];

        return $platform['support_email'] ?? 'support@elikiafund.com';
    }
}
