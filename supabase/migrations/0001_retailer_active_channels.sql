-- Active-channels columns for retailers.
--
-- The retailer finder edge function now returns ranked phones/emails plus a
-- freshness signal (lastUpdatedAt) for each lead. These columns let the CRM
-- persist the full ranked lists rather than just the top phone/email.
--
-- Idempotent: safe to run multiple times.

alter table public.retailers add column if not exists phones          text[] default '{}'::text[];
alter table public.retailers add column if not exists emails          text[] default '{}'::text[];
alter table public.retailers add column if not exists last_updated_at timestamptz;
