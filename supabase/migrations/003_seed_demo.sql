insert into public.boxes (id, name, slug, phone, email, currency, plan, subscription_status, subscription_due_date)
values ('00000000-0000-0000-0000-000000000101', 'WODSTARS HQ', 'wodstars-hq', '+52 55 0000 0000', 'hola@wodstars.mx', 'MXN', 'pro', 'trial', current_date + interval '14 days')
on conflict (id) do nothing;

insert into public.staff (box_id, name, role, phone, email, certifications, rate, active)
values
('00000000-0000-0000-0000-000000000101', 'Coach Valeria', 'Head Coach', '55 1111 2222', 'valeria@box.mx', 'CF-L2, Weightlifting', 350, true),
('00000000-0000-0000-0000-000000000101', 'Coach Ramón', 'Coach', '55 3333 4444', 'ramon@box.mx', 'CF-L1', 280, true)
on conflict do nothing;

insert into public.members (box_id, name, phone, email, plan, monthly_amount, start_date, end_date, status, emergency_contact, notes)
values
('00000000-0000-0000-0000-000000000101', 'Ana Ruiz', '55 1450 9001', 'ana@email.com', 'Ilimitado', 1599, current_date - interval '20 days', current_date + interval '15 days', 'active', 'Luis 55 1000 1000', 'Prefiere clase 7:00'),
('00000000-0000-0000-0000-000000000101', 'Marco Luna', '55 2300 4411', 'marco@email.com', '3x semana', 1199, current_date - interval '25 days', current_date + interval '3 days', 'active', 'Sofía 55 2888 1111', 'Lesión hombro derecho')
on conflict do nothing;
