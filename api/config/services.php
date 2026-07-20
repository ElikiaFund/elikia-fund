<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    'facebook' => [
        'app_id' => env('FACEBOOK_APP_ID'),
        'app_secret' => env('FACEBOOK_APP_SECRET'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
    ],

    // Mobile money PSP (vault deposits/withdrawals, tontine contributions) — see yabeto.md at
    // the repo root and app/Services/Payment/. These are the infra-level defaults; an admin can
    // override mode/account_id/keys at runtime from the back-office (Paramètres > Paiements),
    // which is why App\Services\Payment\YabetoConfig checks the `yabeto_settings` table first
    // and only falls back to these env values.
    'yabeto' => [
        'mode' => env('YABETO_MODE', 'sandbox'),
        'secret_key' => env('YABETO_SECRET_KEY'),
        'account_id' => env('YABETO_ACCOUNT_ID'),
        'webhook_secret' => env('YABETO_WEBHOOK_SECRET'),
    ],

];
