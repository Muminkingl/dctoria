-- A shared provider identity keeps photos and ratings consistent across categories.
create extension if not exists pg_trgm with schema extensions;

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('doctors','hospitals','centers','labs','offers')),
  name text not null check (length(trim(name)) between 2 and 160),
  specialty text not null default '' check (length(specialty) <= 200),
  specialty_id text not null default 'general' check (length(specialty_id) <= 80),
  city text not null check (length(trim(city)) between 2 and 100),
  address text not null check (length(trim(address)) between 2 and 500),
  description text not null default '' check (length(description) <= 4000),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,30}$'),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  services text[] not null default '{}',
  available boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  rating_sum bigint not null default 0 check (rating_sum >= 0),
  rating_count bigint not null default 0 check (rating_count >= 0),
  rating_average numeric(3,2) generated always as
    (case when rating_count=0 then 0 else round(rating_sum::numeric/rating_count,2) end) stored,
  search_text text generated always as
    (lower(translate(name || ' ' || specialty || ' ' || city || ' ' || address, 'يىك', 'ییک'))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (cardinality(services) <= 30),
  check (rating_sum <= rating_count * 5)
);

create index providers_category_city_page on public.providers(category,city,created_at desc,id desc) where status='published';
create index providers_category_page on public.providers(category,created_at desc,id desc) where status='published';
create index providers_page on public.providers(created_at desc,id desc) where status='published';
create index providers_specialty on public.providers(specialty_id,created_at desc,id desc) where status='published';
create index providers_search on public.providers using gin(search_text extensions.gin_trgm_ops) where status='published';

create table public.provider_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  storage_path text not null unique check (length(storage_path) between 1 and 500),
  caption text not null default '' check (length(caption) <= 300),
  position smallint not null default 0 check (position between 0 and 49),
  created_at timestamptz not null default now(),
  unique(provider_id,position)
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 160),
  avatar_url text check (avatar_url is null or length(avatar_url) <= 2000),
  updated_at timestamptz not null default now()
);

create table public.ratings (
  provider_id uuid not null references public.providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(provider_id,user_id)
);
create index ratings_user on public.ratings(user_id,updated_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger providers_updated before update on public.providers for each row execute function public.touch_updated_at();
create trigger profiles_updated before update on public.user_profiles for each row execute function public.touch_updated_at();
create trigger ratings_updated before update on public.ratings for each row execute function public.touch_updated_at();

create function public.sync_auth_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.user_profiles(id,display_name,avatar_url) values (
    new.id, left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),160),
    left(coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),2000)
  ) on conflict(id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url;
  return new;
end;
$$;
create trigger auth_profile_created after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_auth_profile();

create function public.update_rating_totals() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    update public.providers set rating_sum=rating_sum+new.score,rating_count=rating_count+1 where id=new.provider_id;
  elsif tg_op='DELETE' then
    update public.providers set rating_sum=rating_sum-old.score,rating_count=rating_count-1 where id=old.provider_id;
  else
    if new.provider_id<>old.provider_id or new.user_id<>old.user_id then
      raise exception 'Rating owner and provider cannot be changed';
    end if;
    update public.providers set rating_sum=rating_sum+new.score-old.score where id=new.provider_id;
  end if;
  return coalesce(new,old);
end;
$$;
create trigger rating_totals after insert or update or delete on public.ratings for each row execute function public.update_rating_totals();

create function public.is_social_user() returns boolean
language sql stable set search_path='' as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt())->'app_metadata'->'providers' ?| array['google','apple'],false)
    and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false);
$$;

alter table public.providers enable row level security;
alter table public.provider_photos enable row level security;
alter table public.user_profiles enable row level security;
alter table public.ratings enable row level security;
create policy providers_published on public.providers for select to anon,authenticated using(status='published');
create policy photos_published on public.provider_photos for select to anon,authenticated
using(exists(select 1 from public.providers p where p.id=provider_id and p.status='published'));
create policy profiles_self on public.user_profiles for select to authenticated using(id=(select auth.uid()));
create policy ratings_self_read on public.ratings for select to authenticated using(user_id=(select auth.uid()));
create policy ratings_self_insert on public.ratings for insert to authenticated with check(
  user_id=(select auth.uid()) and (select public.is_social_user())
  and exists(select 1 from public.providers p where p.id=provider_id and p.status='published'));
create policy ratings_self_update on public.ratings for update to authenticated
using(user_id=(select auth.uid()) and (select public.is_social_user()))
with check(user_id=(select auth.uid()) and (select public.is_social_user())
  and exists(select 1 from public.providers p where p.id=provider_id and p.status='published'));

