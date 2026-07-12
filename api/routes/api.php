<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\CompanyController as AdminCompanyController;
use App\Http\Controllers\Api\Admin\GroupController as AdminGroupController;
use App\Http\Controllers\Api\Admin\StatsController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VaultController;
use Illuminate\Support\Facades\Route;

// Mobile app auth — OAuth only ("continuer avec Google/Apple/Facebook").
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/google', [AuthController::class, 'google']);
    Route::post('/auth/apple', [AuthController::class, 'apple']);
    Route::post('/auth/facebook', [AuthController::class, 'facebook']);
});

// Back-office auth — email + password, admins only.
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

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

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/transactions', [AdminTransactionController::class, 'index']);
        Route::delete('/transactions/{transaction}', [AdminTransactionController::class, 'destroy']);

        Route::get('/groups', [AdminGroupController::class, 'index']);
        Route::get('/groups/{group}', [AdminGroupController::class, 'show']);
        Route::delete('/groups/{group}', [AdminGroupController::class, 'destroy']);

        Route::get('/companies', [AdminCompanyController::class, 'index']);
        Route::get('/companies/{company}', [AdminCompanyController::class, 'show']);
        Route::delete('/companies/{company}', [AdminCompanyController::class, 'destroy']);
    });
});
