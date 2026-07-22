-- The "approved by manager" state (and the prep quantity a manager accepted/
-- modified) previously only lived in the owner's browser localStorage, so it
-- never reached staff on a different device. Persisting it here lets any
-- team member's session read the same approval state, same pattern as the
-- menu_items/daily_operations team-read fix.

create table if not exists public.approved_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  -- Real dishes use their menu_items.id; accounts still on the demo mock
  -- dataset use one of the fixed mock dish keys — so this stays free text
  -- rather than a foreign key into menu_items.
  item_key text not null,
  prep_quantity numeric not null check (prep_quantity >= 0),
  status text not null check (status in ('accepted', 'modified')),
  updated_at timestamptz not null default now(),
  unique (business_id, item_key)
);

create index if not exists approved_recommendations_business_idx on public.approved_recommendations(business_id);

alter table public.approved_recommendations enable row level security;

drop policy if exists "Owners can manage own approved recommendations" on public.approved_recommendations;
create policy "Owners can manage own approved recommendations"
  on public.approved_recommendations for all
  using (
    exists (
      select 1 from public.bakeries
      where bakeries.id = approved_recommendations.business_id
      and bakeries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bakeries
      where bakeries.id = approved_recommendations.business_id
      and bakeries.owner_id = auth.uid()
    )
  );

drop policy if exists "Bakery team can read approved recommendations" on public.approved_recommendations;
create policy "Bakery team can read approved recommendations"
  on public.approved_recommendations for select
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = approved_recommendations.business_id
      and users.id = auth.uid()
    )
  );
