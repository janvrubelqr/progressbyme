-- Migration: manual daily blood pressure logging (Home screen Progress section)
-- Run this in the Supabase SQL editor of the existing project.

create table blood_pressure_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  systolic int not null,
  diastolic int not null,
  pulse int,
  unique (client_id, date)
);

alter table blood_pressure_logs enable row level security;

create policy "blood_pressure_logs_select" on blood_pressure_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "blood_pressure_logs_write_client" on blood_pressure_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on blood_pressure_logs to authenticated;
