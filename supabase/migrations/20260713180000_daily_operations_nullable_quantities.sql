-- Real-world files rarely have prepared/sold/leftover all at once — a POS
-- export usually only has sold_quantity, a manual kitchen log usually only
-- has prepared/leftover. Requiring all three NOT NULL rejected the most
-- common real file an owner would actually upload (a plain POS sales export).

alter table public.daily_operations
  alter column prepared_quantity drop not null,
  alter column sold_quantity drop not null,
  alter column leftover_quantity drop not null;
