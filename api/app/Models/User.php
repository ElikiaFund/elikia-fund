<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\Carbon;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'email', 'phone', 'password', 'avatar_url', 'google_id', 'apple_id', 'facebook_id', 'role_id', 'push_token',
    'cash_session_frequency', 'cash_session_day', 'cash_session_reminder_time', 'cash_session_reminders_enabled',
])]
#[Hidden(['password', 'remember_token', 'push_token', 'pin_hash'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** Neither is a real column — is_admin is computed from role_id, has_pin_set from pin_hash
     * (kept out of the hidden PIN internals, but the mobile vault-activate flow needs to know
     * whether to render "choose a PIN" vs "confirm your existing PIN" before any company vault
     * is even resolved). */
    protected $appends = ['is_admin', 'has_pin_set'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'onboarding_completed_at' => 'datetime',
            'cash_session_reminders_enabled' => 'boolean',
            'pin_set_at' => 'datetime',
            'locked_until' => 'datetime',
            'lockout_count_reset_at' => 'datetime',
        ];
    }

    protected function isAdmin(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->role_id !== null,
        );
    }

    protected function hasPinSet(): Attribute
    {
        return Attribute::make(
            get: fn () => ! is_null($this->pin_hash),
        );
    }

    public function hasPermission(string $key): bool
    {
        return $this->role?->permissions->contains('key', $key) ?? false;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    /** Every group this user has a membership row for — pending requests included, so the
     * mobile "Mes tontines" list can show a pending badge instead of hiding the request. */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_members')->withPivot('joined_at', 'status', 'approved_at');
    }

    public function ownedGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'owner_id');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest();
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    /** Human-readable French label for the configured cash-session cadence, e.g. "Tous les jours à 20h00". */
    public function cashSessionScheduleLabel(): ?string
    {
        $time = $this->cash_session_reminder_time ? Carbon::parse($this->cash_session_reminder_time)->format('H\hi') : null;

        if ($this->cash_session_frequency === 'weekly') {
            $days = [1 => 'lundis', 2 => 'mardis', 3 => 'mercredis', 4 => 'jeudis', 5 => 'vendredis', 6 => 'samedis', 7 => 'dimanches'];
            $day = $days[$this->cash_session_day] ?? null;

            return $day ? "Tous les {$day}".($time ? " à {$time}" : '') : null;
        }

        return 'Tous les jours'.($time ? " à {$time}" : '');
    }
}
