-- Staff need to write real per-dish numbers from the Check tab so the AI
-- recommendation engine gets real per-dish sales history even for a business
-- that never does a CSV import — previously only owners (via CSV import,
-- 20260713170000_owner_onboarding.sql) could write to daily_operations;
-- staff could only read it (20260722210000_staff_can_read_menu_and_operations.sql).
-- Bakery-team pattern matches leftover_scans/completed_prep_items/events —
-- this is additive (RLS policies are OR'd), the existing owner-only policy
-- is untouched.
drop policy if exists "Bakery team can write daily operations" on public.daily_operations;
create policy "Bakery team can write daily operations"
  on public.daily_operations for all
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_operations.business_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = daily_operations.business_id
      and users.id = auth.uid()
    )
  );
