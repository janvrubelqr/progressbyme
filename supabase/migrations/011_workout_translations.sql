-- Migration: per-language workout titles, so a workout's title respects the
-- viewer's language instead of always showing whatever language the trainer
-- typed it in. Run in the Supabase SQL editor of the existing project.

create table workout_translations (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  language_code text not null,
  title text not null,
  unique (workout_id, language_code)
);

alter table workout_translations enable row level security;

create policy "workout_translations_select" on workout_translations
  for select using (
    exists (
      select 1 from workouts w
      where w.id = workout_translations.workout_id
        and (w.client_id = auth.uid() or w.trainer_id = auth.uid())
    )
  );

create policy "workout_translations_write_trainer" on workout_translations
  for all using (
    exists (
      select 1 from workouts w
      where w.id = workout_translations.workout_id
        and w.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_translations.workout_id
        and w.trainer_id = auth.uid()
    )
  );

grant select, insert, update, delete on workout_translations to authenticated;

-- Backfill: give the existing seeded "Všechny cviky z knihovny" workout a
-- title in all three languages so it stops showing Czech under English/Slovak.
insert into workout_translations (workout_id, language_code, title)
select id, 'cs', 'Všechny cviky z knihovny' from workouts where title = 'Všechny cviky z knihovny'
on conflict (workout_id, language_code) do nothing;

insert into workout_translations (workout_id, language_code, title)
select id, 'en', 'All library exercises' from workouts where title = 'Všechny cviky z knihovny'
on conflict (workout_id, language_code) do nothing;

insert into workout_translations (workout_id, language_code, title)
select id, 'sk', 'Všetky cviky z knižnice' from workouts where title = 'Všechny cviky z knihovny'
on conflict (workout_id, language_code) do nothing;
