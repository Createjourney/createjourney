# CreateJourney — Shopify V1 Integration (Flourished Images pilot)
Status: **DEVELOPMENT / NOT CONNECTED TO CREATEJOURNEY**

## Verified shop
- Shopify merchant store verified through a user-authorized ChatGPT Shopify connection: `flourishedimages.myshopify.com`, Basic plan, USD.
- This connection gives ChatGPT access through the Shopify tool; **it does not grant CreateJourney/Journey AI API credentials**. Do not copy Shopify tokens, passwords, or private customer data between systems.
- Existing Supabase `connected_accounts` currently has no `shopify` provider row for any business. Merchant installation/approval is required.

## V1 integration contract
1. Owner selects `Connect Shopify` in their business Sales Command Center; chooses verified shop domain and approves access at Shopify. App must have its own **Shopify Dev Dashboard app**, client ID and secret, allowlisted callback, and merchant approval.
2. Request only `read_orders,read_products` scopes initially, with potential additional scopes separately approved if needed. No product edits, refunds, payment processing or fulfillment writes.
3. OAuth callback authenticates HMAC, state, exact shop domain, expiry, business ID ownership and single-use state; exchange code server-side and encrypt token at rest in existing `connected_accounts`. Never expose token to browser or logs.
4. Read-only shop verification requests GraphQL Admin `shop{id name}` using the encrypted token. Only mark `operational_verified` on successful real provider response, not mere OAuth completion.
5. Independent order tracking milestone: Shopify webhook with raw-body HMAC validation, encrypted key, idempotent event IDs, deduplication, provider-verified order and refund totals, currency, timestamps, and proper business/merchant attribution. Data must not count checkout links as orders.
6. Surface verified shop/connection status and order totals on Sales Mission Control and aggregate verified revenue on Live Performance, with coverage/freshness indicators and no PII by default.

## Deployment prerequisites
- Shopify app credentials configured privately as `CJ_SHOPIFY_CLIENT_ID` and `CJ_SHOPIFY_CLIENT_SECRET` in Supabase secrets.
- `INTEGRATION_TOKEN_ENCRYPTION_KEY` configured securely in Supabase (the same existing integration crypto contract; do not change or expose it).
- Callback URI registered in Shopify:
  `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-shopify-connector`
- Authorize `flourishedimages.myshopify.com` **for the correct Flourished Images business** once such a tenant exists; the present CreateJourney platform and SmartBoard businesses are not substitutes.
- No merchant orders/imports sent until the actual owner authorizes this app and the integration passes local/prod verification.

## Current release separation
- PR #30 deployed Sales Command Center planning-only architecture to production, with new tables and JWT-protected API. Live owner UI confirmation still needed.
- Shopify is a new code workstream, NOT part of that approved production release; keep release gate separate.
- Never promise 100 units sold. Mission target is 100; outcome must be actual paid orders/refunds and fulfillments.
