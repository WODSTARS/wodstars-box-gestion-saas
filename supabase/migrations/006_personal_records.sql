create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  movement text not null,
  value numeric(12, 2) not null default 0,
  unit text not null default 'kg',
  record_date date not null default current_date,
  notes text,
  congrats_count integer not null default 0,
  last_congrats_by uuid references public.profiles(id) on delete set null,
  last_congrats_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists personal_records_box_id_idx on public.personal_records(box_id);
create index if not exists personal_records_member_id_idx on public.personal_records(member_id);
create index if not exists personal_records_created_at_idx on public.personal_records(created_at);

alter table public.personal_records enable row level security;

drop policy if exists "personal records tenant select" on public.personal_records;
create policy "personal records tenant select" on public.personal_records
for select using (
  public.is_superadmin()
  or box_id = public.current_box_id()
);

drop policy if exists "personal records tenant write" on public.personal_records;
create policy "personal records tenant write" on public.personal_records
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
