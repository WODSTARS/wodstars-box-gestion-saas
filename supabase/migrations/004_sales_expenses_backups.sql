create table public.sales (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  date date not null default current_date,
  product text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  date date not null default current_date,
  category text,
  concept text not null,
  amount numeric(12,2) not null default 0,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  label text not null,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.backups enable row level security;

create policy "sales tenant select"
on public.sales for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "sales tenant write"
on public.sales for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "expenses tenant select"
on public.expenses for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "expenses tenant write"
on public.expenses for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "backups tenant select"
on public.backups for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "backups tenant write"
on public.backups for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));
