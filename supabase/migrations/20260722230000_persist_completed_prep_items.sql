-- "Mark as done" on a dish's prep detail was pure in-memory React state —
-- lost on refresh and never visible to any other team member's device. This
-- is a shared kitchen checklist (any team member can mark or see progress),
-- so unlike approved_recommendations (owner-only), both owner and staff can
-- read and write here.

create table if not exists public.completed_prep_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  -- Real dishes use their menu_items.id; accounts still on the demo mock
  -- dataset use one of the fixed mock dish keys.
  item_key text not null,
  completed_at timestamptz not null default now(),
  unique (business_id, item_key)
);

create index if not exists completed_prep_items_business_idx on public.completed_prep_items(business_id);

alter table public.completed_prep_items enable row level security;

drop policy if exists "Bakery team can manage completed prep items" on public.completed_prep_items;
create policy "Bakery team can manage completed prep items"
  on public.completed_prep_items for all
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = completed_prep_items.business_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = completed_prep_items.business_id
      and users.id = auth.uid()
    )
  );
