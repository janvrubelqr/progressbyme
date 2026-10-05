-- Migration: structured onboarding fields for the training engine.
-- health_conditions stays as free text for human-readable notes —
-- injury_tags is the structured version actually matched against
-- exercises.contraindications (the original comment on CONTRAINDICATION_TAGS
-- already anticipated this, it just wasn't collected anywhere yet).
-- Run this in the Supabase SQL editor of the existing project.

alter table profiles add column experience_level text;
alter table profiles add column equipment_access text[] not null default '{}';
alter table profiles add column injury_tags text[] not null default '{}';
alter table profiles add column training_days_per_week smallint;
alter table profiles add column preferred_categories text[] not null default '{}';
-- Null until the onboarding flow is completed — gates whether a signed-in
-- client gets routed to /onboarding or straight to /(client).
alter table profiles add column onboarding_completed_at timestamptz;
