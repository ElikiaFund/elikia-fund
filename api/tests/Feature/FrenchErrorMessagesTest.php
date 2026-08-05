<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression coverage for bootstrap/app.php's exception renderers: a handful of framework
 * exceptions (ValidationException, throttle's TooManyRequestsHttpException) carry hardcoded
 * English messages that aren't routed through lang/fr/validation.php — every JSON error response
 * the API sends must be French, per CLAUDE.md.
 */
class FrenchErrorMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_validation_failure_has_a_french_top_level_message(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/groups', []);

        $response->assertStatus(422);
        $this->assertSame('Les données fournies sont invalides.', $response->json('message'));
    }

    public function test_a_missing_route_model_has_a_french_message(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/groups/999999');

        $response->assertStatus(404);
        $this->assertSame('Ressource introuvable.', $response->json('message'));
    }

    public function test_a_throttled_request_has_a_french_message(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        // /vault/pin/verify is throttle:5,1 — the 6th request in the window trips it.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/vault/pin/verify', ['pin' => '0000']);
        }

        $response = $this->postJson('/api/vault/pin/verify', ['pin' => '0000']);

        $response->assertStatus(429);
        $this->assertStringContainsString('Trop de tentatives', $response->json('message'));
    }
}
