-- Camera-based leftover scanner: AI predicts leftover quantity from a closing
-- photo, staff confirms/edits before it saves. A one-time "reference photo"
-- per dish (a full tray) gives the AI a baseline to compare the closing
-- photo against.

alter table public.menu_items
  add column if not exists reference_photo_url text;

-- Audit trail of each closing-time scan: what the AI predicted vs what staff
-- actually confirmed, so accuracy can be reviewed/improved over time. Shared
-- kitchen data (like completed_prep_items) — any team member can write here,
-- not just the owner.
create table if not exists public.leftover_scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.bakeries(id) on delete cascade,
  -- Real dishes use their menu_items.id; accounts still on the demo mock
  -- dataset use one of the fixed mock dish keys.
  item_key text not null,
  date date not null,
  photo_url text,
  ai_predicted_quantity numeric,
  ai_predicted_unit text,
  confirmed_quantity numeric,
  created_at timestamptz not null default now(),
  unique (business_id, item_key, date)
);

create index if not exists leftover_scans_business_date_idx on public.leftover_scans(business_id, date);

alter table public.leftover_scans enable row level security;

drop policy if exists "Bakery team can manage leftover scans" on public.leftover_scans;
create policy "Bakery team can manage leftover scans"
  on public.leftover_scans for all
  using (
    exists (
      select 1 from public.users
      where users.bakery_id = leftover_scans.business_id
      and users.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.bakery_id = leftover_scans.business_id
      and users.id = auth.uid()
    )
  );

-- Public-read bucket (food tray photos aren't sensitive) — write access is
-- scoped to any member of the owning business, since staff take these photos
-- during closing (unlike menu-photos, which is owner-only).
-- Path convention: leftover-photos/{business_id}/{item_key}-{date}.{ext}
-- Reference photos: leftover-photos/{business_id}/reference/{item_key}.{ext}
insert into storage.buckets (id, name, public)
values ('leftover-photos', 'leftover-photos', true)
on conflict (id) do nothing;

drop policy if exists "Leftover photos are publicly readable" on storage.objects;
create policy "Leftover photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'leftover-photos');

drop policy if exists "Bakery team can upload leftover photos" on storage.objects;
create policy "Bakery team can upload leftover photos"
  on storage.objects for insert
  with check (
    bucket_id = 'leftover-photos'
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.bakery_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Bakery team can update leftover photos" on storage.objects;
create policy "Bakery team can update leftover photos"
  on storage.objects for update
  using (
    bucket_id = 'leftover-photos'
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.bakery_id::text = (storage.foldername(name))[1]
    )
  );
