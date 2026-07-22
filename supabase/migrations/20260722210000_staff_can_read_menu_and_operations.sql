-- menu_items and daily_operations only ever had owner-only "for all" policies
-- (write access), unlike daily_reports which correctly has a separate
-- "whole bakery team can read" policy. That meant staff logins got zero rows
-- back from menu_items/daily_operations (RLS silently filters, no error),
-- so the staff dashboard always fell back to the demo mock dishes even for
-- a business with a real imported menu.

drop policy if exists "Bakery team can read menu items" on public.menu_items;
create policy "Bakery team can read menu items"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = menu_items.business_id
      and users.id = auth.uid()
    )
  );

drop policy if exists "Bakery team can read daily operations" on public.daily_operations;
create policy "Bakery team can read daily operations"
  on public.daily_operations for select
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_operations.business_id
      and users.id = auth.uid()
    )
  );
