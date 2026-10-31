# Journey AI repair tracker — 2026-10-29

This file is the durable engineering handoff for the five sequential repair milestones. Do not mark a milestone complete based solely on a merged commit or a model's textual claim. Preserve live business/board data and approval boundaries.

## Milestone 1 — Frontend instruction routing
- [x] Confirmed source: `index.html` legacy `handleAiPrompt` plus Build 36.6 `CJJourneyPartnerShouldHandle` and `CJJourneyPartnerAsk`.
- [x] Initial read-only intent fix merged in PR #1, commit `e38ae2eef87cc68f4b44c5e787743751de0a0af3`.
- [x] Hardening merged in PR #2, commit `8de2a236c902e28e3501a3db451161c1b1f190f5`: targeted imperative classifier, immutable proposal identity, no-op Journey protection, pending proposal read-only snapshot.
- [x] Node regression and inline-script syntax tests passed in GitHub Actions run `40837409590`.
- [x] PR #3 merged, commit `6de3538be4a708d0f8455511b397f8e0fc16d398`: DOMContentLoaded runtime bridge and cloud Apply delegation. Node + 5 Chromium smoke tests passed in Actions run `40837871534`.
- [x] Confirmed live GitHub Pages HTML at https://createjourney.github.io/createjourney/ includes both routing and stale-Apply fixes. Deployment workflow PR #4 passed in Actions run `40838002281`; PR #4 merged, commit `a6dfd9cfc7352d15994acab4fa3c6b46addbe2df`.
- [ ] Test authenticated Journey AI response, pending proposal explanation, and real cloud approval in an authorized test business without changing production customer boards.

### Important bug found in Chromium
The main application handlers live inside a DOMContentLoaded closure, but later Build 27 wrappers captured `window.addAiMessage` while undefined, and `window.handleAiPrompt` was never exported. The Build 27 `applyAiPending` also referred to `aiPendingAction` without a runtime bridge. PR #3 adds a lazy wrapper fallback and an explicit runtime bridge. This is a real browser-observed failure, not a speculative issue.

## Milestone 2 — Agent registry integration
- [x] Read-only production SQL audit: all 607 registry rows are `PLANNED`, zero enabled agent permissions, zero jobs. Existing `cj-agent-runtime` has no runnable registered agents until staged activation; do not claim the 607 agents are operational.
- [x] Verified registry status and permissions via production SQL: 607 total, 604 PLANNED and 3 TESTING (agents 2, 333, 336); `cj_agent_authorized` returned true for `ai.analysis` for those three only.
- [x] Added authenticated, owner/manager-scoped pilot routing to `cj-agent-runtime` for the three TESTING agents, with persisted job IDs, analysis-only outputs and legacy persona fallback. PR #5 merged (`a7e9d33536e10bc036842e33d7f9428701a080f3`), Deno type-check passed (Actions run `40838405130`), production `journey-ai-chat` deployed as v18 with `verify_jwt=true`. Original v17 source backed up in `supabase/backups/journey-ai-chat-v17/index.ts`.
- [ ] Confirm at least one authenticated owner request creates a real `cj_agent_jobs` row and `ANALYSIS_COMPLETED` event, and that Journey AI returns the job ID without falsely claiming external execution. Production SQL after v18 deployment still shows **0 jobs, 0 successes**; no live registered-agent run has been demonstrated.
- [ ] Verify job submission, status, traceability and synthesis with a non-production test business. This is not yet an end-to-end verified integration.

## Milestone 3 — Permission-governed execution
- [ ] Keep analysis-only agents read-only.
- [ ] Add typed, allowlisted tools with business/role authorization, approval policies, idempotency, timeouts, and rollback where applicable.
- [ ] Execute safe supported tasks; do not claim unsupported provider actions.

## Milestone 4 — Execution receipts
- [ ] Persist actual tool results and evidence, verified completion state, actor, timestamp, scope, before/after and failure reason.
- [ ] Differentiate `ANALYSIS_COMPLETED` from actual external action completion.

## Milestone 5 — Regression / end-to-end
- [ ] Frontend Node + Chromium checks.
- [ ] Auth, role denial, stale approval, duplicate/idempotent requests, real test board, backend job status, provider error and rollback.
- [ ] Live GitHub Pages deployment check and user-visible authenticated flow.
- [ ] Report completion only when all five gates have evidence.

### Backend facts
Supabase project `pbiivpehdatvmyaxwixk`: `journey-ai-chat` has 10 built-in specialist personas; `cj-agent-runtime` currently declares `analysis_only`; `journey-ai-execution` is a separate service. None of those facts proves autonomous action execution or complete 607-agent deployment.

## Additional findings from this run
- Supabase security advisor reports RLS-enabled/no-policy informational notices on agent tables and pre-existing SECURITY DEFINER/auth warnings. The runtime uses server-side service-role access plus owner/manager membership checks; do not weaken RLS to make testing easier.
- The runtime previously sliced JSON text to 8,000 characters before parsing, which could fail on long contexts. PR #6 merged (`c57b81b90a062fceee1fc84ff5c8c0d9b505231f`), Deno check passed (Actions run `40838716072`), and `cj-agent-runtime` v3 is ACTIVE with safe bounded context fallback and JWT verification enabled.
- A real authenticated test business/session is still required to verify the successful submit/run/status path. Do not fabricate a successful agent execution from SQL permission checks or Deno compilation.

