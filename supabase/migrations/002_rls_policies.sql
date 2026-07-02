create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.current_box_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select box_id from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_superadmin from public.profiles where id = auth.uid() and active = true), false)
$$;

create or replace function public.box_can_access(target_box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boxes b
    where b.id = target_box_id
      and b.subscription_status in ('trial', 'active', 'past_due')
  )
$$;

create or replace function public.user_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('owner', 'admin', 'reception') from public.profiles where id = auth.uid() and active = true), false)
$$;

alter table public.boxes enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.classes enable row level security;
alter table public.wods enable row level security;
alter table public.staff enable row level security;
alter table public.inventory enable row level security;
alter table public.tasks enable row level security;

create policy "boxes visible to own users or superadmin"
on public.boxes for select
using (public.is_superadmin() or id = public.current_box_id());

create policy "boxes managed by superadmin"
on public.boxes for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "profiles visible to own box or superadmin"
on public.profiles for select
using (public.is_superadmin() or box_id = public.current_box_id() or id = auth.uid());

create policy "profiles managed by owner admin or superadmin"
on public.profiles for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.user_can_write()));

create policy "subscriptions visible to own box or superadmin"
on public.subscriptions for select
using (public.is_superadmin() or box_id = public.current_box_id());

create policy "subscriptions managed by superadmin"
on public.subscriptions for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "members tenant select"
on public.members for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "members tenant write"
on public.members for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "payments tenant select"
on public.payments for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "payments tenant write"
on public.payments for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "attendance tenant select"
on public.attendance for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "attendance tenant write"
on public.attendance for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "classes tenant select"
on public.classes for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "classes tenant write"
on public.classes for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "wods tenant select"
on public.wods for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "wods tenant write"
on public.wods for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "staff tenant select"
on public.staff for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "staff tenant write"
on public.staff for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "inventory tenant select"
on public.inventory for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "inventory tenant write"
on public.inventory for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id) and public.user_can_write()));

create policy "tasks tenant select"
on public.tasks for select
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));

create policy "tasks tenant write"
on public.tasks for all
using (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)))
with check (public.is_superadmin() or (box_id = public.current_box_id() and public.box_can_access(box_id)));
