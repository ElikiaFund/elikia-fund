<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(User::with('company')->latest()->get());
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('company', 'transactions', 'vault', 'groups'));
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
