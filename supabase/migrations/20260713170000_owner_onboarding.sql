-- Owner/manager onboarding: extend bakeries with business profile fields,
-- add historical-data import tables (menu_items, daily_operations, data_imports).

-- The base schema only ever granted INSERT on users (no UPDATE), but
-- ensureOwnerOrStaffProfile() upserts this row on every login — add the
-- missing policy so the update branch of that upsert doesn't get blocked by RLS.
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Same gap on bakeries: only SELECT and INSERT policies existed, so every
-- update (business details, "start manually", marking onboarding complete)
-- was silently matching zero rows instead of erroring.
drop policy if exists "Owners can update own bakery" on public.bakeries;
create policy "Owners can update own bakery"
  on public.bakeries for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.bakeries
  add column if not exists business_type text,
  add column if not exists number_of_branches integer,
  add column if not exists operating_hours text,
  add column if not exists number_of_staff integer,
  add column if not exists seating_capacity integer,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bakeries_owner_id_key'
  ) then
    alter table public.bakeries add constraint bakeries_owner_id_key unique (owner_id);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bakeries_set_updated_at on public.bakeries;
create trigger bakeries_set_updated_at
  before update on public.bakeries
  for each row
  execute function public.set_updated_at();

-- Menu items -----------------------------------------------------------

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  category text,
  unit text,
  unit_cost numeric,
  selling_price numeric,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists menu_items_business_id_idx on public.menu_items(business_id);

alter table public.menu_items enable row level security;

drop policy if exists "Owners can manage own menu items" on public.menu_items;
create policy "Owners can manage own menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.bakeries
      where bakeries.id = menu_items.business_id
      and bakeries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bakeries
      where bakeries.id = menu_items.business_id
      and bakeries.owner_id = auth.uid()
    )
  );

-- Daily operations (per menu item, per day) -----------------------------

create table if not exists public.daily_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  date date not null,
  prepared_quantity numeric not null check (prepared_quantity >= 0),
  sold_quantity numeric not null check (sold_quantity >= 0),
  leftover_quantity numeric not null check (leftover_quantity >= 0),
  waste_quantity numeric,
  created_at timestamptz not null default now(),
  unique (business_id, menu_item_id, date)
);

create index if not exists daily_operations_business_date_idx on public.daily_operations(business_id, date);

alter table public.daily_operations enable row level security;

drop policy if exists "Owners can manage own daily operations" on public.daily_operations;
create policy "Owners can manage own daily operations"
  on public.daily_operations for all
  using (
    exists (
      select 1 from public.bakeries
      where bakeries.id = daily_operations.business_id
      and bakeries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bakeries
      where bakeries.id = daily_operations.business_id
      and bakeries.owner_id = auth.uid()
    )
  );

-- Data imports (audit trail for onboarding uploads) ----------------------

create table if not exists public.data_imports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  status text not null default 'completed',
  imported_at timestamptz not null default now()
);

create index if not exists data_imports_business_id_idx on public.data_imports(business_id);

alter table public.data_imports enable row level security;

drop policy if exists "Owners can manage own data imports" on public.data_imports;
create policy "Owners can manage own data imports"
  on public.data_imports for all
  using (
    exists (
      select 1 from public.bakeries
      where bakeries.id = data_imports.business_id
      and bakeries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bakeries
      where bakeries.id = data_imports.business_id
      and bakeries.owner_id = auth.uid()
    )
  );
