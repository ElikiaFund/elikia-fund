<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves "which company is this request for" from the X-Company-Id header, mirroring how
 * auth:sanctum resolves $request->user() one level up. Required, no silent fallback — a missing
 * or invalid header is rejected outright rather than guessed at, since every company-scoped
 * endpoint's data isolation depends on this check running on every single request. Exposes the
 * resolved company via the $request->company() macro (see AppServiceProvider::boot()).
 */
class ResolveActiveCompany
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $companyId = $request->header('X-Company-Id');

        if (! $companyId || ! ctype_digit((string) $companyId)) {
            abort(400, 'Une entreprise active est requise.');
        }

        $company = Company::find((int) $companyId);

        if (! $company || $company->user_id !== $request->user()->id) {
            abort(403, 'Cette entreprise ne vous appartient pas.');
        }

        $request->attributes->set('company', $company);

        return $next($request);
    }
}
