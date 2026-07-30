<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CashSessionController as AdminCashSessionController;
use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\CreditScoreController;
use App\Http\Controllers\Api\Admin\GroupController as AdminGroupController;
use App\Http\Controllers\Api\Admin\PermissionController;
use App\Http\Controllers\Api\Admin\PersonnelController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\ScoringCriterionController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\StatsController;
use App\Http\Controllers\Api\Admin\SupportTicketController as AdminSupportTicketController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\WaitlistController as AdminWaitlistController;
use App\Http\Controllers\Api\Admin\YabetoSettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashSessionController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\CreditScoreController as MeCreditScoreController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VaultController;
use App\Http\Controllers\Api\WaitlistController;
use App\Http\Controllers\Api\YabetoWebhookController;
use Illuminate\Support\Facades\Route;

// Yabeto Pay webhook — public (Yabeto isn't a Sanctum-authenticated user), signature-verified
// inside the controller itself. See yabeto.md §7 and App\Services\Payment\YabetoWebhookVerifier.
Route::post('/webhooks/yabeto', YabetoWebhookController::class);

// Marketing website waitlist — public, no Sanctum user (website has no login). Throttled against spam.
Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:5,1');

// Mobile app auth — OAuth ("continuer avec Google/Apple/Facebook") + email/password.
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/google', [AuthController::class, 'google']);
    Route::post('/auth/apple', [AuthController::class, 'apple']);
    Route::post('/auth/facebook', [AuthController::class, 'facebook']);
});

// Back-office auth — email + password, admins only.
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [ProfileController::class, 'update']);
    Route::post('/me/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::post('/me/push-token', [ProfileController::class, 'registerPushToken']);
    Route::put('/me/cash-session-settings', [ProfileController::class, 'updateCashSessionSettings']);
    Route::get('/me/credit-score', MeCreditScoreController::class);
    Route::get('/me/notifications', [NotificationController::class, 'index']);
    Route::post('/me/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/me/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::get('/settings/contact', [ContactController::class, 'show']);
    Route::post('/support-tickets', [SupportTicketController::class, 'store']);

    Route::post('/onboarding/company', [OnboardingController::class, 'createCompany']);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::post('/sync', SyncController::class);

    Route::get('/cash-sessions', [CashSessionController::class, 'index']);
    Route::get('/cash-sessions/current', [CashSessionController::class, 'current']);
    Route::post('/cash-sessions/close', [CashSessionController::class, 'store']);

    Route::post('/vault/activate', [VaultController::class, 'activate']);
    Route::post('/vault/pin/verify', [VaultController::class, 'verifyPin'])->middleware('throttle:5,1');
    Route::put('/vault/pin', [VaultController::class, 'updatePin'])->middleware('throttle:5,1');
    Route::get('/vault', [VaultController::class, 'show']);
    Route::get('/vault/movements', [VaultController::class, 'movements']);
    Route::post('/vault/deposit', [VaultController::class, 'deposit']);
    Route::post('/vault/withdraw', [VaultController::class, 'withdraw']);

    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/preview/{inviteCode}', [GroupController::class, 'preview']);
    Route::post('/groups/join', [GroupController::class, 'join']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::post('/groups/{group}/contribute', [GroupController::class, 'contribute']);
    Route::post('/groups/{group}/contributions/{contribution}/refresh-status', [GroupController::class, 'refreshContributionStatus']);
    Route::get('/groups/{group}/report', [GroupController::class, 'report']);
    Route::get('/groups/{group}/cycles', [GroupController::class, 'cycles']);
    Route::get('/groups/{group}/requests', [GroupController::class, 'requests']);
    Route::post('/groups/{group}/requests/{user}/approve', [GroupController::class, 'approveRequest']);
    Route::post('/groups/{group}/requests/{user}/decline', [GroupController::class, 'declineRequest']);
    Route::put('/groups/{group}/recipient-order', [GroupController::class, 'updateRecipientOrder']);
    Route::put('/groups/{group}/cycle-recipient', [GroupController::class, 'designateRecipient']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/products/{product}/restock', [ProductController::class, 'restock']);
    Route::post('/products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);

    Route::get('/product-categories', [ProductCategoryController::class, 'index']);
    Route::post('/product-categories', [ProductCategoryController::class, 'store']);
    Route::put('/product-categories/{productCategory}', [ProductCategoryController::class, 'update']);
    Route::delete('/product-categories/{productCategory}', [ProductCategoryController::class, 'destroy']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', StatsController::class);
        Route::post('/verify-password', [AdminAuthController::class, 'verifyPassword'])->middleware('throttle:5,1');

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->middleware('permission:users.delete');
        Route::get('/users/{user}/credit-score', CreditScoreController::class);

        Route::get('/transactions', [AdminTransactionController::class, 'index']);
        Route::delete('/transactions/{transaction}', [AdminTransactionController::class, 'destroy'])->middleware('permission:transactions.delete');

        Route::get('/groups', [AdminGroupController::class, 'index']);
        Route::get('/groups/{group}', [AdminGroupController::class, 'show']);
        Route::delete('/groups/{group}', [AdminGroupController::class, 'destroy'])->middleware('permission:groups.delete');

        Route::get('/companies', [AdminCompanyController::class, 'index']);
        Route::get('/companies/{company}', [AdminCompanyController::class, 'show']);
        Route::delete('/companies/{company}', [AdminCompanyController::class, 'destroy'])->middleware('permission:companies.delete');

        Route::get('/waitlist', [AdminWaitlistController::class, 'index']);
        Route::delete('/waitlist/{waitlistEntry}', [AdminWaitlistController::class, 'destroy']);

        Route::get('/support-tickets', [AdminSupportTicketController::class, 'index']);
        Route::delete('/support-tickets/{supportTicket}', [AdminSupportTicketController::class, 'destroy'])->middleware('permission:support_tickets.delete');

        // Read access to a user's products/cash sessions is bundled into GET /admin/users/{user}
        // (the "Produits"/"Sessions de caisse" tabs) — these two routes only add delete.
        Route::delete('/products/{product}', [AdminProductController::class, 'destroy'])->middleware('permission:products.delete');
        Route::delete('/cash-sessions/{cashSession}', [AdminCashSessionController::class, 'destroy'])->middleware('permission:cash_sessions.delete');

        Route::get('/permissions', [PermissionController::class, 'index']);

        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/roles/{role}', [RoleController::class, 'show']);
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.manage');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.manage');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.manage');

        Route::get('/personnel', [PersonnelController::class, 'index']);
        Route::post('/personnel', [PersonnelController::class, 'store'])->middleware('permission:personnel.manage');
        Route::put('/personnel/{personnel}', [PersonnelController::class, 'update'])->middleware('permission:personnel.manage');
        Route::delete('/personnel/{personnel}', [PersonnelController::class, 'destroy'])->middleware('permission:personnel.manage');

        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update'])->middleware('permission:settings.manage');

        Route::get('/scoring-criteria', [ScoringCriterionController::class, 'index']);
        Route::put('/scoring-criteria/{scoringCriterion}', [ScoringCriterionController::class, 'update'])->middleware('permission:settings.manage');

        Route::get('/settings/yabeto', [YabetoSettingController::class, 'show']);
        Route::put('/settings/yabeto', [YabetoSettingController::class, 'update'])->middleware('permission:settings.manage');
        Route::post('/settings/yabeto/test-connection', [YabetoSettingController::class, 'testConnection'])->middleware('permission:settings.manage');
        Route::post('/settings/yabeto/register-webhook', [YabetoSettingController::class, 'registerWebhook'])->middleware('permission:settings.manage');
    });
});
