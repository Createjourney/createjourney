-- Minimal fixture for isolated E2E only. NOT a production schema migration.
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 name text not null default 'Isolated CI Business'
);
create table public.business_members (
 business_id uuid not null references public.businesses(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','manager','employee')),
 is_active boolean not null default true,
 primary key(business_id,user_id)
);
create table public.cj_agent_registry (
 agent_no integer primary key,
 agent_name text not null,
 status text not null
);
create table public.connected_accounts (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 provider text not null,
 connection_type text,
 status text not null,
 external_account_id text,
 external_account_name text,
 scopes jsonb not null default '[]'::jsonb,
 metadata jsonb not null default '{}'::jsonb,
 oauth_state text,
 connected_by uuid references auth.users(id),
 connected_at timestamptz,
 token_expires_at timestamptz,
 last_synced_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now(),
 capabilities jsonb not null default '{}'::jsonb,
 unique(business_id,provider)
);
create table public.cj_agent_jobs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 agent_no integer not null,
 status text not null,
 output jsonb not null default '{}'::jsonb,
 finished_at timestamptz,
 created_at timestamptz not null default now()
);
grant select,insert,update on public.businesses,public.business_members,
 public.cj_agent_registry,public.connected_accounts,public.cj_agent_jobs to service_role;
