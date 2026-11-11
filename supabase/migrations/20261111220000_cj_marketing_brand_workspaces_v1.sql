-- External-brand marketing workspaces are owner-scoped, not mixed into CreateJourney customer-business metrics.
-- No external publication, no agent registry status changes, no automatic billing.
create table if not exists public.cj_marketing_brand_workspaces (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 brand_name text not null check (char_length(trim(brand_name)) between 2 and 100),
 brand_key text not null check (brand_key ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
 website_url text,
 product_brief jsonb not null default '{}'::jsonb,
 status text not null default 'DRAFT' check (status in ('DRAFT','READY','ARCHIVED')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_user_id,brand_key)
);
create table if not exists public.cj_marketing_squad_runs (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.cj_marketing_brand_workspaces(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
 request text not null check (char_length(request) between 12 and 2000),
 role_receipts jsonb not null default '[]'::jsonb,
 output jsonb not null default '{}'::jsonb,
 error_detail text,
 model text,
 started_at timestamptz,
 finished_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists cj_marketing_runs_owner_workspace_date
 on public.cj_marketing_squad_runs(owner_user_id,workspace_id,created_at desc);
alter table public.cj_marketing_brand_workspaces enable row level security;
alter table public.cj_marketing_squad_runs enable row level security;
revoke all on public.cj_marketing_brand_workspaces from anon, authenticated, public;
revoke all on public.cj_marketing_squad_runs from anon, authenticated, public;
grant select,insert,update on public.cj_marketing_brand_workspaces to service_role;
grant select,insert,update on public.cj_marketing_squad_runs to service_role;
comment on table public.cj_marketing_brand_workspaces is 'Owner-scoped external-brand workspace for the draft-only marketing squad; never join to customer business KPI tables implicitly';
comment on table public.cj_marketing_squad_runs is 'AI draft-only marketing specialist receipts and provenance; no publishing or external claims';
