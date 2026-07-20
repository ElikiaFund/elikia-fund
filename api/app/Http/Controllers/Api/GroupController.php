<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Group\ContributeRequest;
use App\Http\Requests\Group\CreateGroupRequest;
use App\Http\Requests\Group\JoinGroupRequest;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\PaymentNotificationService;
use App\Services\TontineReportService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'invite_code' => $this->generateInviteCode(),
            'owner_id' => $user->id,
        ]);

        $group->members()->attach($user->id, ['joined_at' => now()]);

        return response()->json($this->withCycleStatus($group->load('owner', 'members'), $user), 201);
    }

    /**
     * GET /groups/{group} — detail: members, contribution status for the current cycle.
     */
    public function show(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        return response()->json(
            $this->withCycleStatus($group->load('owner', 'members', 'contributions.user'), $user)
        );
    }

    /**
     * POST /groups/join — join a tontine via its invite code.
     */
    public function join(JoinGroupRequest $request): JsonResponse
    {
        $user = $request->user();
        $group = Group::where('invite_code', strtoupper($request->validated('invite_code')))->first();

        if (! $group) {
            return response()->json(['message' => "Code d'invitation invalide."], 404);
        }

        if ($group->members()->where('users.id', $user->id)->exists()) {
            return response()->json(['message' => 'Vous êtes déjà membre de cette tontine.'], 409);
        }

        if ($group->max_members !== null && $group->members()->count() >= $group->max_members) {
            return response()->json(['message' => 'Cette tontine a atteint son nombre maximum de participants.'], 409);
        }

        $group->members()->attach($user->id, ['joined_at' => now()]);

        return response()->json($this->withCycleStatus($group->load('owner', 'members'), $user));
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

        return $group;
    }
}
