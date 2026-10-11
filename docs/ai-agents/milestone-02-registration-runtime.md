# CreateJourney V2 — Agent Registration and Runtime Foundation Milestone
Verified: 2026-10-11

## Database results
- 75 department records.
- 607 registered roles: 7 independent oversight; 300 department leadership; 300 specialist roles from new departments 46–75.
- Permanent IDs Agent 001–Agent 607 have been assigned to these registered roles.
- Original 45 departments' detailed specialists remain to be recovered and registered; do not claim complete agent inventory or final dependency order.
- All 607 registered roles remain PLANNED; labels are not deployed agents.

## Runtime scaffolding added
- cj_agent_jobs: queued/blocked/approval/running/succeeded/failed/cancelled states, scope, approval metadata, idempotency, attempts, outcomes.
- cj_agent_job_events: event log.
- cj_agent_tool_permissions: deny-by-default tool grants, approval requirements and scopes.
- Row-level security enabled and anonymous/authenticated direct access revoked.
- No runnable orchestration worker/edge runtime has been connected to these tables.
- No tool grants, no jobs, no agents deployed.

## Next execution requirements
1. Recover specialists for original 45 departments, preserve original approved responsibilities.
2. Populate 30-field agent specifications, supervisors, handoffs and dependencies for all agents.
3. Review and, if needed, migrate assigned agent IDs before binding external references if dependency order requires it; never silently reassign identities.
4. Implement a server-side orchestrator, authorized user/business context, per-agent tool grants, approval validation, retry/idempotency rules, durable execution, evidence grading and recovery.
5. Run end-to-end tests with a real low-risk work item; verify data scope, audit events and denial of unauthorized actions.
6. Integrate owner UX with Journey AI and deploy gradually.

## Tests run
- Verified 607 records and zero deployed agents.
- Verified empty job queue and no active tool permissions.
- Successfully applied additive runtime schema migration.

Important: Existing Supabase Edge Functions already serve CreateJourney and must be examined before selecting a unified runtime interface. Production user-facing code unchanged by this milestone.
