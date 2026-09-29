-- Migration: trainer-added client roster (pre-registration + auto-link).
-- A trainer fills in a prospective client's info before they've signed up;
-- once someone signs up with a matching email, the app links them to this
-- trainer and copies these fields onto their profile.
-- Run in the Supabase SQL editor of the existing project.

alter table profiles add column phone text;

create table client_intake (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  age smallint,
  weight_kg numeric,
  height_cm numeric,
  sex text,
  fitness_goal text,
  notes text,
  claimed_by uuid references profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table client_intake enable row level security;

create policy "client_intake_trainer_all" on client_intake
  for all using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "client_intake_select_own_email" on client_intake
  for select using (email = (auth.jwt() ->> 'email'));

create policy "client_intake_claim_own_email" on client_intake
  for update using (email = (auth.jwt() ->> 'email') and claimed_by is null)
  with check (claimed_by = auth.uid());

grant select, insert, update, delete on client_intake to authenticated;
