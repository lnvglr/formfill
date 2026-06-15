-- Track when each profile field was first added (separate from last update)
alter table public.user_fields
  add column if not exists created_at timestamptz;

update public.user_fields
set created_at = updated_at
where created_at is null;

alter table public.user_fields
  alter column created_at set default now(),
  alter column created_at set not null;

create or replace function public.upsert_user_profile(p_user_id uuid, p_fields jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  entry record;
  v_key_id smallint;
begin
  if p_fields is null or p_fields = '{}'::jsonb then
    return;
  end if;

  for entry in select * from jsonb_each_text(p_fields)
  loop
    v_key_id := public.ensure_field_key(entry.key);

    insert into public.user_fields (user_id, field_key_id, value, created_at, updated_at)
    values (p_user_id, v_key_id, entry.value, now(), now())
    on conflict (user_id, field_key_id)
    do update set
      value = excluded.value,
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.get_user_profile_detailed(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', fk.key,
        'value', uf.value,
        'created_at', uf.created_at,
        'updated_at', uf.updated_at
      )
      order by uf.updated_at desc
    ),
    '[]'::jsonb
  )
  from public.user_fields uf
  join public.field_keys fk on fk.id = uf.field_key_id
  where uf.user_id = p_user_id;
$$;
