-- Track which outreach channels (whatsapp, sms, call, email, in_person) are
-- actively in use with a retailer. Lets the app filter / show channel chips
-- without aggregating retailer_outreach_logs each time.

alter table public.retailers
  add column if not exists active_channels text[] not null default '{}';

create index if not exists retailers_active_channels_idx
  on public.retailers using gin (active_channels);
