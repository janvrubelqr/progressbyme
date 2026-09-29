-- Migration: daily water intake tracking (Home screen water tracker)
-- Run this in the Supabase SQL editor of the existing project.

create table water_intake (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  liters numeric not null default 0,
  goal_liters numeric not null default 3,
  unique (client_id, date)
);

alter table water_intake enable row level security;

create policy "water_intake_select" on water_intake
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "water_intake_write_client" on water_intake
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on water_intake to authenticated;
