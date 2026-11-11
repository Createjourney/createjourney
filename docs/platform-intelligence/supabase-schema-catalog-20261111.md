# CreateJourney Supabase — complete public schema catalog

**Source:** live SQL information_schema/pg_catalog read-only inspection, 2026-11-11. **No row contents or secret values exported.** Table presence does not prove feature functionality. Existing permissions require individual policy and negative-test review.

## Coverage
- 49 public base tables
- 517 public columns
- 70 foreign-key references
- 31 public functions
- 59 public RLS policies (note: a table with zero direct policies may be deliberately server-only)

## Tables and column structures

| Table | Columns | RLS policy count |
|---|---|---:|
| `audit_log` | `id` (bigint NOT NULL), `business_id` (uuid NOT NULL), `actor_user_id` (uuid), `board_id` (uuid), `event_type` (text NOT NULL), `details` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `board_assignments` | `id` (uuid NOT NULL), `board_id` (uuid NOT NULL), `business_member_id` (uuid NOT NULL), `can_edit_journey` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 2 |
| `board_events` | `id` (bigint NOT NULL), `board_id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `visitor_id` (text), `session_id` (text), `event_type` (text NOT NULL), `action_type` (text), `status` (text NOT NULL), `provider` (text), `provider_event_id` (text), `metadata` (jsonb NOT NULL), `occurred_at` (timestamp with time zone NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `board_registry` | `id` (uuid NOT NULL), `public_id` (text NOT NULL), `claim_code_hash` (text NOT NULL), `status` (text NOT NULL), `claimed_business_id` (uuid), `claimed_board_id` (uuid), `claimed_by` (uuid), `claimed_at` (timestamp with time zone), `manufactured_at` (timestamp with time zone NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `boards` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `location_id` (uuid), `activation_code` (text NOT NULL), `name` (text NOT NULL), `status` (USER-DEFINED NOT NULL), `is_primary` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `registry_id` (uuid), `parent_board_id` (uuid), `board_kind` (text NOT NULL), `placement_label` (text), `profile_slug` (text), `public_profile` (jsonb NOT NULL), `journey_ai_personal_assistant` (boolean NOT NULL), `ai_addon_status` (text NOT NULL), `source_key` (text), `data_environment` (text NOT NULL) | 4 |
| `business_growth_baselines` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `baseline_at` (timestamp with time zone NOT NULL), `source` (text NOT NULL), `metrics` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `business_members` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `role` (USER-DEFINED NOT NULL), `is_active` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 4 |
| `business_performance_snapshots` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `snapshot_at` (timestamp with time zone NOT NULL), `period_key` (text NOT NULL), `metrics` (jsonb NOT NULL), `source_status` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `businesses` | `id` (uuid NOT NULL), `name` (text NOT NULL), `slug` (text), `created_by` (uuid), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `industry` (text), `description` (text), `website_url` (text), `phone` (text), `logo_url` (text), `brand_primary_color` (text), `brand_secondary_color` (text), `brand_voice` (text), `business_hours` (jsonb NOT NULL), `goals` (jsonb NOT NULL), `target_customer` (jsonb NOT NULL), `business_brain` (jsonb NOT NULL), `subscription_plan` (text NOT NULL), `journey_ai_trial_started_at` (timestamp with time zone), `journey_ai_trial_ends_at` (timestamp with time zone), `journey_ai_enabled` (boolean NOT NULL), `data_environment` (text NOT NULL) | 3 |
| `cj_agent_departments` | `department_no` (smallint NOT NULL), `department_name` (text NOT NULL), `phase` (text NOT NULL), `source_reference` (text), `created_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_agent_dependencies` | `agent_no` (integer NOT NULL), `requires_agent_no` (integer NOT NULL), `dependency_type` (text NOT NULL) | 0 |
| `cj_agent_job_events` | `id` (bigint NOT NULL), `job_id` (uuid NOT NULL), `event_type` (text NOT NULL), `evidence` (jsonb NOT NULL), `actor` (text NOT NULL), `occurred_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_agent_jobs` | `id` (uuid NOT NULL), `agent_no` (integer NOT NULL), `business_id` (uuid), `task_id` (uuid), `requested_by` (uuid), `input` (jsonb NOT NULL), `output` (jsonb), `status` (text NOT NULL), `risk_level` (text NOT NULL), `approval_required` (boolean NOT NULL), `approved_by` (uuid), `approved_at` (timestamp with time zone), `attempts` (integer NOT NULL), `idempotency_key` (text), `error_detail` (text), `created_at` (timestamp with time zone NOT NULL), `started_at` (timestamp with time zone), `finished_at` (timestamp with time zone) | 0 |
| `cj_agent_registry` | `agent_no` (integer NOT NULL), `permanent_id` (text), `agent_name` (text NOT NULL), `department_no` (smallint), `classification` (text NOT NULL), `responsibility` (text NOT NULL), `specification` (jsonb NOT NULL), `supervisor_agent_no` (integer), `status` (text NOT NULL), `version` (integer NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_agent_status_history` | `id` (bigint NOT NULL), `agent_no` (integer NOT NULL), `prior_status` (text), `new_status` (text NOT NULL), `evidence` (jsonb NOT NULL), `actor` (text NOT NULL), `changed_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_agent_tool_catalog` | `tool_key` (text NOT NULL), `description` (text NOT NULL), `risk_level` (text NOT NULL), `default_approval_required` (boolean NOT NULL), `enabled` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_agent_tool_permissions` | `agent_no` (integer NOT NULL), `tool_key` (text NOT NULL), `granted` (boolean NOT NULL), `approval_required` (boolean NOT NULL), `permission_scope` (jsonb NOT NULL) | 0 |
| `cj_ai_response_config` | `config_key` (text NOT NULL), `version` (integer NOT NULL), `enabled` (boolean NOT NULL), `rules` (text NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_board_admin_log` | `id` (bigint NOT NULL), `board_id` (uuid), `action` (text NOT NULL), `previous_status` (text), `new_status` (text), `details` (text), `created_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_board_inventory` | `id` (uuid NOT NULL), `board_number` (text NOT NULL), `board_type` (text NOT NULL), `public_token` (uuid NOT NULL), `activation_code` (text NOT NULL), `status` (text NOT NULL), `claimed_by` (uuid), `claimed_at` (timestamp with time zone), `board_name` (text), `replaced_board_id` (uuid), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `activated_at` (timestamp with time zone), `owner_code` (text) | 0 |
| `cj_platform_admins` | `user_id` (uuid NOT NULL), `admin_role` (text NOT NULL), `active` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_sales_campaign_events` | `id` (bigint NOT NULL), `campaign_id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `actor_user_id` (uuid), `event_type` (text NOT NULL), `detail` (jsonb NOT NULL), `occurred_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_sales_campaigns` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `name` (text NOT NULL), `product_name` (text NOT NULL), `product_url` (text NOT NULL), `currency` (text NOT NULL), `sale_price_cents` (integer NOT NULL), `regular_price_cents` (integer NOT NULL), `order_target` (integer NOT NULL), `daily_ad_cap_cents` (integer NOT NULL), `daily_research_target` (integer NOT NULL), `shipping_policy` (text NOT NULL), `fulfillment_note` (text NOT NULL), `delivery_guaranteed` (boolean NOT NULL), `status` (text NOT NULL), `created_by` (uuid NOT NULL), `approved_by` (uuid), `approved_at` (timestamp with time zone), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 0 |
| `cj_sales_verification_evidence` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `campaign_id` (uuid NOT NULL), `gate_key` (text NOT NULL), `outcome` (text NOT NULL), `source` (text NOT NULL), `provider_reference` (text), `signature` (text NOT NULL), `verified_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone NOT NULL), `evidence` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 0 |
| `connected_accounts` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `provider` (text NOT NULL), `connection_type` (text), `status` (text NOT NULL), `external_account_id` (text), `external_account_name` (text), `scopes` (jsonb NOT NULL), `metadata` (jsonb NOT NULL), `connected_by` (uuid), `connected_at` (timestamp with time zone), `last_synced_at` (timestamp with time zone), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `token_expires_at` (timestamp with time zone), `last_error` (text), `capabilities` (jsonb NOT NULL), `oauth_state` (text) | 2 |
| `creative_assets` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid), `created_by` (uuid), `asset_type` (text NOT NULL), `title` (text NOT NULL), `purpose` (text), `category` (text), `storage_bucket` (text), `storage_path` (text), `public_url` (text), `prompt` (text), `caption` (text), `platform` (text), `campaign_name` (text), `status` (text NOT NULL), `usage_history` (jsonb NOT NULL), `performance` (jsonb NOT NULL), `ai_analysis` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `customer_feedback` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid NOT NULL), `visitor_id` (text), `session_id` (text), `rating` (smallint), `feedback_text` (text), `review_provider` (text), `review_link_clicked_at` (timestamp with time zone), `provider_review_confirmed_at` (timestamp with time zone), `metadata` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `device_push_tokens` | `id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `workspace_id` (uuid), `platform` (text NOT NULL), `expo_push_token` (text NOT NULL), `device_name` (text), `app_version` (text), `active` (boolean NOT NULL), `last_seen_at` (timestamp with time zone NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `integration_webhook_events` | `id` (uuid NOT NULL), `business_id` (uuid), `provider` (text NOT NULL), `provider_event_id` (text NOT NULL), `event_type` (text), `status` (text NOT NULL), `payload` (jsonb NOT NULL), `error_message` (text), `received_at` (timestamp with time zone NOT NULL), `processed_at` (timestamp with time zone) | 1 |
| `journey_agent_outputs` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `created_by` (uuid), `task_id` (uuid), `specialist_id` (text NOT NULL), `output_type` (text NOT NULL), `title` (text NOT NULL), `summary` (text), `status` (text NOT NULL), `payload` (jsonb NOT NULL), `external_provider_required` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `journey_ai_memory_snapshots` | `id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `workspace_id` (uuid NOT NULL), `snapshot` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 0 |
| `journey_ai_recommendations` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid), `professional_member_id` (uuid), `category` (text NOT NULL), `title` (text NOT NULL), `summary` (text NOT NULL), `rationale` (text), `impact_score` (numeric), `evidence` (jsonb NOT NULL), `proposed_action` (jsonb NOT NULL), `status` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `expires_at` (timestamp with time zone), `dismissed_at` (timestamp with time zone), `acted_at` (timestamp with time zone) | 2 |
| `journey_ai_task_events` | `id` (uuid NOT NULL), `task_id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `actor_user_id` (uuid), `event_type` (text NOT NULL), `detail` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 2 |
| `journey_ai_tasks` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid), `requested_by` (uuid NOT NULL), `assigned_member_id` (uuid), `task_type` (text NOT NULL), `title` (text NOT NULL), `description` (text), `status` (text NOT NULL), `risk_level` (text NOT NULL), `requires_approval` (boolean NOT NULL), `proposal` (jsonb NOT NULL), `result` (jsonb NOT NULL), `approved_by` (uuid), `approved_at` (timestamp with time zone), `completed_at` (timestamp with time zone), `error_message` (text), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `feature_key` (text), `source_surface` (text), `source_context` (jsonb NOT NULL), `progress` (smallint NOT NULL), `last_activity_at` (timestamp with time zone NOT NULL), `metadata` (jsonb NOT NULL) | 3 |
| `journey_automation_rules` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `created_by` (uuid), `task_id` (uuid), `name` (text NOT NULL), `trigger_definition` (jsonb NOT NULL), `conditions` (jsonb NOT NULL), `action_definition` (jsonb NOT NULL), `approval_boundary` (text), `failure_handling` (text), `measurement` (text), `status` (text NOT NULL), `external_provider_required` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `journey_experiment_variants` | `id` (uuid NOT NULL), `experiment_id` (uuid NOT NULL), `variant_key` (text NOT NULL), `name` (text NOT NULL), `journey_signature` (text NOT NULL), `steps` (jsonb NOT NULL), `allocation_percent` (smallint NOT NULL), `source_journey_id` (uuid), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `journey_experiments` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid NOT NULL), `name` (text NOT NULL), `optimize_for` (text NOT NULL), `status` (text NOT NULL), `minimum_taps_per_variant` (integer NOT NULL), `target_taps_per_variant` (integer NOT NULL), `created_by` (uuid), `started_at` (timestamp with time zone), `ended_at` (timestamp with time zone), `winner_variant_id` (uuid), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `journey_steps` | `id` (uuid NOT NULL), `journey_id` (uuid NOT NULL), `position` (smallint NOT NULL), `action_type` (text NOT NULL), `destination_url` (text), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 4 |
| `journeys` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid NOT NULL), `name` (text NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `data_environment` (text NOT NULL) | 4 |
| `locations` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `name` (text NOT NULL), `address_line_1` (text), `address_line_2` (text), `city` (text), `state_region` (text), `postal_code` (text), `country_code` (text), `is_active` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `professional_profiles` | `id` (uuid NOT NULL), `business_member_id` (uuid NOT NULL), `display_name` (text), `bio` (text), `services` (jsonb NOT NULL), `booking_url` (text), `social_links` (jsonb NOT NULL), `goals` (jsonb NOT NULL), `preferences` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `profiles` | `id` (uuid NOT NULL), `full_name` (text), `email` (text), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `seo_opportunities` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `source` (text NOT NULL), `category` (text NOT NULL), `title` (text NOT NULL), `detail` (text), `status` (text NOT NULL), `impact` (text NOT NULL), `evidence` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `completed_at` (timestamp with time zone) | 1 |
| `subscriptions` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `scope_type` (text NOT NULL), `board_id` (uuid), `plan_code` (text NOT NULL), `status` (text NOT NULL), `provider` (text NOT NULL), `provider_customer_id` (text), `provider_subscription_id` (text), `provider_price_id` (text), `trial_started_at` (timestamp with time zone), `trial_ends_at` (timestamp with time zone), `current_period_end` (timestamp with time zone), `cancel_at_period_end` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `visitor_journey_state` | `id` (uuid NOT NULL), `business_id` (uuid NOT NULL), `board_id` (uuid NOT NULL), `visitor_id` (text NOT NULL), `prompt_key` (text NOT NULL), `last_impression_at` (timestamp with time zone), `last_response` (text), `last_response_at` (timestamp with time zone), `decline_count` (integer NOT NULL), `suppressed_until` (timestamp with time zone), `completed_at` (timestamp with time zone), `metadata` (jsonb NOT NULL), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 1 |
| `workspace_invites` | `id` (uuid NOT NULL), `workspace_id` (uuid NOT NULL), `email` (text NOT NULL), `role` (text NOT NULL), `can_edit_journey` (boolean NOT NULL), `board_code` (text), `status` (text NOT NULL), `created_by` (uuid), `claimed_by` (uuid), `created_at` (timestamp with time zone NOT NULL), `claimed_at` (timestamp with time zone) | 0 |
| `workspace_members` | `workspace_id` (uuid NOT NULL), `user_id` (uuid NOT NULL), `role` (text NOT NULL), `can_edit_journey` (boolean NOT NULL), `created_at` (timestamp with time zone NOT NULL) | 1 |
| `workspace_state` | `workspace_id` (uuid NOT NULL), `state` (jsonb NOT NULL), `updated_at` (timestamp with time zone NOT NULL) | 2 |
| `workspaces` | `id` (uuid NOT NULL), `name` (text NOT NULL), `use_type` (text NOT NULL), `owner_id` (uuid), `created_at` (timestamp with time zone NOT NULL), `updated_at` (timestamp with time zone NOT NULL), `business_id` (uuid), `data_environment` (text NOT NULL) | 1 |

## Foreign-key relation graph (database-enforced only)

| Source | Destination |
|---|---|
| `audit_log.board_id` | `boards.id` |
| `audit_log.business_id` | `businesses.id` |
| `board_assignments.board_id` | `boards.id` |
| `board_assignments.business_member_id` | `business_members.id` |
| `board_events.board_id` | `boards.id` |
| `board_events.business_id` | `businesses.id` |
| `board_registry.claimed_board_id` | `boards.id` |
| `board_registry.claimed_business_id` | `businesses.id` |
| `boards.business_id` | `businesses.id` |
| `boards.location_id` | `locations.id` |
| `boards.parent_board_id` | `boards.id` |
| `boards.registry_id` | `board_registry.id` |
| `business_growth_baselines.business_id` | `businesses.id` |
| `business_members.business_id` | `businesses.id` |
| `business_performance_snapshots.business_id` | `businesses.id` |
| `cj_agent_dependencies.agent_no` | `cj_agent_registry.agent_no` |
| `cj_agent_dependencies.requires_agent_no` | `cj_agent_registry.agent_no` |
| `cj_agent_job_events.job_id` | `cj_agent_jobs.id` |
| `cj_agent_jobs.agent_no` | `cj_agent_registry.agent_no` |
| `cj_agent_jobs.business_id` | `businesses.id` |
| `cj_agent_jobs.task_id` | `journey_ai_tasks.id` |
| `cj_agent_registry.department_no` | `cj_agent_departments.department_no` |
| `cj_agent_registry.supervisor_agent_no` | `cj_agent_registry.agent_no` |
| `cj_agent_status_history.agent_no` | `cj_agent_registry.agent_no` |
| `cj_agent_tool_permissions.agent_no` | `cj_agent_registry.agent_no` |
| `cj_board_admin_log.board_id` | `cj_board_inventory.id` |
| `cj_board_inventory.replaced_board_id` | `cj_board_inventory.id` |
| `cj_sales_campaign_events.business_id` | `businesses.id` |
| `cj_sales_campaign_events.campaign_id` | `cj_sales_campaigns.id` |
| `cj_sales_campaigns.business_id` | `businesses.id` |
| `cj_sales_verification_evidence.business_id` | `businesses.id` |
| `cj_sales_verification_evidence.campaign_id` | `cj_sales_campaigns.id` |
| `connected_accounts.business_id` | `businesses.id` |
| `creative_assets.board_id` | `boards.id` |
| `creative_assets.business_id` | `businesses.id` |
| `customer_feedback.board_id` | `boards.id` |
| `customer_feedback.business_id` | `businesses.id` |
| `device_push_tokens.workspace_id` | `workspaces.id` |
| `integration_webhook_events.business_id` | `businesses.id` |
| `journey_agent_outputs.business_id` | `businesses.id` |
| `journey_agent_outputs.task_id` | `journey_ai_tasks.id` |
| `journey_ai_recommendations.board_id` | `boards.id` |
| `journey_ai_recommendations.business_id` | `businesses.id` |
| `journey_ai_recommendations.professional_member_id` | `business_members.id` |
| `journey_ai_task_events.business_id` | `businesses.id` |
| `journey_ai_task_events.task_id` | `journey_ai_tasks.id` |
| `journey_ai_tasks.assigned_member_id` | `business_members.id` |
| `journey_ai_tasks.board_id` | `boards.id` |
| `journey_ai_tasks.business_id` | `businesses.id` |
| `journey_automation_rules.business_id` | `businesses.id` |
| `journey_automation_rules.task_id` | `journey_ai_tasks.id` |
| `journey_experiment_variants.experiment_id` | `journey_experiments.id` |
| `journey_experiment_variants.source_journey_id` | `journeys.id` |
| `journey_experiments.board_id` | `boards.id` |
| `journey_experiments.business_id` | `businesses.id` |
| `journey_experiments.winner_variant_id` | `journey_experiment_variants.id` |
| `journey_steps.journey_id` | `journeys.id` |
| `journeys.board_id` | `boards.id` |
| `journeys.business_id` | `businesses.id` |
| `locations.business_id` | `businesses.id` |
| `professional_profiles.business_member_id` | `business_members.id` |
| `seo_opportunities.business_id` | `businesses.id` |
| `subscriptions.board_id` | `boards.id` |
| `subscriptions.business_id` | `businesses.id` |
| `visitor_journey_state.board_id` | `boards.id` |
| `visitor_journey_state.business_id` | `businesses.id` |
| `workspace_invites.workspace_id` | `workspaces.id` |
| `workspace_members.workspace_id` | `workspaces.id` |
| `workspace_state.workspace_id` | `workspaces.id` |
| `workspaces.business_id` | `businesses.id` |

## Public functions (signatures only)

| Function | Arguments | SECURITY DEFINER |
|---|---|---|
| `bootstrap_workspace` | `p_workspace_name text, p_use_type text, p_board_code text, p_board_name text, p_actions jsonb, p_destinations jsonb` | YES — inspect grants and body |
| `cj_admin_board_history` | `p_board_number text` | YES — inspect grants and body |
| `cj_admin_list_boards` | `` | YES — inspect grants and body |
| `cj_admin_reset_board` | `p_board_number text` | YES — inspect grants and body |
| `cj_admin_set_board_status` | `p_board_number text, p_new_status text` | YES — inspect grants and body |
| `cj_agent_authorized` | `p_agent_no integer, p_tool_key text, p_approved boolean DEFAULT false` | YES — inspect grants and body |
| `cj_assign_board_member` | `target_board_id uuid, target_business_member_id uuid, allow_journey_edit boolean DEFAULT false` | No |
| `cj_claim_agent_job` | `p_job_id uuid` | YES — inspect grants and body |
| `cj_claim_board` | `p_activation_code text` | YES — inspect grants and body |
| `cj_claim_board_verified` | `p_board_number text, p_activation_code text` | YES — inspect grants and body |
| `cj_claim_tapped_board` | `p_public_token uuid, p_owner_code text` | YES — inspect grants and body |
| `cj_ensure_my_workspace` | `p_name text DEFAULT NULL::text, p_use_type text DEFAULT 'business'::text` | YES — inspect grants and body |
| `cj_is_platform_admin` | `` | YES — inspect grants and body |
| `cj_list_workspace_published_smartboards` | `p_workspace_id uuid` | YES — inspect grants and body |
| `cj_publish_claimed_board_journey` | `p_board_number text, p_actions jsonb, p_board_name text DEFAULT NULL::text` | YES — inspect grants and body |
| `cj_rename_board` | `target_board_id uuid, next_name text` | No |
| `cj_replace_board_journey` | `target_board_id uuid, journey_name text, steps jsonb` | No |
| `cj_resolve_board` | `p_public_token uuid` | YES — inspect grants and body |
| `cj_set_board_status` | `target_board_id uuid, next_status board_status` | No |
| `cj_set_updated_at` | `` | No |
| `cj_start_journey_ai_trial` | `target_business_id uuid` | No |
| `cj_tap_board_state` | `p_public_token uuid` | YES — inspect grants and body |
| `cj_touch_agent_output_updated_at` | `` | No |
| `cj_touch_journey_ai_memory_updated_at` | `` | No |
| `cj_update_board_destination` | `target_board_id uuid, target_action_type text, next_destination_url text` | No |
| `claim_my_invites` | `` | YES — inspect grants and body |
| `claim_official_board` | `p_public_id text, p_claim_code text, p_business_id uuid, p_board_id uuid` | YES — inspect grants and body |
| `create_workspace_invite` | `p_workspace uuid, p_email text, p_role text, p_can_edit_journey boolean, p_board_code text` | YES — inspect grants and body |
| `handle_new_user` | `` | YES — inspect grants and body |
| `rls_auto_enable` | `` | YES — inspect grants and body |
| `set_updated_at` | `` | No |

## Limitations
- Catalog does not cover private and auth schema internals or provider configuration; those need separate permitted inspection.
- PostgreSQL foreign keys are not the complete application relationship graph; JSONB and code relationships also exist.
- Runtime permission tests are required before software execution authority is approved.
