create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  product text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists credit_requests_box_id_idx on public.credit_requests(box_id);
create index if not exists credit_requests_member_id_idx on public.credit_requests(member_id);
create index if not exists credit_requests_status_idx on public.credit_requests(status);

alter table public.credit_requests enable row level security;

drop policy if exists "credit requests tenant select" on public.credit_requests;
create policy "credit requests tenant select" on public.credit_requests
for select using (
  public.is_superadmin()
  or box_id = public.current_box_id()
);

drop policy if exists "credit requests tenant write" on public.credit_requests;
create policy "credit requests tenant write" on public.credit_requests
for all using (
  public.is_superadmin()
  or (
    box_id = public.current_box_id()
    and public.box_can_access(box_id)
    and public.user_can_write()
  )
) with check (
  public.is_superadmin()
  or (
    box_id = public.current_box_id()
    and public.box_can_access(box_id)
    and public.user_can_write()
  )
);
