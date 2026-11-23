# Journey AI repair verification gates — 2026-11-07

## Read-only production evidence
- Supabase project pbiivpehdatvmyaxwixk: journey-ai-chat ACTIVE v22 (JWT required), cj-agent-runtime ACTIVE v4 (JWT required), journey-ai-execution ACTIVE v9 (JWT required).
- Direct SQL counts (not approximate table metadata): 607 cj_agent_registry rows, 1 cj_agent_jobs row, 3 cj_agent_job_events rows, 3 cj_agent_tool_permissions rows.
- journey-ai-chat v22 contains 10 hard-coded specialist definitions and a registered-agent pilot limited to agents 2, 333, 336. The pilot submits/runs jobs through cj-agent-runtime, uses authenticated business membership, and labels its analysis results UNVERIFIED.
- Read-only inspection only. No production rows altered. An ACTIVE function status is not evidence of successful authenticated execution.

## Sequential release gates (none may be marked passed without evidence)

1. **PR #1 frontend routing**: verify PR disposition and compare deployed frontend asset with merged GitHub commit; use authenticated owner session to exercise instruction routing; record request, response, timestamp, and commit. Merge/deploy only after validation.
2. **Registered agents**: with a real authenticated owner token, exercise agents 2, 333, 336 through journey-ai-chat and prove a corresponding authorized job, events, and result in the registry-backed runtime. Assert business isolation and clear fallback when an agent fails. Do not equate ten hard-coded specialists with registry orchestration.
3. **Permission-governed execution**: default-deny unknown tools; enforce actor, business, agent, tool, risk tier and explicit approval at the execution boundary, not just in prompt text. Verify denied calls create no external side effect.
4. **Execution receipts**: immutable correlation/job IDs, actor and business scope, policy decision, input digest, provider operation ID, observed result, timestamps and evidence status. Separate attempted from provider-confirmed; test failed/partial operations and idempotent retries.
5. **Regression and E2E**: authenticated owner and denied-user scenarios; no-login customer NFC journey; SmartBoard Pay/Review/Book URLs and ordering; external action safety; agent routing, failed agents, approval denial, receipts, duplicate execution, cross-tenant access, frontend on iPhone Safari, and rollback. Record test artifacts and deployment hash.

## Immediate blockers
- No authenticated browser owner session or confirmed frontend deployment hash was obtained during this inspection.
- No production invocation of autonomous write tools was attempted; do not bypass approval/permission gates.
- Preserve existing business, board, journey, and agent-job data. Use isolated test identities/fixtures for any write-path E2E.

This document is an audit checkpoint, **not** a completion or deployment certificate.
