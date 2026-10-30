-- Repair #2: runtime service_role needs least-privilege DML on agent pilot tables.
-- Verified 2026-10-30: runtime HTTP 500 / PostgreSQL 42501 on cj_agent_registry.
-- Keep RLS enabled and do NOT grant access to anon or authenticated.
BEGIN;
GRANT SELECT ON TABLE public.cj_agent_registry TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cj_agent_jobs TO service_role;
GRANT SELECT, INSERT ON TABLE public.cj_agent_job_events TO service_role;
COMMIT;
