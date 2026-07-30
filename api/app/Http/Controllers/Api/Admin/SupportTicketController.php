<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;

class SupportTicketController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(SupportTicket::with('user')->latest()->get());
    }

    public function destroy(SupportTicket $supportTicket): JsonResponse
    {
        $supportTicket->delete();

        return response()->json(['message' => 'Ticket supprimé.']);
    }
}
