<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vault\SetVaultPinRequest;
use App\Http\Requests\Vault\UpdateVaultPinRequest;
use App\Http\Requests\Vault\VaultTransactionRequest;
use App\Http\Requests\Vault\VerifyVaultPinRequest;
use App\Models\Vault;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\PaymentNotificationService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class VaultController extends Controller
{
    /**
     * Human-readable label stored on the movement note for display purposes.
     *
     * @var array<string, string>
     */
    private const PAYMENT_METHOD_LABELS = [
        'mtn_momo' => 'MTN Mobile Money',
        'airtel_money' => 'Airtel Money',
    ];

    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly PaymentNotificationService $paymentNotifications,
    ) {}

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
     * PUT /vault/pin — change the PIN, re-verifying the current one first. Powers the mobile
     * "Sécurité et code PIN" screen.
     */
    public function updatePin(UpdateVaultPinRequest $request): JsonResponse
    {
        $vault = $request->user()->vault;

        if (! $vault || ! $vault->hasPinSet()) {
            return response()->json(['message' => "Le coffre n'est pas encore activé."], 404);
        }

        if (! Hash::check($request->validated('current_pin'), $vault->pin_hash)) {
            return response()->json(['message' => 'Code PIN actuel incorrect.'], 422);
        }

        $vault->pin_hash = Hash::make($request->validated('pin'));
        $vault->pin_set_at = now();
        $vault->save();

        return response()->json(['message' => 'Code PIN mis à jour.']);
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
     * GET /vault/movements — full deposit/withdraw history, for the in-app history list and the
     * PDF statement export. Most recent first.
     */
    public function movements(Request $request): JsonResponse
    {
        $vault = $request->user()->vault;

        if (! $vault) {
            return response()->json(['message' => "Le coffre n'est pas encore activé."], 404);
        }

        return response()->json($vault->movements()->latest()->get());
    }

    /**
     * POST /vault/deposit — re-verifies the PIN, then either runs a real Yabeto Pay deposit
     * (Payment Intent create+confirm) when the provider is enabled, or falls back to the
     * simulated instant-credit path (see api/README.md) otherwise.
     */
    public function deposit(VaultTransactionRequest $request): JsonResponse
    {
        $vault = $this->vaultForVerifiedPin($request);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        $amount = $request->validated('amount');
        $paymentMethod = $request->validated('payment_method');
        $methodLabel = self::PAYMENT_METHOD_LABELS[$paymentMethod];

        if (! $this->yabeto->isEnabled()) {
            return $this->depositSimulated($vault, $amount, $methodLabel);
        }

        $phone = $request->validated('phone');

        if (! $phone) {
            return response()->json(['message' => 'Numéro de téléphone Mobile Money requis.'], 422);
        }

        return $this->depositViaYabeto($vault, $amount, $paymentMethod, $methodLabel, $phone);
    }

    /**
     * POST /vault/withdraw — re-verifies the PIN and checks sufficient balance, then either runs
     * a real Yabeto Pay payout (Disbursement) or falls back to the simulated instant-debit path.
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

        $paymentMethod = $request->validated('payment_method');
        $methodLabel = self::PAYMENT_METHOD_LABELS[$paymentMethod];

        if (! $this->yabeto->isEnabled()) {
            return $this->withdrawSimulated($vault, $amount, $methodLabel);
        }

        $phone = $request->validated('phone');

        if (! $phone) {
            return response()->json(['message' => 'Numéro de téléphone Mobile Money requis.'], 422);
        }

        return $this->withdrawViaYabeto($vault, $amount, $paymentMethod, $methodLabel, $phone);
    }

    private function depositSimulated(Vault $vault, float $amount, string $methodLabel): JsonResponse
    {
        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $vault->increment('balance', $amount);

            return $vault->movements()->create([
                'type' => 'deposit',
                'amount' => $amount,
                'note' => "Dépôt via {$methodLabel} (simulation).",
                'status' => 'completed',
            ]);
        });

        $this->paymentNotifications->depositSucceeded($vault->user, $amount);

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    private function withdrawSimulated(Vault $vault, float $amount, string $methodLabel): JsonResponse
    {
        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $vault->decrement('balance', $amount);

            return $vault->movements()->create([
                'type' => 'withdraw',
                'amount' => $amount,
                'note' => "Retrait via {$methodLabel} (simulation).",
                'status' => 'completed',
            ]);
        });

        $this->paymentNotifications->withdrawSucceeded($vault->user, $amount);

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    /**
     * Deposits credit the balance only once Yabeto confirms success — the confirm response is
     * often already terminal (yabeto.md §5.2), but a `processing` result leaves the movement
     * pending until the `intent.completed` webhook resolves it.
     */
    private function depositViaYabeto(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): JsonResponse
    {
        try {
            $intent = $this->yabeto->createPaymentIntent(
                (int) round($amount),
                'Dépôt coffre Elikia Fund',
                ['vault_id' => $vault->id],
            );

            $result = $this->yabeto->confirmPaymentIntent(
                $intent->id,
                $intent->clientSecret ?? '',
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->user->name,
                '',
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto deposit request failed', ['message' => $e->getMessage()]);

            return response()->json(['message' => "Le paiement n'a pas pu être initié. Veuillez réessayer."], 502);
        }

        if ($result->failed()) {
            $this->paymentNotifications->depositFailed($vault->user, $amount, $result->failureMessage);

            return response()->json(['message' => $result->failureMessage ?? 'Le paiement a échoué.'], 422);
        }

        $movement = $vault->movements()->create([
            'type' => 'deposit',
            'amount' => $amount,
            'note' => "Dépôt via {$methodLabel}.",
            'provider' => 'yabeto',
            'status' => $result->status,
            'yabeto_reference' => $result->id,
        ]);

        if ($result->succeeded()) {
            $vault->increment('balance', $amount);
            $this->paymentNotifications->depositSucceeded($vault->user, $amount);
        }

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    /**
     * Withdrawals via Disbursement are always created `processing` (yabeto.md §6) — the balance
     * is debited immediately to reserve the funds, and refunded if the webhook later reports a
     * failure. Never optimistic-credits; only ever optimistic-*debits* a payout already in flight.
     */
    private function withdrawViaYabeto(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): JsonResponse
    {
        try {
            $result = $this->yabeto->createDisbursement(
                (int) round($amount),
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->user->name,
                '',
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto withdrawal request failed', ['message' => $e->getMessage()]);

            return response()->json(['message' => "Le retrait n'a pas pu être initié. Veuillez réessayer."], 502);
        }

        if ($result->failed()) {
            $this->paymentNotifications->withdrawFailed($vault->user, $amount, $result->failureMessage);

            return response()->json(['message' => $result->failureMessage ?? 'Le retrait a échoué.'], 422);
        }

        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel, $result) {
            $vault->decrement('balance', $amount);

            return $vault->movements()->create([
                'type' => 'withdraw',
                'amount' => $amount,
                'note' => "Retrait via {$methodLabel}.",
                'provider' => 'yabeto',
                'status' => $result->status,
                'yabeto_reference' => $result->id,
            ]);
        });

        if ($result->succeeded()) {
            $this->paymentNotifications->withdrawSucceeded($vault->user, $amount);
        }

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
