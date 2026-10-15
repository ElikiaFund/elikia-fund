<?php

namespace App\Models;

use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id', 'name', 'category', 'other_category', 'department', 'city', 'neighborhood', 'address',
    'yabeto_account_id', 'yabeto_onboarding_url', 'yabeto_onboarding_expires_at',
    'yabeto_verification_status', 'yabeto_capabilities', 'yabeto_compliance_checked_at',
])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory;

    /**
     * Yabeto Connect verification states, mirrored from GET
     * /v1/connect/accounts/{acct}/compliance.verification.status (docs/fr/connect/accounts/
     * onboarding). Flow: null → created → documents_submitted → in_review →
     * {approved, rejected, needs_info}. Only `approved` with `withdraw` in allowed_operations
     * unlocks the money flows for a Connect-routed company.
     */
    public const YABETO_VERIFICATION_APPROVED = 'approved';

    public const YABETO_VERIFICATION_TERMINAL = ['approved', 'rejected'];

    protected function casts(): array
    {
        return [
            'yabeto_capabilities' => 'array',
            'yabeto_onboarding_expires_at' => 'datetime',
            'yabeto_compliance_checked_at' => 'datetime',
        ];
    }

    /**
     * Whether this company was signed up under the Connect regime. Returns false for every
     * legacy user — their money flows continue through Elikia's own Yabeto account exactly as
     * today. Every money service's router branches on this one method.
     */
    public function hasConnectAccount(): bool
    {
        return filled($this->yabeto_account_id);
    }

    /**
     * KYC is approved AND `withdraw` is in allowed_operations. Both conditions must hold before
     * any Connect money operation is safe: Yabeto refunds buyers charge-by-charge if an account
     * accepts contributions then gets rejected (docs/fr/connect/accounts/onboarding "Si rejet"),
     * which would be catastrophic mid-tontine-cycle.
     */
    public function isConnectReady(): bool
    {
        if ($this->yabeto_verification_status !== self::YABETO_VERIFICATION_APPROVED) {
            return false;
        }

        $capabilities = $this->yabeto_capabilities ?? [];

        return in_array('withdraw', (array) ($capabilities['allowed_operations'] ?? []), true);
    }

    public const CATEGORIES = [
        'commerce',
        'agriculture',
        'artisanat',
        'restauration',
        'transport',
        'services',
        'beaute_bien_etre',
        'sante',
        'education',
        'technologie',
        'autre',
    ];

    /**
     * The Republic of Congo's 15 current departments — restructured from 12 in October 2024
     * (Congo-Oubangui split from Cuvette, Nkéni-Alima from Plateaux, Djoué-Léfini from Pool).
     * Congo-Brazzaville is the only market this app (and its payment provider) currently supports.
     */
    public const DEPARTMENTS = [
        'sangha', 'likouala', 'congo_oubangui', 'cuvette', 'cuvette_ouest', 'nkeni_alima',
        'plateaux', 'djoue_lefini', 'brazzaville', 'pool', 'bouenza', 'lekoumou', 'niari',
        'kouilou', 'pointe_noire',
    ];

    /**
     * Department capitals — the one guaranteed-correct preset city per department, offered as a
     * one-tap default in the location picker. Deliberately not a full commune/arrondissement
     * list: that data is genuinely incomplete even in authoritative sources this soon after the
     * reform above, so `city` itself is stored as free text (see the companies migration).
     *
     * @var array<string, string>
     */
    public const DEPARTMENT_CAPITALS = [
        'sangha' => 'Ouesso',
        'likouala' => 'Impfondo',
        'congo_oubangui' => 'Mossaka',
        'cuvette' => 'Owando',
        'cuvette_ouest' => 'Ewo',
        'nkeni_alima' => 'Gamboma',
        'plateaux' => 'Djambala',
        'djoue_lefini' => 'Odziba',
        'brazzaville' => 'Brazzaville',
        'pool' => 'Kinkala',
        'bouenza' => 'Madingou',
        'lekoumou' => 'Sibiti',
        'niari' => 'Dolisie',
        'kouilou' => 'Loango',
        'pointe_noire' => 'Pointe-Noire',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function productCategories(): HasMany
    {
        return $this->hasMany(ProductCategory::class);
    }

    public function transactionCategories(): HasMany
    {
        return $this->hasMany(TransactionCategory::class);
    }

    public function cashSessions(): HasMany
    {
        return $this->hasMany(CashSession::class);
    }

    public function vault(): HasOne
    {
        return $this->hasOne(Vault::class);
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }
}
