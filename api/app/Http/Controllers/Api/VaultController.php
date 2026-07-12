<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vault\SetVaultPinRequest;
use App\Http\Requests\Vault\VerifyVaultPinRequest;
use App\Models\Vault;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class VaultController extends Controller
{
    /**
     * POST /vault/activate — first-time vault activation: creates the vault and sets its 4-digit PIN.
     */
    public function activate(SetVaultPinRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->vault()->exists()) {
            return response()->json(['message' => 'Le coffre est déjà activé.'], 409);
        }

        $vault = new Vault(['user_id' => $user->id, 'balance' => 0]);
        // pin_hash is deliberately kept out of $fillable — set directly, never via mass assignment.
        $vault->pin_hash = Hash::make($request->validated('pin'));
        $vault->pin_set_at = now();
        $vault->save();

        return response()->json($vault, 201);
    }

    /**
     * POST /vault/pin/verify — unlock vault access for this session by confirming the PIN.
     */
    public function verifyPin(VerifyVaultPinRequest $request): JsonResponse
    {
        $vault = $request->user()->vault;

        if (! $vault || ! $vault->hasPinSet()) {
            return response()->json(['message' => "Le coffre n'est pas encore activé."], 404);
        }

        if (! Hash::check($request->validated('pin'), $vault->pin_hash)) {
            return response()->json(['message' => 'Code PIN incorrect.'], 422);
        }

        return response()->json(['message' => 'Code PIN vérifié.']);
    }

    // TODO (Day 2): GET /vault — balance + movement history for the authenticated user.
    public function show(Request $request)
    {
        //
    }

    // TODO (Day 2): POST /vault/deposit — mock deposit; must re-verify `pin` against vault.pin_hash before recording the movement.
    public function deposit(Request $request)
    {
        //
    }

    // TODO (Day 2): POST /vault/withdraw — mock withdraw; must re-verify `pin` against vault.pin_hash before recording the movement.
    public function withdraw(Request $request)
    {
        //
    }
}
