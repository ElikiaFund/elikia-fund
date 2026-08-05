<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['company_id', 'type', 'name', 'icon', 'color'])]
class TransactionCategory extends Model
{
    /**
     * Every new company starts with this vocabulary — the same fixed list the mobile cash flow
     * form used before categories became per-company/editable (mobile/src/constants/cashflow-categories.ts),
     * so existing behavior doesn't regress on day one; freely renamed/added/deleted after.
     */
    public const DEFAULT_CATALOG = [
        'income' => [
            ['name' => 'Vente', 'icon' => 'storefront-outline'],
            ['name' => 'Salaire', 'icon' => 'briefcase-outline'],
            ['name' => 'Prêt reçu', 'icon' => 'hand-left-outline'],
            ['name' => 'Autre revenu', 'icon' => 'ellipsis-horizontal-outline'],
        ],
        'expense' => [
            ['name' => 'Alimentation', 'icon' => 'restaurant-outline'],
            ['name' => 'Transport', 'icon' => 'car-outline'],
            ['name' => 'Logement', 'icon' => 'home-outline'],
            ['name' => 'Santé', 'icon' => 'medkit-outline'],
            ['name' => 'Fournitures', 'icon' => 'cube-outline'],
            ['name' => 'Achat de stock', 'icon' => 'archive-outline'],
            ['name' => 'Loisirs', 'icon' => 'happy-outline'],
            ['name' => 'Autre dépense', 'icon' => 'ellipsis-horizontal-outline'],
        ],
    ];

    public static function seedDefaultsFor(Company $company): void
    {
        foreach (self::DEFAULT_CATALOG as $type => $items) {
            foreach ($items as $item) {
                self::firstOrCreate(
                    ['company_id' => $company->id, 'type' => $type, 'name' => $item['name']],
                    ['icon' => $item['icon']],
                );
            }
        }
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
