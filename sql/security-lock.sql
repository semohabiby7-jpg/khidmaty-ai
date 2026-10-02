create extension if not exists pgcrypto;
alter table public.users enable row level security;
update public.users set password = encode(digest('khidmaty-v1:' || password, 'sha256'), 'hex') where length(password) <> 64;
alter table public.users drop constraint if exists users_password_hash_shape;
alter table public.users add constraint users_password_hash_shape check (length(password) = 64);
revoke all on public.users from anon, authenticated;
create or replace function public.register_user(p_phone text, p_password text, p_name text, p_gov text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if length(p_password) <> 64 then
    return jsonb_build_object('error', 'weak_password');
  end if;
  select count(*) into c from public.users where phone = p_phone;
  if c > 0 then
    return jsonb_build_object('error', 'duplicate');
  end if;
  insert into public.users (phone, password, name, gov, role) values (p_phone, p_password, p_name, p_gov, 'citizen');
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.login_user(p_phone text, p_password text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.users where phone = p_phone and password = p_password limit 1;
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'name', r.name, 'gov', r.gov, 'phone', r.phone, 'role', r.role);
end $$;
grant execute on function public.register_user(text, text, text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
