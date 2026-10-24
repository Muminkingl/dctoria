alter table public.admin_audit_log add column telegram_update_id bigint;
create unique index audit_operation_once on public.admin_audit_log(telegram_update_id,action);

create function public.bot_save_provider(p_data jsonb,p_admin_id bigint,p_update_id bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; before_row jsonb;
begin
  select to_jsonb(p) into before_row from public.providers p where id=(p_data->>'id')::uuid;
  insert into public.providers(id,category,name,specialty,specialty_id,city,address,description,phone,latitude,longitude,services,available,status)
  values((p_data->>'id')::uuid,p_data->>'category',p_data->>'name',coalesce(p_data->>'specialty',''),coalesce(p_data->>'specialty_id','general'),
    p_data->>'city',p_data->>'address',coalesce(p_data->>'description',''),nullif(p_data->>'phone',''),
    (p_data->>'latitude')::double precision,(p_data->>'longitude')::double precision,
    array(select jsonb_array_elements_text(coalesce(p_data->'services','[]'::jsonb))),coalesce((p_data->>'available')::boolean,true),coalesce(p_data->>'status','draft'))
  on conflict(id) do update set category=excluded.category,name=excluded.name,specialty=excluded.specialty,specialty_id=excluded.specialty_id,
    city=excluded.city,address=excluded.address,description=excluded.description,phone=excluded.phone,latitude=excluded.latitude,longitude=excluded.longitude,
    services=excluded.services,available=excluded.available,status=excluded.status
  returning id into saved;
  insert into public.admin_audit_log(telegram_user_id,provider_id,action,details,telegram_update_id)
  values(p_admin_id,saved,'save',jsonb_build_object('before',before_row,'after',p_data),p_update_id)
  on conflict(telegram_update_id,action) do nothing;
  return saved;
end;
$$;

create function public.bot_set_status(p_id uuid,p_status text,p_admin_id bigint,p_update_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
  select status into previous from public.providers where id=p_id for update;
  if not found then raise exception 'Provider not found'; end if;
  update public.providers set status=p_status where id=p_id;
  insert into public.admin_audit_log(telegram_user_id,provider_id,action,details,telegram_update_id)
  values(p_admin_id,p_id,'status',jsonb_build_object('before',previous,'after',p_status),p_update_id)
  on conflict(telegram_update_id,action) do nothing;
end;
$$;

create function public.bot_save_photos(p_id uuid,p_photos jsonb,p_replace boolean,p_admin_id bigint,p_update_id bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if jsonb_typeof(p_photos)<>'array' or jsonb_array_length(p_photos) not between 1 and 50 then raise exception 'Expected 1 to 50 photos'; end if;
  perform 1 from public.providers where id=p_id for update;
  if not found then raise exception 'Provider not found'; end if;
  if p_replace then delete from public.provider_photos where provider_id=p_id; end if;
  insert into public.provider_photos(provider_id,storage_path,position,caption)
  select p_id,x.storage_path,x.position,coalesce(x.caption,'') from jsonb_to_recordset(p_photos) as x(storage_path text,position smallint,caption text)
  on conflict(provider_id,position) do update set storage_path=excluded.storage_path,caption=excluded.caption;
  insert into public.admin_audit_log(telegram_user_id,provider_id,action,details,telegram_update_id)
  values(p_admin_id,p_id,'photos',jsonb_build_object('count',jsonb_array_length(p_photos),'replace',p_replace),p_update_id)
  on conflict(telegram_update_id,action) do nothing;
end;
$$;

revoke all on function public.bot_save_provider(jsonb,bigint,bigint),public.bot_set_status(uuid,text,bigint,bigint),public.bot_save_photos(uuid,jsonb,boolean,bigint,bigint)
from public,anon,authenticated;
grant execute on function public.bot_save_provider(jsonb,bigint,bigint),public.bot_set_status(uuid,text,bigint,bigint),public.bot_save_photos(uuid,jsonb,boolean,bigint,bigint)
to service_role;
notify pgrst,'reload schema';
