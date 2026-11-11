# CreateJourney — Universal Agent Runtime & Workforce Activation Controller V1

Date: 2026-11-11. Production release from GitHub PR #44, squash `e0b51c2815d434872100dcefd3e03462ef1d564b`.

## Deployed
- `cj-agent-activation-controller` Supabase Edge Function **v1 ACTIVE**, `verify_jwt=true`.
- `journey-ai-chat` **v26 ACTIVE**, `verify_jwt=true`; owner's activation/readiness questions now route to the new controller, returning a deterministic evidence-based plan without executing agents.
- Existing `cj-agent-runtime` **v4 ACTIVE**, `verify_jwt=true`; an isolated **analysis-only pilot** executor. Controller supports its initial universal runtime adapter `analysis_only_v1`, with an extensible adapter registry for additional future task types.
- Real-time JWT/owner-or-manager business authorization, tenant-scoped job receipts, read-only fleet assessment, 607-row activation plan, paginated per-agent readiness, and explicit synthetic-only pilot testing.
- No registry statuses, permission grants, user SmartBoards, billing, or external integrations changed during release.

## Live production classification
- Registry rows: **607**.
- **3** authorized to call existing *analysis-only pilot adapter* once an owner submits an explicit synthetic test: **#2** Independent Evidence Verification, **#333** SmartBoard Interaction Optimization, **#336** SmartBoard Conversion Intelligence.
- **604** require runtime implementation and/or approvals (currently PLANNED).
- **0** agents with evidence in the existing job log sufficient to classify as verified operational.
- Only enabled registered tool: `ai.analysis`; three associated agent grants.
- One historical failed job (Agent #333), **zero** recorded successful registered-agent jobs.

**Precision:** "pilot callable" means a configured runtime path, not a successful authenticated test. These three remain `TESTING` and **not operationally verified**. No lifecycle status was deceptively changed to `DEPLOYED`.

## Controller contract
- `action=overview`: full live authorized fleet summary and evidence coverage.
- `action=activation_plan`: exact three pilot candidates, 604 blocked agent numbers and blocking reasons.
- `action=agents`: paginated agent-level readiness.
- `action=agent_detail`: isolated agent's readiness, available tools and last business receipt.
- `action=pilot_test`: gated `confirm_analysis_only=true`, `synthetic_only=true`, bounded synthetic `test_prompt`; only authorized pilot adapter, owner/manager business, one submitted runtime job. Successful AI text receipt remains **UNVERIFIED** until independent checks and monitoring.

All action requests require a verified user JWT and one authorized owner/manager business. The controller never accepts anonymous access and never publishes cross-business execution receipts.

## Tests completed
- GitHub Actions `Agent Universal Runtime + Activation Controller V1`: Deno typecheck and policy tests **PASS**.
- Existing Journey AI Workforce M3 and read-only role grants checks **PASS**.
- Production auth smoke re-run **PASS** (run 43107036480): missing bearer → HTTP **401**, forged bearer → HTTP **401**.
- Edge Function versions `cj-agent-activation-controller` v1 and `journey-ai-chat` v26 verified ACTIVE with JWT.
- Live SQL confirms exactly three eligible testing agents and 604 PLANNED.

## Outstanding production acceptance
There is **no connected owner JWT** in the development tools. The owner-facing `activation_plan` response and `pilot_test` function have not been executed in an authenticated business session. The CI smoke reports **BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS**, not PASS. No new pilot job was created.

Owner acceptance question to send to Journey AI:
> Which AI agents can we activate immediately, and which of our 607 agents still need development?

The response must report **3 analysis-only pilot candidates (#2, #333, #336)**, **604 requiring development**, **0 independently verified operational**, and **no activation performed**.

Next, run bounded synthetic pilot tests **only with signed-in owner approval**, review SUCCESS/FAILED receipts, verify external-action absence, refine specifications, and stage gated rollout by department.
