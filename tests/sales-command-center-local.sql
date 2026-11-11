-- Local-only schema security smoke checks. Run against ephemeral Supabase CLI Postgres.
-- Do not execute on the production database.
begin;
DO $$
DECLARE
  required text;
  s boolean;
  n integer;
BEGIN
  FOREACH required IN ARRAY ARRAY['cj_sales_campaigns','cj_sales_campaign_events','cj_sales_verification_evidence']
  LOOP
    SELECT c.relrowsecurity INTO s FROM pg_class c
      JOIN pg_namespace ns ON ns.oid=c.relnamespace
      WHERE ns.nspname='public' AND c.relname=required AND c.relkind='r';
    IF s IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS is not enabled for %', required; END IF;
    IF has_table_privilege('anon','public.' || required,'SELECT') OR
       has_table_privilege('authenticated','public.' || required,'SELECT') OR
       has_table_privilege('anon','public.' || required,'INSERT') OR
       has_table_privilege('authenticated','public.' || required,'INSERT') THEN
       RAISE EXCEPTION 'Unintended client privileges found on %',required;
    END IF;
    IF NOT has_table_privilege('service_role','public.' || required,'SELECT') THEN
       RAISE EXCEPTION 'Service role cannot read %',required;
    END IF;
  END LOOP;
  SELECT COUNT(*) INTO n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='cj_sales_verification_evidence'
   AND column_name='signature' AND data_type='text';
  IF n<>1 THEN RAISE EXCEPTION 'Signature column missing'; END IF;
  SELECT COUNT(*) INTO n FROM pg_policies
   WHERE schemaname='public' AND tablename IN
    ('cj_sales_campaigns','cj_sales_campaign_events','cj_sales_verification_evidence');
  IF n>0 THEN RAISE EXCEPTION 'Client-facing policies added unexpectedly'; END IF;
END $$;
-- Verify actual DB constraints by attempting malicious inserts under a rolled-back savepoint.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cj_sales_campaigns
      (business_id,name,product_name,product_url,sale_price_cents,regular_price_cents,
       order_target,daily_ad_cap_cents,created_by,delivery_guaranteed)
    VALUES (gen_random_uuid(),'Trial','Frame','https://example.com',29900,34000,100,1000,gen_random_uuid(),true);
    RAISE EXCEPTION 'Delivery guarantee should never be accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Test encountered FK before verifying delivery check';
  END;
END $$;
rollback;
