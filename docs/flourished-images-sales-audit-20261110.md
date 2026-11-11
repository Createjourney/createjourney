# Flourished Images × CreateJourney — Autonomous Sales launch audit
Date: 2026-11-10. Scope: read-only production inspection and non-production readiness code.

## Business launch brief
- Product: Flourished Images display frame; nationwide US campaign.
- Price: $299 holiday offer, regular price $340; initial allocation 100 orders ($29,900 gross product sales before refunds, fees, taxes, shipping).
- Packaging: assembled and packed after the order; buyer pays standard/express shipping.
- Marketing: initial paid media ceiling $10/day; 120 *researched* leads/day is a research target, **not** a message volume commitment.
- Checkout: separate Flourished Images storefront/Shopify checkout; CreateJourney is the marketing/attribution orchestration layer.
- Holiday delivery guarantee is **blocked** until manufacturing, inbound transport and final-fulfillment timeline is verified.

## Confirmed production inventory
- Supabase project pbiivpehdatvmyaxwixk, database ACTIVE_HEALTHY.
- `cj_agent_registry`: 607 rows, 604 PLANNED, 3 TESTING, **0 independently verified operational sales agents**.
- `cj_agent_jobs`: 1 failed historical job; no successful registered-agent run established by this audit.
- `connected_accounts`: 1 row, Google in error state; no verified Meta, TikTok, Shopify or email connector.
- `cj-agent-runtime` v4 is explicitly `analysis_only`; does not execute marketing provider actions.
- `journey-integrations` v9 lists Google, Meta, Square, Calendly, Acuity. Its Meta OAuth scope is for page reading/Instagram publishing, not proof of outbound follows, DMs, or advertising execution. TikTok/Shopify/email are absent from its provider definitions.
- `journey-ai-capabilities` labels Marketing but lists only `navigate`; do not confuse navigation with campaign execution.

## Registry mapping: agent identity is a plan, not runnable capability
| Launch responsibility | Existing agent IDs and registry names | Current implementation gap |
|---|---|---|
| Goal and campaign orchestration | 519 Campaign Goal Planning; 521 Campaign Strategy; 523 Campaign Execution Coordination | PLANNED; no executable campaign runner or signed authorization |
| Buyer and partnership research | 520 Campaign Audience Research; 509 Opportunity Research; 511 Opportunity Customer Validation | PLANNED; no validated research/prospect provenance pipeline |
| Creative and content | 184 Creative Content Department Chief; 185 Operations Supervisor; 186 Quality Supervisor | Creative department leadership exists; dedicated creative workers are not identified in the registry and provider-backed media/publishing tools are missing |
| Organic social interactions | 409 Message Personalization; 411 Communication Timing Optimization; 412 Communication Channel Selection | PLANNED; no approved provider APIs/permissions for automated prospect interaction |
| Follow-ups and replies | 408 Customer Communication Strategy; 416 Customer Follow-Up Intelligence; 417 Communication Conversion Analysis | PLANNED; no consent/opt-out and channel state machine |
| Ads and spend | 352 Acquisition Budget Optimization; 354 Campaign Profitability; 525 Campaign Optimization | PLANNED; no Meta/TikTok ads integration, expense ledger or server-side $10/day enforcement |
| Checkout and revenue attribution | 345 Payment Flow Optimization; 337 Journey Revenue Attribution; 353 Lead-to-Customer Economics | PLANNED; Shopify webhooks, identity/UTM attribution, and refund reconciliation missing |
| Performance and finance reporting | 524 Campaign Performance Monitoring; 526 Campaign Profitability Analysis | PLANNED; no verified order/revenue receipts and spend reconciliation |

These groups are selected launch responsibilities, not the full future workforce. Before assigning creative production, inspect additional registry specialists and identify their actual tool implementations.

## Build order and acceptance gates
1. **Readiness gate** (this branch): non-mutating, fail-closed evaluator with traceable agent IDs, provider observations and explicit missing proofs. Unit tests are included. It is not yet wired into frontend or backend.
2. **Authenticated campaign record and approval**: tenant-scoped goals, product ID, $299 offer, initial allocation, $10/day cap, shipping/fulfillment disclaimer, allowed channels, owner stop switch. Validate with RLS and isolated test workspace.
3. **Provider connection and capabilities**: implement Shopify read-only orders/webhooks first, Meta organic permitted operations second, TikTok and email thereafter. Record fine-grained actual scopes, token health and rate limits. Never claim that a generic `connected` record proves a capability.
4. **Permissioned jobs and receipts**: queue, idempotency, per-step provider response, approval policy, failure handling, opt-out suppression, daily spend cap, duplicate suppression. Block unsanctioned bulk DMs, fake rapport, unapproved follows/comments, or unsupported APIs.
5. **End-to-end isolated tests**: checkout to Shopify order webhook to verified attributed sale; permissions, spend limits, opt-out, provider errors/retries, refunds, and kill switch. Only then consider live account authorization and paid spend.

