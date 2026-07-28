<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashSession\StoreCashSessionRequest;
use App\Models\CashSession;
use App\Services\CashSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    public function __construct(private readonly CashSessionService $cashSessions) {}

    /**
     * GET /cash-sessions — the authenticated user's closed sessions, most recent first.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->cashSessions()->latest('closed_at')->get());
    }

    /**
     * GET /cash-sessions/current — the live, authoritative expected balance since the last
     * closing (or since the beginning, if none exists yet). Used online as the close screen's
     * prefill; offline, the mobile app computes the identical figure from its local transaction
     * cache instead of calling this endpoint.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $last = $this->cashSessions->lastSession($user);
        $now = now();

        return response()->json([
            'period_start' => $last?->closed_at,
            'expected_balance' => $this->cashSessions->expectedBalance($user, $now),
            'as_of' => $now,
            'schedule_label' => $user->cashSessionScheduleLabel(),
        ]);
    }

    /**
     * POST /cash-sessions/close — records a closing. Upserts by client-generated uuid (same
     * idempotency idiom SyncController already uses for transactions), so an offline-queued
     * close is safe to retry. `variance` is the only figure derived server-side — expected/counted
     * are trusted from the client, since the user already confirmed them on screen.
     */
    public function store(StoreCashSessionRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $session = CashSession::updateOrCreate(
            ['uuid' => $validated['uuid'], 'user_id' => $user->id],
            [
                'period_start' => $validated['period_start'] ?? null,
                'closed_at' => $validated['closed_at'],
                'expected_balance' => $validated['expected_balance'],
                'counted_balance' => $validated['counted_balance'],
                'variance' => $validated['counted_balance'] - $validated['expected_balance'],
                'notes' => $validated['notes'] ?? null,
            ],
        );

        return response()->json($session, 201);
    }
}
