-- Migration: coaching metadata on exercises (muscle groups, movement type,
-- difficulty, equipment, recommended age range, contraindications) plus a
-- per-language description. Foundation for later profile-based exercise
-- suggestions (age/sex/goal) — not the suggestion logic itself.
-- Run in the Supabase SQL editor of the existing project.

alter table exercises add column muscle_groups text[] not null default '{}';
alter table exercises add column movement_type text;
alter table exercises add column difficulty text;
alter table exercises add column equipment text;
alter table exercises add column min_age smallint;
alter table exercises add column max_age smallint;
alter table exercises add column contraindications text[] not null default '{}';

alter table exercise_translations add column description text;
