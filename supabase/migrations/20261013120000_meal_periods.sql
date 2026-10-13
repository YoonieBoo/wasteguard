-- Breakfast / Dinner meal periods for the Check tab. Real hotels run
-- distinct breakfast and dinner buffets with different menus and closing
-- times; today a second same-day submission (e.g. Dinner after Breakfast)
-- silently overwrites the first via the date-only unique constraints below.

-- menu_items: which meal period(s) a dish is served during.
alter table public.menu_items
  add column if not exists meal_period text not null default 'both'
    check (meal_period in ('breakfast', 'dinner', 'both'));

-- daily_operations: the period a specific Check-tab submission belongs to.
-- Widen the per-dish-per-day uniqueness to include it so Breakfast and
-- Dinner rows for the same dish+date coexist instead of colliding.
-- 'unspecified' covers rows written before this migration, and CSV-imported
-- historical rows, which have no real period breakdown — distinct from
-- menu_items.meal_period's 'both', which is a dish-eligibility tag, not a
-- submission-period value.
alter table public.daily_operations
  add column if not exists meal_period text not null default 'unspecified'
    check (meal_period in ('breakfast', 'dinner', 'unspecified'));

alter table public.daily_operations
  drop constraint if exists daily_operations_business_id_menu_item_id_date_key;
alter table public.daily_operations
  add constraint daily_operations_business_id_menu_item_id_date_meal_period_key
  unique (business_id, menu_item_id, date, meal_period);

-- leftover_scans: same per-dish-per-day collision risk for the AI-scan audit
-- trail, same treatment.
alter table public.leftover_scans
  add column if not exists meal_period text not null default 'unspecified'
    check (meal_period in ('breakfast', 'dinner', 'unspecified'));

alter table public.leftover_scans
  drop constraint if exists leftover_scans_business_id_item_key_date_key;
alter table public.leftover_scans
  add constraint leftover_scans_business_id_item_key_date_meal_period_key
  unique (business_id, item_key, date, meal_period);
