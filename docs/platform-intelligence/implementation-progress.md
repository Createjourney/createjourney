# Journey AI Platform Intelligence — approved dependency roadmap

Approved by CreateJourney owner on **2026-11-11**. This is the controlling checklist for the feature branch. No release is permitted from source commits alone.

## Release gates
- **G0: Read-only audit.** Complete source, live function/schema, auth, agent, integration, deployed-site, and desktop/mobile discovery. The static scanner only collects source evidence and MUST never mark features operational.
- **G1: Platform registry.** Map pages, interactions, actions, navigation, dependencies and evidence using stable IDs. Link to deployed version/commit. Reuse existing `CJJourneyCapabilities` where possible.
- **G2: Workforce intelligence.** Derive real agent status from `cj_agent_registry`, `cj_agent_jobs`, events, tool grants, runtime and evidence; distinguish the ten chat personas from registered 607 agents.
- **G3: Integration intelligence.** Model authorization, token expiry, per-operation support, verified last success, webhooks and restrictions.
- **G4: Context-aware AI.** Trusted selected-business and page context; department-specific prompts; no fabricated execution.
- **G5: Permission governance.** User, membership, resource, provider scope, approval, idempotency and audit checks. No unrestricted service role access from model input.
- **G6: Universal Action Engine.** Allowlisted typed operations, preview, approval, execution, result verification, recovery and auditable receipts. Read-only first.
- **G7: Test SmartBoard execution.** Natural-language Pay → Review → Book on an explicitly selected isolated board; independently verify readback and customer-facing publish; unrelated boards unchanged.
- **G8: Live state and receipts.** Reconcile backend versions and frontend view; persist task progress, evidence and reversible history.
- **G9: Computer use.** Only approved constrained authenticated sessions where trustworthy backend operations are absent; browser actions never bypass server authorization.
- **G10: Knowledge synchronization.** CI detects source changes, verifies deployment and runtime results before knowledge state promotion.
- **G11: Full regression.** Multi-tenant denial, stale approval, duplicate submission, failed calls, real customer tap flows, desktop Chromium + actual WebKit/iPhone Safari, rollback.

## First branch deliverable (in progress)
- [x] Branch created, no production modifications.
- [x] Audit baseline committed with evidence, limits and unresolved issues.
- [x] Static source-control scanner added. Its output uses `IMPLEMENTED_UNVERIFIED`, not `VERIFIED_OPERATIONAL`.
- [x] Node smoke tests and a CI artifact workflow committed.
- [x] Static source and anonymous Chromium/WebKit CI checks passed; attached JSON artifacts. **One runtime error found, not an operational pass.**
- [ ] Reconcile 695 source candidates with 553 anonymous DOM controls, 65 surfaces, and authenticated browser views.
- [x] Inventory all 49 public tables, 31 function signatures and 25 deployed Edge Function source relationships.
- [ ] Finish per-operation SQL/Edge Function authorization negative tests.
- [x] Pin full 57-file repository manifest and compare local vs hosted anonymous DOM counts.
- [ ] Finish deployed source provenance checks and authenticated browser coverage.
- [ ] Investigate confirmed hosted `esc is not defined` exception at index.html:7086.

## Critical design decisions
1. Resolve target workspace/business explicitly; do not let an ambiguous earliest-workspace selector silently choose which business is modified.
2. Treat `cj_publish_claimed_board_journey` and `cj_replace_board_journey` as distinct, currently implemented RPCs. Do not assume identical authorization or publication semantics.
3. Build one canonical action contract, not parallel independent AI execution systems.
4. Require a verified operation receipt, not just a model statement or HTTP 200.
5. No production deployments, migrations, existing-customer board mutations, external spending, or unapproved outreach from this initial branch.

## Evidence status
The current branch implements only a **read-only static inventory generator and documentation**. It does **not** implement the knowledge database, full button discovery, autonomous board updates, computer use, or production navigation. Advancement depends on test evidence.
