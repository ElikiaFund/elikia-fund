<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RoleRequest;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Role::with('permissions')->withCount('users')->get());
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json($role->load('permissions'));
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $role = Role::create($request->safe()->only(['name', 'description']));
        $role->permissions()->sync($request->validated('permission_ids', []));

        return response()->json($role->load('permissions'), 201);
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $role->update($request->safe()->only(['name', 'description']));
        $role->permissions()->sync($request->validated('permission_ids', []));

        return response()->json($role->load('permissions'));
    }

    public function destroy(Role $role): JsonResponse
    {
        // users.role_id is nullOnDelete — members of this role become unassigned, not deleted.
        $role->delete();

        return response()->json(['message' => 'Rôle supprimé.']);
    }
}
