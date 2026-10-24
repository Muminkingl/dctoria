-- Keep the original form state so a retried message cannot fill the next field.
alter table public.bot_updates add column session_snapshot jsonb;
alter table public.bot_updates add column snapshot_taken boolean not null default false;
create function public.bot_update_snapshot(p_update_id bigint,p_chat_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; taken boolean;
begin
  select session_snapshot,snapshot_taken into saved,taken from public.bot_updates where update_id=p_update_id for update;
  if not found then raise exception 'Update was not claimed'; end if;
  if not taken then
    select to_jsonb(s) into saved from public.bot_sessions s where chat_id=p_chat_id and expires_at>now();
    update public.bot_updates set session_snapshot=saved,snapshot_taken=true where update_id=p_update_id;
  end if;
  return saved;
end;
$$;
revoke all on function public.bot_update_snapshot(bigint,bigint) from public,anon,authenticated;
grant execute on function public.bot_update_snapshot(bigint,bigint) to service_role;
notify pgrst,'reload schema';
