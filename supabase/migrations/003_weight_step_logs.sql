-- Migration: manual daily weight and step logging (Home screen widgets)
-- Not connected to any phone sensor/HealthKit — the client types both in by
-- hand. Run this in the Supabase SQL editor of the existing project.

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric not null,
  unique (client_id, date)
);

create table step_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  steps int not null default 0,
  unique (client_id, date)
);

alter table weight_logs enable row level security;
alter table step_logs enable row level security;

create policy "weight_logs_select" on weight_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "weight_logs_write_client" on weight_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "step_logs_select" on step_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "step_logs_write_client" on step_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on weight_logs, step_logs to authenticated;
