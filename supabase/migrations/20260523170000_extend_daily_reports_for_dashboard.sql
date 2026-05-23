alter table public.daily_reports
  add column if not exists orders integer not null default 0 check (orders >= 0),
  add column if not exists food_prepared integer not null default 0 check (food_prepared >= 0),
  add column if not exists food_sold integer not null default 0 check (food_sold >= 0),
  add column if not exists leftover integer not null default 0 check (leftover >= 0),
  add column if not exists revenue numeric(12,2) not null default 0,
  add column if not exists weather text not null default 'sunny',
  add column if not exists is_weekend integer not null default 0 check (is_weekend in (0, 1)),
  add column if not exists promotion integer not null default 0 check (promotion in (0, 1));

drop policy if exists "Bakery team can update reports" on public.daily_reports;

create policy "Bakery team can update reports"
  on public.daily_reports for update
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_reports.bakery_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_reports.bakery_id
      and users.id = auth.uid()
    )
  );
