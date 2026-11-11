# CreateJourney Journey AI — Milestone 3 Agent Workforce Intelligence

**State:** implemented on feature branch; independently CI-tested, **NOT DEPLOYED**. This is a read-only intelligence system, not activation of 607 agents or authorization for autonomous external actions.

## Audited live baseline (2026-11-11)

- `cj_agent_registry`: **607** registered roles: **604 PLANNED**, **3 TESTING**, **0 VERIFIED/DEPLOYED**.
- Testing pilots: Agent **002** Independent Evidence Verification Agent; Agent **333** SmartBoard Interaction Optimization; Agent **336** SmartBoard Conversion Intelligence.
- `cj_agent_departments`: **75** departments in the live database; some cross-cutting agents have null department.
- `cj_agent_dependencies`: **0** stored dependencies. Do **not** infer that all 607 roles are independent. Supervisor links exist separately in `cj_agent_registry.supervisor_agent_no`.
- `cj_agent_tool_permissions`: **3** granted `ai.analysis` permissions to agents 2, 333, 336, each explicitly `execution_mode=analysis_only`.
- `cj_agent_tool_catalog`: **0** entries (not a verified callable tool service).
- `cj_agent_jobs`: **1 FAILED** agent 333 job; error `AI provider returned no text`; **zero successful registered-agent jobs confirmed**.
- `cj_agent_status_history`: **0** records.
- Separate `journey-ai-chat` personas (10 logical specialties) are **not** the same as independently deployed entries in the 607-agent workforce catalog.
- Findings are time-specific: inspect live state on each request. Do not cache these numbers as timeless facts.

## Shipped source

- `supabase/functions/journey-ai-agent-intelligence/logic.mjs` — pure permission-aware readiness and evidence classification utilities.
- `supabase/functions/journey-ai-agent-intelligence/index.ts` — authenticated, owner/manager-only, read-only Supabase Edge Function.
- `tests/journey-ai-agent-intelligence.test.mjs` — regression tests for realistic registry totals, evidence policy, missing grants and bounded inputs.
- `.github/workflows/agent-workforce-m3.yml` — Node tests, Deno type-check and read-only permission contract guard.

## Authenticated API contract

All POST requests require a valid end-user Supabase JWT and a **validated business UUID**. The server calls `auth.getUser` and separately verifies active business owner/manager membership; model claims, client roles or untrusted metadata cannot grant access.

| Action | Result | Limits |
|---|---|---|
| `overview` | Live 607-registry counts grouped by lifecycle status, department count, known dependencies count, scoped business job count | 1,000 registry records max, enough for today's 607 |
| `roster` | Ordered, paginated agent directory, optional bounded search | 60 records/page, max offset 5,000 |
| `agent_detail` | A single role's responsibilities, classification, supervisor, prerequisite/dependent relationships, granted tools, business-specific job/event/status evidence | 20 jobs; 120 events; 250 dependency rows |
| `departments` | 75 departments with live role counts/status breakdown | 150 departments max |
| `tool_capabilities` | Registered tool definitions and explicit grants, labeled `UNVERIFIED`; never falsely treats grants as a successful provider operation | 1,000 grants max |
| `business_evidence` | Limited, tenant-scoped job receipts **without input/output prompts or provider secrets** | 100 jobs max |

### Truth model

- `PLANNED` → `NOT_IMPLEMENTED` — registration does not mean software exists.
- `TESTING` with no successful analysis receipts → `TESTING_UNVERIFIED`.
- A `SUCCEEDED` analysis-only job **plus** an `ANALYSIS_COMPLETED` job event (scoped to the selected business) → `ANALYSIS_RUNTIME_OBSERVED`. **Still not an external provider action.**
- Unknown `DEPLOYED`/other statuses without receipts → `IMPLEMENTED_UNVERIFIED`, not automatically verified operational.
- No recorded dependency → `NOT_RECORDED`, **not** “no dependencies”.
- Tool permission → `granted` in metadata, **not** “can execute successfully.”
- External operation verification is always `false` until a separately verified execution receipt/permission framework exists.

### Security and privacy

The Edge Function has no mutation endpoints. It does not accept tool-invocation strings, execute agents, deploy Edge Functions, change SmartBoards, spend money or forward credential material to the browser. Service-role key is used server-side only. Every execution history read is scoped to the authorized business ID, not all customers' jobs.

## Release gates

- [x] Inspect live 607-role registry, departments, tool permissions, dependencies and existing job evidence.
- [x] Define deterministic lifecycle, readiness and proof distinctions.
- [x] Implement secure roster, agent detail, department, grant and business-evidence reads.
- [x] Add tests and Deno type-check workflow.
- [ ] Final GitHub Actions run green for this branch and code review.
- [ ] PR #36 Milestone 1 authenticated and live-board acceptance gates.
- [ ] PR #37 Milestone 2 migration + verified production knowledge activation.
- [ ] Scoped authenticated E2E in isolated business, including cross-tenant denials and actual runtime job receipts.
- [ ] Deploy read-only Edge Function with `verify_jwt=true`, test 401/403/success under owner/manager, and check logs.
- [ ] Integrate into Journey AI chat only in the future context-aware milestone, with user role/business selection and independently verified evidence.

**Release decision:** Keep this work staged until prior dependencies and authenticated tests pass. No production database writes and no agent activation.
