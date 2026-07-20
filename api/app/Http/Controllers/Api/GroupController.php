<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Group\ContributeRequest;
use App\Http\Requests\Group\CreateGroupRequest;
use App\Http\Requests\Group\DesignateRecipientRequest;
use App\Http\Requests\Group\JoinGroupRequest;
use App\Http\Requests\Group\UpdateRecipientOrderRequest;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Services\GroupCycleRecipientService;
use App\Services\GroupMembershipNotificationService;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\PaymentNotificationService;
use App\Services\TontineReportService;
use Carbon\Carbon;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    /**
     * Percentage withheld from every contribution as a tontine management fee.
     */
    private const MANAGEMENT_FEE_RATE = 0.03;

    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly PaymentNotificationService $paymentNotifications,
        private readonly GroupMembershipNotificationService $membershipNotifications,
        private readonly GroupCycleRecipientService $cycleRecipients,
    ) {}

    /**
     * GET /groups — tontines the authenticated user belongs to.
     */
    public function index(Request $request): JsonResponse
    {
        // `members` is eager-loaded (not just the count) so the mobile list can render an
        // avatar-stack preview per tontine without a follow-up request per group.
        $groups = $request->user()->groups()->with('members')->withCount('members')->latest()->get();

        return response()->json($groups);
    }

    /**
     * POST /groups — create a tontine (name, contribution amount, frequency), generating a
     * unique invite code. The creator is automatically the first member.
     */
    public function store(CreateGroupRequest $request): JsonResponse
    {
        $user = $request->user();

        $group = Group::create([
            'uuid' => Str::uuid(),
            'name' => $request->validated('name'),
            'contribution_amount' => $request->validated('contribution_amount'),
            'frequency' => $request->validated('frequency'),
            'max_members' => $request->validated('max_members'),
            'contribution_day' => $request->validated('contribution_day'),
            'contribution_time' => $request->validated('contribution_time'),
            'recipient_mode' => $request->validated('recipient_mode') ?? 'join_order',
            'invite_code' => $this->generateInviteCode(),
            'owner_id' => $user->id,
        ]);

        $group->members()->attach($user->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        return response()->json($this->withCycleStatus($group->load('owner', 'members'), $user), 201);
    }

    /**
     * GET /groups/preview/{inviteCode} — read-only group info shown before requesting to join,
     * so a scanning/typing user sees what they're about to ask to join.
     */
    public function preview(Request $request, string $inviteCode): JsonResponse
    {
        $user = $request->user();
        $group = Group::where('invite_code', strtoupper($inviteCode))->with('owner')->withCount('members')->first();

        if (! $group) {
            return response()->json(['message' => "Code d'invitation invalide."], 404);
        }

        $membership = DB::table('group_members')->where('group_id', $group->id)->where('user_id', $user->id)->first();

        $group->membership_status = $membership?->status;
        $group->schedule_label = $group->scheduleLabel();

        return response()->json($group);
    }

    /**
     * GET /groups/{group} — detail: members, contribution status for the current cycle. A
     * pending join request can view the group (to see its "en attente" state) but not a full
     * approved-member view — the mobile client branches on membership_status.
     */
    public function show(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();
        $membership = DB::table('group_members')->where('group_id', $group->id)->where('user_id', $user->id)->first();

        abort_unless($membership, 403);

        $group->membership_status = $membership->status;
        $group->load('owner', 'members', 'contributions.user');

        if ($group->owner_id === $user->id) {
            $group->load('pendingMembers');
        }

        return response()->json($this->withCycleStatus($group, $user));
    }

    /**
     * POST /groups/join — request to join a tontine via its invite code. Membership starts
     * 'pending' — the owner must approve before the requester can contribute (see
     * approveRequest/declineRequest below).
     */
    public function join(JoinGroupRequest $request): JsonResponse
    {
        $user = $request->user();
        $group = Group::where('invite_code', strtoupper($request->validated('invite_code')))->first();

        if (! $group) {
            return response()->json(['message' => "Code d'invitation invalide."], 404);
        }

        $existing = DB::table('group_members')->where('group_id', $group->id)->where('user_id', $user->id)->first();

        if ($existing?->status === 'approved') {
            return response()->json(['message' => 'Vous êtes déjà membre de cette tontine.'], 409);
        }

        if ($existing?->status === 'pending') {
            return response()->json(['message' => "Votre demande d'adhésion est déjà en attente d'approbation."], 409);
        }

        if ($group->max_members !== null && $group->members()->count() >= $group->max_members) {
            return response()->json(['message' => 'Cette tontine a atteint son nombre maximum de participants.'], 409);
        }

        $group->pendingMembers()->attach($user->id, ['status' => 'pending', 'joined_at' => now()]);

        $this->membershipNotifications->joinRequested($group, $user);

        $group->membership_status = 'pending';

        return response()->json($group->load('owner'));
    }

    /**
     * GET /groups/{group}/requests — pending join requests, owner-only.
     */
    public function requests(Request $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        return response()->json($group->pendingMembers()->get());
    }

    /**
     * POST /groups/{group}/requests/{user}/approve — owner approves a pending join request.
     */
    public function approveRequest(Request $request, Group $group, User $user): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $updated = DB::table('group_members')
            ->where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->update(['status' => 'approved', 'approved_at' => now(), 'updated_at' => now()]);

        abort_unless($updated > 0, 404);

        $this->membershipNotifications->joinApproved($user, $group);

        return response()->json(['message' => 'Demande approuvée.']);
    }

    /**
     * POST /groups/{group}/requests/{user}/decline — owner declines a pending join request.
     */
    public function declineRequest(Request $request, Group $group, User $user): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $deleted = DB::table('group_members')
            ->where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->delete();

        abort_unless($deleted > 0, 404);

        $this->membershipNotifications->joinDeclined($user, $group);

        return response()->json(['message' => 'Demande refusée.']);
    }

    /**
     * PUT /groups/{group}/recipient-order — owner sets the fixed rotation order for
     * recipient_mode = 'predefined'. Must contain exactly the group's current approved members.
     */
    public function updateRecipientOrder(UpdateRecipientOrderRequest $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $order = $request->validated('order');
        $memberIds = $group->members()->pluck('users.id')->sort()->values()->all();

        if (collect($order)->sort()->values()->all() !== $memberIds) {
            return response()->json(['message' => "L'ordre doit contenir exactement les membres actuels de la tontine."], 422);
        }

        $group->update(['recipient_order' => $order]);

        return response()->json($group->fresh());
    }

    /**
     * PUT /groups/{group}/cycle-recipient — owner manually designates the current cycle's
     * recipient. Only meaningful for recipient_mode = 'admin', but always allowed as an explicit
     * override of any mode's automatic pick.
     */
    public function designateRecipient(DesignateRecipientRequest $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $recipient = User::findOrFail($request->validated('user_id'));

        abort_unless($group->members()->where('users.id', $recipient->id)->exists(), 422);

        $cycleRecipient = $this->cycleRecipients->designate($group, $group->currentCyclePeriod(), $recipient);

        return response()->json($cycleRecipient->load('user'));
    }

    /**
     * POST /groups/{group}/contribute — contribution for the current cycle. Runs a real Yabeto
     * Pay payment (Payment Intent create+confirm) when the provider is enabled, or falls back to
     * the simulated instant-paid path otherwise (see api/README.md).
     */
    public function contribute(ContributeRequest $request, Group $group): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        $cyclePeriod = $group->currentCyclePeriod();

        $existing = $group->contributions()
            ->where('user_id', $user->id)
            ->where('cycle_period', $cyclePeriod)
            ->latest()
            ->first();

        if ($existing?->status === 'succeeded') {
            return response()->json(['message' => 'Vous avez déjà cotisé pour ce cycle.'], 409);
        }

        if ($existing?->status === 'processing') {
            return response()->json(['message' => 'Une cotisation est déjà en cours de confirmation pour ce cycle.'], 409);
        }

        $amount = (float) $group->contribution_amount;
        $feeAmount = round($amount * self::MANAGEMENT_FEE_RATE, 2);

        if (! $this->yabeto->isEnabled()) {
            $contribution = Contribution::create([
                'group_id' => $group->id,
                'user_id' => $user->id,
                'amount' => $amount,
                'fee_amount' => $feeAmount,
                'net_amount' => $amount - $feeAmount,
                'cycle_period' => $cyclePeriod,
                'paid_at' => now(),
                'status' => 'succeeded',
            ]);

            $this->paymentNotifications->contributionSucceeded($user, $group, $amount);

            return response()->json($contribution->load('user'), 201);
        }

        $paymentMethod = $request->validated('payment_method');
        $phone = $request->validated('phone');

        if (! $paymentMethod || ! $phone) {
            return response()->json(['message' => 'Méthode de paiement et numéro de téléphone requis.'], 422);
        }

        try {
            $intent = $this->yabeto->createPaymentIntent(
                (int) round($amount),
                "Cotisation tontine « {$group->name} »",
                ['group_id' => $group->id, 'user_id' => $user->id],
            );

            $result = $this->yabeto->confirmPaymentIntent(
                $intent->id,
                $intent->clientSecret ?? '',
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $user->name,
                '',
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto contribution request failed', ['message' => $e->getMessage()]);

            return response()->json(['message' => "Le paiement n'a pas pu être initié. Veuillez réessayer."], 502);
        }

        $contribution = Contribution::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'amount' => $amount,
            'fee_amount' => $feeAmount,
            'net_amount' => $amount - $feeAmount,
            'cycle_period' => $cyclePeriod,
            'paid_at' => now(),
            'provider' => 'yabeto',
            'status' => $result->status,
            'yabeto_reference' => $result->id,
        ]);

        if ($result->failed()) {
            $this->paymentNotifications->contributionFailed($user, $group, $amount, $result->failureMessage);

            return response()->json([
                'message' => $result->failureMessage ?? 'Le paiement a échoué.',
                'contribution' => $contribution->load('user'),
            ], 422);
        }

        if ($result->succeeded()) {
            $this->paymentNotifications->contributionSucceeded($user, $group, $amount);
        }

        return response()->json($contribution->load('user'), 201);
    }

    /**
     * POST /groups/{group}/contributions/{contribution}/refresh-status — manual fallback for a
     * contribution stuck `processing` (e.g. the confirmation webhook never arrived — see
     * yabeto.md §5.3, `getPaymentIntent` is documented specifically for this). Only the member
     * who made the contribution can trigger it.
     */
    public function refreshContributionStatus(Request $request, Group $group, Contribution $contribution): JsonResponse
    {
        $user = $request->user();

        abort_unless($contribution->group_id === $group->id, 404);
        abort_unless($contribution->user_id === $user->id, 403);

        if (! $this->yabeto->isEnabled() || $contribution->status !== 'processing' || ! $contribution->yabeto_reference) {
            return response()->json($contribution->load('user'));
        }

        try {
            $result = $this->yabeto->getPaymentIntent($contribution->yabeto_reference);
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto contribution status refresh failed', ['message' => $e->getMessage()]);

            return response()->json($contribution->load('user'));
        }

        if ($result->status !== $contribution->status) {
            $contribution->update(['status' => $result->status]);

            if ($result->succeeded()) {
                $this->paymentNotifications->contributionSucceeded($user, $group, (float) $contribution->amount);
            } elseif ($result->failed()) {
                $this->paymentNotifications->contributionFailed($user, $group, (float) $contribution->amount, $result->failureMessage);
            }
        }

        return response()->json($contribution->fresh()->load('user'));
    }

    /**
     * GET /groups/{group}/report — cycle report (defaults to the most recently completed
     * cycle; pass ?cycle=YYYY-MM or ?cycle=YYYY-\WWW to inspect a different one).
     */
    public function report(Request $request, Group $group, TontineReportService $reports): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        $cyclePeriod = $request->query('cycle');

        return response()->json($reports->generate($group, is_string($cyclePeriod) ? $cyclePeriod : null));
    }

    /**
     * GET /groups/{group}/cycles — every cycle since the tontine was created, most recent first,
     * so the mobile group detail screen can list them (e.g. "10 au 17 mai 2026") and let a member
     * open any one via GET /groups/{group}/report?cycle=. Capped to the last 52 cycles so a
     * long-running weekly tontine doesn't return an unbounded list.
     */
    public function cycles(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        $periods = [];
        $cursor = $group->created_at->copy();
        $now = now();

        while ($cursor->lte($now) && count($periods) < 52) {
            $period = $group->cyclePeriodFor($cursor);

            if (! in_array($period, $periods, true)) {
                $periods[] = $period;
            }

            $cursor = $group->frequency === 'weekly' ? $cursor->addWeek() : $cursor->addMonthNoOverflow();
        }

        $periods = array_reverse($periods);
        $currentPeriod = $group->currentCyclePeriod();
        $members = $group->members;

        $paidCounts = $group->contributions()
            ->whereIn('cycle_period', $periods)
            ->where('status', 'succeeded')
            ->get()
            ->groupBy('cycle_period')
            ->map(fn ($rows) => $rows->pluck('user_id')->unique()->count());

        return response()->json(collect($periods)->map(function (string $period) use ($group, $members, $paidCounts, $currentPeriod) {
            $bounds = $group->cycleBoundsFor($period);
            $eligibleCount = $members->filter(
                fn ($member) => $member->pivot->approved_at && Carbon::parse($member->pivot->approved_at)->lte($bounds['end'])
            )->count();

            return [
                'cycle_period' => $period,
                'starts_at' => $bounds['start']->toDateString(),
                'ends_at' => $bounds['end']->toDateString(),
                'is_current' => $period === $currentPeriod,
                'paid_count' => $paidCounts[$period] ?? 0,
                'members_count' => $eligibleCount,
            ];
        })->values());
    }

    private function generateInviteCode(): string
    {
        do {
            $code = Str::upper(Str::random(6));
        } while (Group::where('invite_code', $code)->exists());

        return $code;
    }

    private function withCycleStatus(Group $group, User $user): Group
    {
        $group->current_cycle_period = $group->currentCyclePeriod();
        $group->has_paid_current_cycle = $group->contributions()
            ->where('user_id', $user->id)
            ->where('cycle_period', $group->current_cycle_period)
            ->where('status', 'succeeded')
            ->exists();
        $group->cycle_ends_at = $group->cycleEndsAt()->toIso8601String();
        $group->schedule_label = $group->scheduleLabel();

        if ($group->relationLoaded('members') && $group->members->isNotEmpty()) {
            $group->current_cycle_recipient = $this->cycleRecipients
                ->resolveFor($group, $group->current_cycle_period)
                ->load('user');
        }

        if ($group->owner_id === $user->id) {
            $group->pending_requests_count = $group->pendingMembers()->count();
        }

        return $group;
    }
}
