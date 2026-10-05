create table public.profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  color text not null default 'butter',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name_nl text not null,
  name_latin text,
  origin text, insertion text, innervation text, function text,
  image_path text,
  marker jsonb,
  covers jsonb not null default '[]'::jsonb,
  image_source text, image_author text, image_license text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;
alter table public.cards enable row level security;
create policy "own cards" on public.cards for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.cards(category_id);

create policy "own images read" on storage.objects for select to authenticated using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images insert" on storage.objects for insert to authenticated with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images update" on storage.objects for update to authenticated using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images delete" on storage.objects for delete to authenticated using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);