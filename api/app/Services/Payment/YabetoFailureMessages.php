<?php

namespace App\Services\Payment;

/**
 * Translates Yabeto/the underlying mobile money network's raw failure reason codes (e.g.
 * "LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED") into French messages a merchant can
 * actually act on. Applied once at the DTO boundary (PaymentIntentResult/DisbursementResult) so
 * every caller downstream (VaultController, GroupController, the notification services) gets the
 * translated text automatically instead of each needing to remember to translate it themselves.
 *
 * The mapping is deliberately not exhaustive — Yabeto/MTN don't publish a canonical code list
 * anywhere referenced in yabeto.md — it only covers codes either confirmed in production or
 * well-documented on MTN's own Mobile Money API. Anything unrecognized still gets a generic,
 * actionable French message rather than surfacing the raw code to the user.
 */
class YabetoFailureMessages
{
    private const MAP = [
        // Confirmed in production (2026-08-05) — MTN's own Request-to-Pay API bundles several
        // distinct causes into one composite code: the payer's wallet balance is too low, a
        // MoMo transaction/velocity limit was hit, or the number isn't a valid/active MoMo wallet.
        'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED' => "Solde insuffisant, limite Mobile Money atteinte, ou ce numéro n'est pas un compte Mobile Money valide. Vérifiez le numéro et réessayez.",
        'NOT_ENOUGH_FUNDS' => 'Solde Mobile Money insuffisant.',
        'PAYER_LIMIT_REACHED' => 'Limite de transaction Mobile Money atteinte pour ce numéro.',
        'PAYEE_NOT_FOUND' => "Ce numéro n'est pas reconnu comme un compte Mobile Money.",
        'PAYER_NOT_FOUND' => "Ce numéro n'est pas reconnu comme un compte Mobile Money.",
        'PAYEE_NOT_ALLOWED_TO_RECEIVE' => 'Ce compte Mobile Money ne peut pas recevoir ce paiement.',
        'NOT_ALLOWED' => "Cette opération n'est pas autorisée pour ce compte Mobile Money.",
        'EXPIRED' => 'La demande de confirmation a expiré sans réponse.',
        'REJECTED' => 'Le paiement a été refusé sur le téléphone du payeur.',
    ];

    public static function translate(?string $rawCode): ?string
    {
        if (! $rawCode) {
            return null;
        }

        return self::MAP[$rawCode]
            ?? 'Le paiement a échoué. Vérifiez le numéro et le solde Mobile Money, puis réessayez.';
    }
}
