<?php

namespace App\Models;

use Carbon\Carbon;
use Database\Factories\GroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'uuid', 'name', 'contribution_amount', 'frequency', 'max_members', 'invite_code', 'owner_id', 'company_id',
    'contribution_day', 'contribution_time', 'recipient_mode', 'recipient_order',
    'auto_payout_enabled', 'round_number', 'round_status',
    'recipient_order_updated_at', 'recipient_order_updated_by',
])]
class Group extends Model
{
    /** @use HasFactory<GroupFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'contribution_amount' => 'decimal:2',
            'recipient_order' => 'array',
            'auto_payout_enabled' => 'boolean',
            'recipient_order_updated_at' => 'datetime',
        ];
    }

    /** A round (one full pass through the rotation) is locked once everyone's been paid out — see TontinePayoutService::completeRoundIfDone(). */
    public function isRoundLocked(): bool
    {
        return $this->round_status === 'completed';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** The business this tontine is attributed to — chosen by the creator, fixed for the
     * tontine's lifetime. Membership stays person-based (see members()); this only decides
     * where cotisations/versements are counted (vault credit destination, credit-score
     * tontine_participation) — see TontinePayoutService::disburse(). */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /** Approved members only — pending join requests can't contribute or count toward max_members. */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members')
            ->withPivot('joined_at', 'status', 'approved_at')
            ->wherePivot('status', 'approved');
    }

    /** Join requests awaiting the owner's approve/decline decision. */
    public function pendingMembers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members')
            ->withPivot('joined_at', 'status')
            ->wherePivot('status', 'pending');
    }

    /** Members removed by the owner — kept for history (see GroupController::removeMember), not shown to mobile clients. */
    public function removedMembers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members')
            ->withPivot('joined_at', 'approved_at', 'removed_at')
            ->wherePivot('status', 'removed');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }

    public function cycleRecipients(): HasMany
    {
        return $this->hasMany(GroupCycleRecipient::class);
    }

    public function deletionRequests(): HasMany
    {
        return $this->hasMany(GroupDeletionRequest::class);
    }

    /** The currently-active (not yet resolved) deletion vote, if any — at most one per group. */
    public function pendingDeletionRequest(): HasOne
    {
        return $this->hasOne(GroupDeletionRequest::class)->where('status', 'pending');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * The identifier for "this billing cycle" — monthly groups key by calendar month, weekly
     * groups by ISO week. Naive by design (calendar-aligned, not rolling from creation date) —
     * matches the "keep it dumb" conflict rule the rest of the cash flow/sync logic follows.
     */
    public function currentCyclePeriod(): string
    {
        return $this->cyclePeriodFor(now());
    }

    public function previousCyclePeriod(): string
    {
        return $this->cyclePeriodFor($this->frequency === 'weekly' ? now()->subWeek() : now()->subMonthNoOverflow());
    }

    public function cyclePeriodFor(Carbon $date): string
    {
        return $this->frequency === 'weekly' ? $date->format('o-\WW') : $date->format('Y-m');
    }

    /**
     * The reverse of cyclePeriodFor() — the calendar start/end of a given cycle_period string,
     * e.g. "2026-W20" -> the Monday-Sunday of ISO week 20, or "2026-05" -> the full month of May.
     * Used to figure out who was actually a member during a given cycle (see TontineReportService)
     * and to label cycles for display (e.g. "10 au 17 mai 2026").
     */
    public function cycleBoundsFor(string $cyclePeriod): array
    {
        if ($this->frequency === 'weekly') {
            [$year, $week] = sscanf($cyclePeriod, '%d-W%d');
            $start = Carbon::now()->setISODate($year, $week)->startOfDay();

            return ['start' => $start, 'end' => $start->copy()->endOfWeek()];
        }

        $start = Carbon::createFromFormat('Y-m-d', "{$cyclePeriod}-01")->startOfMonth();

        return ['start' => $start, 'end' => $start->copy()->endOfMonth()];
    }

    /**
     * The scheduled due-moment for this cycle's contribution. Defaults to the plain calendar
     * week/month boundary when the creator hasn't set a specific contribution_day/time.
     */
    public function cycleEndsAt(): Carbon
    {
        if ($this->contribution_day === null) {
            return $this->frequency === 'weekly' ? now()->endOfWeek() : now()->endOfMonth();
        }

        $target = $this->frequency === 'weekly'
            ? now()->startOfWeek()->addDays($this->contribution_day - 1)
            : now()->startOfMonth()->addDays(min($this->contribution_day, now()->daysInMonth) - 1);

        if ($this->contribution_time) {
            [$hour, $minute] = explode(':', $this->contribution_time);
            $target->setTime((int) $hour, (int) $minute);
        }

        return $target;
    }

    /** Human-readable French label for the configured schedule, e.g. "Tous les lundis à 18h00". */
    public function scheduleLabel(): ?string
    {
        if ($this->contribution_day === null) {
            return null;
        }

        $time = $this->contribution_time ? Carbon::parse($this->contribution_time)->format('H\hi') : null;

        if ($this->frequency === 'weekly') {
            $days = [1 => 'lundis', 2 => 'mardis', 3 => 'mercredis', 4 => 'jeudis', 5 => 'vendredis', 6 => 'samedis', 7 => 'dimanches'];
            $day = $days[$this->contribution_day] ?? null;

            return $day ? "Tous les {$day}".($time ? " à {$time}" : '') : null;
        }

        return "Le {$this->contribution_day} du mois".($time ? " à {$time}" : '');
    }
}
