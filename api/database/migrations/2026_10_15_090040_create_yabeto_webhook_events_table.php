<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dedup table for Yabeto webhook deliveries. Required because the two
     * `*_blocked_insufficient_funds` Connect events have no idempotency anchor
     * (docs/fr/connect/webhooks "Les deux événements *_blocked_insufficient_funds n'ont pas
     * d'ancre d'idempotence") — three refusals produce three events. Also serves as a general
     * safety net for the non-Connect events, which already have strong idempotency on our side
     * (status transitions are no-ops when already-terminal) but shouldn't be processed twice.
     *
     * `event_id` is unique; the webhook handler inserts the row before dispatching to any
     * handler, so a duplicate delivery short-circuits before touching anything else.
     */
    public function up(): void
    {
        Schema::create('yabeto_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id', 128)->unique();
            $table->string('event_type', 64);
            $table->timestamp('received_at');

            $table->index('event_type');
            $table->index('received_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yabeto_webhook_events');
    }
};
