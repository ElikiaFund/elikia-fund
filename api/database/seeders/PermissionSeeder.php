<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * The fixed permission catalog — not user-creatable, only assignable to roles.
     *
     * @return array<string, array<string, string>>
     */
    public static function catalog(): array
    {
        return [
            'Utilisateurs' => ['users.view' => 'Voir les utilisateurs', 'users.delete' => 'Supprimer des utilisateurs'],
            'Transactions' => ['transactions.view' => 'Voir les transactions', 'transactions.delete' => 'Supprimer des transactions'],
            'Tontines' => ['groups.view' => 'Voir les tontines', 'groups.delete' => 'Supprimer des tontines'],
            'Entreprises' => ['companies.view' => 'Voir les entreprises', 'companies.delete' => 'Supprimer des entreprises'],
            'Personnel' => ['personnel.view' => 'Voir le personnel', 'personnel.manage' => 'Gérer le personnel'],
            'Rôles' => ['roles.view' => 'Voir les rôles', 'roles.manage' => 'Gérer les rôles et permissions'],
            'Paramètres' => ['settings.view' => 'Voir les paramètres', 'settings.manage' => 'Gérer les paramètres et la notation de crédit'],
        ];
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::catalog() as $group => $permissions) {
            foreach ($permissions as $key => $label) {
                Permission::updateOrCreate(['key' => $key], ['label' => $label, 'group' => $group]);
            }
        }
    }
}
