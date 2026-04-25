-- ─── Retailers ────────────────────────────────────────────────────────────────
create table if not exists public.retailers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  category text not null,
  area text not null,
  address text,
  phone text,
  email text,
  website text,
  social_links jsonb default '[]'::jsonb,
  maps_url text,
  lead_score int default 0 check (lead_score >= 0 and lead_score <= 100),
  score_reason text,
  suggested_pitch text,
  recommended_next_step text,
  source text,
  status text default 'not_contacted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Retailer Contacts ────────────────────────────────────────────────────────
create table if not exists public.retailer_contacts (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid references public.retailers(id) on delete cascade,
  contact_name text,
  role text,
  phone text,
  email text,
  whatsapp text,
  created_at timestamptz default now()
);

-- ─── Retailer Notes ───────────────────────────────────────────────────────────
create table if not exists public.retailer_notes (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid references public.retailers(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz default now()
);

-- ─── Retailer Outreach Logs ───────────────────────────────────────────────────
create table if not exists public.retailer_outreach_logs (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid references public.retailers(id) on delete cascade,
  channel text not null,
  message text,
  outcome text,
  contacted_at timestamptz default now()
);

-- ─── Retailer Follow-ups ──────────────────────────────────────────────────────
create table if not exists public.retailer_followups (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid references public.retailers(id) on delete cascade,
  followup_date date not null,
  followup_reason text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create unique index if not exists retailers_unique_name_area
  on public.retailers (lower(business_name), lower(area));

create index if not exists retailers_area_idx       on public.retailers(area);
create index if not exists retailers_category_idx   on public.retailers(category);
create index if not exists retailers_status_idx     on public.retailers(status);
create index if not exists retailers_lead_score_idx on public.retailers(lead_score);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists retailers_updated_at on public.retailers;
create trigger retailers_updated_at
  before update on public.retailers
  for each row execute procedure public.handle_updated_at();

-- ─── RLS (enable then lock down per user) ─────────────────────────────────────
alter table public.retailers              enable row level security;
alter table public.retailer_contacts      enable row level security;
alter table public.retailer_notes         enable row level security;
alter table public.retailer_outreach_logs enable row level security;
alter table public.retailer_followups     enable row level security;

-- Allow all operations for authenticated users (tighten per team as needed)
create policy "authenticated full access - retailers"
  on public.retailers for all to authenticated using (true) with check (true);

create policy "authenticated full access - contacts"
  on public.retailer_contacts for all to authenticated using (true) with check (true);

create policy "authenticated full access - notes"
  on public.retailer_notes for all to authenticated using (true) with check (true);

create policy "authenticated full access - logs"
  on public.retailer_outreach_logs for all to authenticated using (true) with check (true);

create policy "authenticated full access - followups"
  on public.retailer_followups for all to authenticated using (true) with check (true);
