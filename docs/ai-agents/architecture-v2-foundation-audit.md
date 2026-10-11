# CreateJourney Agent Architecture v2 — Foundation Audit
Date: 2026-10-11
Status: PARTIAL IMPLEMENTATION — no runnable agents claimed.

## Verified infrastructure
- Repository: Createjourney/createjourney, base branch main.
- Production database: CreateJourney Production (Supabase).
- Existing production task, recommendation, task event, and specialist output tables are present.
- New additive registry schema: cj_agent_departments, cj_agent_registry, cj_agent_dependencies, cj_agent_status_history.
- Department categories 01–75 seeded as INVENTORY_PENDING. No agent ID assigned until original specialist inventory is reconciled and dependency order frozen.
- No live web app changed, no autonomous agent runtime deployed.

## Completeness accounting
- 75 departments (45 original + 30 additions).
- Four department leadership roles each = 300.
- Additions contain 300 distinct specialist responsibilities in directive section 5.
- Original 45 department specialist count: UNKNOWN until recovered from historical approved specifications.
- Independent oversight: at least 7 required role descriptions; ensure not double-counted with cross-system agents.
- Known minimum before original specialist count and shared nonoverlapping agents: 607 (300 leadership + 300 new specialists + 7 executive).
- FINAL COUNT = 607 + original approved specialists + unique other cross-system agents (minus verified duplicates; no capabilities omitted).

## Hard gates before agent numbering
1. Recover approved original 45 specialist inventories; reconcile with existing code and prior architecture.
2. Freeze exact role mapping (one responsibility per specialist unless explicit reapproval).
3. Separate leadership, executive oversight, cross-system agents; map roles to capabilities and workflows.
4. Topologically sort dependencies, then assign immutable Agent 001 onward.
5. Implement permissions/approvals, handoff/routing, evidence verification, observability and task state transitions.
6. Implement one vertical end-to-end agent workflow, validate real tools, audit trail, proof of completion and rollback.
7. Expand to other departments through verified regression-tested releases.

## Security baseline
Registry tables have row-level security enabled, anonymous and authenticated SQL privileges revoked. Operational execution must remain server-side under least-privilege credentials with explicit permission checks. Registration does not mean implementation or deployment.

## Existing platform compatibility
Keep existing journey_ai_tasks, journey_ai_task_events, journey_ai_recommendations and journey_agent_outputs contracts compatible. Preserve SmartBoard customer recognition as probabilistic, not verified identity. Do not misrepresent booking or revenue conversions without provider evidence.

## Deferred verification
- Recover exact old specialist inventory and design decisions from project history.
- Validate runtime and UX tests prior to exposing agents in dashboard.
- Confirm no existing agent-like edge functions or external orchestrators are missed.
- Capture all 300 new specialist roles as full specification records rather than just labels.

The user directive as received ends partway through Section 11 at letter H; later sections, if any, must be reconciled before final architecture freeze.
