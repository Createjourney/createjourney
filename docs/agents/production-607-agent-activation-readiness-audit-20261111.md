# CreateJourney — 607-Agent Production Readiness Audit

Date: 2026-11-11. Source: **read-only live Supabase production queries** against project `pbiivpehdatvmyaxwixk` and deployed Edge Function source; no agent statuses, permissions, customer configurations, or jobs were changed.

## Executive decision

**DO NOT mass-activate the 607 registry rows.** Registration is metadata, not a deployed independently-operating agent. A bulk status UPDATE to `DEPLOYED` would falsely report capabilities and would not produce an execution runtime, supervisor/worker orchestration, tool coverage, workflow receipts, authorization, or working agents.

### Actual production evidence

| Field | Observed |
|---|---:|
| Registered agent rows | 607 |
| PLANNED | 604 |
| TESTING | 3 |
| VERIFIED / DEPLOYED / MONITORING | 0 |
| Departments | 75 |
| Supervisor references assigned | 600 |
| Explicit dependency records | 0 |
| Rows with nonempty `specification` JSON | 90 |
| Rows without a nonempty `specification` JSON | 517 |
| Tool catalog records | 8 |
| Enabled tool catalog records | 1 |
| Granted agent tool permissions | 3 |
| Agent lifecycle/status-history records | 0 |
| Recorded registered-agent jobs | 1 |
| Succeeded agent jobs | 0 |
| Failed agent jobs | 1 |
| Completed analysis events | 0 |

Agent 333's one failed job (2026-11-01) has error: **“AI provider returned no text.”** The runtime has since acquired a response text extraction/retry path, but **no successful authenticated rerun is recorded**. Do not claim repaired behavior until exercised.

### Only eligible testing pilots

| # | Agent | Registry lifecycle | Allowed tool | Verified runtime success |
|---:|---|---|---|---|
| 002 | Independent Evidence Verification Agent | TESTING | `ai.analysis` — `analysis_only` | None |
| 333 | SmartBoard Interaction Optimization | TESTING | `ai.analysis` — `analysis_only` | None; one failed job |
| 336 | SmartBoard Conversion Intelligence | TESTING | `ai.analysis` — `analysis_only` | None |

The only enabled catalog tool is `ai.analysis`. Seven other catalog tools are disabled and cover high-impact activity such as customer outreach, external integrations, SmartBoard changes, content publication, billing, and production deployment. Granting all agents every tool is **not** an activation strategy; these require separately verified implementations and business-scoped action authorization.

### What is deployed versus what is not

`journey-ai-chat` v25 and `journey-ai-agent-intelligence` v1 are both ACTIVE with JWT verification. The `cj-agent-runtime` v4 Edge Function also exists and provides authenticated, owner/manager-only **analysis** pilot `submit`, `run`, and `status` actions. It does not implement every specialist agent's external task, persistent scheduled execution, multi-agent dependency DAG, autonomous company operations, or company-wide independent heartbeat verification.

Current runtime `capabilities` returns eligible agent registry rows; that alone is not a success/health check. Its `submit` action requires one of TESTING, VERIFIED, DEPLOYED, or MONITORING plus an authorized `ai.analysis` permission. Changing the registry status alone cannot add an implementation or tool permission.

### Verification limits

Live SQL / deployed-source inspection is possible through connected Supabase and GitHub. **An actual signed-in webpage interaction or authenticated `cj-agent-runtime` execution is not possible with the available session.** A real browser owner session would be required to exercise the signed-in Journey AI UI, create isolated test jobs, inspect provider output and assert tenant isolation. Public/invalid JWT response checks are separately covered in the existing production smoke workflow. Do **not** copy secrets or bearer tokens into a chat or GitHub issue.

## Correctly gated activation plan

1. **Pilot execution acceptance**: run agents 2, 333 and 336 only against a dedicated owner-authorized isolated test business with synthetic inputs. Require jobs `SUCCEEDED`, `QUEUED` → `STARTED` → `ANALYSIS_COMPLETED` receipts, valid nonempty analyses, and no external work claimed. Exercise cross-business denial, duplicate execution, malformed requests, and spending limits.
2. **Readiness contracts for the remaining 604 roles**: for each, establish implementation identity/version, clear task schema, data requirements, registered applicable tool(s), permitted risk scope, dependency/supervisor relationships, failure and retry policy, spend budget, test fixture, monitoring, audit receipt, and rollback.
3. **Organizational runtime**: implement supervisor orchestration and worker-to-worker handoffs with explicit dependencies and request provenance. Keep the first iteration isolated from customer-side mutations.
4. **Staged activation**: enable small, verified **analysis-only** cohorts, then gradually introduce action-capable teams with approvals for high-risk changes. For every activation enforce a real execution test, versioned evidence, current authorization, spend limits and ongoing health checks.
5. **Full workforce gate**: only label a registered role `VERIFIED` or `DEPLOYED` on evidence of its own successful supported operations and monitoring. Provide dashboard counts for registered, configured, callable, tested, successful, failed, and operational separately.

## Recommended owner-side questions

- “List the three testing agents, their tool permissions, and the last recorded job outcome for each.”
- “Run an **analysis-only** synthetic check with Agent 333 on a dedicated test business; show the job receipt and completion events.” (**Only after isolated owner test setup**, not on the live customer business.)
- “Which agents have a configured executable runtime versus only an entry in the registry?”
- “Which approvals, external connections and tools would be required before Agent 336 could do more than internal analysis?”
- “How many agent jobs have verifiably succeeded, and can you show the corresponding receipts?”

### Acceptance statement

**Audit of 607 registry rows and fleet execution prerequisites completed at the metadata/backend level.** **Not** a claim of individually executed 607-agent E2E tests. **0** registered agents meet the observed successful-job operational-evidence criterion. **No mass activation performed** because no implementation and verification basis exists for the 604 PLANNED rows.
