# CreateJourney Marketing Connection Readiness — staged release

**Scope:** One native Marketing button opens the Marketing & Sales Command Center. All provider links remain owner-initiated; the button does **not** grant access, activate paid advertising, send messages, or execute campaigns automatically.

## Implemented in PR #47 (not yet production)

- Single Marketing tile with connection cards, live account-status checks, agent-readiness inspection, and draft-only Flourished Images planning.
- JWT-authenticated, tenant-bound existing Google Business Profile and Meta (Facebook/Instagram) connection controls, delegated to the previously deployed journey-integrations API. Existing Meta scopes are for business-page visibility and Instagram content publishing, **not** messaging or ad buying. An OAuth record is not proof that those operations work.
- New independent Shopify standalone-store authorization-code adapter (merchant enters .myshopify.com domain), signed + expiring OAuth callback validation, encrypted token persistence, and owner-controlled disconnection. This does not implement orders/refunds webhooks or verify checkout.
- New independent Gmail/Outlook send-only and TikTok identity OAuth adapters with one-time expiring state, encrypted access/refresh tokens, owner-controlled disconnect, status, and identity verification. Gmail authorization does not send emails by itself; TikTok basic login scope does not allow public posting.
- Fail-closed presentation for unimplemented Meta advertising and missing provider credentials.
- Correct Flourished Images launch assumptions: $240 retail, planned first 100 units; shipping target is **not** a verified fulfillment guarantee.

## OAuth callback hardening and confirmation evidence

- Shopify: HMAC authenticates the query, timestamp allows a maximum 10-minute window, and a matching single-use `connected_accounts.oauth_state` must be present and unexpired. An API token is encrypted only after the required product/order read scopes were returned. A subsequent store identity check uses Shopify Admin GraphQL; it still does not verify order webhooks.
- Existing Google Business Profile and Meta callbacks were audited: the older deployed callback previously checked state only, consumed it **after** token exchange, and redirected to a native URI. The staged hardened callback now enforces a 10-minute expiry, atomically consumes the state before exchanging a token, refuses missing provider identity, and returns to `https://app.gocreatejourney.com/`. This is an intentional behavior change requiring staged deployment verification.
- Gmail, TikTok and Outlook: enforce an owner-initiated, single-use 10-minute state, provider identity verification and required scopes; return only a generic success/failure without revealing authorization code or tokens. Tokens remain encrypted server-side.
- CI contains negative callback tests with **synthetic** credentials and local Supabase storage. This verifies invalid HMAC, expired callback timestamps, missing/forged and persisted expired states, JWT protection and tenant isolation. Real successful third-party authorization cannot be verified until each provider app is registered and the owner consents through that provider.
- The unified Marketing page displays provider-return outcomes and then performs a fresh connection status read; the return URL alone is not evidence of publishing, outreach, checkout or ad authorization.

## Required provider-side work before a human may authorize accounts

| Provider | Developer setup | Callback to register | Current scope | What remains to be verified |
|---|---|---|---|---|
| Shopify | Register a standalone Shopify app; set `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-shopify-integration` | `read_products,read_orders` | Real merchant OAuth, API scope, signed order/refund webhooks, order attribution, checkout, uninstall handling |
| Facebook / Instagram | Existing `META_APP_ID`, `META_APP_SECRET`, application permissions/app review | Existing `journey-integration-callback?provider=meta` | `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish` | Verified page linkage and publish test; ad and outreach scopes **not** present |
| Google Business Profile | Existing Google OAuth app credentials and business profile API approval | Existing `journey-integration-callback?provider=google` | `business.manage` | Provider verification; **not** Gmail or Analytics |
| Gmail | Register Google OAuth client; set `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET` | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/gmail` | `openid email profile gmail.send` | Consent screen, sensitive-scope verification, permitted sending/opt-out and delivery receipts |
| TikTok | TikTok for Developers Login Kit app; set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/tiktok` | `user.info.basic` | TikTok publishing API, `video.publish` approval, app audit and real action receipts |
| Microsoft 365 / Outlook | Register Microsoft Entra app; set `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/outlook` | `openid profile email offline_access User.Read Mail.Send` | User/admin consent, Graph identity verification, authorized sending/opt-out, real delivery receipts |
| Meta Ads | Not implemented as independent execution connection | None | None | Ads permissions and app review, account selection, spend cap enforcement, provider receipts |

**Secrets:** Server-only Supabase secrets; never store tokens in browser localStorage or expose them in UI. `INTEGRATION_TOKEN_ENCRYPTION_KEY` must be strong (>=32 chars for new adapters) and available to existing / new authorized OAuth services. Do not ask the owner to paste secrets into a chat.

## Release gates / definition of ready to connect

1. CI: frontend syntax, Deno typechecks for all new adapters, Playwright single-button flows on desktop + 390px view, existing tenant-isolation test suite all pass.
2. Security review: unauthenticated POST rejected even when callback functions use `verify_jwt=false`; callbacks enforce state expiry, replay prevention, provider signature (Shopify), tenant boundaries, and fixed redirect destination; disconnect erases local tokens.
3. Do not merge or deploy until CI green. Deploy new callbacks first, run anonymous/synthetic negative probes, configure provider callback URLs/credentials, verify read-only status, then publish UI.
4. In production, owner personally authorizes each app through provider consent; provider setup and review may take time. No connection is truthful until the callback completes and live identity check succeeds.
5. **Separate launch gate**: accurate inventory/fulfillment, storefront checkout, signed orders/refunds events, independently verified agent jobs, customer opt-out, publishing approval, budget control, and provider-side pause are mandatory before live outreach or spend.

### Known restrictions

PR #47 is connection infrastructure, not the full eight-agent autonomous execution team. The agent registry currently has 607 roles (604 PLANNED, three TESTING), and registered role IDs are not independently verified operational agents. The marketing squad currently makes only owner-approved AI drafts. The Marketing button should show these limitations plainly.

Sources: Shopify standalone OAuth https://shopify.dev/docs/apps/build/authentication-authorization ; TikTok Login Kit https://developers.tiktok.com/docs/en/login-kit-web ; Gmail API scopes https://developers.google.com/workspace/gmail/api/auth/scopes .
