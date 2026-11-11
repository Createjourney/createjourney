# CreateJourney live Edge Function source inventory — November 11, 2026

**Evidence:** Connected Supabase project `pbiivpehdatvmyaxwixk`; `list_edge_functions` and individual `get_edge_function` source reads. Status: **25 ACTIVE deployments**; source visibility verified, authenticated business execution *not* verified. Source-to-table and action relationships are **regex-derived discovery hints**, not exhaustive call graphs. A deployment's `verify_jwt=false` is not proof of insecure access: provider callbacks and public APIs may validate their own signatures/requests.

| Edge Function | Version | Gateway JWT | Source references / purpose hints | Discovered actions |
|---|---:|---|---|---|
| `journey-ai-session` | 9 | yes | session/token voice support | — |
| `journey-ai-realtime` | 9 | no | realtime voice/session interaction | — |
| `journey-ai-memory` | 12 | no | workspace_members, journey_ai_memory_snapshots | sync, get |
| `journey-ai-creative` | 9 | no | workspace_members | — |
| `journey-public` | 11 | no | board_registry, boards, journeys, journey_steps, journey_experiments, board_events, visitor_journey_state, customer_feedback | resolve_board, record_events, prompt_response, record_review_click, submit_feedback |
| `journey-ai-actions` | 8 | yes | workspace_members, workspaces, businesses, business_members, workspace_state, boards, board_registry, journeys, journey_steps, journey_ai_tasks | sync_workspace, list_boards, get_board_journey, propose_journey, approve_and_execute_task, dismiss_task, set_board_status |
| `journey-ai-chat` | 22 | yes | business_members, cj_ai_response_config | analysis and specialist routing |
| `journey-board-actions` | 7 | yes | cj_rename_board, cj_update_board_destination, cj_assign_board_member | rename_board, update_destination, assign_member |
| `journey-ai-vision` | 7 | yes | image/vision AI requests | — |
| `journey-billing` | 7 | yes | business_members, businesses, subscriptions | create_checkout, create_portal |
| `journey-billing-webhook` | 7 | no | subscriptions, businesses, boards | — |
| `journey-owner-data` | 7 | yes | workspace_members, workspaces, business_members, boards, board_events, customer_feedback, journey_ai_tasks | dashboard, feedback, activity |
| `journey-integrations` | 9 | yes | workspace_members, workspaces, business_members, connected_accounts | status, begin_connection, sync_account, disconnect |
| `journey-ai-optimizer` | 10 | yes | workspaces, businesses, boards, journeys, journey_steps, board_events, journey_experiments | — |
| `journey-ai-research` | 7 | yes | research generation | — |
| `journey-ai-optimization-actions` | 7 | yes | workspaces, businesses, boards, journey_ai_tasks, cj_replace_board_journey | propose_optimization, approve_and_execute, dismiss |
| `journey-optimization-actions` | 7 | yes | workspaces, businesses, boards, journey_ai_tasks, journey_steps, cj_replace_board_journey | prepare_optimization, approve_optimization, dismiss_optimization |
| `journey-ai-experiments` | 7 | yes | business_members, cj_platform_admins, journey_experiments, journey_experiment_variants, boards | list, create_and_start, pause, resume, cancel, complete |
| `journey-ai-execution` | 9 | yes | workspaces, business_members, journey_ai_task_events, journey_ai_tasks, connected_accounts, journey_agent_outputs, journey_automation_rules | capabilities, handoff, list_tasks, task_detail, prepare, approve_and_execute, record_activity, list_outputs |
| `journey-integration-callback` | 7 | no | connected_accounts | — |
| `journey-provider-webhook` | 7 | no | connected_accounts, integration_webhook_events | — |
| `journey-growth-performance` | 7 | yes | business_members, business_growth_baselines, boards, board_events, connected_accounts, seo_opportunities, business_performance_snapshots | capture_snapshot |
| `cj-agent-runtime` | 4 | yes | cj_agent_registry, business_members, cj_agent_jobs, cj_agent_job_events, cj_agent_authorized, cj_claim_agent_job | capabilities, submit, status, run |
| `journey-ai-capabilities` | 1 | yes | workspace_members, boards, workspaces | catalog |
| `cj-sales-command-center` | 1 | yes | business_members, cj_sales_campaigns, cj_sales_campaign_events, cj_agent_registry, connected_accounts, cj_agent_jobs, cj_sales_verification_evidence | create, update, approve |

## Cross-system overlap requiring investigation

1. `journey-ai-actions`, `journey-ai-optimization-actions`, `journey-optimization-actions` and `journey-ai-execution` already implement related preparation/approval flows. Consolidate authorization/verification contracts before adding further mutation handlers.
2. `journey-board-actions` and `cj_publish_claimed_board_journey` support specific board mutations today; their permissions and resource-target resolution are different. Use typed operations and explicit board identity.
3. `journey-public` is an anonymous visitor surface. Customer flows must stay available without CreateJourney owner login; test privacy and anonymous token protections.
4. `journey-integrations` and callbacks/webhooks exist, but integration health is provider-operation-specific; one Google record is in `error` with no verified sync.
5. `cj-agent-runtime` is analysis-only. Its registered-agent pilot cannot be presented as an autonomous execution fleet.

## Audit validation gates

- [x] All listed deployed function source files retrieved and inspected for direct static references.
- [ ] Inspect full authorization logic, input validation, output scoping, and provider verification for every sensitive action, including dynamically selected operations.
- [ ] Test unauthorized, expired-token, cross-business, and duplicate-action cases under an isolated tenant.
- [ ] Exercise authenticated owner flows and public visitor journeys against a non-production SmartBoard.
- [ ] Reconcile current deployment SHAs against corresponding GitHub source or backup; not all deployed functions are committed in `supabase/functions/`.

**Classification:** `IMPLEMENTED_UNVERIFIED` until end-to-end tests pass.
