-- Journey AI Platform Knowledge Registry V1 (Milestone 2)
-- Additive, global technical metadata only. No customer/business records.
-- Staging changes DO NOT promote capabilities into verified production knowledge.
create table if not exists public.cj_platform_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('development','staging','production')),
  source_commit text not null check (source_commit ~ '^[a-f0-9]{40}$'),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  schema_version integer not null default 1 check (schema_version = 1),
  state text not null default 'STAGED' check (state in ('STAGED','VERIFIED','REJECTED','RETIRED')),
  source_created_at timestamptz not null default now(),
  verified_at timestamptz,
  verification_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(verification_evidence)='object'),
  created_at timestamptz not null default now(),
  unique(environment,source_commit,artifact_sha256),
  check (state <> 'VERIFIED' or (verified_at is not null and verification_evidence ? 'release_verification_id'))
);
create table if not exists public.cj_platform_knowledge_nodes (
  version_id uuid not null references public.cj_platform_knowledge_versions(id),
  node_key text not null check (length(node_key) between 3 and 160 and node_key ~ '^[a-z0-9:_./-]+$'),
  node_kind text not null check (node_kind in ('page','feature','interaction','workflow','integration','agent_capability','backend_operation','permission')),
  name text not null check (length(name) between 1 and 240),
  description text not null default '',
  source_path text,
  source_line integer check (source_line is null or source_line > 0),
  selector text,
  navigation_target text,
  required_roles text[] not null default '{}',
  capability_status text not null default 'IMPLEMENTED_UNVERIFIED'
    check (capability_status in ('VERIFIED_OPERATIONAL','IMPLEMENTED_UNVERIFIED','PARTIALLY_IMPLEMENTED','PLANNED','BROKEN','DISABLED')),
  verification_status text not null default 'UNVERIFIED'
    check (verification_status in ('UNVERIFIED','PASSED','FAILED','BLOCKED')),
  verified_at timestamptz,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  primary key(version_id,node_key),
  check (capability_status <> 'VERIFIED_OPERATIONAL' or (verification_status='PASSED' and verified_at is not null and evidence ? 'test_run_id'))
);
create index if not exists cj_platform_nodes_kind_idx on public.cj_platform_knowledge_nodes(version_id,node_kind,capability_status);
create table if not exists public.cj_platform_knowledge_edges (
  version_id uuid not null,
  from_node_key text not null,
  to_node_key text not null,
  relation_type text not null check (relation_type in ('contains','navigates_to','invokes','depends_on','requires_permission','supported_by','uses_integration','uses_agent','produces','related_to')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  created_at timestamptz not null default now(),
  primary key(version_id,from_node_key,to_node_key,relation_type),
  foreign key(version_id,from_node_key) references public.cj_platform_knowledge_nodes(version_id,node_key),
  foreign key(version_id,to_node_key) references public.cj_platform_knowledge_nodes(version_id,node_key)
);
create index if not exists cj_platform_edges_target_idx on public.cj_platform_knowledge_edges(version_id,to_node_key);
create table if not exists public.cj_platform_knowledge_verifications (
  id bigint generated always as identity primary key,
  version_id uuid not null,
  node_key text not null,
  test_type text not null check (length(test_type) between 2 and 90),
  outcome text not null check (outcome in ('PASSED','FAILED','BLOCKED')),
  evidence_reference text not null check (length(evidence_reference) between 3 and 500),
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  foreign key(version_id,node_key) references public.cj_platform_knowledge_nodes(version_id,node_key)
);
create index if not exists cj_platform_verifications_node_idx on public.cj_platform_knowledge_verifications(version_id,node_key,observed_at desc);

-- Deny client-side Data API access even when defaults grant public schema privileges.
alter table public.cj_platform_knowledge_versions enable row level security;
alter table public.cj_platform_knowledge_nodes enable row level security;
alter table public.cj_platform_knowledge_edges enable row level security;
alter table public.cj_platform_knowledge_verifications enable row level security;
revoke all on public.cj_platform_knowledge_versions,public.cj_platform_knowledge_nodes,public.cj_platform_knowledge_edges,public.cj_platform_knowledge_verifications from public,anon,authenticated;
grant select,insert,update on public.cj_platform_knowledge_versions,public.cj_platform_knowledge_nodes,public.cj_platform_knowledge_edges,public.cj_platform_knowledge_verifications to service_role;
-- No direct client policies: authenticated read access is through a server-verified response only.
-- No DELETE grants; history remains append-only under routine application permissions.
grant usage,select on sequence public.cj_platform_knowledge_verifications_id_seq to service_role;
