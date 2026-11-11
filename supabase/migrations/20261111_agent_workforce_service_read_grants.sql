-- M3 Agent Workforce Intelligence: read-only access for trusted Edge runtime.
-- Verified 2026-11-11: service_role SELECT already exists on business_members,
-- cj_agent_registry, cj_agent_jobs, and cj_agent_job_events.
-- The following five metadata/evidence tables did not grant service_role SELECT.
-- No client access, agent execution grants, INSERT/UPDATE/DELETE or RLS changes.
grant select on table
  public.cj_agent_departments,
  public.cj_agent_dependencies,
  public.cj_agent_status_history,
  public.cj_agent_tool_catalog,
  public.cj_agent_tool_permissions
to service_role;
