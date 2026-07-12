<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    /**
     * TODO (Day 2): POST /sync — accept a batch of UUID-keyed transactions from the
     * mobile sync_queue, upsert by uuid (last-write-wins by timestamp), return accepted IDs.
     */
    public function __invoke(Request $request)
    {
        //
    }
}
