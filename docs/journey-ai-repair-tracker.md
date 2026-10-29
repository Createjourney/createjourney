# Journey AI repair tracker — 2026-10-29

This file is the durable engineering handoff for the five sequential repair milestones. Do not mark a milestone complete based solely on a merged commit or a model's textual claim. Preserve live business/board data and approval boundaries.

## Milestone 1 — Frontend instruction routing
- [x] Confirmed source: `index.html` legacy `handleAiPrompt` plus Build 36.6 `CJJourneyPartnerShouldHandle` and `CJJourneyPartnerAsk`.
- [x] Initial read-only intent fix merged in PR #1, commit `e38ae2eef87cc68f4b44c5e787743751de0a0af3`.
- [x] Hardening merged in PR #2, commit `8de2a236c902e28e3501a3db451161c1b1f190f5`: targeted imperative classifier, immutable proposal identity, no-op Journey protection, pending proposal read-only snapshot.
- [x] Node regression and inline-script syntax tests passed in GitHub Actions run `40837409590`.
- [ ] PR #3 (`test/journey-ai-browser-smoke`): browser-level regression and missing DOMContentLoaded bridge fix. Earlier Chromium run `40837762904` passed 3 browser tests after the runtime bridge fix; expanded 5-test suite awaiting final check.
- [ ] Verify the merged code is served from the confirmed GitHub Pages deployment URL: https://createjourney.github.io/createjourney/. A `journey-ai-deployment.yml` workflow is being added to check this on main.
- [ ] Test authenticated Journey AI response, pending proposal explanation, and real cloud approval in an authorized test business without changing production customer boards.

### Important bug found in Chromium
The main application handlers live inside a DOMContentLoaded closure, but later Build 27 wrappers captured `window.addAiMessage` while undefined, and `window.handleAiPrompt` was never exported. The Build 27 `applyAiPending` also referred to `aiPendingAction` without a runtime bridge. PR #3 adds a lazy wrapper fallback and an explicit runtime bridge. This is a real browser-observed failure, not a speculative issue.

## Milestone 2 — Agent registry integration
- [ ] Verify registry statuses, department mapping and permissions.
- [ ] Route chat to actual registered agents using authenticated business scope; avoid treating ten prompt personas as all 607 implemented agents.
- [ ] Verify job submission, status, traceability and synthesis with a non-production test business.

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
