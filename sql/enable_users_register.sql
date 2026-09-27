-- ============================================================
-- خِدْمَتي AI — تفعيل التسجيل في قاعدة البيانات
-- ينفّذ مرة واحدة فقط في Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) جدول المستخدمين
alter table public.users enable row level security;

-- القراءة (للدخول والعداد)
drop policy if exists "users read anon" on public.users;
create policy "users read anon" on public.users
  for select to anon using (true);

-- الكتابة (لإنشاء الحساب)
drop policy if exists "users insert anon" on public.users;
create policy "users insert anon" on public.users
  for insert to anon with check (true);

-- 2) جدول الطلبات (عشان "اطلب خدمة" يتحفظ)
alter table public.requests enable row level security;

drop policy if exists "requests insert anon" on public.requests;
create policy "requests insert anon" on public.requests
  for insert to anon with check (true);

drop policy if exists "requests read agent" on public.requests;
create policy "requests read agent" on public.requests
  for select to service_role using (true);

-- 3) عدّاد المسجلين (RPC سريع وآمن للعداد)
create or replace function public.get_members_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.users;
$$;

grant execute on function public.get_members_count() to anon;

-- ============================================================
-- إصلاح تكرار البوستات في قناة التيلجرام (البوت كان بينزل 3 مرات)
-- جدول agent_logs مقفول كان RLS فحماية التكرار (dedup) مكانتش تشتغل
-- ============================================================
alter table public.agent_logs enable row level security;

drop policy if exists "agent_logs insert anon" on public.agent_logs;
create policy "agent_logs insert anon" on public.agent_logs
  for insert to anon with check (true);

drop policy if exists "agent_logs read anon" on public.agent_logs;
create policy "agent_logs read anon" on public.agent_logs
  for select to anon using (true);
