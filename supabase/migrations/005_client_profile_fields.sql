-- Migration: training/nutrition-relevant client profile fields
-- All optional, client-editable via the existing profiles_update_own RLS
-- policy — no RLS changes needed. Run in the Supabase SQL editor.

alter table profiles add column date_of_birth date;
alter table profiles add column sex text;
alter table profiles add column height_cm numeric;
alter table profiles add column fitness_goal text;
alter table profiles add column activity_level text;
alter table profiles add column health_conditions text;
alter table profiles add column dietary_restrictions text;
