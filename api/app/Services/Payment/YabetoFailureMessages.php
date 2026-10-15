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

        // Yabeto Connect (docs/fr/connect/pricing, /payouts, /refunds, /errors). These codes
        // only appear in the Connect routing paths — see each service's shouldUseConnect()
        // branch and app/Http/Controllers/Api/YabetoWebhookController's Connect event handlers.
        'connect.application_fee_too_low' => 'La commission marketplace configurée est inférieure au plancher Yabeto. Contactez le support Elikia pour ajuster le taux dans les paramètres.',
        'connect.application_fee_too_high' => 'La commission marketplace dépasse le montant encaissé. Contactez le support Elikia.',
        'connect.vendor_net_not_positive' => 'Après commission, le vendeur recevrait zéro ou moins. Réduisez la commission ou augmentez le montant.',
        'connect.incomplete_request' => 'La configuration de la cotisation est incomplète (compte connecté ou taux de commission manquant). Contactez le support.',
        'connect.fee_payer_unset' => "Le compte Yabeto Connect n'a pas de mode de commission configuré. Contactez le support Elikia.",
        'connect.controller_mode_unset' => "Yabeto Connect n'est pas encore activé pour Elikia. Contactez le support.",
        'connect.insufficient_funds_for_refund' => 'Impossible de rembourser : solde Elikia insuffisant côté marketplace. Réessayez une fois le solde reconstitué.',
        'connect.insufficient_funds_for_reversal' => "Impossible d'annuler l'allocation : le vendeur ne peut plus restituer les fonds (déjà retirés).",
        'E_CONNECT_VENDOR_PAYOUT_METHOD_UNAVAILABLE' => 'Vous devez terminer la vérification de votre identité (CNI + selfie) et enregistrer votre numéro Mobile Money avant de pouvoir recevoir des versements.',
        'E_CONNECT_VENDOR_EMPTY_BALANCE' => "Les fonds de ce cycle sont encore en période de maturation chez Yabeto. Le versement se fera automatiquement dès qu'ils seront disponibles.",
        'E_CONNECT_PRICING_UNAVAILABLE' => 'Impossible de résoudre la grille tarifaire Yabeto. Réessayez dans un instant.',
        'E_PENDING_WITHDRAW' => "Un versement est déjà en cours pour ce cycle. Attendez sa confirmation avant d'en lancer un autre.",
        'E_VERIFICATION_REQUIRED' => 'Votre identité doit être vérifiée par Yabeto avant toute opération. Lancez la vérification depuis votre entreprise.',
        'E_SERVICE_UNAVAILABLE' => 'Le service de paiement Yabeto est momentanément indisponible. Réessayez dans quelques instants.',
        'E_SSO_UNAVAILABLE' => "Le service d'identité Yabeto est momentanément indisponible. Réessayez dans quelques instants.",
        'E_REFERENTIAL_COUNTRY_MISSING' => 'Pays non reconnu dans le référentiel Yabeto. Contactez le support.',
        'E_CONNECT_ONBOARDING_UNSUPPORTED' => "Yabeto n'offre pas encore de vérification d'identité pour votre pays. Contactez le support.",
        'E_IDEMPOTENCY_CONFLICT' => 'Une requête identique est déjà en cours. Attendez quelques secondes et réessayez.',
        'E_DUPLICATE_OPERATION' => 'Cette opération a déjà été effectuée. Vérifiez vos relevés avant de réessayer.',
        'E_TOO_MANY_REQUESTS' => 'Trop de requêtes. Attendez une minute puis réessayez.',
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
