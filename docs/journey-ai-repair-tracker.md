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
- [ ] Confirm at least one authenticated owner request creates a real `cj_agent_jobs` row and `ANALYSIS_COMPLETED` event, and that Journey AI returns the job ID without falsely claiming external execution.
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
