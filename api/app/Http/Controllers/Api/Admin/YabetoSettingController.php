<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateYabetoSettingsRequest;
use App\Models\YabetoSetting;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Lets an admin manage the Yabeto Pay integration from the back-office (Paramètres > Paiements)
 * without a redeploy — mode, account id, keys, and on/off. Secrets are write-only: `show()` only
 * ever reports whether one is configured, never the value (see App\Models\YabetoSetting).
 */
class YabetoSettingController extends Controller
{
    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly YabetoConfig $config,
    ) {}

    public function show(): JsonResponse
    {
        return response()->json($this->present(YabetoSetting::current()));
    }

    /**
     * Accepts a partial payload — `secret_key`/`webhook_secret` are only overwritten when a
     * non-empty value is actually submitted, so toggling `is_enabled` doesn't force re-pasting
     * keys the admin already saved.
     */
    public function update(UpdateYabetoSettingsRequest $request): JsonResponse
    {
        $setting = YabetoSetting::current();

        $data = collect($request->validated())
            ->reject(fn ($value, $key) => in_array($key, ['secret_key', 'webhook_secret'], true) && blank($value))
            ->all();

        $setting->update($data);

        return response()->json($this->present($setting->fresh()));
    }

    /**
     * POST /admin/settings/yabeto/test-connection — a safe, read-only authenticated call
     * (listing webhooks) to confirm the currently-saved credentials actually work.
     */
    public function testConnection(): JsonResponse
    {
        if (! $this->config->secretKey || ! $this->config->accountId) {
            return response()->json(['success' => false, 'message' => 'Identifiant de compte et clé secrète requis.'], 422);
        }

        try {
            $this->yabeto->listWebhooks();

            return response()->json(['success' => true, 'message' => 'Connexion à Yabeto Pay réussie.']);
        } catch (YabetoRequestException $e) {
            Log::warning('Yabeto test connection failed', ['message' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => $e->userMessage()], 422);
        } catch (ConnectionException $e) {
            Log::warning('Yabeto test connection could not reach the API', ['message' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => "Le serveur n'a pas pu joindre Yabeto Pay (réseau/DNS/SSL sortant) — ce n'est pas un problème d'identifiants. Vérifiez la connectivité sortante de l'hébergeur de l'API.",
            ], 422);
        }
    }

    /**
     * POST /admin/settings/yabeto/register-webhook — registers our webhook URL with Yabeto and
     * stores the returned secret. The secret is only ever shown in this one response (Yabeto
     * never returns it again on subsequent reads) — the frontend must display it once and warn
     * the admin to note it down.
     */
    public function registerWebhook(): JsonResponse
    {
        if (! $this->config->secretKey || ! $this->config->accountId) {
            return response()->json(['message' => 'Identifiant de compte et clé secrète requis.'], 422);
        }

        try {
            $result = $this->yabeto->registerWebhook(
                url('/api/webhooks/yabeto'),
                ['intent.completed', 'disbursement.completed'],
            );
        } catch (YabetoRequestException $e) {
            Log::warning('Yabeto webhook registration failed', ['message' => $e->getMessage()]);

            return response()->json(['message' => $e->userMessage()], 422);
        } catch (ConnectionException $e) {
            Log::warning('Yabeto webhook registration could not reach the API', ['message' => $e->getMessage()]);

            return response()->json([
                'message' => "Le serveur n'a pas pu joindre Yabeto Pay (réseau/DNS/SSL sortant).",
            ], 422);
        }

        $secret = $result['secret'] ?? null;

        if ($secret) {
            YabetoSetting::current()->update(['webhook_secret' => $secret]);
        }

        return response()->json(['id' => $result['id'] ?? null, 'secret' => $secret]);
    }

    private function present(YabetoSetting $setting): array
    {
        return [
            'mode' => $setting->mode,
            'account_id' => $setting->account_id,
            'is_enabled' => $setting->is_enabled,
            'has_secret_key' => filled($setting->secret_key),
            'has_webhook_secret' => filled($setting->webhook_secret),
            'webhook_url' => url('/api/webhooks/yabeto'),
        ];
    }
}
