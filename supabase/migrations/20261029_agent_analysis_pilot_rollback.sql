-- Manual rollback ONLY if pilot must be disabled.
BEGIN;
UPDATE public.cj_agent_tool_permissions
SET granted=false
WHERE agent_no IN (2,333,336) AND tool_key='ai.analysis'
  AND permission_scope->>'pilot'='journey_ai_registry_v1';
UPDATE public.cj_agent_registry
SET status='PLANNED',updated_at=now()
WHERE agent_no IN (2,333,336) AND status='TESTING';
COMMIT;