## PR #30 pre-merge review corrections (2026-11-10)
- The readiness evaluator is a **Node-only** and read-only module; it does not connect accounts, send messages, deploy software, or modify data.
- New readiness decision requires both verified registry statuses and an HMAC-signed, tenant/campaign-bound, unexpired receipt for **each** of seven independent checks. Unsigned flags and account labels are never launch evidence.
- Status can reach `READY_FOR_AUTHORIZED_FINAL_REVIEW`, **not launch authorization**. The signing key must remain in a trusted server environment. A real server-side evidence issuer, authenticated endpoint, and authorization check do not exist yet and are blocking production rollout.
- Test suite now contains 12 negative/positive cases. New `.github/workflows/sales-readiness.yml` attempts Node syntax and regression testing on pushes and PRs. CI result is still a separate merge gate.
- `creative` maps to verified existing creative **leadership** IDs 184–186; the dedicated creative execution specialists and tools are still missing and must be created/verified before launch. Registry status alone does not establish media-generation or publishing capability.
- Run locally: `node --test scripts/sales-readiness.test.mjs`.
- Next patch: authenticated read-only API to gather server-side agent/provider observations, then real verification receipts and owner-scoped campaign settings. Never expose the signing key to the frontend.

## Deployment rule
Do not merge or deploy until GitHub CI checks are inspected and the isolated authenticated E2E verification is feasible. No production changes are made by creating this branch.


## PR #30 implementation follow-up: authenticated Sales Command Center (staged, not deployed)
- New `supabase/migrations/20261110_sales_campaign_command_center.sql`: tenant-bound campaign configuration, append-only application audit events, and cryptographically signed verification evidence. Restricts all three new tables to `service_role`; RLS stays enabled.
- New `supabase/functions/cj-sales-command-center/index.ts`: requires a valid Supabase user access token and active owner/manager membership. Supports `overview`, `create`, `update`, `approve` (owner only, **planning approval**), and `pause`. It never sends a message, creates a paid advertisement or touches a payment provider.
- Campaign validation enforces HTTPS product URLs, integer-cent pricing, finite targets and budget, a truthful fulfillment note, and disables unverified delivery guarantees.
- Overview reads real registry IDs and statuses, redacted integration status and a scoped list of agent job statuses. No connected account tokens, raw job results or customer personal data are returned.
- Verification evidence is accepted **only** when stored by a trusted service, unexpired (up to 24h), tenant/campaign matched, and HMAC-SHA256 signed over `JSON.stringify(["cj-sales-v1",gate,business_id,campaign_id,verified_at_ms,expires_at_ms,"PASS"])`. A future independent verifier must hold `CJ_SALES_VERIFICATION_SECRET` and emit independently checked outcomes; **no verifier or signer is deployed by this PR**. Without these, the gate stays `BLOCKED`.
- New `assets/cj-sales-center-v1.js`: optional owner-visible campaign draft and readiness overlay, loaded from the Journey capability registry and attached to the Marketing panel when available. This does not itself activate external marketing.
- CI now checks Node readiness tests, browser-side syntax, and Deno backend type correctness. SQL migration tests, authenticated e2e, and provider integrations are not yet covered.

### Release gates and safe deployment order
1. Inspect GitHub Actions results for the exact PR commit and resolve failures. Review the final diff.
2. Validate migration on a disposable Supabase development branch or isolated test project, including RLS, ownership, permissions, and event insert behavior. Do **not** trial synthetic campaigns in the live production business.
3. Apply the migration after review; deploy `cj-sales-command-center` with JWT verification enabled, then publish the UI asset from a reviewed frontend commit.
4. Run authenticated test-business create/update/owner-approve/manager-denial/pause/overview tests, with invalid JWT, cross-business isolation and forged evidence checks.
5. Reconcile UI state against backend receipts. Only after that implement Shopify webhook orders/refunds, Meta/Instagram permitted operations and TikTok + email connections.

### Distinguish working components from planned components
At this stage the existing agent registry remains mostly PLANNED, no social/Shopify provider action has been proven, and no real sales campaigns have been processed. Passing static CI confirms source hygiene, **not** functional deployment.
