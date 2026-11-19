create table if not exists public.contact_rate_limits (
  identifier text primary key check (identifier ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 6)
);

alter table public.contact_rate_limits enable row level security;
revoke all on table public.contact_rate_limits from public, anon, authenticated;
grant all on table public.contact_rate_limits to service_role;

create index if not exists contact_rate_limits_window_started_at_idx
  on public.contact_rate_limits (window_started_at);

create or replace function public.consume_contact_rate_limit(p_identifier text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_identifier !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid contact rate-limit identifier';
  end if;

  insert into public.contact_rate_limits (identifier, window_started_at, request_count)
  values (p_identifier, v_now, 1)
  on conflict (identifier) do update
  set window_started_at = case
        when public.contact_rate_limits.window_started_at <= v_now - interval '1 hour' then v_now
        else public.contact_rate_limits.window_started_at
      end,
      request_count = case
        when public.contact_rate_limits.window_started_at <= v_now - interval '1 hour' then 1
        else least(public.contact_rate_limits.request_count + 1, 6)
      end
  returning request_count into v_count;

  delete from public.contact_rate_limits
  where window_started_at < v_now - interval '24 hours';

  return v_count <= 5;
end;
$$;

revoke all on function public.consume_contact_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text) to service_role;
