# Flourished Images — Marketing Launch Squad V1 Production Status
Date: 2026-11-11. PR #45 merged at `4491d0c6f249beea29c028925dd05ad648427161`.

## Intent
Prioritize a bounded, brand-specific marketing team for Flourished Images; defer all 607-agent mass activation until useful. Keep the CreateJourney platform universal while storing this external brand's content in a separate **owner-scoped marketing workspace**, not customer-business metrics.

## Deployed code
- Supabase migration: owner-only `cj_marketing_brand_workspaces` and `cj_marketing_squad_runs`. Row-level security enabled and direct client SELECT denied to both anon and authenticated roles; scoped access through JWT-checked Edge Function and service-role backend.
- `cj-marketing-launch-squad` Edge Function v1 ACTIVE, `verify_jwt=true`. Supported actions: `readiness`, `setup_brand` (explicit brand control confirmation), `draft_campaign` (explicit owner approval for AI analysis costs and draft-only use, with ten-minute cool-down and one concurrent job per workspace), `run_status`.
- `journey-ai-chat` v27 ACTIVE, `verify_jwt=true`. Bounded Flourished Images conversational route: default read-only readiness; explicit brand setup phrase; explicit approved draft phrase. No action-capable external publishing endpoint.
- Registry role mappings: #520 Campaign Audience Research; #521 Campaign Strategy; #523 Campaign Execution Coordination; #527 Campaign Completion Review/QA. Reference department supervisors #64–67. **These global registry entries are still PLANNED**, not falsely labeled deployed. A successful draft run can provide evidence for gradual genuine pilot activation.
- Draft role outputs and receipts persisted under the owner's external-brand workspace. This does NOT call the global `cj-agent-runtime` or update `cj_agent_jobs`; separate draft jobs are tracked in `cj_marketing_squad_runs`.
- Owner-reported provisional brand information: premium 3D modular frame, $240 retail, target first 100, 20-day shipping target, intended women 18–60. **Not verified against a merchant product feed or production fulfillment.**

## External merchant/channel checks via connected apps (outside CreateJourney)
- The connected Shopify store is named **Flourishedimages** at `flourishedimages.myshopify.com`. Product search returned **0 products**. Product, inventory, payment and checkout live-readiness are **not established**.
- Connected Metricool returned **no social network connection**; post scheduling/publishing is blocked until connected.
- The marketing squad Edge Function does not have access to ChatGPT's separate Shopify or Metricool connector sessions. Do not claim those provider integrations work inside CreateJourney.
- Flourished Images is **not present** as a CreateJourney `businesses` row. The explicit external-brand workspace avoids corrupting CreateJourney merchant performance metrics, but must still be created from the signed-in owner account.

## Automated verification
- GitHub Actions marketing suite, Deno typecheck, and preexisting Agent Workforce routing regression: **PASS** (see PR #45).
- Production authentication smoke `43113016981`: missing JWT 401 **PASS**, forged JWT 401 **PASS**.
- `journey-ai-chat` v27 / `cj-marketing-launch-squad` v1: confirmed ACTIVE with `verify_jwt=true`.
- New tables `anon` and `authenticated` SELECT false; service_role SELECT true.
- **Owner-authenticated readiness, brand creation, and paid draft-generation acceptance are NOT YET TESTED** because no owner JWT exists in connected developer tools. Production smoke explicitly reports `BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS`. Do not declare the full marketing system operational.
- No social publishing, email marketing, ad spending, or merchant changes were performed.

## Owner acceptance messages (in CreateJourney Journey AI)
1. `What is the Flourished Images marketing team readiness and what is missing?` — must show four planned registered role mappings and product/channel blockers without running models.
2. `I confirm I own Flourished Images. Set up the Flourished Images marketing workspace.` — must create owner-scoped workspace without generating a paid campaign or publishing content.
3. `Generate a Flourished Images campaign draft. I approve AI analysis costs. Draft only. Develop a 14-day pre-order strategy and include unverified claim warnings.` — requires an actual signed-in owner account; should produce role receipts for #520, #521, #523, #527 and a draft outcome with no external action.

## Production launch blockers
- Authoritative merchant product URL/checkout, product images, inventory/capacity, shipping and refund disclosures and accurate availability statements.
- Social account integration to publisher/analytics; any future ads require explicit budgets, approvals and platform integrations.
- Actual signed-in owner acceptance with structured job output and QA evidence before promoting role status to TESTING, VERIFIED or DEPLOYED.
- Further capabilities (creative asset production, approved publishing, customer attribution, reporting and optimization) remain to be implemented.

**Correct operational label:** Marketing squad V1 deployed for controlled draft-only owner testing; live revenue-producing campaigns are NOT launched. All other registry agents remain unchanged.
