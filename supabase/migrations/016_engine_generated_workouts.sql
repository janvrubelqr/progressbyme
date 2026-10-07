-- Migration: allow workouts with no human trainer — the first rule-based
-- plan the engine generates right after onboarding (see
-- supabase/functions/generate-starter-plan) has no trainer_id, since the
-- B2C pivot means most clients won't have one. Existing trainer-assigned
-- workouts are unaffected; this just drops the NOT NULL constraint.
-- Run this in the Supabase SQL editor of the existing project.

alter table workouts alter column trainer_id drop not null;
