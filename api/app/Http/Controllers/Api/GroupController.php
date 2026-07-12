<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    // TODO (Day 2): GET /groups — groups the authenticated user belongs to.
    public function index(Request $request)
    {
        //
    }

    // TODO (Day 2): POST /groups — create group (name, contribution_amount, frequency), generate invite_code.
    public function store(Request $request)
    {
        //
    }

    // TODO (Day 2): GET /groups/{group} — detail: members + contribution status per cycle.
    public function show(Request $request, string $group)
    {
        //
    }

    // TODO (Day 2): POST /groups/join — join via invite code.
    public function join(Request $request)
    {
        //
    }

    // TODO (Day 2): POST /groups/{group}/contribute — record a mock contribution.
    public function contribute(Request $request, string $group)
    {
        //
    }
}
