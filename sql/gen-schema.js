// Generator: يحوّل services.js → schema.sql كامل وآمن لـ Supabase
// التشغيل: node sql/gen-schema.js > sql/schema.sql
const { categories, services, providers } = require('../src/data/services.js');

function q(v){ return "'" + String(v).replace(/'/g, "''") + "'"; }
function arr(a){ return "'{" + a.map(q).join(',') + "}'"; }

// ----- CREATE TABLE statements -----
const ddl = `-- ============================================================
-- خِدْمَتي AI — Supabase Schema (كامل وآمن — يتشتغل من أول مرة)
-- الملف ده بيتشغّل مرة واحدة في Supabase SQL Editor
-- https://supabase.com/dashboard/project/puhdastfiswcmbnczvwx/sql/new
-- ============================================================

-- ============================================================
-- 1) جدول categories — فئات الخدمات
-- ============================================================
create table if not exists public.categories (
  id     text primary key,
  slug   text,
  name   text not null,
  icon   text,
  "desc" text,
  color  text
);

-- ============================================================
-- 2) جدول services — كل الخدمات الحكومية
-- ============================================================
create table if not exists public.services (
  id          bigint primary key,
  category    text,
  icon        text,
  name        text not null,
  svc_desc    text,
  online      boolean default true,
  link        text,
  source      text,
  updated     text,
  tags        text[],
  eligibility text,
  documents   text[],
  steps       text[],
  fees        text,
  duration    text
);

create index if not exists services_category_idx on public.services(category);
create index if not exists services_tags_idx on public.services using gin(tags);

-- ============================================================
-- 3) جدول providers — مقدمو الخدمات (الخطوة 4)
-- ============================================================
create table if not exists public.providers (
  id       bigint primary key,
  name     text not null,
  type     text,
  gov      text,
  rating   numeric,
  orders   int,
  badge    text,
  verified boolean default false
);

-- ============================================================
-- 4) جدول user_services — الخدمات اللي المستخدم بيضيفها للتذكيرات
-- ============================================================
create table if not exists public.user_services (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  service_id    bigint not null,
  service_name  text,
  service_icon  text,
  date_added    timestamptz not null default now(),
  renewal_date  timestamptz,
  status        text not null default 'active',
  progress      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists user_services_user_id_idx on public.user_services(user_id);
create unique index if not exists user_services_user_service_uq
  on public.user_services(user_id, service_id);

-- ============================================================
-- 5) جدول orders (الخطوة 4) — طلبات مساعدة من providers
-- ============================================================
create table if not exists public.orders (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  service_id    bigint,
  provider_name text,
  status        text not null default 'pending',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 6) Row Level Security
-- ============================================================
alter table public.user_services enable row level security;
alter table public.orders enable row level security;

drop policy if exists "user_services select own" on public.user_services;
create policy "user_services select own" on public.user_services
  for select using (auth.uid() = user_id);
drop policy if exists "user_services insert own" on public.user_services;
create policy "user_services insert own" on public.user_services
  for insert with check (auth.uid() = user_id);
drop policy if exists "user_services update own" on public.user_services;
create policy "user_services update own" on public.user_services
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_services delete own" on public.user_services;
create policy "user_services delete own" on public.user_services
  for delete using (auth.uid() = user_id);

drop policy if exists "orders select own" on public.orders;
create policy "orders select own" on public.orders
  for select using (auth.uid() = user_id);
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders
  for insert with check (auth.uid() = user_id);
drop policy if exists "orders update own" on public.orders;
create policy "orders update own" on public.orders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 7) updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_services_updated_at on public.user_services;
create trigger trg_user_services_updated_at
  before update on public.user_services
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

`;

// ----- INSERT categories -----
const catVals = categories.map(c =>
  `(${q(c.id)},${q(c.slug)},${q(c.name)},${q(c.icon)},${q(c.desc)},${q(c.color)})`
).join(',\n  ');

const catInsert = `-- ============================================================
-- 8) تزويد جدول categories
-- ============================================================
insert into public.categories (id, slug, name, icon, "desc", color)
values
  ${catVals}
on conflict (id) do nothing;

`;

// ----- INSERT services -----
const svcVals = services.map(s =>
  `(${s.id},${q(s.category)},${q(s.icon)},${q(s.name)},${q(s.desc)},${s.online},${q(s.link)},${q(s.source)},${q(s.updated)},${arr(s.tags)},${q(s.eligibility)},${arr(s.documents)},${arr(s.steps)},${q(s.fees)},${q(s.duration)})`
).join(',\n  ');

const svcInsert = `-- ============================================================
-- 9) تزويد جدول services بكل الخدمات (1-${services.length})
-- ============================================================
insert into public.services
  (id, category, icon, name, svc_desc, online, link, source, updated, tags, eligibility, documents, steps, fees, duration)
values
  ${svcVals}
on conflict (id) do nothing;

`;

// ----- INSERT providers -----
const prvVals = providers.map((p, i) =>
  `(${i+1},${q(p.name)},${q(p.type)},${q(p.gov)},${p.rating},${p.orders},${q(p.badge)},${p.verified})`
).join(',\n  ');

const prvInsert = `-- ============================================================
-- 10) تزويد جدول providers
-- ============================================================
insert into public.providers (id, name, type, gov, rating, orders, badge, verified)
values
  ${prvVals}
on conflict (id) do nothing;

`;

// ----- Footer -----
const footer = `-- ============================================================
-- تم ✅ — لما تشغّل ده، هتبقى عندك:
--   - جدول categories (${categories.length} فئة)
--   - جدول services (${services.length} خدمة)
--   - جدول providers (${providers.length} مقدم خدمة)
--   - جدول user_services + RLS (تذكيرات لكل مستخدم)
--   - جدول orders جاهز للخطوة 4
-- ============================================================
`;

process.stdout.write(ddl + catInsert + svcInsert + prvInsert + footer);
