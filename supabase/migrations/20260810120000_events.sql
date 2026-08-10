-- Events: discrete buffet/banquet occasions (weddings, conferences), separate
-- from the one-row-per-day daily_reports flow — a hotel can run more than
-- one event on the same date, which daily_reports' unique(bakery_id,
-- report_date) can't represent. Bakery-team RLS (business_id direct column,
-- single `for all` policy) matches leftover_scans/completed_prep_items, not
-- menu_items' owner-only write policy — staff must be able to close an event.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  event_date date not null,
  expected_guests integer check (expected_guests is null or expected_guests >= 0),
  status text not null default 'planned' check (status in ('planned', 'closed')),
  total_prepared numeric(12,2),
  total_leftover numeric(12,2),
  waste_percent numeric(12,2),
  money_value_wasted numeric(12,2),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists events_business_date_idx on public.events(business_id, event_date);

create table if not exists public.event_menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- Denormalized: RLS below is evaluated per-row on this table directly, not
  -- via a join through events, so this column is structurally required.
  business_id uuid not null references public.bakeries(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  -- Snapshotted from menu_items at event-creation time — later price edits
  -- or dish deletion must not corrupt this event's historical financials.
  name text not null,
  unit text,
  unit_cost numeric,
  planned_quantity numeric(12,2) not null default 0 check (planned_quantity >= 0),
  actual_prepared numeric(12,2) check (actual_prepared is null or actual_prepared >= 0),
  leftover numeric(12,2) check (leftover is null or leftover >= 0),
  photo_url text,
  ai_predicted_quantity numeric(12,2),
  unique (event_id, menu_item_id)
);

create index if not exists event_menu_items_event_idx on public.event_menu_items(event_id);
create index if not exists event_menu_items_business_idx on public.event_menu_items(business_id);

alter table public.events enable row level security;
alter table public.event_menu_items enable row level security;

drop policy if exists "Bakery team can manage events" on public.events;
create policy "Bakery team can manage events"
  on public.events for all
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = events.business_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = events.business_id
      and users.id = auth.uid()
    )
  );

drop policy if exists "Bakery team can manage event menu items" on public.event_menu_items;
create policy "Bakery team can manage event menu items"
  on public.event_menu_items for all
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = event_menu_items.business_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = event_menu_items.business_id
      and users.id = auth.uid()
    )
  );

-- Event photos reuse the existing leftover-photos bucket as-is — its RLS
-- (see 20260723120000_leftover_scanner.sql) only inspects the first path
-- segment, so no storage migration is needed. Path convention:
-- leftover-photos/{business_id}/events/{event_id}/{menu_item_id}-{timestamp}.{ext}
