-- ========================================================
--  خِدْمَتي AI — إعداد التسجيل والعداد (Supabase Auth)
--  ينفّذ في: Supabase Dashboard → SQL Editor → الصق → Run
-- ========================================================

-- 1) دالة عداد المستخدمين المسجّلين (ترجع عدد auth.users)
--    security definer عشان anon يقدر يقرأ العدد بدون صلاحيات على auth.users
create or replace function public.user_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from auth.users;
$$;

-- 2) منح صلاحية تنفيذ الدالة لكل الزوار (anon) والمسجّلين (authenticated)
grant execute on function public.user_count() to anon, authenticated;

-- (الجلسة تتحفظ تلقائياً في المتصفح عبر Supabase JS SDK — لا يحتاج إعداد هنا)
