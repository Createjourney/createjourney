# CreateJourney Sales Command Center — Controlled Production Deployment Runbook
Status: **PREPARATION ONLY / HOLD** | PR #30 | 2026-11-10 (America/Los_Angeles)

## Production baseline — observed, not modified
- GitHub repository: `Createjourney/createjourney`; PR #30 is a **draft**, unmerged.
- Supabase production project: `pbiivpehdatvmyaxwixk`.
- No `cj_sales_campaigns`, `cj_sales_campaign_events`, or `cj_sales_verification_evidence` table currently appears in production schema.
- Core production references exist: `businesses.id`, `business_members.business_id/user_id/is_active/role`. The production membership role type is `public.app_role` (not text, unlike the isolated test fixture); server code string-normalizes it.
- Existing production Edge Functions are active; `cj-sales-command-center` does not yet exist in the deployed list.
- Supabase migration history contains earlier production foundational migrations absent from the GitHub checkout. Therefore the GitHub local test uses an *intentionally minimal fixture*; it has **not** performed a full production schema replay.
- **Critical website-hosting gap:** repository root `index.html` is empty and no deployment configuration was found at `vercel.json` / `netlify.toml`. Confirm which repository/branch/build actually publishes the live CreateJourney application, and confirm `assets/cj-journey-capabilities-v1.js` is genuinely loaded there, **before claiming UI is live**.
- No Shopify/Meta/TikTok account action, API token configuration, paid spend, or automation activation has been performed.

## CI evidence / gate 1
- Earlier PR head `14f0ac617c4dfb3c0672fc34475b3de3163493ef` passed run `42978586568`, covering:
  1. Node unit tests and JS syntax.
  2. Deno type check.
  3. Isolated CLI/Postgres migration and RLS/grants smoke checks.
  4. Authenticated local owner/manager/outsider API tests and blocked readiness.
  5. Chromium Sales Command Center smoke tests with a mocked API.
- The application UI loading path has now been adjusted to resolve its sidecar asset relative to the existing capability script. **Recheck CI on the final PR head before merge**.
- Local end-to-end tests use a mocked *minimal business registry* and do **not** prove existing production membership/workspace behavior or final app-hosting topology.

## Staged deployment plan — no step silently implies the next

### Phase A — release candidate validation (no production writes)
1. Confirm latest full PR diff, CI jobs green on exact commit, and production schema/roles unchanged.
2. Locate the real CreateJourney website deployment origin and its build entrypoint. Do not use the empty repository root `index.html` as proof of the app deployment.
3. Capture migration text hash/commit; confirm no duplicate `commit` statements and additive-only objects; verify potential table grants and `business_members.role` enum compatibility.
4. Confirm an authenticated owner account/business that can perform controlled smoke testing without modifying customer-facing SmartBoards. Prefer a test business; **no test sales to actual buyers**.
5. Prepare an app release asset/rollback reference and record the deployed Supabase Edge Function versions before mutation.

### Phase B — database and API (explicit go/no-go)
1. Apply **only** the additive migration `supabase/migrations/20261110_sales_campaign_command_center.sql` using the Supabase migration tool; choose an unambiguous migration name, e.g. `sales_campaign_command_center_v1_20261110`. Do not try to replay older GitHub migrations into production.
2. Read-only postmigration assertions:
   - Three tables present and `relrowsecurity=true`.
   - `anon` and `authenticated` have no direct SELECT/INSERT/UPDATE on those tables.
   - `service_role` can read the tables and insert event and signed-evidence records.
   - No existing business/board/journey rows modified.
3. Deploy **new** `cj-sales-command-center` Edge Function only, `verify_jwt=true`; keep existing Journey AI functions untouched.
4. Smoke test anonymous request rejected (401) and authenticated owner overview; test draft creation and manager access only in an isolated *test business*.
5. Observe deployment/error logs before releasing UI.

### Phase C — interface integration (requires hosting verification)
1. Confirm the existing capability module is loaded from the *actual* website deployment and both updated scripts are deployed as static assets.
2. Open Marketing section as a signed-in owner: verify new readiness button, blocked state, masked integration statuses, and creation of a planning-only draft.
3. Test a nonmember/employee, a manager, multi-business selection, mobile Safari and desktop Chromium.
4. Confirm SmartBoard NFC, customer Journey/booking/pay/review and owner dashboard still operate normally.
5. If regression occurs, disable/revert Sales panel assets *first*. Leave backend as dormant/read-only; do not drop existing records.

### Phase D — postdeployment reporting and next project
- Distinguish `registered`, `connected`, `verified`, `approved for planning`, and `live` in UI and documentation.
- Implement independent signed-evidence issuer and authorization receipts before any execution status transitions to operational.
- Then Shopify verified order and refund webhooks, Meta/Facebook/Instagram limited/permissioned scopes, TikTok after provider approval, budget ledger and opt-out.
- No autonomous publication, outreach, or ad spending until the responsible execution layer and its owner approvals are separately tested.

## Rollback strategy
- **UI rollback:** remove/revert Sales Center loader and standalone asset from the serving website build. No SmartBoard or customer Journey code needs changing.
- **API rollback:** stop routing UI to `cj-sales-command-center`; preserve the new function and database in a disabled/dormant state. If deployment defects occur, redeploy the last known good version of affected components.
- **Database:** prefer a *forward fix*, **not** destructive DROP in production. The new tables are additive and isolated; deletion risks destroying legitimate test campaigns or audit evidence. Revert schema only after a migration/data-retention review and explicit approval.
- Keep immutable event/audit records; never claim successful external execution based on analysis-only jobs or connection labels.

## Exact release GO conditions
- [ ] Latest PR CI green (including browser and local auth E2E).
- [ ] Final code review complete.
- [ ] Real website hosting and asset routing discovered and validated.
- [ ] Production migration compatibility/rollback plan reviewed.
- [ ] Authorized non-customer test business/account selected.
- [ ] Explicit go decision for production deployment after the above checks.

**Status at authoring:** NOT DEPLOYED; no production migration, no merge and no provider accounts connected.
