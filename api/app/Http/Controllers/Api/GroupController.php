<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Group\CreateGroupRequest;
use App\Http\Requests\Group\JoinGroupRequest;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GroupController extends Controller
{
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

        $group->members()->attach($user->id, ['joined_at' => now()]);

        return response()->json($this->withCycleStatus($group->load('owner', 'members'), $user));
    }

    /**
     * POST /groups/{group}/contribute — record a mock contribution for the current cycle.
     */
    public function contribute(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        abort_unless($group->members()->where('users.id', $user->id)->exists(), 403);

        $cyclePeriod = $this->currentCyclePeriod($group);

        $alreadyPaid = $group->contributions()
            ->where('user_id', $user->id)
            ->where('cycle_period', $cyclePeriod)
            ->exists();

        if ($alreadyPaid) {
            return response()->json(['message' => 'Vous avez déjà cotisé pour ce cycle.'], 409);
        }

        $contribution = Contribution::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'amount' => $group->contribution_amount,
            'cycle_period' => $cyclePeriod,
            'paid_at' => now(),
        ]);

        return response()->json($contribution->load('user'), 201);
    }

    private function generateInviteCode(): string
    {
        do {
            $code = Str::upper(Str::random(6));
        } while (Group::where('invite_code', $code)->exists());

        return $code;
    }

    /**
     * The identifier for "this billing cycle" — monthly groups key by calendar month,
     * weekly groups by ISO week, so contribute() can dedupe per member per cycle.
     */
    private function currentCyclePeriod(Group $group): string
    {
        return $group->frequency === 'weekly' ? now()->format('o-\WW') : now()->format('Y-m');
    }

    private function withCycleStatus(Group $group, User $user): Group
    {
        $group->current_cycle_period = $this->currentCyclePeriod($group);
        $group->has_paid_current_cycle = $group->contributions()
            ->where('user_id', $user->id)
            ->where('cycle_period', $group->current_cycle_period)
            ->exists();

        return $group;
    }
}
