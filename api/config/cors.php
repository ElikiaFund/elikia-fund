<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Only browser-origin callers need CORS (native mobile requests aren't origin-checked): the
    // back-office console and, for the public /waitlist endpoint, the marketing website.
    'allowed_origins' => [
        env('FRONTEND_URL', 'https://www.console.elikiafund.com'),
        env('FRONTEND_URL_2', 'https://console.elikiafund.com'),
        env('WEBSITE_URL', 'https://elikiafund.com'),
        env('WEBSITE_URL_2', 'https://www.elikiafund.com'),
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
