create extension if not exists pgcrypto;
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
create policy users_no_direct_access on public.users for all to anon, authenticated using (false);
update public.users set password = encode(digest('khidmaty-v1:' || password, 'sha256'), 'hex') where length(password) <> 64;
