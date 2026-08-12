<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\FeeException;
use App\Exceptions\VaultLockedException;
use App\Exceptions\VaultTransactionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Vault\SetVaultPinRequest;
use App\Http\Requests\Vault\UpdateVaultPinRequest;
use App\Http\Requests\Vault\VaultTransactionRequest;
use App\Http\Requests\Vault\VerifyVaultPinRequest;
use App\Models\Vault;
use App\Models\VaultMovement;
use App\Services\FeeService;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\Payment\YabetoStatus;
use App\Services\PaymentNotificationService;
use App\Services\VaultFraudDetectionService;
use App\Services\VaultSecurityService;
use App\Services\VaultTransactionService;
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
        private readonly VaultTransactionService $vaultTransactions,
        private readonly FeeService $fees,
        private readonly VaultSecurityService $vaultSecurity,
        private readonly VaultFraudDetectionService $fraudDetection,
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

        $this->vaultSecurity->logActivated($vault);

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

        try {
            if (! $this->vaultSecurity->checkPin($vault, $request->validated('pin'))) {
                return response()->json(['message' => 'Code PIN incorrect.'], 422);
            }
        } catch (VaultLockedException $e) {
            return response()->json(['message' => $e->getMessage()], 423);
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

        try {
            if (! $this->vaultSecurity->checkPin($vault, $request->validated('current_pin'))) {
                return response()->json(['message' => 'Code PIN actuel incorrect.'], 422);
            }
        } catch (VaultLockedException $e) {
            return response()->json(['message' => $e->getMessage()], 423);
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

        try {
            $result = $this->vaultTransactions->deposit($vault, $amount, $paymentMethod, $methodLabel, $phone);
        } catch (VaultTransactionException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($result['movement']->status === 'succeeded') {
            $this->paymentNotifications->depositSucceeded($vault->user, $amount);
        } elseif ($result['movement']->status === 'failed') {
            $this->paymentNotifications->depositFailed($vault->user, $amount, $result['message'] ?? null);
        }

        return response()->json($result, $this->statusFor($result['movement']));
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
        $paymentMethod = $request->validated('payment_method');
        $methodLabel = self::PAYMENT_METHOD_LABELS[$paymentMethod];

        if (! $this->yabeto->isEnabled()) {
            return $this->withdrawSimulated($vault, $amount, $methodLabel);
        }

        $phone = $request->validated('phone');

        if (! $phone) {
            return response()->json(['message' => 'Numéro de téléphone Mobile Money requis.'], 422);
        }

        try {
            $result = $this->vaultTransactions->withdraw($vault, $amount, $paymentMethod, $methodLabel, $phone);
        } catch (VaultTransactionException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($result['movement']->status === 'succeeded') {
            $this->paymentNotifications->withdrawSucceeded($vault->user, $amount);
        } elseif ($result['movement']->status === 'failed') {
            $this->paymentNotifications->withdrawFailed($vault->user, $amount, $result['message'] ?? null);
        }

        return response()->json($result, $this->statusFor($result['movement']));
    }

    private function depositSimulated(Vault $vault, float $amount, string $methodLabel): JsonResponse
    {
        try {
            $fee = $this->fees->deposit($amount);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $movement = DB::transaction(function () use ($vault, $amount, $fee, $methodLabel) {
            $vault->increment('balance', $fee['net_amount']);

            return $vault->movements()->create([
                'type' => 'deposit',
                'amount' => $amount,
                'fee_amount' => $fee['fee_amount'],
                'provider_fee_amount' => $fee['provider_fee_amount'],
                'platform_fee_amount' => $fee['platform_fee_amount'],
                'net_amount' => $fee['net_amount'],
                'note' => "Dépôt via {$methodLabel} (simulation).",
                'status' => 'completed',
            ]);
        });

        $this->paymentNotifications->depositSucceeded($vault->user, $amount);
        $this->fraudDetection->evaluate($movement);

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    private function withdrawSimulated(Vault $vault, float $amount, string $methodLabel): JsonResponse
    {
        try {
            $fee = $this->fees->withdrawal($amount);
        } catch (FeeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        try {
            $movement = DB::transaction(function () use ($vault, $amount, $fee, $methodLabel) {
                $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

                if ($amount > (float) $locked->balance) {
                    throw new VaultTransactionException('Solde insuffisant.');
                }

                $locked->decrement('balance', $amount);

                return $locked->movements()->create([
                    'type' => 'withdraw',
                    'amount' => $amount,
                    'fee_amount' => $fee['fee_amount'],
                    'provider_fee_amount' => $fee['provider_fee_amount'],
                    'platform_fee_amount' => $fee['platform_fee_amount'],
                    'net_amount' => $fee['net_amount'],
                    'note' => "Retrait via {$methodLabel} (simulation).",
                    'status' => 'completed',
                ]);
            });
        } catch (VaultTransactionException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->paymentNotifications->withdrawSucceeded($vault->user, $amount);
        $this->fraudDetection->evaluate($movement);

        return response()->json(['vault' => $vault->fresh(), 'movement' => $movement], 201);
    }

    /**
     * POST /vault/movements/{movement}/refresh-status — manual fallback for a deposit/withdrawal
     * stuck `processing` (e.g. the confirmation webhook never arrived — mirrors
     * GroupController::refreshContributionStatus, contributions' own equivalent).
     */
    public function refreshMovementStatus(Request $request, VaultMovement $movement): JsonResponse
    {
        $vault = $request->user()->vault;

        abort_unless($vault && $movement->vault_id === $vault->id, 403);

        if ($movement->provider !== 'yabeto' || YabetoStatus::isTerminal($movement->status) || ! $movement->yabeto_reference) {
            return response()->json($movement);
        }

        try {
            $result = $movement->type === 'deposit'
                ? $this->yabeto->getPaymentIntent($movement->yabeto_reference)
                : $this->yabeto->getDisbursement($movement->yabeto_reference);
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto movement status refresh failed', ['message' => $e->getMessage(), 'movement_id' => $movement->id]);

            return response()->json($movement);
        }

        $resolved = $this->vaultTransactions->resolveMovementStatus($movement->id, $result->status);

        if ($resolved) {
            if ($result->succeeded()) {
                $movement->type === 'deposit'
                    ? $this->paymentNotifications->depositSucceeded($vault->user, (float) $movement->amount)
                    : $this->paymentNotifications->withdrawSucceeded($vault->user, (float) $movement->amount);
            } elseif ($result->failed()) {
                $movement->type === 'deposit'
                    ? $this->paymentNotifications->depositFailed($vault->user, (float) $movement->amount, $result->failureMessage)
                    : $this->paymentNotifications->withdrawFailed($vault->user, (float) $movement->amount, $result->failureMessage);
            }
        }

        return response()->json($resolved ?? $movement->fresh());
    }

    /** 201 once a movement is terminally succeeded, 202 while still processing, 422 on a terminal failure. */
    private function statusFor(VaultMovement $movement): int
    {
        return match ($movement->status) {
            'succeeded', 'completed' => 201,
            'processing' => 202,
            'failed' => 422,
            default => 200,
        };
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

        try {
            if (! $this->vaultSecurity->checkPin($vault, $request->validated('pin'))) {
                return response()->json(['message' => 'Code PIN incorrect.'], 422);
            }
        } catch (VaultLockedException $e) {
            return response()->json(['message' => $e->getMessage()], 423);
        }

        return $vault;
    }
}
