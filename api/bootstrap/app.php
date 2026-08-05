<?php

use App\Http\Middleware\EnsureUserHasPermission;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\ResolveActiveCompany;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'permission' => EnsureUserHasPermission::class,
            'resolve-active-company' => ResolveActiveCompany::class,
        ]);

        // This is a pure JSON API with no `login` web route to redirect an unauthenticated
        // guest to — without this, Laravel's default Authenticate middleware calls
        // route('login') for any request that doesn't send an explicit `Accept: application/json`
        // header, which throws RouteNotFoundException (a raw 500) instead of a clean 401.
        // Real clients (mobile/back-office apiService) always send that header, but this closes
        // the gap for anything that doesn't.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // These framework exceptions carry hardcoded English messages ("Unauthenticated.",
        // "This action is unauthorized.") that aren't routed through lang/fr/validation.php —
        // overridden here so every JSON error response the API sends is French, not just
        // FormRequest validation failures.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Authentification requise.'], 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Action non autorisée.'], 403);
            }
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Ressource introuvable.'], 404);
            }
        });

        // FormRequest/Validator failures already translate each field message via
        // lang/fr/validation.php, but ValidationException's own top-level summary
        // ("The given data was invalid.") is a hardcoded English string outside that file —
        // overridden here so the envelope around `errors` is French too.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Les données fournies sont invalides.',
                    'errors' => $e->errors(),
                ], $e->status);
            }
        });

        // The `throttle` middleware (vault PIN verify/deposit/withdraw, auth, admin
        // verify-password, ...) throws this with a hardcoded English "Too Many Attempts."
        // message — Retry-After is preserved so clients can still back off correctly.
        $exceptions->render(function (TooManyRequestsHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $retryAfter = $e->getHeaders()['Retry-After'] ?? null;

                return response()->json([
                    'message' => $retryAfter
                        ? "Trop de tentatives. Réessayez dans {$retryAfter} seconde(s)."
                        : 'Trop de tentatives. Veuillez réessayer plus tard.',
                ], 429, $e->getHeaders());
            }
        });
    })->create();
