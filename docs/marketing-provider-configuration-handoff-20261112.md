# CreateJourney — external provider setup handoff
Status: backend deployed; external developer applications and provider consent **not** yet confirmed. Never represent listed configurations as active solely because an Edge Function responds.

Production Supabase project: `pbiivpehdatvmyaxwixk`. Hosted CreateJourney app: `https://app.gocreatejourney.com/`.

## Actual merchant context
- An existing Shopify store was verified through the user's connected Shopify app: `flourishedimages.myshopify.com`, store name Flourishedimages, USD / Basic plan.
- That is a *ChatGPT–Shopify* connection, not evidence that the **CreateJourney** OAuth app has been installed on the store.
- For this specific merchant, the Shopify domain entered in Marketing is `flourishedimages.myshopify.com`.
- Keep CreateJourney's marketing connectors tenant-generic; do not hard-code this Shopify store for every business.

## Provider app configuration (to be created/confirmed in provider-owned developer consoles)

| Provider | Developer console | Exact registered callback | Required Supabase secrets | First authorization scopes |
|---|---|---|---|---|
| Shopify | https://dev.shopify.com/dashboard | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-shopify-integration` | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | `read_products,read_orders` |
| Google Business Profile | https://console.cloud.google.com/apis/credentials | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/journey-integration-callback?provider=google` | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | `business.manage`; Google Business Profile API approval may be required |
| Meta Facebook / Instagram | https://developers.facebook.com/apps/ | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/journey-integration-callback?provider=meta` | `META_APP_ID`, `META_APP_SECRET` | Page / Instagram permissions according to existing `journey-integrations` function; Meta Ads is a separate, unimplemented capability |
| Gmail | https://console.cloud.google.com/apis/credentials | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/gmail` | `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET` | `openid email profile https://www.googleapis.com/auth/gmail.send`; sensitive-scope review may apply |
| TikTok | https://developers.tiktok.com/apps/ | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/tiktok` | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Login Kit `user.info.basic` only; publishing requires separate API and approval |
| Microsoft 365 / Outlook | https://entra.microsoft.com/ | `https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/cj-marketing-oauth/outlook` | `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | `openid profile email offline_access User.Read Mail.Send`; delegated access, consent/admin policy applies |

For **all new adapters**, `INTEGRATION_TOKEN_ENCRYPTION_KEY` must be a strong, stable server-only value at least 32 characters long, shared with the existing `journey-integrations` encryption implementation as appropriate. Rotate only with a documented re-encryption/reconnect strategy. Avoid changing an existing key blindly: doing so can make stored integration tokens unreadable. Never paste client secrets into chat, GitHub commits, browser-side JavaScript or public logs.

## Acceptance checks per provider
1. Application exists in the provider console, callback registered exactly, URL/domain ownership verified when required, and correct permissions approved.
2. All required environment variables stored as Supabase Edge Function secrets (not exposed to JavaScript). Configuration readiness must report true to an authenticated CreateJourney owner.
3. Owner opens the single Marketing button, chooses the correct CreateJourney business, and authorizes the provider's consent screen.
4. OAuth callback completes for that tenant using a short-lived one-time state. Backend independently reads connected provider identity, scopes, and expiry before showing **verified**.
5. Disconnect removes CreateJourney's stored token; confirm provider-side revocation separately where available. For Gmail/Outlook test actual send functionality only with explicit owner consent and a controlled test recipient.
6. Shopify checkout, order/refund signed webhooks, attribution, TikTok publishing, Meta Ads budget controls and autonomous outreach are **not** part of initial OAuth setup and cannot be presented as ready.

## Known limitations
These actions **cannot** be finalized solely from GitHub and Supabase: registering external developer apps, accepting provider terms, obtaining unshared client IDs/secrets, granting consent, Meta/Google/TikTok review, and choosing a Shopify app distribution mode. Existing Shopify access via ChatGPT is separate from OAuth authorization of CreateJourney. The owner must complete provider-specific account authorization (or use an approved computer-use environment) before an end-to-end live connection can be verified.

Provider documentation:
- Shopify: https://shopify.dev/docs/apps/build/authentication-authorization
- Meta: https://developers.facebook.com/docs/facebook-login/
- Google: https://developers.google.com/identity/protocols/oauth2/web-server
- Gmail: https://developers.google.com/workspace/gmail/api/auth/scopes
- TikTok: https://developers.tiktok.com/doc/login-kit-web
- Microsoft: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
