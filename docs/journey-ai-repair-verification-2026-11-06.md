# Journey AI repair verification — 2026-11-06

This file records read-only observations, not a production sign-off.

## Milestone 1 — PR #1 frontend instruction routing
- PR #1 is closed (GitHub issue/PR metadata); closure alone does **not** prove merge, deployment, or behavioral correctness.
- Validate the *served* index.html against the merged commit and run an authenticated read-only inspection prompt. Verify no mutation action card and no writes.
- Re-test explicit owner-authorized mutation and voice input before marking complete.

## Milestone 2 — registered-agent orchestration
- Production Supabase Edge Function `journey-ai-chat` is ACTIVE, version 22.
- Its source includes ten hard-coded specialist definitions **and** a registered-agent pilot targeting agent numbers 2, 333, 336 via `cj-agent-runtime`.
- Pilot dispatch requires authenticated business membership and an explicit or matched prompt. This is not proof that the entire registered workforce is wired.
- `public.cj_agent_registry`, `cj_agent_jobs`, `cj_agent_job_events`, `cj_agent_tool_permissions` exist. One job was observed in the jobs table at inspection time.
- Next: verify the runtime function exists and compare its deployed contract to the chat caller; exercise authenticated pilot and capture job/result IDs.

## Milestone 3 — autonomous execution
- No general permission-governed autonomous execution has been proven. Keep write actions approval-gated and require deny-by-default checks.

## Milestone 4 — receipts and evidence
- Agent job events exist, but no end-to-end execution receipt, provider confirmation, and evidence verification were demonstrated.
- Never infer completed external action from an LLM response or outbound click.

## Milestone 5 — regression and E2E
- No authenticated end-to-end suite results obtained.
- Required matrix: inspection intent vs mutation; authenticated/unauthenticated; cross-workspace access denial; agent dispatch; approval denial/approval; idempotency; retries; receipts; provider confirmation; rollback; mobile Safari; voice fallback.

## Release gate
Do not claim completion until each milestone has a reproducible pass, commit/deployment reference, and recorded verification evidence. No production database writes were made during this inspection.
