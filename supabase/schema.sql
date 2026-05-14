create extension if not exists "pgcrypto";

create table if not exists public.bakeries (
  id uuid primary key default gen_random_uuid(),
  bakery_name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'staff')),
  bakery_id uuid references public.bakeries(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_predictions (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  product_name text not null,
  predicted_quantity integer not null check (predicted_quantity >= 0),
  ingredient_estimates jsonb not null default '[]'::jsonb,
  prediction_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  report_date date not null default current_date,
  waste_percentage numeric(5,2) not null default 0,
  money_saved numeric(12,2) not null default 0,
  co2_saved numeric(12,2) not null default 0,
  production_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (bakery_id, report_date)
);

create index if not exists bakeries_invite_code_idx on public.bakeries(invite_code);
create index if not exists users_bakery_id_idx on public.users(bakery_id);
create index if not exists daily_predictions_bakery_date_idx on public.daily_predictions(bakery_id, prediction_date);
create index if not exists daily_reports_bakery_date_idx on public.daily_reports(bakery_id, report_date);

alter table public.bakeries enable row level security;
alter table public.users enable row level security;
alter table public.daily_predictions enable row level security;
alter table public.daily_reports enable row level security;

create policy "Bakery team can read bakery"
  on public.bakeries for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.users
      where users.bakery_id = bakeries.id
      and users.id = auth.uid()
    )
  );

create policy "Signed in users can join by invite code"
  on public.bakeries for select
  using (auth.uid() is not null);

create policy "Owners can create bakery"
  on public.bakeries for insert
  with check (owner_id = auth.uid());

create policy "Users can read own profile"
  on public.users for select
  using (id = auth.uid());

create policy "Users can create own profile"
  on public.users for insert
  with check (id = auth.uid());

create policy "Bakery team can read predictions"
  on public.daily_predictions for select
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_predictions.bakery_id
      and users.id = auth.uid()
    )
  );

create policy "Owners can manage predictions"
  on public.daily_predictions for all
  using (
    exists (
      select 1 from public.bakeries
      where bakeries.id = daily_predictions.bakery_id
      and bakeries.owner_id = auth.uid()
    )
  );

create policy "Bakery team can read reports"
  on public.daily_reports for select
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_reports.bakery_id
      and users.id = auth.uid()
    )
  );

create policy "Bakery team can create reports"
  on public.daily_reports for insert
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_reports.bakery_id
      and users.id = auth.uid()
    )
  );
