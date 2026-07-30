-- waste_percentage is capped at numeric(5,2) (max 999.99), which is the
-- actual column that overflowed in production: the client-side waste_percent
-- calculation wasn't clamped, so a leftover count exceeding what was marked
-- as baked (e.g. an AI photo-scan estimate filled in while "Actual Baked"
-- was still 0) could compute well over 100%. The calculation is now clamped
-- to [0, 100] client-side, but this widens the column too as a safety net
-- against any future unclamped write, same as money_saved/co2_saved.
alter table public.daily_reports
  alter column waste_percentage type numeric(12,2);
