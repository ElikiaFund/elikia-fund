<?php

namespace App\Services\Notifications;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * Sends a single push notification via Expo's push service. Silently no-ops on a token
     * that isn't a real Expo push token (e.g. leftover seed/test data) and never throws — a
     * bad token or a down push service shouldn't break the reminder/report batch it's part of.
     */
    public function send(string $pushToken, string $title, string $body, array $data = []): void
    {
        if (! str_starts_with($pushToken, 'ExponentPushToken')) {
            return;
        }

        try {
            $response = Http::post(self::ENDPOINT, [
                'to' => $pushToken,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
            ]);

            if ($response->failed()) {
                Log::warning('Expo push notification failed', ['status' => $response->status(), 'body' => $response->body()]);
            }
        } catch (\Throwable $e) {
            Log::warning('Expo push notification threw', ['message' => $e->getMessage()]);
        }
    }
}