-- Revoke broad Supabase defaults, then grant only what each client needs.
revoke all on public.providers,public.provider_photos,public.ratings,public.user_profiles from anon,authenticated;
grant select on public.providers,public.provider_photos to anon,authenticated;
grant select on public.ratings,public.user_profiles to authenticated;
grant insert(provider_id,user_id,score),update(score) on public.ratings to authenticated;
grant all on public.providers,public.provider_photos,public.ratings,public.user_profiles to service_role;

create view public.directory_entries with(security_invoker=true) as
select p.*, (select storage_path from public.provider_photos f where f.provider_id=p.id order by position limit 1) as cover_photo_path
from public.providers p;
create view public.doctors with(security_invoker=true) as select * from public.directory_entries where category='doctors';
create view public.hospitals with(security_invoker=true) as select * from public.directory_entries where category='hospitals';
create view public.centers with(security_invoker=true) as select * from public.directory_entries where category='centers';
grant select on public.directory_entries,public.doctors,public.hospitals,public.centers to anon,authenticated,service_role;

create function public.search_directory(
  p_query text default '',p_category text default null,p_city text default null,p_specialty text default null,
  p_ids uuid[] default null,p_limit integer default 20,p_after timestamptz default null,p_after_id uuid default null
) returns setof public.directory_entries language sql stable security invoker
set search_path='' as $$
  select d.* from public.directory_entries d
  where d.status='published'
    and (p_category is null or d.category=p_category)
    and (p_city is null or d.city=p_city)
    and (p_specialty is null or d.specialty_id=p_specialty)
    and (p_ids is null or d.id=any(p_ids))
    and (nullif(trim(p_query),'') is null or d.search_text like '%' ||
      replace(replace(replace(lower(translate(left(trim(p_query),200),'يىك','ییک')),'\','\\'),'%','\%'),'_','\_') || '%')
    and (p_after is null or (d.created_at,d.id)<(p_after,p_after_id))
  order by d.created_at desc,d.id desc limit least(greatest(p_limit,1),50);
$$;

-- This invoker function uses RLS and never accepts a user ID from the client.
create function public.rate_provider(p_provider_id uuid,p_score smallint) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_social_user() then raise exception 'Sign in with Google or Apple to rate' using errcode='42501'; end if;
  insert into public.ratings(provider_id,user_id,score) values(p_provider_id,(select auth.uid()),p_score)
  on conflict(provider_id,user_id) do update set score=excluded.score;
end;
$$;

revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_social_user() to authenticated;
grant execute on function public.search_directory(text,text,text,text,uuid[],integer,timestamptz,uuid) to anon,authenticated,service_role;
grant execute on function public.rate_provider(uuid,smallint) to authenticated;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('provider-photos','provider-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- No storage write policy for app users: all uploads go through the admin bot.

create table public.bot_sessions (
  chat_id bigint primary key,
  user_id bigint not null,
  step text not null,
  data jsonb not null default '{}',
  expires_at timestamptz not null default now()+interval '24 hours',
  updated_at timestamptz not null default now()
);
create table public.bot_updates (
  update_id bigint primary key,
  status text not null check(status in ('processing','done','failed')),
  locked_until timestamptz not null,
  attempts smallint not null default 1,
  created_at timestamptz not null default now()
);
create index bot_updates_cleanup on public.bot_updates(created_at);
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  telegram_user_id bigint not null,
  provider_id uuid,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.bot_sessions enable row level security;
alter table public.bot_updates enable row level security;
alter table public.admin_audit_log enable row level security;
revoke all on public.bot_sessions,public.bot_updates,public.admin_audit_log from anon,authenticated;
grant all on public.bot_sessions,public.bot_updates,public.admin_audit_log to service_role;
grant usage,select on sequence public.admin_audit_log_id_seq to service_role;

create function public.claim_bot_update(p_update_id bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed bigint;
begin
  insert into public.bot_updates(update_id,status,locked_until)
  values(p_update_id,'processing',now()+interval '90 seconds')
  on conflict(update_id) do update set status='processing',locked_until=now()+interval '90 seconds',attempts=bot_updates.attempts+1
  where bot_updates.status='failed' or (bot_updates.status='processing' and bot_updates.locked_until<now())
  returning update_id into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_bot_update(bigint) from public,anon,authenticated;
grant execute on function public.claim_bot_update(bigint) to service_role;

notify pgrst,'reload schema';
