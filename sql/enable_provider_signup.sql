-- ============================================================
-- تشغيل تسجيل مقدمي الخدمة على خِدْمَتي AI
-- ============================================================
-- انسخ هذا الملف بالكامل والصقه في:
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) إضافة أعمدة بيانات التواصل والخدمات لجدول providers
alter table public.providers
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists services text;

-- 2) السماح لأي زائر (anon) بإضافة مقدم خدمة جديد
-- (القراءة تبقى مفتوحة للجميع كما هي، والإدخال يسمح به للجميع)
drop policy if exists "providers insert anon" on public.providers;
create policy "providers insert anon"
  on public.providers for insert
  to anon, authenticated
  with check (true);

-- 3) التأكد من سياسة القراءة العامة
drop policy if exists "providers read all" on public.providers;
create policy "providers read all"
  on public.providers for select
  using (true);

-- 4) (اختياري) السماح بتعديل الصف الخاص فقط (للمستقبل)
-- drop policy if exists "providers update own" on public.providers;
-- create policy "providers update own" on public.providers for update using (true);

-- ============================================================
-- للتأكد من نجاح التشغيل، نفّذ:
--   select * from public.providers limit 5;
-- ============================================================
