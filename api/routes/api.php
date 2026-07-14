<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\CreditScoreController;
use App\Http\Controllers\Api\Admin\GroupController as AdminGroupController;
use App\Http\Controllers\Api\Admin\PermissionController;
use App\Http\Controllers\Api\Admin\PersonnelController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\ScoringCriterionController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\StatsController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CreditScoreController as MeCreditScoreController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VaultController;
use Illuminate\Support\Facades\Route;

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
    Route::get('/me/credit-score', MeCreditScoreController::class);

    Route::post('/onboarding/company', [OnboardingController::class, 'createCompany']);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::post('/sync', SyncController::class);

    Route::post('/vault/activate', [VaultController::class, 'activate']);
    Route::post('/vault/pin/verify', [VaultController::class, 'verifyPin'])->middleware('throttle:5,1');
    Route::get('/vault', [VaultController::class, 'show']);
    Route::post('/vault/deposit', [VaultController::class, 'deposit']);
    Route::post('/vault/withdraw', [VaultController::class, 'withdraw']);

    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::post('/groups/join', [GroupController::class, 'join']);
    Route::post('/groups/{group}/contribute', [GroupController::class, 'contribute']);

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
    });
});
