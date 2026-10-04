-- Migration: weighted muscle impact per exercise — "this exercise loads
-- quads at 0.6, glutes at 0.3, lower_back at 0.1" instead of a flat tag
-- list. Foundation for the training engine's daily per-muscle load/
-- readiness calculation (see docs/adr/0001-b2c-pivot-architecture.md and
-- the architecture handoff doc's "weighted muscle impact" feature).
--
-- exercises.muscle_groups (text[]) is left untouched — it's still used for
-- simple tag display/filtering in the exercise library UI. This table is
-- additive: a finer-grained layer on top, not a replacement (yet).
-- Run this in the Supabase SQL editor of the existing project.

create table exercise_muscle_weights (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  -- One of MUSCLE_GROUPS in src/lib/exercise-taxonomy.ts — plain text, not
  -- an enum/FK table, same controlled-vocabulary pattern already used for
  -- muscle_groups/movement_type/difficulty on exercises itself.
  muscle text not null,
  -- Relative share of this exercise's total load this muscle absorbs.
  -- Weights for one exercise are expected to sum to ~1.0 — not enforced in
  -- SQL (a trainer partway through filling these in shouldn't be blocked),
  -- validated/warned about app-side instead.
  weight numeric not null check (weight > 0 and weight <= 1),
  unique (exercise_id, muscle)
);

alter table exercise_muscle_weights enable row level security;

create policy "exercise_muscle_weights_select_all" on exercise_muscle_weights
  for select using (true);

create policy "exercise_muscle_weights_write_trainer" on exercise_muscle_weights
  for all using (is_trainer())
  with check (is_trainer());

grant select on exercise_muscle_weights to authenticated;
grant insert, update, delete on exercise_muscle_weights to authenticated;
