-- money_saved and co2_saved predate the migration history and were left at
-- their original narrow precision (numeric(5,2), max 999.99) while revenue
-- was widened to numeric(12,2) in 20260523170000. At real hotel-scale daily
-- volumes, money_saved = (food_sold - leftover) * 12 easily exceeds 999.99,
-- causing every staff Check-tab save to fail silently with a numeric field
-- overflow while the UI still shows "Today's Production Saved".
alter table public.daily_reports
  alter column money_saved type numeric(12,2),
  alter column co2_saved type numeric(12,2);
