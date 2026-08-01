<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContactMessageRequest;
use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class ContactMessageController extends Controller
{
    /**
     * POST /contact-messages — the website's /contact page. Public, no Sanctum user. Persists the
     * message (visible to staff in the back-office "Contact" page) and forwards it by e-mail to
     * whatever support address is currently configured in Paramètres > Général.
     */
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $message = ContactMessage::create($request->validated());

        $platform = Setting::firstWhere('key', 'platform')?->value ?? [];
        $supportEmail = $platform['support_email'] ?? 'support@elikiafund.com';
        Mail::to($supportEmail)->send(new ContactMessageReceived($message));

        return response()->json($message, 201);
    }
}
