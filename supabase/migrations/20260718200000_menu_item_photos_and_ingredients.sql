-- Menu tab: per-dish photo + ingredient recipe (name/quantity-per-portion/unit),
-- plus the storage bucket + RLS for owners to upload dish photos.

alter table public.menu_items
  add column if not exists image_url text,
  add column if not exists ingredients jsonb not null default '[]'::jsonb;

-- Public-read bucket (dish photos aren't sensitive) — write access is scoped to
-- the owning business below. Path convention: menu-photos/{business_id}/{file}.
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

drop policy if exists "Menu photos are publicly readable" on storage.objects;
create policy "Menu photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'menu-photos');

drop policy if exists "Owners can upload menu photos for their own bakery" on storage.objects;
create policy "Owners can upload menu photos for their own bakery"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-photos'
    and exists (
      select 1 from public.bakeries
      where bakeries.owner_id = auth.uid()
      and bakeries.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Owners can update their own menu photos" on storage.objects;
create policy "Owners can update their own menu photos"
  on storage.objects for update
  using (
    bucket_id = 'menu-photos'
    and exists (
      select 1 from public.bakeries
      where bakeries.owner_id = auth.uid()
      and bakeries.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Owners can delete their own menu photos" on storage.objects;
create policy "Owners can delete their own menu photos"
  on storage.objects for delete
  using (
    bucket_id = 'menu-photos'
    and exists (
      select 1 from public.bakeries
      where bakeries.owner_id = auth.uid()
      and bakeries.id::text = (storage.foldername(name))[1]
    )
  );
