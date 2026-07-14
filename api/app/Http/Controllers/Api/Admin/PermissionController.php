<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /**
     * Read-only — the permission catalog is code-defined (see PermissionSeeder), not user-creatable.
     */
    public function index(): JsonResponse
    {
        return response()->json(Permission::orderBy('group')->get());
    }
}
