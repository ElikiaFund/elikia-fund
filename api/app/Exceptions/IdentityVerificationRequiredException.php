<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A Connect company tried to move money before Yabeto approved its KYC. Rendered as a 403 with a
 * stable `code` so the mobile app can open the identity-verification screen instead of just
 * showing the message.
 */
class IdentityVerificationRequiredException extends RuntimeException
{
    public const CODE = 'identity_verification_required';

    public function __construct(string $message, public readonly int $companyId)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => self::CODE,
            'company_id' => $this->companyId,
        ], 403);
    }
}
