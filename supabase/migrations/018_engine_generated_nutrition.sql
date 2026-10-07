-- Migration: allow nutrition plans with no human trainer — same reasoning
-- as migration 016 for workouts. The starter nutrition plan the engine
-- generates right after onboarding (see
-- supabase/functions/generate-starter-nutrition-plan) has no trainer_id.
-- Run this in the Supabase SQL editor of the existing project.

alter table nutrition_plans alter column trainer_id drop not null;
