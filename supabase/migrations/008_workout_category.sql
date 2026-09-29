-- Migration: workout category (home / gym / cardio / rehab / ...) so the
-- client's workout list can group/tab by type instead of one flat list.
-- Run in the Supabase SQL editor of the existing project.

alter table workouts add column category text;
