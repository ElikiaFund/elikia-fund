<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ContributionInProgressException;
use App\Exceptions\FeeException;
use App\Exceptions\GroupDeletionInProgressException;
use App\Exceptions\TontinePayoutException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Group\CastDeletionVoteRequest;
use App\Http\Requests\Group\ContributeRequest;
use App\Http\Requests\Group\CreateGroupRequest;
use App\Http\Requests\Group\DesignateRecipientRequest;
use App\Http\Requests\Group\JoinGroupRequest;
use App\Http\Requests\Group\PayoutCycleRequest;
use App\Http\Requests\Group\RecordManualContributionRequest;
use App\Http\Requests\Group\RenewRoundRequest;
use App\Http\Requests\Group\UpdateGroupSettingsRequest;
use App\Http\Requests\Group\UpdateRecipientOrderRequest;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\User;
use App\Services\ContributionService;
use App\Services\FeeService;
use App\Services\GroupCycleRecipientService;
use App\Services\GroupDeletionService;
use App\Services\GroupMembershipNotificationService;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\Payment\YabetoStatus;
use App\Services\PaymentNotificationService;
use App\Services\TontinePayoutService;
use App\Services\TontineReportService;
use Carbon\Carbon;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly PaymentNotificationService $paymentNotifications,
        private readonly GroupMembershipNotificationService $membershipNotifications,
        private readonly GroupCycleRecipientService $cycleRecipients,
        private readonly TontinePayoutService $payouts,
        private readonly ContributionService $contributions,
        private readonly FeeService $fees,
        private readonly GroupDeletionService $deletions,
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
            // Both columns have a matching DB-level default, but Eloquent's create() never
            // re-queries the row afterward — leaving these null on the in-memory $group used
            // a few lines below (withCycleStatus() -> resolveFor(), which persists
            // $group->round_number onto the first GroupCycleRecipient row). That column has no
            // default and is NOT NULL, so a null in-memory round_number crashed every group
            // creation. Setting both explicitly here keeps memory and DB in sync from the start.
            'round_number' => 1,
            'round_status' => 'active',
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
     * GET /groups/{group}/members/{user}/removal-preview — owner-only, non-mutating check before
     * confirming a removal: a hard block (would orphan an in-flight payout) vs. a soft, informational
     * warning (member already received a payout this round but has missed contributions since).
     */
    public function previewMemberRemoval(Request $request, Group $group, User $user): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $blockingReason = $user->id === $group->owner_id
            ? 'Le créateur ne peut pas se retirer lui-même.'
            : $this->removalBlockingReason($group, $user);

        return response()->json([
            'can_remove' => $blockingReason === null,
            'blocking_reason' => $blockingReason,
            'warning' => $this->defaulterWarning($group, $user),
        ]);
    }

    /**
     * DELETE /groups/{group}/members/{user} — owner-only soft removal. Preserves contribution/
     * payout history (needed for the credit score's tontine-participation factor) — Group::members()
     * already filters to status='approved', so a removed member drops out of rotation/eligibility
     * automatically, with no other query changes needed anywhere.
     */
    public function removeMember(Request $request, Group $group, User $user): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);
        abort_if($user->id === $group->owner_id, 422, 'Le créateur ne peut pas se retirer lui-même.');

        if ($reason = $this->removalBlockingReason($group, $user)) {
            return response()->json(['message' => $reason], 409);
        }

        $updated = DB::table('group_members')
            ->where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->update(['status' => 'removed', 'removed_at' => now(), 'updated_at' => now()]);

        abort_unless($updated > 0, 404);

        $this->membershipNotifications->memberRemoved($user, $group);
        $this->membershipNotifications->memberRemovedBroadcast($group, $user);

        return response()->json(['message' => 'Membre retiré.']);
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

        $group->update([
            'recipient_order' => $order,
            'recipient_order_updated_at' => now(),
            'recipient_order_updated_by' => $request->user()->id,
        ]);

        $this->membershipNotifications->recipientOrderChanged($group, $request->user());

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

        if ($group->isRoundLocked()) {
            return response()->json(['message' => 'Ce tour de tontine est terminé. Le créateur doit relancer un nouveau tour.'], 409);
        }

        $recipient = User::findOrFail($request->validated('user_id'));

        abort_unless($group->members()->where('users.id', $recipient->id)->exists(), 422);

        $cycleRecipient = $this->cycleRecipients->designate($group, $group->currentCyclePeriod(), $recipient);

        return response()->json($cycleRecipient->load('user'));
    }

    /**
     * PUT /groups/{group}/settings — owner-only partial update (auto-payout toggle plus the same
     * editable fields create-group.tsx already collects at creation time).
     */
    public function updateSettings(UpdateGroupSettingsRequest $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $group->update($request->validated());

        return response()->json($group->fresh());
    }

    /**
     * POST /groups/{group}/renew-round — owner-only, only while the round is locked (see
     * TontinePayoutService::completeRoundIfDone). Deliberately never touches recipient_order or
     * any rotation counter: rotationIndex() % memberCount already naturally restarts at position 0
     * for the new round — the owner separately uses updateRecipientOrder() for a different order.
     */
    public function renewRound(RenewRoundRequest $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        if (! $group->isRoundLocked()) {
            return response()->json(['message' => "Ce tour n'est pas encore terminé."], 409);
        }

        $group->update(array_merge($request->validated(), [
            'round_number' => $group->round_number + 1,
            'round_status' => 'active',
        ]));

        return response()->json($group->fresh());
    }

    /**
     * GET /groups/{group}/payout — owner-only preview for the mobile payout screen: cycle info,
     * the live amount, the recipient and whether their vault is activated, and whether payout can
     * actually happen right now (`can_payout`) plus enough detail for the client to explain why
     * not otherwise. Read-only counterpart to the POST below — same URI, dispatched by method.
     */
    public function previewPayout(Request $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $cyclePeriod = $request->query('cycle_period');
        $cyclePeriod = is_string($cyclePeriod) && $cyclePeriod !== '' ? $cyclePeriod : $group->currentCyclePeriod();

        if ($group->isRoundLocked()) {
            return response()->json([
                'group_name' => $group->name,
                'round_status' => $group->round_status,
                'round_number' => $group->round_number,
                'blocked_reason' => 'Ce tour est terminé. Le créateur doit relancer un nouveau tour.',
                'can_payout' => false,
            ]);
        }

        $group->loadMissing('members');

        $cycleRecipient = $this->cycleRecipients->resolveFor($group, $cyclePeriod)->load('user.vault');
        $bounds = $group->cycleBoundsFor($cyclePeriod);
        $progress = $this->cycleProgress($group, $cyclePeriod);

        $amount = (float) $group->contributions()
            ->where('cycle_period', $cyclePeriod)
            ->where('status', 'succeeded')
            ->sum('net_amount');

        $recipient = $cycleRecipient->user;
        $vaultActivated = (bool) $recipient?->vault;
        $alreadyPaidOut = $cycleRecipient->paid_out_at !== null;

        return response()->json([
            'group_name' => $group->name,
            'frequency' => $group->frequency,
            'cycle_period' => $cyclePeriod,
            'round_status' => $group->round_status,
            'round_number' => $group->round_number,
            'starts_at' => $bounds['start']->toDateString(),
            'ends_at' => $bounds['end']->toDateString(),
            'recipient' => $recipient ? [
                'id' => $recipient->id,
                'name' => $recipient->name,
                'avatar_url' => $recipient->avatar_url,
                'vault_activated' => $vaultActivated,
            ] : null,
            'members_count' => $progress['eligible_member_ids']->count(),
            'paid_count' => $progress['paid_user_ids']->intersect($progress['eligible_member_ids'])->count(),
            'amount' => $amount,
            'all_paid' => $progress['all_paid'],
            'already_paid_out' => $alreadyPaidOut,
            'paid_out_at' => $cycleRecipient->paid_out_at?->toIso8601String(),
            'can_payout' => $progress['all_paid'] && $recipient !== null && $vaultActivated && ! $alreadyPaidOut,
        ]);
    }

    /**
     * POST /groups/{group}/payout — owner-only. Disburses a cycle's total net contributions
     * (post management-fee) straight into that cycle's recipient's vault, once every eligible
     * member has paid. Defaults to the current cycle if `cycle_period` isn't given. Idempotent
     * per cycle — a second call for an already-disbursed cycle 422s (see TontinePayoutService).
     */
    public function payoutCycle(PayoutCycleRequest $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $cyclePeriod = $request->validated('cycle_period') ?? $group->currentCyclePeriod();

        try {
            $result = $this->payouts->disburseAndNotify($group, $cyclePeriod);
        } catch (TontinePayoutException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'recipient' => $result['recipient'],
            'movement' => $result['movement'],
            'amount' => $result['amount'],
            'round_completed' => $result['round_completed'],
        ]);
    }

    /**
     * GET /groups/{group}/deletion-request — the tontine's current pending deletion vote, if any.
     * Any member can view it (not owner-only — every member needs to see what they're voting on).
     */
    public function showDeletionRequest(Request $request, Group $group): JsonResponse
    {
        abort_unless($group->members()->where('users.id', $request->user()->id)->exists(), 403);

        return response()->json($group->pendingDeletionRequest()->with('votes.user', 'requester')->first());
    }

    /**
     * POST /groups/{group}/deletion-request — owner-only, proposes deleting the tontine. Every
     * other approved member gets 48h to approve or decline (silence counts as approval — see
     * GroupDeletionService); a solo-member tontine (just the owner) deletes immediately.
     */
    public function requestDeletion(Request $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        try {
            $deletionRequest = $this->deletions->requestAndNotify($group, $request->user());
        } catch (GroupDeletionInProgressException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json($deletionRequest->load('votes.user'), 201);
    }

    /**
     * POST /groups/{group}/deletion-request/vote — any approved member except the requester (who
     * already implicitly approved by proposing it) casts approve/decline.
     */
    public function castDeletionVote(CastDeletionVoteRequest $request, Group $group): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        $deletionRequest = $group->pendingDeletionRequest()->first();

        if (! $deletionRequest) {
            return response()->json(['message' => 'Aucune demande de suppression en cours pour cette tontine.'], 404);
        }

        try {
            $outcome = $this->deletions->castVoteAndNotify($deletionRequest, $user, $request->validated('decision'));
        } catch (GroupDeletionInProgressException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json([
            'outcome' => $outcome,
            'deletion_request' => $outcome === 'approved' ? null : $deletionRequest->fresh()->load('votes.user'),
        ]);
    }

    /**
     * DELETE /groups/{group}/deletion-request — owner-only, withdraws a pending deletion request
     * before it resolves.
     */
    public function cancelDeletionRequest(Request $request, Group $group): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);

        $deletionRequest = $group->pendingDeletionRequest()->first();

        if (! $deletionRequest) {
            return response()->json(['message' => 'Aucune demande de suppression en cours pour cette tontine.'], 404);
        }

        try {
            $this->deletions->cancelAndNotify($deletionRequest);
        } catch (GroupDeletionInProgressException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'Demande de suppression annulée.']);
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

        if ($group->isRoundLocked()) {
            return response()->json(['message' => 'Ce tour de tontine est terminé. Le créateur doit relancer un nouveau tour avant de reprendre les cotisations.'], 409);
        }

        $cyclePeriod = $group->currentCyclePeriod();
        $amount = (float) $group->contribution_amount;

        try {
            $fee = $this->fees->contribution($amount);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $this->yabeto->isEnabled()) {
            try {
                $contribution = $this->contributions->reserve($group, $user, $cyclePeriod, $amount, $fee, 'succeeded');
            } catch (ContributionInProgressException $e) {
                return response()->json(['message' => $e->getMessage()], 409);
            }

            $this->paymentNotifications->contributionSucceeded($user, $group, $amount);
            $this->payouts->disburseIfEligibleAndNotify($group, $cyclePeriod);

            return response()->json($contribution->load('user'), 201);
        }

        $paymentMethod = $request->validated('payment_method');
        $phone = $request->validated('phone');

        if (! $paymentMethod || ! $phone) {
            return response()->json(['message' => 'Méthode de paiement et numéro de téléphone requis.'], 422);
        }

        try {
            $contribution = $this->contributions->reserve($group, $user, $cyclePeriod, $amount, $fee, 'processing', 'yabeto');
        } catch (ContributionInProgressException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        try {
            $intent = $this->yabeto->createPaymentIntent(
                (int) round($amount),
                "Cotisation tontine « {$group->name} »",
                ['group_id' => $group->id, 'user_id' => $user->id, 'contribution_id' => $contribution->id],
            );

            $contribution->update(['yabeto_reference' => $intent->id]);

            $result = $this->yabeto->confirmPaymentIntent(
                $intent->id,
                $intent->clientSecret ?? '',
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $user->name,
                '',
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto contribution request failed', ['message' => $e->getMessage(), 'contribution_id' => $contribution->id]);

            // Nothing to roll back — no balance was touched, and Yabeto may still have received
            // the request despite the transport error on our end. The row stays 'processing'; a
            // later refresh-status call or webhook resolves it (see A's residual-risk note if
            // createPaymentIntent itself never returned a reference to poll against).
            return response()->json([
                'message' => "Nous n'avons pas pu confirmer votre cotisation immédiatement. Elle est en cours de traitement.",
                'contribution' => $contribution->fresh()->load('user'),
            ], 202);
        }

        $contribution = $this->contributions->resolveStatus($contribution->id, $result->status) ?? $contribution->fresh();

        if ($result->failed()) {
            $this->paymentNotifications->contributionFailed($user, $group, $amount, $result->failureMessage);

            return response()->json([
                'message' => $result->failureMessage ?? 'Le paiement a échoué.',
                'contribution' => $contribution->load('user'),
            ], 422);
        }

        if ($result->succeeded()) {
            $this->paymentNotifications->contributionSucceeded($user, $group, $amount);
            $this->payouts->disburseIfEligibleAndNotify($group, $cyclePeriod);
        }

        return response()->json($contribution->load('user'), $result->succeeded() ? 201 : 202);
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

        if (! $this->yabeto->isEnabled() || YabetoStatus::isTerminal($contribution->status) || ! $contribution->yabeto_reference) {
            return response()->json($contribution->load('user'));
        }

        try {
            $result = $this->yabeto->getPaymentIntent($contribution->yabeto_reference);
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto contribution status refresh failed', ['message' => $e->getMessage()]);

            return response()->json($contribution->load('user'));
        }

        $resolved = $this->contributions->resolveStatus($contribution->id, $result->status);

        if ($resolved) {
            if ($result->succeeded()) {
                $this->paymentNotifications->contributionSucceeded($user, $group, (float) $contribution->amount);
                $this->payouts->disburseIfEligibleAndNotify($group, $contribution->cycle_period);
            } elseif ($result->failed()) {
                $this->paymentNotifications->contributionFailed($user, $group, (float) $contribution->amount, $result->failureMessage);
            }
        }

        return response()->json(($resolved ?? $contribution)->load('user'));
    }

    /**
     * POST /groups/{group}/members/{user}/contributions — owner-only, records a cash/manual
     * contribution on a member's behalf (e.g. cash handed to the organizer off-app). Same fee
     * math as a self-service contribution, and goes through the same ContributionService::reserve()
     * guard, so it still can't double-book a member who's already paid for this cycle another way.
     */
    public function recordContribution(RecordManualContributionRequest $request, Group $group, User $user): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);
        abort_unless($group->members()->where('users.id', $user->id)->exists(), 422);

        if ($group->isRoundLocked()) {
            return response()->json(['message' => 'Ce tour de tontine est terminé. Le créateur doit relancer un nouveau tour.'], 409);
        }

        $cyclePeriod = $request->validated('cycle_period') ?? $group->currentCyclePeriod();

        $alreadyPaidOut = GroupCycleRecipient::where('group_id', $group->id)
            ->where('cycle_period', $cyclePeriod)
            ->whereNotNull('paid_out_at')
            ->exists();

        if ($alreadyPaidOut) {
            return response()->json(['message' => 'Ce cycle a déjà été versé, impossible d\'y ajouter une cotisation.'], 409);
        }

        $amount = (float) ($request->validated('amount') ?? $group->contribution_amount);
        $paidAt = $request->validated('paid_at') ? Carbon::parse($request->validated('paid_at')) : null;

        try {
            $fee = $this->fees->contribution($amount);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        try {
            $contribution = $this->contributions->reserve(
                $group,
                $user,
                $cyclePeriod,
                $amount,
                $fee,
                'succeeded',
                'manual',
                $request->user()->id,
                $paidAt,
            );
        } catch (ContributionInProgressException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        $this->paymentNotifications->contributionSucceeded($user, $group, $amount);
        $this->payouts->disburseIfEligibleAndNotify($group, $cyclePeriod);

        return response()->json($contribution->load('user'), 201);
    }

    /**
     * POST /groups/{group}/contributions/{contribution}/void — owner-only correction for a
     * mistaken manual entry. Restricted to manually-recorded contributions (recorded_by set) —
     * a real Yabeto payment is never voidable this way, that would need an actual refund flow.
     */
    public function voidContribution(Request $request, Group $group, Contribution $contribution): JsonResponse
    {
        abort_unless($group->owner_id === $request->user()->id, 403);
        abort_unless($contribution->group_id === $group->id, 404);
        abort_unless($contribution->recorded_by !== null, 422, 'Seule une cotisation enregistrée manuellement peut être annulée.');

        if ($contribution->status !== 'succeeded') {
            return response()->json(['message' => 'Seule une cotisation confirmée peut être annulée.'], 422);
        }

        $alreadyPaidOut = GroupCycleRecipient::where('group_id', $group->id)
            ->where('cycle_period', $contribution->cycle_period)
            ->whereNotNull('paid_out_at')
            ->exists();

        if ($alreadyPaidOut) {
            return response()->json(['message' => 'Ce cycle a déjà été versé, la cotisation ne peut plus être annulée.'], 409);
        }

        $contribution->update(['status' => 'voided']);

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
            if ($group->isRoundLocked()) {
                $group->current_cycle_recipient = null;
                $group->current_cycle_all_paid = false;
                $group->round_summary = $this->roundSummary($group);
            } else {
                $group->current_cycle_recipient = $this->cycleRecipients
                    ->resolveFor($group, $group->current_cycle_period)
                    ->load('user');

                // The mobile client shows a "Verser au bénéficiaire" entry point off this flag alone
                // — it's always visible (see group-payout.tsx), current_cycle_all_paid just decides
                // whether it opens straight into an actionable payout or an honestly-partial one.
                $group->current_cycle_all_paid = $this->cycleProgress($group, $group->current_cycle_period)['all_paid'];
            }
        }

        if ($group->owner_id === $user->id) {
            $group->pending_requests_count = $group->pendingMembers()->count();
        }

        return $group;
    }

    /**
     * Eligible-member and paid-count math for a given cycle — the "approved by cycle end" rule
     * TontinePayoutService also uses. Shared by withCycleStatus() (current cycle only) and
     * previewPayout() (any cycle_period), so the two can never quietly disagree about who counts.
     * Requires $group->members to already be loaded (relationLoaded('members')).
     *
     * @return array{eligible_member_ids: Collection, paid_user_ids: Collection, all_paid: bool}
     */
    private function cycleProgress(Group $group, string $cyclePeriod): array
    {
        $bounds = $group->cycleBoundsFor($cyclePeriod);

        $eligibleMemberIds = $group->members
            ->filter(fn ($member) => $member->pivot->approved_at && Carbon::parse($member->pivot->approved_at)->lte($bounds['end']))
            ->pluck('id');

        $paidUserIds = $group->contributions()
            ->where('cycle_period', $cyclePeriod)
            ->where('status', 'succeeded')
            ->pluck('user_id')
            ->unique();

        return [
            'eligible_member_ids' => $eligibleMemberIds,
            'paid_user_ids' => $paidUserIds,
            'all_paid' => $eligibleMemberIds->isNotEmpty() && $eligibleMemberIds->diff($paidUserIds)->isEmpty(),
        ];
    }

    private function removalBlockingReason(Group $group, User $user): ?string
    {
        return $this->isUnpaidCurrentRecipient($group, $user)
            ? "{$user->name} est le bénéficiaire désigné du cycle en cours et n'a pas encore été payé. Impossible de le retirer maintenant."
            : null;
    }

    private function isUnpaidCurrentRecipient(Group $group, User $user): bool
    {
        return GroupCycleRecipient::where('group_id', $group->id)
            ->where('cycle_period', $group->currentCyclePeriod())
            ->where('user_id', $user->id)
            ->whereNull('paid_out_at')
            ->exists();
    }

    /**
     * Informational only, never blocking: the member already received a payout this round but has
     * missed a contribution for a cycle since then — a "defaulter" signal worth surfacing to the
     * owner before they confirm removal, rather than silently losing the information.
     */
    private function defaulterWarning(Group $group, User $user): ?string
    {
        $lastPayout = GroupCycleRecipient::where('group_id', $group->id)
            ->where('round_number', $group->round_number)
            ->where('user_id', $user->id)
            ->whereNotNull('paid_out_at')
            ->first();

        if (! $lastPayout) {
            return null;
        }

        // Same cycle-period-enumeration idiom as cycles(), scoped to cycles since the payout.
        $periods = [];
        $cursor = $group->cycleBoundsFor($lastPayout->cycle_period)['end']->copy()->addDay();
        $now = now();

        while ($cursor->lte($now) && count($periods) < 52) {
            $period = $group->cyclePeriodFor($cursor);

            if (! in_array($period, $periods, true)) {
                $periods[] = $period;
            }

            $cursor = $group->frequency === 'weekly' ? $cursor->addWeek() : $cursor->addMonthNoOverflow();
        }

        $missed = collect($periods)->reject(
            fn ($period) => Contribution::where('group_id', $group->id)
                ->where('user_id', $user->id)
                ->where('cycle_period', $period)
                ->where('status', 'succeeded')
                ->exists()
        );

        return $missed->isNotEmpty()
            ? "{$user->name} a déjà reçu un versement ce tour mais n'a pas cotisé pour {$missed->count()} cycle(s) depuis."
            : null;
    }

    /** Shown on the group detail screen once a round is locked, in place of the normal cycle card. */
    private function roundSummary(Group $group): array
    {
        $rows = GroupCycleRecipient::where('group_id', $group->id)
            ->where('round_number', $group->round_number)
            ->whereNotNull('paid_out_at')
            ->with('vaultMovement')
            ->get();

        return [
            'members_paid' => $rows->pluck('user_id')->unique()->count(),
            'total_distributed' => (float) $rows->sum(fn ($row) => (float) ($row->vaultMovement->amount ?? 0)),
        ];
    }
}
