<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vault;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'users_count' => User::count(),
            'transactions_volume' => (float) Transaction::sum('amount'),
            'vault_balance_total' => (float) Vault::sum('balance'),
            'active_groups_count' => Group::has('contributions')->count(),
        ]);
    }
}
