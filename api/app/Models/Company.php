<?php

namespace App\Models;

use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['user_id', 'name', 'category', 'other_category', 'department', 'city', 'neighborhood', 'address'])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory;

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
