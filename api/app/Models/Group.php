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

#[Fillable(['uuid', 'name', 'contribution_amount', 'frequency', 'max_members', 'invite_code', 'owner_id'])]
class Group extends Model
{
    /** @use HasFactory<GroupFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'contribution_amount' => 'decimal:2',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members')->withPivot('joined_at');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
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

    /** End of the current calendar week/month — used to schedule contribution reminders. */
    public function cycleEndsAt(): Carbon
    {
        return $this->frequency === 'weekly' ? now()->endOfWeek() : now()->endOfMonth();
    }
}
