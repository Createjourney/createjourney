# Journey AI isolated E2E gate — 2026-11-04

## Read-only production evidence
- Supabase project: `pbiivpehdatvmyaxwixk` (CreateJourney Production).
- Verified live SQL: `cj_agent_jobs=1`, `cj_agent_job_events=3`, `businesses WHERE data_environment='test'=0`.
- Active JWT-protected functions include `journey-ai-chat` v22 and `cj-agent-runtime` v4 (observed 2026-11-04).
- PR #1 is merged; its authenticated inspection-versus-mutation routing regression remains unverified.
- PR #17 is open and not mergeable at time of inspection; do not force merge.

## Gate before any authenticated synthetic run
1. Provision a *new* isolated test business and a dedicated authenticated test owner using normal approved provisioning. Do not relabel an existing production business.
2. Verify `data_environment='test'`, owner membership, and zero boards and zero journeys; use the existing guarded E2E harness from PR #15.
3. Capture before/after counts, scoped job IDs, event IDs, timestamps, HTTP status, function version, agent ID, authorization decision, execution status, and evidence references. Redact credentials.
4. Run read-only instruction routing tests first. Then run registered-agent chat orchestration. Require a completed agent receipt; QUEUED/STARTED/FAILED do not count as success.
5. Only after (4) succeeds, test permission denials and authorized execution on test-owned disposable resources. No production customer/board mutations.
6. Verify execution receipts against observed provider or database state, not merely model output; include idempotency, duplicate-run, rollback, and cross-tenant negative cases.
7. Run full regression suite and attach passing CI and authenticated E2E evidence before claiming any milestone complete.

## Outstanding
Milestone 1: frontend merged; authenticated routing/approval and deployment verification outstanding.
Milestone 2: runtime deployed; successful registered-agent chat receipt outstanding.
Milestone 3: autonomous execution governance unverified.
Milestone 4: receipts and external evidence verification unverified.
Milestone 5: comprehensive regression and E2E incomplete.

This document is a safety gate and audit trail, not evidence of a successful end-to-end run. No production data was changed.
