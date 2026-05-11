-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 — Operations mirror tables for offline-first Dexie ↔ Supabase sync.
-- Mirrors the operations entities defined in src/types/operations.ts so the
-- client sync engine (src/lib/sync.ts) can upsert into snake_case tables.
--
-- Notes:
--   - We intentionally do NOT add foreign-key constraints between operations
--     tables. The sync queue flushes rows in insertion order, but related
--     rows may have been written out-of-order on the client (e.g. a delivery
--     written before its order finished syncing). The client enforces
--     referential integrity through Dexie; the server keeps loose relations.
--   - RLS follows the existing pattern (authenticated full access). Tighten
--     per-role once role-based access lands.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key,
  name text not null,
  sku text not null,
  unit_price numeric(14,2) not null default 0,
  low_stock_threshold integer not null default 0,
  color_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_sku_idx on public.products(sku);

-- ── Inventory batches ───────────────────────────────────────────────────────
create table if not exists public.inventory_batches (
  id uuid primary key,
  product_id uuid not null,
  batch_code text not null,
  initial_quantity integer not null default 0,
  quantity integer not null default 0,
  production_date date not null,
  expiry_date date not null,
  qc_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inventory_batches_product_idx on public.inventory_batches(product_id);
create index if not exists inventory_batches_expiry_idx  on public.inventory_batches(expiry_date);

-- ── Raw materials ───────────────────────────────────────────────────────────
create table if not exists public.raw_materials (
  id uuid primary key,
  name text not null,
  unit text not null,
  quantity numeric(14,3) not null default 0,
  low_stock_threshold numeric(14,3) not null default 0,
  cost_per_unit numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key,
  order_code text not null,
  retailer_id uuid not null,
  retailer_name text not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_retailer_idx on public.orders(retailer_id);
create index if not exists orders_status_idx   on public.orders(status);

-- ── Deliveries ──────────────────────────────────────────────────────────────
create table if not exists public.deliveries (
  id uuid primary key,
  order_id uuid not null,
  order_code text not null,
  retailer_name text not null,
  driver_id uuid not null,
  driver_name text not null,
  vehicle text,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled',
  -- proof_image is a base64 data URL today; consider moving to Storage later.
  proof_image text,
  proof_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deliveries_order_idx  on public.deliveries(order_id);
create index if not exists deliveries_driver_idx on public.deliveries(driver_id);

-- ── Drivers ─────────────────────────────────────────────────────────────────
create table if not exists public.drivers (
  id uuid primary key,
  name text not null,
  phone text not null,
  vehicle text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Production batches ──────────────────────────────────────────────────────
create table if not exists public.production_batches (
  id uuid primary key,
  batch_code text not null,
  product_id uuid not null,
  product_name text not null,
  raw_used jsonb not null default '[]'::jsonb,
  output_quantity integer not null default 0,
  waste_quantity integer not null default 0,
  production_date date not null,
  expiry_date date not null,
  operator text not null,
  inventory_batch_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

-- ── QC records ──────────────────────────────────────────────────────────────
create table if not exists public.qc_records (
  id uuid primary key,
  inventory_batch_id uuid not null,
  batch_code text not null,
  product_name text not null,
  status text not null,
  inspector text not null,
  criteria jsonb not null default '{}'::jsonb,
  notes text,
  inspected_at timestamptz not null
);
create index if not exists qc_records_batch_idx on public.qc_records(inventory_batch_id);

-- ── Finance entries ─────────────────────────────────────────────────────────
create table if not exists public.finance_entries (
  id uuid primary key,
  type text not null,
  amount numeric(14,2) not null,
  description text not null,
  category text,
  order_id uuid,
  recorded_by text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists finance_entries_occurred_idx on public.finance_entries(occurred_at);

-- ── Customer credits ────────────────────────────────────────────────────────
create table if not exists public.customer_credits (
  retailer_id uuid primary key,
  balance numeric(14,2) not null default 0,
  total_purchased numeric(14,2) not null default 0,
  total_paid numeric(14,2) not null default 0,
  last_order_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Employees ───────────────────────────────────────────────────────────────
create table if not exists public.employees (
  id uuid primary key,
  full_name text not null,
  role text not null,
  department text not null,
  phone text,
  email text,
  base_salary numeric(14,2) not null default 0,
  pay_frequency text not null default 'monthly',
  bank_name text,
  bank_account text,
  hire_date date not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Payroll runs ────────────────────────────────────────────────────────────
create table if not exists public.payroll_runs (
  id uuid primary key,
  run_code text not null,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  status text not null default 'draft',
  entries jsonb not null default '[]'::jsonb,
  total_gross numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  notes text,
  prepared_by text not null,
  approved_by text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── updated_at triggers ─────────────────────────────────────────────────────
-- handle_updated_at() is already defined by schema.sql for the retailer tables.
-- Reuse it for every table that has an updated_at column.
do $$
declare t text;
begin
  for t in select unnest(array[
    'products',
    'inventory_batches',
    'raw_materials',
    'orders',
    'deliveries',
    'customer_credits',
    'employees',
    'payroll_runs'
  ]) loop
    execute format(
      'drop trigger if exists %I_updated_at on public.%I;', t, t
    );
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute procedure public.handle_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.products           enable row level security;
alter table public.inventory_batches  enable row level security;
alter table public.raw_materials      enable row level security;
alter table public.orders             enable row level security;
alter table public.deliveries         enable row level security;
alter table public.drivers            enable row level security;
alter table public.production_batches enable row level security;
alter table public.qc_records         enable row level security;
alter table public.finance_entries    enable row level security;
alter table public.customer_credits   enable row level security;
alter table public.employees          enable row level security;
alter table public.payroll_runs       enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'products', 'inventory_batches', 'raw_materials', 'orders', 'deliveries',
    'drivers', 'production_batches', 'qc_records', 'finance_entries',
    'customer_credits', 'employees', 'payroll_runs'
  ]) loop
    execute format(
      'drop policy if exists "authenticated full access - %s" on public.%I;',
      t, t
    );
    execute format(
      'create policy "authenticated full access - %s" on public.%I
         for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;
