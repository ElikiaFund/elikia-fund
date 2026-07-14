<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePersonnelRequest;
use App\Http\Requests\Admin\UpdatePersonnelRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class PersonnelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(User::whereNotNull('role_id')->with('role')->latest()->get());
    }

    public function store(StorePersonnelRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
            'role_id' => $request->validated('role_id'),
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(UpdatePersonnelRequest $request, User $personnel): JsonResponse
    {
        $personnel->update($request->validated());

        return response()->json($personnel->load('role'));
    }

    public function destroy(User $personnel): JsonResponse
    {
        $personnel->delete();

        return response()->json(['message' => 'Membre du personnel supprimé.']);
    }
}
