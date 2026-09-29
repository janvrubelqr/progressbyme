-- Migration: let trainers manage the shared exercise library from the app
-- (previously read-only, seeded/edited only via the SQL editor).
-- Run in the Supabase SQL editor of the existing project.

create or replace function is_trainer()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'trainer'
  );
$$;

create policy "exercises_write_trainer" on exercises
  for all using (is_trainer())
  with check (is_trainer());

create policy "exercise_translations_write_trainer" on exercise_translations
  for all using (is_trainer())
  with check (is_trainer());

grant insert, update, delete on exercises, exercise_translations to authenticated;
