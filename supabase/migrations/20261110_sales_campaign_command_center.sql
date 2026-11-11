-- Sales command center V1: scoped campaign records, audit trail and verification claims.
-- IMPORTANT: staged migration only. No external operations or checkout changes.
begin;
create table if not exists public.cj_sales_campaigns (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null check (char_length(name) between 3 and 120),
 product_name text not null check (char_length(product_name) between 2 and 160),
 product_url text not null check (char_length(product_url) <= 500 and product_url ~ '^https://'),
 currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
 sale_price_cents integer not null check(sale_price_cents > 0),
 regular_price_cents integer not null check(regular_price_cents >= sale_price_cents),
 order_target integer not null check(order_target between 1 and 100000),
 daily_ad_cap_cents integer not null default 1000 check(daily_ad_cap_cents between 0 and 100000000),
 daily_research_target integer not null default 120 check(daily_research_target between 0 and 100000),
 shipping_policy text not null default 'buyer_pays' check(shipping_policy in ('buyer_pays','seller_pays','calculated')),
 fulfillment_note text not null default 'Carefully assembled and packaged for you' check(char_length(fulfillment_note)<=300),
 delivery_guaranteed boolean not null default false check(delivery_guaranteed = false),
 status text not null default 'draft' check(status in ('draft','approved','paused')),
 created_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint approved_requires_identity check(status <> 'approved' or (approved_by is not null and approved_at is not null))
);
create index if not exists cj_sales_campaigns_business_idx on public.cj_sales_campaigns(business_id,created_at desc);
create table if not exists public.cj_sales_campaign_events (
 id bigint generated always as identity primary key,
 campaign_id uuid not null references public.cj_sales_campaigns(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 actor_user_id uuid references auth.users(id),
 event_type text not null check(event_type in ('CREATED','UPDATED','APPROVED_FOR_PLANNING','PAUSED')),
 detail jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create index if not exists cj_sales_campaign_events_lookup_idx on public.cj_sales_campaign_events(business_id,campaign_id,occurred_at desc);
-- Only the trusted backend can store independently verified evidence later.
create table if not exists public.cj_sales_verification_evidence (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 campaign_id uuid not null references public.cj_sales_campaigns(id) on delete cascade,
 gate_key text not null,
 outcome text not null check (outcome in ('PASS','FAIL')),
 source text not null,
 provider_reference text,
 signature text not null check (signature ~ '^[0-9a-f]{64}$'),
 verified_at timestamptz not null,
 expires_at timestamptz not null check(expires_at > verified_at),
 evidence jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists cj_sales_evidence_scope_idx on public.cj_sales_verification_evidence(business_id,campaign_id,gate_key,verified_at desc);
alter table public.cj_sales_campaigns enable row level security;
alter table public.cj_sales_campaign_events enable row level security;
alter table public.cj_sales_verification_evidence enable row level security;
revoke all on public.cj_sales_campaigns, public.cj_sales_campaign_events, public.cj_sales_verification_evidence from anon, authenticated;
grant select,insert,update on public.cj_sales_campaigns to service_role;
grant select,insert on public.cj_sales_campaign_events, public.cj_sales_verification_evidence to service_role;
grant usage,select on sequence public.cj_sales_campaign_events_id_seq to service_role;
commit;
