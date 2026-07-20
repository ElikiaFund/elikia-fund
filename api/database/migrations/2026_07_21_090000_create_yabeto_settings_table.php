<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Single-row config table, deliberately separate from the generic `settings` key-value
        // store: `Admin\SettingController@index` returns every settings row verbatim to the
        // back-office, which is fine for platform name/credit-scoring thresholds but would leak
        // API secrets. Keeping payment credentials in their own table means the only way to read
        // them is through `Admin\YabetoSettingController`, which never serializes the encrypted
        // columns back out.
        Schema::create('yabeto_settings', function (Blueprint $table) {
            $table->id();
            $table->string('mode')->default('sandbox');
            $table->string('account_id')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('yabeto_settings');
    }
};
