<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class ContactController extends Controller
{
    /**
     * GET /settings/contact — mobile's "Aide et support" sheet reads this (and caches it locally)
     * instead of hardcoding channels, so admins can update them from Paramètres > Général without
     * an app release. Fields left null in the admin-configured 'contact' setting are simply
     * omitted here rather than filled with placeholder text.
     */
    public function show(): JsonResponse
    {
        $platform = Setting::firstWhere('key', 'platform')?->value ?? [];
        $contact = Setting::firstWhere('key', 'contact')?->value ?? [];

        return response()->json([
            'support_email' => $platform['support_email'] ?? null,
            'phone' => $contact['phone'] ?? null,
            'whatsapp' => $contact['whatsapp'] ?? null,
            'address' => $contact['address'] ?? null,
            'hours' => $contact['hours'] ?? null,
        ]);
    }
}
