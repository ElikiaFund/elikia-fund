<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /me/notifications — the authenticated user's most recent notifications (contribution
     * reminders, late-payment alerts, cycle-report nudges).
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->notifications()->limit(50)->get());
    }

    /**
     * POST /me/notifications/{notification}/read
     */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->forceFill(['read_at' => now()])->save();

        return response()->json($notification);
    }

    /**
     * POST /me/notifications/read-all
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marquées comme lues.']);
    }
}
