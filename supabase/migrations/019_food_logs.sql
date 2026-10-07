-- Migration: a daily food log, separate from nutrition_plans/meals/
-- meal_items (which are a fixed, trainer/engine-authored *template* of
-- what to eat, not a log of what was actually eaten). This is the
-- "what did you actually eat today" diary — one row per logged item,
-- typically from a photo estimate (see supabase/functions/
-- estimate-food-photo and knowledge-base/nutrition-targets.md).
-- Deliberately no photo storage: the image is sent to the Edge Function
-- for a one-time AI estimate and never persisted, so there's no Storage
-- bucket/RLS to set up and no food photos sitting in the database.
-- Run this in the Supabase SQL editor of the existing project.

create table food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  logged_at timestamptz not null default now(),
  description text not null,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  -- 'photo' (AI estimate from a picture) vs 'manual' (typed in directly) —
  -- shown in the UI so an estimate is never presented as an exact figure.
  source text not null default 'manual'
);

alter table food_logs enable row level security;

create policy "food_logs_select" on food_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "food_logs_write_client" on food_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on food_logs to authenticated;
