create extension if not exists "pgcrypto";

create type public.box_subscription_status as enum ('trial', 'active', 'past_due', 'suspended', 'cancelled');
create type public.user_role as enum ('owner', 'admin', 'reception', 'coach');
create type public.member_status as enum ('active', 'paused', 'expired', 'expiring');
create type public.task_status as enum ('pending', 'in_progress', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  email text,
  address text,
  currency text not null default 'MXN',
  plan text not null default 'starter',
  subscription_status public.box_subscription_status not null default 'trial',
  subscription_due_date date,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  box_id uuid references public.boxes(id) on delete set null,
  full_name text not null,
  role public.user_role not null default 'coach',
  active boolean not null default true,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mercado_pago')),
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null,
  status public.box_subscription_status not null,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  plan text not null,
  monthly_amount numeric(12,2) not null default 0,
  start_date date not null,
  end_date date not null,
  status public.member_status not null default 'active',
  emergency_contact text,
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  email text,
  certifications text,
  rate numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  name text not null,
  type text not null,
  coach_id uuid references public.staff(id) on delete set null,
  day text not null,
  time time not null,
  capacity integer not null default 12,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  date date not null,
  concept text not null,
  amount numeric(12,2) not null default 0,
  method text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  date date not null,
  time time not null,
  created_at timestamptz not null default now()
);

create table public.wods (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  date date not null,
  name text not null,
  focus text,
  warmup text,
  strength text,
  workout text,
  scaling text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  equipment text not null,
  category text,
  quantity integer not null default 1,
  status text not null default 'Bueno',
  maintenance_date date,
  estimated_cost numeric(12,2) not null default 0,
  maintenance_cost numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  title text not null,
  owner text,
  due_date date,
  status public.task_status not null default 'pending',
  priority public.task_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boxes_status_idx on public.boxes(subscription_status);
create index profiles_box_id_idx on public.profiles(box_id);
create index subscriptions_box_id_idx on public.subscriptions(box_id);
create unique index subscriptions_provider_subscription_unique_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index members_box_id_idx on public.members(box_id);
create index payments_box_id_date_idx on public.payments(box_id, date);
create index attendance_box_id_date_idx on public.attendance(box_id, date);
create index classes_box_id_idx on public.classes(box_id);
create index wods_box_id_date_idx on public.wods(box_id, date);
create index staff_box_id_idx on public.staff(box_id);
create index inventory_box_id_idx on public.inventory(box_id);
create index tasks_box_id_idx on public.tasks(box_id);
