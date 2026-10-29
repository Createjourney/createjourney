-- CreateJourney Journey AI registry pilot: analysis only, no external action tools.
-- Reversible, idempotent, and restricted to three explicitly selected agents.
BEGIN;
UPDATE public.cj_agent_registry
SET status='TESTING',updated_at=now()
WHERE agent_no IN (2,333,336) AND status='PLANNED';

INSERT INTO public.cj_agent_tool_permissions
(agent_no,tool_key,granted,approval_required,permission_scope)
SELECT agent_no,'ai.analysis',true,false,
       '{"execution_mode":"analysis_only","pilot":"journey_ai_registry_v1"}'::jsonb
FROM public.cj_agent_registry
WHERE agent_no IN (2,333,336) AND status='TESTING'
ON CONFLICT (agent_no,tool_key) DO UPDATE
SET granted=true,approval_required=false,
    permission_scope=EXCLUDED.permission_scope;
COMMIT;
