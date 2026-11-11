# Journey AI Platform Intelligence — verified baseline (2026-11-11)

Status: **READ-ONLY AUDIT IN PROGRESS**. This report is an evidence ledger, **not** a claim of complete website or browser verification.

## Scope and guardrails
- GitHub: `Createjourney/createjourney`, default branch `main`.
- Supabase: `pbiivpehdatvmyaxwixk`.
- No production schema/data/function changes authorized by this baseline document.
- Do not classify deployed code as verified operational without authenticated runtime and customer-facing checks.
- Keep customer data, production boards, and existing published Journeys untouched during test development.

## Inspected GitHub implementation
1. `assets/cj-journey-capabilities-v1.js`: 12 static logical capability entries, click-derived context, a visible-button inventory limited to 600, `CJExactHome.routeHomeAction` navigation bridge, authenticated workspace-context fetch, explicit block on generic mutations.
2. `assets/cj-journey-capabilities-v1.js` also includes owner SmartBoard editor; publisher invokes `cj_publish_claimed_board_journey` then performs a readback with `cj_list_workspace_published_smartboards`. The editor's 'Test Customer Journey' is explicitly labeled simulation; this is not independent live customer-flow verification.
3. `journey-ai-discovery.js`: contextual discovery shortcuts and creative chat handling. Context-dependent hints do not yet constitute a verified page-state knowledge system.
4. `assets/cj-sales-center-v1.js`: draft/planning-only sales overlay and separate direct sales entry. It explicitly indicates that no external advertising, outreach, Shopify operations, or sales execution is verified.
5. `customer-journey.html`: static public customer flow calls `journey-public` and opens configured HTTPS destinations. Authenticated real-board E2E verification remains pending.
6. Existing tests: `tests/journey-ai-browser.spec.mjs`, `tests/sales-command-center-browser.spec.mjs`; CI workflows under `.github/workflows/`. Existing coverage does not prove every button's runtime behavior or iPhone Safari correctness.
7. `docs/journey-ai-repair-tracker.md` documents prior repair/rollback gates and the outstanding authenticated owner/runtime verification.

## Inspected live Supabase
- 25 Edge Functions report `ACTIVE`. This confirms deployment metadata, not successful operation.
- Existing public tables include `businesses`, `business_members`, `boards`, `board_registry`, `journeys`, `journey_steps`, `connected_accounts`, `journey_ai_tasks`, `journey_ai_task_events`, `audit_log`, `cj_agent_registry`, `cj_agent_jobs`, `cj_agent_job_events`, and `cj_agent_tool_permissions`.
- Agent registry: **607** rows: **604 PLANNED**, **3 TESTING** (#2, #333, #336), **0 VERIFIED** and **0 DEPLOYED**.
- Agent jobs: **1 FAILED** job for agent #333, error `AI provider returned no text`. No successful registered-agent job was demonstrated.
- Connected accounts: one Google record with `status=error`, empty capabilities, no successful sync timestamp.
- `cj-agent-runtime` v4 supports authenticated owner/manager-scoped `analysis_only` jobs. Analysis completion is not a completed external business operation.
- `journey-ai-chat` v22 contains ten internal conversational specialist definitions; distinguish these personas from the persistent 607-agent registry.
- `cj_replace_board_journey(uuid,text,jsonb)` uses `private.can_edit_board_journey` and writes `audit_log`.
- `cj_publish_claimed_board_journey(text,jsonb,text)` checks authenticated claimant ownership and writes published Journey steps. It picks the earliest owner/manager workspace rather than accepting an explicit workspace ID. **Review this ambiguity before multi-business conversational execution.** It does not by itself prove a customer-facing NFC flow works.
- Core RLS policies on business/board/Journey tables exist; `cj_agent_jobs` has RLS without client policies, consistent with a possible server-only access design, requiring permission review rather than automatic alteration.
- Supabase security advisor flagged RLS-no-policy findings and privileged function execution. Audit each function body and grants before changing any privilege; public board reads may be intentionally anonymous.

## Architectural gaps, by evidence class
| Capability | Current state | Needed |
|---|---|---|
| Full routes/page registry | Partial static client catalog | Build full source + runtime inventory |
| All interactions | Visible button names only, max 600 | Stable IDs, controls, conditional behavior, workflow mapping |
| Verified page navigation | Existing routing callback | DOM/route and permission confirmation |
| Context-aware assistance | Partial click and discovery context | Canonical page/business/workflow state, server-side trust boundary |
| Agent awareness | 607 registry records, 3 TESTING | Capability resolution and evidence-backed execution status |
| Integrations | Connected-account data and functions | Per-provider, per-operation health and permission checks |
| Software execution | Backend board RPCs; no universal verified operator | Allowlisted server-side action engine with approvals, idempotency, receipts |
| State synchronization | Several app-specific mechanisms | Tenant-scoped authoritative state/version changes |
| Knowledge updates | No verified deployment activation gate | CI extraction, diff, tests, deployment probe, version promotion |

## Audit completion gates — NOT YET PASSED
- [ ] Enumerate all repository application files, scripts, routes, handlers, and CI configuration at a pinned commit.
- [ ] Inventory HTML and dynamically rendered interactive controls; reconcile static and authenticated DOM inventories.
- [ ] Inspect every relevant deployed Edge Function and SQL RPC behavior, including authorization and side effects.
- [ ] Trace 607 agents' dependencies, tools, status and actual successful execution evidence.
- [ ] Inspect RLS policies/grants/function bodies for cross-tenant leakage and ambiguous target selection.
- [ ] Inspect CI deployments and GitHub Pages deployed build relative to repository branch.
- [ ] Run desktop Chromium and real WebKit/iPhone Safari compatibility testing.
- [ ] Run an authenticated **isolated test-business** SmartBoard read-only baseline; preserve unrelated boards.
- [ ] Publish full page, interaction, integration and relationship registries with source/verification timestamps.

## Verified-function risk to resolve before write-enabled autonomy
`cj_publish_claimed_board_journey` currently selects an owner/manager workspace ordered by creation and takes a board number. For a user managing multiple workspaces/businesses, the association must be explicitly resolved/verified for the target board. Do not reuse it blindly for an AI mutation on an ambiguous target.

## Status vocabulary
`VERIFIED_OPERATIONAL`, `IMPLEMENTED_UNVERIFIED`, `PARTIALLY_IMPLEMENTED`, `PLANNED`, `BROKEN`, `DISABLED`. Distinguish source presence, deployed metadata, successful authenticated execution, and independent public-result verification.

## References
- https://github.com/Createjourney/createjourney/blob/main/assets/cj-journey-capabilities-v1.js
- https://github.com/Createjourney/createjourney/blob/main/journey-ai-discovery.js
- https://github.com/Createjourney/createjourney/blob/main/assets/cj-sales-center-v1.js
- https://github.com/Createjourney/createjourney/blob/main/customer-journey.html
- https://github.com/Createjourney/createjourney/blob/main/docs/journey-ai-repair-tracker.md
- https://supabase.com/docs/guides/database/postgres/row-level-security
