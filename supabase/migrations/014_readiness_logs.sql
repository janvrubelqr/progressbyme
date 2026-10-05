-- Migration: daily readiness input (sleep, energy, soreness) — the signal
-- the training engine uses to adjust *today's* plan. Deliberately separate
-- from check_ins, which is a weekly, heavier reflection — this is meant to
-- take ~10 seconds, same spirit as the weight/steps/water trackers.
-- See docs/adr/0001-b2c-pivot-architecture.md and src/lib/readiness.ts for
-- how these three inputs combine into a 0-100 score.
-- Run this in the Supabase SQL editor of the existing project.

create table readiness_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  sleep_hours numeric,
  -- 1 (wiped out) – 5 (great) and 1 (very sore) – 5 (no soreness).
  energy_level smallint check (energy_level between 1 and 5),
  soreness_level smallint check (soreness_level between 1 and 5),
  unique (client_id, date)
);

alter table readiness_logs enable row level security;

create policy "readiness_logs_select" on readiness_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "readiness_logs_write_client" on readiness_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on readiness_logs to authenticated;
