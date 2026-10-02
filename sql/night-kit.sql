create table if not exists public.chat_questions (
  id bigint generated always as identity primary key,
  question text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_questions enable row level security;
drop policy if exists allow_insert_questions on public.chat_questions;
create policy allow_insert_questions on public.chat_questions for insert to anon, authenticated with check (true);
revoke select, update, delete on public.chat_questions from anon, authenticated;
create or replace function public.get_members_count() returns bigint language sql security definer set search_path = public as $$ select count(*)::bigint from public.users $$;
grant execute on function public.get_members_count() to anon, authenticated;
create table if not exists public.watchdog_state (
  id int primary key default 1,
  last_alert_at timestamptz,
  last_status text
);
alter table public.watchdog_state enable row level security;
revoke all on public.watchdog_state from anon, authenticated;
create or replace function public.watchdog_get_state() returns jsonb language sql security definer set search_path = public as $$ select jsonb_build_object('last_alert_at', last_alert_at, 'last_status', last_status) from public.watchdog_state where id = 1 $$;
grant execute on function public.watchdog_get_state() to anon, authenticated;
create or replace function public.watchdog_set_state(p_last_alert_at timestamptz, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.watchdog_state where id = 1) then
    insert into public.watchdog_state (id, last_alert_at, last_status) values (1, p_last_alert_at, p_status);
  else
    update public.watchdog_state set last_alert_at = p_last_alert_at, last_status = p_status where id = 1;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.watchdog_set_state(timestamptz, text) to anon, authenticated;
