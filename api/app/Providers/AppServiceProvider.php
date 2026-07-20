<?php

namespace App\Providers;

use App\Services\Payment\YabetoConfig;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // YabetoConfig has scalar constructor params (resolved from the yabeto_settings table
        // + env, see YabetoConfig::resolve()) — the container can't autowire that, so it needs
        // an explicit binding. Singleton so YabetoService/YabetoClient/the webhook controller
        // all see the same resolved config within one request instead of re-querying it.
        $this->app->singleton(YabetoConfig::class, fn () => YabetoConfig::resolve());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
