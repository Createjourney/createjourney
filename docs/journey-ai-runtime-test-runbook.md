# Registered agent runtime authenticated verification — Repair #2

## Preconditions
- Use an authorized owner/manager account and a **non-production test business**. Do not use a live customer SmartBoard for mutation tests.
- Confirm Supabase `journey-ai-chat` v21 and `cj-agent-runtime` v3 are ACTIVE, JWT verification enabled.
- Registry agents #333 and #336 should be TESTING with `ai.analysis` permission.
- The runtime must remain analysis-only. Do not modify board Journeys or destinations.

## Test
From the authenticated CreateJourney Journey AI chat, request:

> Investigate the test SmartBoard using registered agents #333 and #336. Execute real analysis-only runtime jobs. Report actual job IDs and statuses. Do not modify any board settings.

Inspect the network response for `registered_agent_jobs`. Expect exactly two entries with distinct UUID job IDs, status `SUCCEEDED`, `execution_type: analysis_only`, `verification_status: UNVERIFIED`. The last field refers to external business evidence, not whether the runtime ran.

## Server-side verification (read-only)
```sql
SELECT id, agent_no, status, business_id, created_at, finished_at
FROM public.cj_agent_jobs
WHERE agent_no IN (333,336)
ORDER BY created_at DESC
LIMIT 10;

SELECT e.job_id, e.event_type, e.occurred_at
FROM public.cj_agent_job_events e
JOIN public.cj_agent_jobs j ON j.id=e.job_id
WHERE j.agent_no IN (333,336)
ORDER BY e.occurred_at DESC
LIMIT 30;
```

Verify job `business_id` matches the authorized test business and events include `QUEUED`, `STARTED`, and `ANALYSIS_COMPLETED` for each successful job. Do not treat analysis completion as a verified booking or external action.

## Negative tests
- Authenticated viewer/non-member must receive a permission denial, without creating a job.
- Missing/ambiguous business scope should yield `SKIPPED` receipts, not fabricated job IDs.
- Disabled or unpermitted agents must not execute.
- Timeout or provider error must yield a failed receipt and an auditable FAILED job when claimed.
- Repeat read-only request must not modify any board configuration.

## Rollback
If v21 chat causes a production regression, redeploy the exact source in `supabase/backups/journey-ai-chat-v20/index.ts` with `verify_jwt=true`. Database migration only adds minimal service_role table privileges; do not revoke them blindly if other runtime operations depend on them.

## Gate
Do not advance to autonomous execution or mark milestone 2 complete until authenticated test-business jobs and receipts are independently verified.
