# Yabetoo Pay — Payment Integration Reference

Status: **implemented.** `api/app/Services/Payment/` (`YabetoClient`, `YabetoService`, `YabetoConfig`, `YabetoWebhookVerifier`) is real, wired into `VaultController::deposit/withdraw` and `GroupController::contribute` with a simulated fallback when disabled (`yabeto_settings.is_enabled`, managed from the back-office "Paramètres > Paiements" tab). See `api/README.md` → "Payments — Yabeto Pay integration" for the implementation summary; this document remains the detailed API reference and the record of what's confirmed-working vs. still-a-documentation-guess (§9) — check it before touching payment code, since some of §9's open questions have since been hit for real in production (see §9.5a).

Source: [docs.yabetoopay.com](https://docs.yabetoopay.com/fr/api-reference/introduction) (French docs, fetched 2026-07-20). Where the docs were thin, contradictory, or clearly stale, that's called out explicitly in [§9 Documentation gaps](#9-documentation-gaps--things-to-verify-before-going-live) rather than papered over — verify those points against a real sandbox account before writing code against them.

---

## 0. TL;DR for whoever implements this

- Yabetoo is a REST payment API for **mobile money** (MTN MoMo, Airtel Money) in **Central Africa (XAF)**. As of this writing, the docs only document **Congo-Brazzaville (`cg`, +242)** as a covered country. **This is the single biggest open question for Elikia Fund — confirm Yabetoo covers our actual target market(s) before building anything against this API.** See §9.
- Two-stage payment flow: create a **Payment Intent** → **confirm** it with the customer's mobile money number/operator → customer approves via PIN push notification on their phone → webhook (`intent.completed`) confirms success server-side.
- Payouts (vault withdrawals, tontine payouts) use a separate **Disbursement** resource, not a payment intent.
- Auth is a simple `Authorization: Bearer sk_test_...` / `sk_live_...` header — no OAuth dance.
- There's an official PHP SDK (`composer require yabetoo/yabetoo-sdk`) that wraps all of this reasonably closely to what's documented below.
- Money-related flows in Elikia Fund (`VaultController::deposit/withdraw`, `GroupController::contribute`) now call this API for real when Yabeto is enabled from the back-office — and fall back to the original simulated instant-success behavior when it isn't (the default, so nothing breaks without real credentials).

---

## 1. Environments

| | Sandbox | Production |
|---|---|---|
| Payments/Intents/Disbursements base URL | `https://pay.sandbox.yabetoopay.com` | `https://pay.api.yabetoopay.com` |
| Checkout Sessions base URL | `https://buy.api.yabetoopay.com` *(see §9 — no sandbox variant documented)* | `https://buy.api.yabetoopay.com` |
| Secret key prefix | `sk_test_...` | `sk_live_...` |
| Public key prefix | `pk_test_...` | `pk_live_...` |
| Webhook secret prefix | `whsec_...` | `whsec_...` |

Keys and your `accountId` (merchant identifier, required by several endpoints) live in the Yabetoo dashboard: **app.yabetoo.com → Developers**.

**Never hardcode keys.** Store in `.env`, never commit, rotate if leaked. Standard stuff, but the docs are explicit about it too.

---

## 2. Authentication

Every request:

```
Authorization: Bearer sk_test_XXXXXXXXXXXXXXXXXXXXXXXX
Content-Type: application/json
```

That's it — no signing of request bodies for outbound API calls (signing only applies to *inbound* webhooks, see §7).

Some endpoints (webhook registration/listing) are scoped under `/v1/account/{accountId}/...` and need your `accountId` in the URL, not just the header.

---

## 3. Currency & amounts

- **XAF (Franc CFA, CEMAC zone)** is the currency documented as supported (`"currency": "xaf"`, lowercase in requests). A few example payloads elsewhere in the docs use `xof`/`USD`/`EUR` — treat those as copy-paste artifacts in the docs, not confirmed support. Confirm with Yabetoo support before assuming multi-currency.
- Amounts are **whole Francs, not centimes** — there's no smallest-subunit conversion like Stripe's cents. `"amount": 2000` = 2 000 XAF. Elikia Fund's own `decimal(12,2)` columns (transactions, vault, contributions) already store whole-XAF-with-decimals, so this maps over cleanly — just cast to an integer Yabetoo-side (`(int) round($amountXaf)`), since the docs never show a decimal amount.

---

## 4. Supported countries / mobile money operators

| Operator | Code | Country | Country code | Phone prefix |
|---|---|---|---|---|
| MTN MoMo | `mtn` | Congo-Brazzaville | `cg` | `+242` |
| Airtel Money | `airtel` | Congo-Brazzaville | `cg` | `+242` |

Phone numbers (`msisdn`) must be **international format**: `+242066594470` or `242066594470` — a bare local number (`066594470`) is rejected.

**No other country is documented as covered.** If Elikia Fund's users are outside Congo-Brazzaville, this PSP may not be usable as-is — flag with Yabetoo support directly (`support@yabetoopay.com`) before committing engineering time.

---

## 5. Payment flow (deposits / contributions)

Two-stage, intent → confirm:

```
1. POST /v1/payment-intents          → creates intent, status "pending", returns clientSecret
2. POST /v1/payment-intents/:id/confirm  → supplies customer's momo number/operator
                                          → operator sends a PIN push to the customer's phone
3. customer approves on their phone (60–90s typical, per docs)
4. webhook "intent.completed" fires  → this is the authoritative "it's done" signal
   (the confirm response itself may already show a terminal status — see §9)
```

### Payment Intent statuses

| Status | Meaning |
|---|---|
| `pending` | Created, not yet confirmed |
| `processing` | Mobile money provider is handling it |
| `succeeded` | Done — terminal, fires `intent.completed` |
| `failed` | Rejected — terminal, includes `failureMessage`/`failureCode` |

The `GET` reference page additionally lists `requires_payment_method`, `requires_confirmation`, `canceled` as possible values — likely a Stripe-derived doc template that doesn't fully match this API's actual state machine. Treat `pending → processing → (succeeded | failed)` as the reliable subset; don't build UI/logic that depends on the extra states existing.

### 5.1 Create a Payment Intent

```
POST https://pay.sandbox.yabetoopay.com/v1/payment-intents
Authorization: Bearer sk_test_...
Content-Type: application/json

{
  "amount": 2000,
  "currency": "xaf",
  "description": "Dépôt coffre Elikia Fund",
  "metadata": { "orderId": "1234" }
}
```

| Param | Type | Required | Notes |
|---|---|---|---|
| `amount` | number | yes | Whole XAF |
| `currency` | string | yes | `"xaf"` |
| `description` | string | no | Shown nowhere customer-facing per docs, just your own reference |
| `metadata` | object | no | **This is where we'd stash `vault_movement_id` / `contribution_id` so the webhook handler can find the local row without a lookup table** |

Response (200):
```json
{
  "id": "pi_OYgGCdY1VaWvszwZcAY7VXvuXI70Ao9rsuMl",
  "amount": 10000,
  "currency": "xaf",
  "description": "Payment for product",
  "metadata": { "orderId": "orderId-22" },
  "accountId": "acct_xsd",
  "liveMode": false,
  "label": "payment_intent",
  "clientSecret": "pi_..._secret_...",
  "createdAt": "2026-02-16T15:33:55.048+00:00",
  "updatedAt": "2026-02-16T15:33:55.062+00:00"
}
```

Errors: `422` validation, `401` bad/missing key.

### 5.2 Confirm a Payment Intent

```
POST https://pay.sandbox.yabetoopay.com/v1/payment-intents/:id/confirm
Authorization: Bearer sk_test_...
Content-Type: application/json

{
  "client_secret": "pi_..._secret_...",
  "first_name": "Jean",
  "last_name": "Dupont",
  "receipt_email": "jean.dupont@example.com",
  "payment_method_data": {
    "type": "momo",
    "momo": {
      "country": "cg",
      "msisdn": "+242123456789",
      "operator_name": "mtn"
    }
  }
}
```

| Param | Type | Required |
|---|---|---|
| `client_secret` | string | yes |
| `first_name`, `last_name`, `receipt_email` | string | no |
| `payment_method_data.type` | string | yes — always `"momo"` for now |
| `payment_method_data.momo.country` | string | yes — `"cg"` |
| `payment_method_data.momo.msisdn` | string | yes — international format |
| `payment_method_data.momo.operator_name` | string | yes — `"mtn"` \| `"airtel"` |

Success (200):
```json
{
  "intentId": "pi_3r8utQTUlCY5hjV2pMtjtaNYsZ30FylO3PZk",
  "financialTransactionId": "7331529368",
  "transactionId": "pi_3r8utQTUlCY5hjV2pMtjtaNYsZ30FylO3PZk",
  "amount": 2228,
  "currency": "xaf",
  "status": "succeeded",
  "captured": true,
  "externalId": "ext_7hp8lsjCFwTemoeL",
  "id": "ch_ADdQhObdEDlz4L0kl7qNRniFjruNcrcY85xq",
  "createdAt": "2026-02-16T06:51:43.103+00:00",
  "updatedAt": "2026-02-16T06:51:43.177+00:00",
  "paymentMethodId": "pm_evILNJIgAyJs7S4KYmy5n5Ect8itay2GeycL"
}
```

**Failure still returns HTTP 200**, not a 4xx — check `status` in the body, don't rely on the HTTP status code:
```json
{
  "intentId": "pi_HUHh0kAg9H8QZvHtFf0taIspdWlUVftSOLhB",
  "status": "expired",
  "captured": false,
  "failureMessage": "Transaction timed out",
  "failureCode": "Transaction timed out"
}
```

Errors: `422` (invalid/not permitted), `404` (intent not found), `401`.

### 5.3 Retrieve a Payment Intent

```
GET https://pay.sandbox.yabetoopay.com/v1/payment-intents/:id
```
Returns the same shape as create, with current `status`. Used for polling as a fallback if a webhook is missed.

---

## 6. Payouts (vault withdrawals, tontine payouts)

Yabetoo documents two payout-shaped resources: **Disbursements** and **Remittances**. The docs never explain how they differ from each other — Disbursements have a dedicated overview page (prerequisites, timing, webhook event) and Remittances don't, so **treat Disbursements as the primary/documented payout mechanism** for Elikia Fund (vault withdrawal, tontine payout to a member) unless Yabetoo support says otherwise. Don't build against Remittances without confirming with them first.

### Prerequisites (per the Disbursements overview page)

- Requires a **partner account** — a standard merchant account doesn't have payout access by default. This has to be requested from Yabetoo separately; budget lead time for this before a payout feature can ship.
- Disbursements are **asynchronous**: the API call returns immediately (`status: "processing"`), but actual money movement can take up to **J+1 (next business day)**. This matters for UX — "Retrait" in the vault can't promise instant delivery once this is real money, unlike the current mock.

### 6.1 Create a Disbursement

```
POST https://pay.sandbox.yabetoopay.com/v1/disbursements
Authorization: Bearer sk_test_...
Content-Type: application/json

{
  "amount": 10000,
  "currency": "XAF",
  "first_name": "Jean",
  "last_name": "Dupont",
  "payment_method_data": {
    "type": "momo",
    "momo": {
      "msisdn": "242066594471",
      "country": "CG",
      "operator_name": "mtn"
    }
  }
}
```

Response (200):
```json
{
  "amount": 10000,
  "currency": "xaf",
  "status": "processing",
  "firstName": "Jean",
  "lastName": "Dupont",
  "operatorName": "mtn",
  "country": "cg",
  "phone": "242066594471",
  "object": "disbursement",
  "type": 1,
  "shouldExecutedAt": "2025-03-18T09:24:57.555Z",
  "id": "wt_RMqehxy8NNi1ocJFG2SSAZMj81m6spo72vnZ",
  "createdAt": "2025-03-17T10:24:57.559+01:00",
  "updatedAt": "2025-03-17T10:24:57.559+01:00"
}
```

Statuses: `processing` → `succeeded` | `failed` | `canceled`. No `metadata` field is documented on disbursements (unlike payment intents) — **so we'll need our own mapping table** (e.g. a `yabeto_reference` column on `vault_movements`/`contributions`) rather than round-tripping our own IDs through Yabetoo.

### 6.2 Retrieve a Disbursement

```
GET https://pay.sandbox.yabetoopay.com/v1/disbursement/{id}
```
Note the **singular** `disbursement` in the URL here vs. **plural** `disbursements` on create — as documented. Verify this isn't a docs typo before hardcoding both.

---

## 7. Webhooks

This is how we'll actually know a payment/payout finished — **don't poll, subscribe**.

### 7.1 Registering an endpoint

```
POST https://pay.sandbox.yabetoopay.com/v1/account/{accountId}/webhooks
Authorization: Bearer sk_test_...

{
  "url": "https://api.elikia-fund.test/api/webhooks/yabeto",
  "description": "Elikia Fund production webhook",
  "enabled_events": ["intent.completed", "disbursement.completed"],
  "metadata": { "environment": "production" }
}
```

Response includes a **`secret` (`whsec_...`) you only see once** — store it (e.g. `YABETO_WEBHOOK_SECRET` in `.env`), it's what verifies incoming payloads.

`GET /v1/account/{accountId}/webhooks` lists registered endpoints with delivery stats (`successful_deliveries`, `failed_deliveries`, `average_response_time`).

### 7.2 Verifying a delivery

Every webhook POST carries:

| Header | Purpose |
|---|---|
| `X-Yabetoo-Webhook-Signature` | HMAC-SHA256 signature, format `v1=<hex>` |
| `X-Yabetoo-Webhook-Timestamp` | Unix seconds — check against replay/staleness |
| `X-Yabetoo-Webhook-Event` | Event name |
| `X-Yabetoo-Webhook-Id` | Delivery ID, for dedup/idempotency |

Verification: `HMAC_SHA256(secret, "{timestamp}.{raw_body}")`, compared **timing-safe** (`hash_equals()` in PHP) against the signature header. Must respond `200` within ~5s or Yabetoo retries.

```php
// api/app/Services/Payment/YabetoWebhookVerifier.php (planned)
public function verify(string $rawBody, string $timestamp, string $signature, string $secret): bool
{
    $expected = hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);
    return hash_equals($expected, $signature);
}
```

### 7.3 Event types

Only two are documented:

| Event | Fires when | 
|---|---|
| `intent.completed` | A payment intent succeeded |
| `disbursement.completed` | A disbursement/payout succeeded |

**Naming inconsistency in the docs themselves:** the webhook-verification example code references an event named `payment_intent.succeeded`, while the dedicated events page names it `intent.completed`. No sample payload is shown for either. **Handle both names defensively** in the webhook controller until this is confirmed against a live sandbox delivery, and log the raw payload the first few times so we can see the real shape.

Neither a `*.failed` event nor a payment-link/checkout-session event is documented — for failure detection, fall back to polling `GET /v1/payment-intents/:id` after a timeout window (the confirm endpoint's synchronous response usually already tells you if it failed immediately, per §5.2).

---

## 8. Testing (sandbox)

Use `sk_test_...` keys. These MSISDNs simulate specific outcomes — **useful for writing PSP-adapter tests without real money**:

| Phone number | Operator | Result |
|---|---|---|
| `242066000001` | Airtel Money | `succeeded` |
| any other number | MTN MoMo | `succeeded` |
| `46733123454` | MTN MoMo | `succeeded`, with `PAYER_DELAYED` message |
| `242050017890` | Airtel Money | `failed` — `INTERNAL_PROCESSING_ERROR` |
| `46733123450` | MTN MoMo | `failed` — `INTERNAL_PROCESSING_ERROR` |
| `46733123451` | MTN MoMo | `failed` — `APPROVAL_REJECTED` |
| `46733123455` | MTN MoMo | `failed` — `PAYEE_NOT_FOUND` |
| `46733123456` | MTN MoMo | `failed` — `PAYEE_NOT_ALLOWED_TO_RECEIVE` |
| `46733123457` | MTN MoMo | `failed` — `NOT_ALLOWED` |
| `46733123452` | MTN MoMo | `failed` — `EXPIRED` |
| `46733123453` | MTN MoMo | `expired` — `TIMEOUT` |

No test card numbers exist — this PSP is mobile-money-only, there's no card rail documented at all.

---

## 9. Documentation gaps — things to verify before going live

Being upfront about this rather than presenting the docs as more coherent than they are:

1. **Country coverage.** Only Congo-Brazzaville is documented. If that's not Elikia Fund's market, this whole integration may be moot — **resolve this first**, before any of the rest matters.
2. **Currency scope.** Docs say "XAF only," but several example payloads use `xof`/`USD`/`EUR`. Ambiguous — confirm actual supported currencies.
3. **Checkout Session domain/shape mismatch.** The *create* reference (`payments/payment-session` guide) posts to `buy.api.yabetoopay.com/v1/sessions` and returns camelCase fields (`successUrl`, `orderId`). The *get* reference (`api-reference/checkout-session/get`) implies a different path (`/v1/checkout/sessions/:id`) and returns snake_case fields wrapped in a `{status, data}` envelope, plus a `payment_status` field the create response never mentions. These read like two different doc-generation passes that drifted apart. **Don't build against Checkout Sessions until you've made one real sandbox call and seen the actual response** — Elikia Fund likely wants Payment Intents directly anyway (in-app confirm, not a redirect-to-hosted-page flow), so Checkout Sessions may not even be needed.
4. **Payment Links domain mismatch.** The create example posts to `https://api.yabetoo.com/v1/payment-links` — a third, different domain (`api.yabetoo.com`, no `pay.`/`buy.` subdomain, `.com` not the `pay.api.yabetoopay.com` pattern used everywhere else). Almost certainly a docs error, but don't copy-paste it uncritically. Payment Links (reusable shareable checkout URLs) aren't an obvious fit for Elikia Fund's flows anyway (in-app deposit/withdraw/contribute, not "share a payment link") — low priority to investigate further.
5. **Disbursement singular/plural URL inconsistency**: `POST /v1/disbursements` (create) vs `GET /v1/disbursement/{id}` (get, no `s`). Verify both work as documented.
5a. **Confirmed in production**: `GET /v1/account/{accountId}/webhooks` returned a 404 against a real account with a correct `accountId` and secret key — this endpoint is the least corroborated one in the docs (shown once, never referenced by the official PHP SDK's method list). Elikia Fund's `YabetoService::listWebhooks()`/`registerWebhook()` still use it (webhook registration has no documented alternative), but `testConnection()` was switched to `GET /v1/payment-intents` (list, no `accountId` needed — Yabeto derives the merchant from the secret key) specifically to avoid this endpoint for connectivity checks. If webhook *registration* also 404s for you, that's this same gap — worth raising with Yabeto support directly rather than assuming your credentials are wrong.
6. **Remittance vs. Disbursement**: no documented distinction. Default to Disbursement (§6) as the payout mechanism; ask Yabetoo support directly if Remittance turns out to matter (e.g. for cross-border transfers, which the glossary hints at: *"un transfert de fonds pour cross-border ou paiements programmés"*).
7. **Webhook event naming**: `intent.completed` vs. `payment_intent.succeeded` — see §7.3.
8. **No documented minimum/maximum transaction amount** — worth confirming for both vault deposits (could be small, e.g. 100 XAF) and tontine contributions (recurring, potentially larger).
9. **Fees**: not documented anywhere in what was fetched — need direct confirmation from Yabetoo (their cut per transaction, and whether it's on top of or deducted from the amount) before this can factor into Elikia Fund's own 3% tontine management fee math (`GroupController::MANAGEMENT_FEE_RATE`) or any vault fee.
10. There's an **OpenAPI spec** at `https://docs.yabetoopay.com/en/api-reference/openapi.json` — worth running through a codegen tool (or at minimum diffing against this doc) right before implementation, since it's more likely to be internally consistent than the prose docs.

---

## 10. Integration: `YabetoService`

### 10.1 Where it lives

```
api/app/Services/Payment/
  YabetoClient.php            — thin HTTP wrapper (base URL + auth header per env, JSON in/out)
  YabetoService.php           — domain-facing methods (see 10.3)
  YabetoWebhookVerifier.php   — HMAC verification (§7.2)
  DTOs/
    PaymentIntentResult.php
    DisbursementResult.php
```

Mirrors the existing `app/Services/` convention (`CreditScoreService.php`, `SocialAuthService.php`) — a plain service class, constructor-injected, no facades. `Payment/` as a subdirectory since this is the first payment-specific service; if a second PSP is ever added (unlikely, but the code should make room), it'd get its own class beside this one rather than a shared interface being invented speculatively now.

### 10.2 Config

`config/services.php`:
```php
'yabeto' => [
    'mode' => env('YABETO_MODE', 'sandbox'), // 'sandbox' | 'live'
    'secret_key' => env('YABETO_SECRET_KEY'),
    'account_id' => env('YABETO_ACCOUNT_ID'),
    'webhook_secret' => env('YABETO_WEBHOOK_SECRET'),
],
```

`.env` additions (document in `.env.example` too):
```
YABETO_MODE=sandbox
YABETO_SECRET_KEY=sk_test_...
YABETO_ACCOUNT_ID=acct_...
YABETO_WEBHOOK_SECRET=whsec_...
```

`YabetoClient` picks the base URL from `mode` (`pay.sandbox.yabetoopay.com` vs `pay.api.yabetoopay.com`) rather than hardcoding — same "one flag flips environments" pattern as `DB_CONNECTION`/etc.

### 10.3 Planned `YabetoService` methods

Named around what Elikia Fund actually does, not a 1:1 mirror of Yabetoo's resource names:

```php
class YabetoService
{
    // Vault deposit / tontine contribution
    public function createPaymentIntent(int $amountXaf, string $description, array $metadata = []): PaymentIntentResult;
    public function confirmPaymentIntent(string $intentId, string $clientSecret, string $msisdn, string $operator, string $firstName, string $lastName): PaymentIntentResult;
    public function getPaymentIntent(string $intentId): PaymentIntentResult;

    // Vault withdrawal / tontine payout
    public function createDisbursement(int $amountXaf, string $msisdn, string $operator, string $firstName, string $lastName): DisbursementResult;
    public function getDisbursement(string $disbursementId): DisbursementResult;
}
```

`operator`/`country` narrowed to what §4 documents (`mtn`|`airtel`, `cg`) — reject anything else client-side with a clear French error rather than letting a bad request round-trip to Yabetoo.

### 10.4 Where it plugs into existing code

Both integration points already exist as mocks with `// TODO` markers — this service replaces the mock branch, doesn't add new endpoints:

- **`VaultController::deposit()` / `withdraw()`** (`api/app/Http/Controllers/Api/VaultController.php`) — currently records a `VaultMovement` directly. Real flow: create+confirm a Payment Intent (deposit) or Disbursement (withdraw) first; only write the `VaultMovement` once the webhook confirms success (or synchronously on a `succeeded` confirm response, with the webhook as the reconciling source of truth). PIN re-verification (already a documented TODO in `VaultController`) happens *before* calling Yabetoo, not after.
- **`GroupController::contribute()`** — same shape: create+confirm a Payment Intent for `contribution_amount`, and only create the `Contribution` row (with its `fee_amount`/`net_amount` split, already implemented) once payment is confirmed.
- **New: `POST /webhooks/yabeto`** (public route, no `auth:sanctum` — Yabetoo isn't one of our users) — verifies the signature (§7.2), looks up the local row via `metadata` (payment intents) or a new `yabeto_reference` column (disbursements, since they don't support `metadata` — see §6.1), and flips it from a pending/pending-confirmation state to settled.
- **New nullable columns** (when this is actually built): `vault_movements.yabeto_reference`, `contributions.yabeto_reference` — string, nullable, to correlate local rows with Yabetoo intent/disbursement IDs for idempotent webhook handling (a webhook retried twice must not double-credit a deposit).

### 10.5 The Savings Vault case study (directly relevant)

Yabetoo's own docs include a worked example — `platforms/examples/savings-vault.md` — that's essentially Elikia Fund's Vault feature already. Worth reading in full before implementation, but the shape:

1. Deposit: `payments.create()` with vault metadata → pending → webhook confirms → increment balance.
2. Daily cron checks maturity/unlock conditions (not directly applicable — Elikia Fund's vault has no lock period today, this is their SafeLock-style example, not ours).
3. Withdrawal: compute any fee → `disbursements.create()` → deduct from local balance once confirmed.
4. Minimum lock period, tiered fees, milestone notifications — all optional ideas from their example, not requirements for us.

The deposit→webhook→credit and withdraw→disburse→debit shape maps directly onto `VaultController`; the maturity/lock-period stuff doesn't apply to Elikia Fund's vault design and shouldn't be copied in just because the example has it.

### 10.6 Security / operational checklist for whenever this is built

- Secret key only ever touches the Laravel backend — **never** shipped to mobile or back-office.
- Webhook route excluded from CSRF (already true for all of `routes/api.php`) but must verify HMAC signature before trusting the payload.
- Idempotency: webhook deliveries can repeat — key off `X-Yabetoo-Webhook-Id` or the intent/disbursement ID, not "did we get a webhook," to avoid double-crediting.
- Confirm response can already be terminal (§5.2) — don't assume you must always wait for the webhook; treat the webhook as the reconciliation path for the cases where the synchronous response was still `processing`.
- Log raw webhook payloads (at least temporarily) — the actual event-name/payload shape isn't reliably documented (§7.3, §9).
- Disbursements need a partner-account upgrade requested from Yabetoo in advance — this has lead time, so if vault withdrawal or tontine payout via Yabetoo is on a real roadmap, start that conversation with Yabetoo early, independent of when the code gets written.

---

## Appendix: source pages fetched

All under `https://docs.yabetoopay.com/fr/` unless noted:
`api-reference/introduction`, `api-reference/authentication`, `api-reference/errors`, `api-reference/currencies`, `quickstart`, `guides/concepts/payment-flow`, `guides/concepts/statuses`, `guides/concepts/mobile-money`, `guides/glossary`, `api-reference/payment-intent/{create,confirm,get}`, `api-reference/checkout-session/{create,get}`, `payments/payment-link/{intro,create}`, `api-reference/webhook/{create,all}`, `developer-tools/webhook/{overview,events}`, `developer-tools/test/overview`, `developer-tools/sdk/php`, `platforms/examples/savings-vault`, `payments/disbursement/overview`, `api-reference/disbursement/{create,get}`, `api-reference/remittance/create`. Full sitemap: `https://docs.yabetoopay.com/llms.txt`. OpenAPI spec: `https://docs.yabetoopay.com/en/api-reference/openapi.json`.