## 2026-10-30 incremental repair — multi-agent chat orchestration (pending CI / production verification)
- Reconfirmed PR #1 is merged and deployment verification is documented above; authenticated end-to-end approval gate remains open.
- Reconfirmed production `journey-ai-chat` v20 and `cj-agent-runtime` v3 are ACTIVE. SQL still shows no `cj_agent_jobs` rows; registry agents 2, 333 and 336 remain TESTING.
- Prepared multi-agent pilot routing in branch `fix/journey-ai-multi-agent-runtime-20261030`, starting from **live v20 source** to avoid reverting the server-resolved membership fix missing from the older GitHub file.
- Explicit requests for agents #333 and #336 now select both; independent submit/run sequences execute concurrently with the legacy persona analysis. No board mutation tools were added.
- Added per-agent structured execution receipts (job ID, SUCCEEDED/SUBMIT_FAILED/RUN_FAILED/SKIPPED, safe failure code) to prevent unverified execution claims. Browser-supplied metrics remain labeled as context, not independently verified analytics.
- Added Node routing/permission regression tests and Deno-check workflow coverage. **Do not deploy until GitHub Actions passes and PR is reviewed.**
- Still blocked for full milestone-2 verification on an authenticated owner/manager session and a non-production test business; no successful runtime job has yet been observed.

## 2026-10-30 verified backend repair outcome
- **PR #7 merged** as `4774eccbf298117e1e94faf91058869badd4213c`; GitHub Actions run `41021204742` completed successfully (Deno checks + Node agent-routing regression tests). `journey-ai-chat` **v21 ACTIVE**, with deployed source exactly matching GitHub main, JWT verification enabled. Supports simultaneous #333/#336 analysis-only pilot jobs and explicit per-agent receipts.
- **PR #8 merged** as `37e3b3289295dac34625395dc7fc21c174612249`; exact prior production v20 source backed up to `supabase/backups/journey-ai-chat-v20/index.ts` before v21 deployment.
- **Root cause confirmed from Supabase logs at 2026-10-30 06:39 UTC:** `cj-agent-runtime` returned HTTP 500 / PostgreSQL `42501`, `permission denied for table cj_agent_registry`. Service role lacked SELECT on registry and necessary DML on job/event tables.
- **PR #9 merged** as `4b65e3a1d44ddda4e4e6baeb90be45e2f0f212dc`. Applied migration `agent_runtime_service_role_grants_20261030` successfully, granting only `service_role` the needed registry SELECT, job SELECT/INSERT/UPDATE, and event SELECT/INSERT. Verified grants in production and verified all three tables still have RLS enabled. No anon/authenticated table grants added.
- **Critical remaining gate:** Production `cj_agent_jobs` count is still **0** immediately after repairs. No authenticated owner runtime job has been executed or verified. Do not mark Milestone 2 complete or assert that any agent successfully ran. Use an authorized owner session with a non-production test business and confirm two job IDs, SUCCEEDED rows and ANALYSIS_COMPLETED events.
- **Secondary performance issue:** Earlier chat function logs showed some persona OpenAI responses incomplete at `max_output_tokens`, causing empty specialist briefings. Address after the registered-agent success path is proven.
- No production SmartBoard Journey, destinations, customer data or customer-facing settings were modified.

## 2026-10-31 automated incremental verification (Milestone 2 gate still open)
- Rechecked GitHub PR #1: merged at `e38ae2eef87cc68f4b44c5e787743751de0a0af3`. Existing tracker records subsequent frontend fixes, Chromium tests and live Pages deployment; authenticated owner approval test remains unverified.
- Read-only Supabase production audit: `cj_agent_jobs=0`, `cj_agent_job_events=0`, and exactly 3 TESTING agents. Current `journey-ai-chat` v21 is ACTIVE with JWT verification. Existing pilot grants are only `ai.analysis` for agents 2, 333 and 336. No evidence of a completed registered-agent execution.
- Production contains only **one business** and **zero businesses with test/demo/sandbox in their names**. Do not assume that business is disposable or use it for synthetic tests.
- Added `scripts/journey-ai-authenticated-e2e.mjs`, an opt-in owner-JWT harness that requires `CJ_ISOLATED_TEST_BUSINESS=YES` plus an explicitly supplied isolated business UUID. It checks cross-business denial, two persisted analysis jobs, events, duplicate-run rejection, and chat-orchestrated agent receipts. It does not touch customer boards or destinations. This harness has **not been run against production** because no authorized isolated test business/session was available.
- Added no-secret GitHub Actions workflow to parse-check the harness and assert that execution refuses to start without the isolation flag. CI result must be inspected before merge.
- To run only after provisioning an isolated test business and owner account, set `CJ_SUPABASE_URL`, `CJ_SUPABASE_ANON_KEY`, `CJ_TEST_ACCESS_TOKEN`, `CJ_TEST_BUSINESS_ID`, and `CJ_ISOLATED_TEST_BUSINESS=YES`, then execute `node scripts/journey-ai-authenticated-e2e.mjs`. Never commit token values. Four test jobs (two direct and two chat-routed) are expected, each analysis-only.
- Milestones 3–5 remain unverified. No new autonomous execution tools, production migrations, or business data changes were made in this run.
