create table if not exists public.app_activity_stats (
  metric text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_activity_stats_metric_check check (metric in ('captures', 'images'))
);

insert into public.app_activity_stats (metric, value)
values ('captures', 0), ('images', 0)
on conflict (metric) do nothing;

alter table public.app_activity_stats enable row level security;

create or replace function public.increment_app_activity_stat(metric_name text)
returns table(metric text, value bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if metric_name not in ('captures', 'images') then
    raise exception 'invalid_metric';
  end if;

  return query
  insert into public.app_activity_stats as stats (metric, value, updated_at)
  values (metric_name, 1, now())
  on conflict (metric) do update
    set value = stats.value + 1,
        updated_at = now()
  returning stats.metric, stats.value, stats.updated_at;
end;
$$;
