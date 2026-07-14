<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vault\SetVaultPinRequest;
use App\Http\Requests\Vault\VaultTransactionRequest;
use App\Http\Requests\Vault\VerifyVaultPinRequest;
use App\Models\Vault;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class VaultController extends Controller
{
    /**
     * Mocked payment gateway — no real MTN/Airtel API integration yet, see api/README.md.
     * Human-readable label stored on the movement note for display purposes.
     *
     * @var array<string, string>
     */
    private const PAYMENT_METHOD_LABELS = [
        'mtn_momo' => 'MTN Mobile Money',
        'airtel_money' => 'Airtel Money',
    ];

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

    /**
     * GET /vault — lets the client know upfront whether a vault exists (and its balance),
     * so it can route straight to activation or to PIN unlock without guessing.
     */
    public function show(Request $request): JsonResponse
    {
        $vault = $request->user()->vault;

        if (! $vault) {
            return response()->json(['message' => "Le coffre n'est pas encore activé."], 404);
        }

        return response()->json($vault);
    }

    /**
     * POST /vault/deposit — mocked mobile money deposit (see api/README.md for what's real vs.
     * staged here). Re-verifies the PIN, then credits the balance and records the movement.
     */
    public function deposit(VaultTransactionRequest $request): JsonResponse
    {
        $vault = $this->vaultForVerifiedPin($request);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        $amount = $request->validated('amount');
        $methodLabel = self::PAYMENT_METHOD_LABELS[$request->validated('payment_method')];

        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $vault->increment('balance', $amount);

            return $vault->movements()->create([
                'type' => 'deposit',
                'amount' => $amount,
                'note' => "Dépôt via {$methodLabel} (simulation).",
            ]);
        });

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    /**
     * POST /vault/withdraw — mocked mobile money withdrawal (see api/README.md). Re-verifies
     * the PIN, checks sufficient balance, then debits and records the movement.
     */
    public function withdraw(VaultTransactionRequest $request): JsonResponse
    {
        $vault = $this->vaultForVerifiedPin($request);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        $amount = $request->validated('amount');

        if ($amount > $vault->balance) {
            return response()->json(['message' => 'Solde insuffisant.'], 422);
        }

        $methodLabel = self::PAYMENT_METHOD_LABELS[$request->validated('payment_method')];

        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $vault->decrement('balance', $amount);

            return $vault->movements()->create([
                'type' => 'withdraw',
                'amount' => $amount,
                'note' => "Retrait via {$methodLabel} (simulation).",
            ]);
        });

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    /**
     * Shared PIN re-verification for deposit/withdraw. Returns the vault on success, or a
     * ready-to-return error JsonResponse on failure.
     */
    private function vaultForVerifiedPin(VaultTransactionRequest $request): Vault|JsonResponse
    {
        $vault = $request->user()->vault;

        if (! $vault || ! $vault->hasPinSet()) {
            return response()->json(['message' => "Le coffre n'est pas encore activé."], 404);
        }

        if (! Hash::check($request->validated('pin'), $vault->pin_hash)) {
            return response()->json(['message' => 'Code PIN incorrect.'], 422);
        }

        return $vault;
    }
}
