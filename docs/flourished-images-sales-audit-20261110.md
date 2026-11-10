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
| Creative and content | 521 Campaign Strategy; 524 Campaign Performance Monitoring | Need dedicated creative workers mapped from registry and provider-backed media/publishing actions |
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

## First patch: scripts/sales-readiness.mjs
- Pure decision-support function; does not connect to accounts, charge money, send messages, publish posts, or modify the database.
- Fail-closed, even with all caller-provided flags marked true: untrusted client evidence cannot unblock launch.
- Run locally: `node --test scripts/sales-readiness.test.mjs`.
- Next patch should implement an authenticated read-only API to supply real server-side registry/provider observations, followed by immutable verification receipts and the campaign settings UI.

## Deployment rule
Do not merge or deploy until GitHub CI checks are inspected and the isolated authenticated E2E verification is feasible. No production changes are made by creating this branch.
