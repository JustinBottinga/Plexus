-- Share a category through an invite link. The recipient gets their own copy of the category and its
-- cards (own reviews, own planning); the original stays untouched.

create table if not exists public.category_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  -- Unguessable: two random uuids, dashes removed
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);
grant select, insert, update on public.category_invites to authenticated;
grant all on public.category_invites to service_role;
alter table public.category_invites enable row level security;
create policy "own invites select" on public.category_invites for select to authenticated using (auth.uid() = user_id);
create policy "own invites insert" on public.category_invites for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid())
  );
create policy "own invites update" on public.category_invites for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists category_invites_category_idx on public.category_invites(category_id);

-- Who received which category. Only written by accept_invite(); it also gives read access to the
-- original images until the recipient has copied them into their own folder.
create table if not exists public.category_shares (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  source_category_id uuid not null references public.categories(id) on delete cascade,
  copied_category_id uuid not null references public.categories(id) on delete cascade,
  invite_id uuid references public.category_invites(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recipient_id, source_category_id)
);
grant select on public.category_shares to authenticated;
grant all on public.category_shares to service_role;
alter table public.category_shares enable row level security;
create policy "own shares" on public.category_shares for select to authenticated using (auth.uid() = recipient_id);

-- What the invite page shows before the recipient accepts
create or replace function public.invite_preview(p_token text)
returns table (
  category_name text,
  category_color text,
  card_count bigint,
  owner_name text,
  is_owner boolean,
  copied_category_id uuid
)
language sql stable security definer set search_path = public as $$
  select
    c.name,
    c.color,
    (select count(*) from public.cards k where k.category_id = c.id),
    p.display_name,
    i.user_id = auth.uid(),
    (select s.copied_category_id from public.category_shares s
       where s.recipient_id = auth.uid() and s.source_category_id = c.id)
  from public.category_invites i
  join public.categories c on c.id = i.category_id
  left join public.profiles p on p.id = i.user_id
  where auth.uid() is not null
    and i.token = p_token
    and i.revoked_at is null
    and i.expires_at > now();
$$;

-- Copies the category and its cards to the caller. Idempotent: accepting twice returns the same copy.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_invite public.category_invites%rowtype;
  v_source public.categories%rowtype;
  v_copy uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_invite from public.category_invites
    where token = p_token and revoked_at is null and expires_at > now();
  if not found then
    raise exception 'invite not found or expired' using errcode = 'P0002';
  end if;
  if v_invite.user_id = v_user then
    raise exception 'cannot accept your own invite' using errcode = '22023';
  end if;

  select copied_category_id into v_copy from public.category_shares
    where recipient_id = v_user and source_category_id = v_invite.category_id;
  if found then
    return v_copy;
  end if;

  select * into v_source from public.categories where id = v_invite.category_id;
  insert into public.categories (user_id, name, color)
    values (v_user, v_source.name, v_source.color)
    returning id into v_copy;

  insert into public.cards (
    user_id, category_id, name_nl, name_latin, origin, insertion, innervation, function,
    image_path, marker, covers, image_source, image_author, image_license
  )
  select
    v_user, v_copy, name_nl, name_latin, origin, insertion, innervation, function,
    image_path, marker, covers, image_source, image_author, image_license
  from public.cards where category_id = v_source.id;

  insert into public.category_shares (recipient_id, source_category_id, copied_category_id, invite_id)
    values (v_user, v_source.id, v_copy, v_invite.id);
  return v_copy;
end; $$;

revoke all on function public.invite_preview(text) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- Read access to the original images of a category that was shared with you. Security definer,
-- because a recipient cannot select the owner's cards directly (row level security).
create or replace function public.can_read_shared_image(p_path text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.category_shares s
    join public.cards c on c.category_id = s.source_category_id
    where s.recipient_id = auth.uid() and c.image_path = p_path
  );
$$;
revoke all on function public.can_read_shared_image(text) from public, anon;
grant execute on function public.can_read_shared_image(text) to authenticated;

create policy "shared images read" on storage.objects for select to authenticated
  using (bucket_id = 'card-images' and public.can_read_shared_image(name));
