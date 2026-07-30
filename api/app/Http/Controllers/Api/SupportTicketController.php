<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupportTicketRequest;
use App\Mail\SupportTicketReceived;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class SupportTicketController extends Controller
{
    /**
     * POST /support-tickets — mobile's "Aide et support" sheet. Persists the ticket (visible to
     * staff in the back-office "Support" page) and forwards it by e-mail to whatever support
     * address is currently configured in Paramètres > Général, not a hardcoded address.
     */
    public function store(StoreSupportTicketRequest $request): JsonResponse
    {
        $ticket = $request->user()->supportTickets()->create($request->validated());

        $platform = Setting::firstWhere('key', 'platform')?->value ?? [];
        $supportEmail = $platform['support_email'] ?? 'support@elikiafund.com';
        Mail::to($supportEmail)->send(new SupportTicketReceived($ticket));

        return response()->json($ticket, 201);
    }
}
