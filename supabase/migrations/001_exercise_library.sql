-- Migration: shared, multi-language exercise library
-- Run this in the Supabase SQL editor of the existing project (adds to what
-- supabase/schema.sql already created — do not re-run schema.sql).

create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table exercise_translations (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  language_code text not null,
  name text not null,
  video_url text,
  unique (exercise_id, language_code)
);

alter table workout_exercises
  add column exercise_id uuid references exercises (id) on delete set null,
  alter column name drop not null;

alter table exercises enable row level security;
alter table exercise_translations enable row level security;

create policy "exercises_select_all" on exercises
  for select using (true);

create policy "exercise_translations_select_all" on exercise_translations
  for select using (true);

grant select on exercises, exercise_translations to authenticated;

-- Seed a starter set of exercises already referenced by the app's placeholder
-- copy, in cs/en/sk. video_url is left null until AI-generated videos exist.
insert into exercises (slug) values
  ('squat'), ('pushup'), ('plank'), ('cat-cow'), ('wall-slide')
on conflict (slug) do nothing;

insert into exercise_translations (exercise_id, language_code, name)
select e.id, t.language_code, t.name
from exercises e
join (values
  ('squat', 'cs', 'Dřep'),
  ('squat', 'en', 'Squat'),
  ('squat', 'sk', 'Drep'),
  ('pushup', 'cs', 'Kliky'),
  ('pushup', 'en', 'Push-up'),
  ('pushup', 'sk', 'Kliky'),
  ('plank', 'cs', 'Plank'),
  ('plank', 'en', 'Plank'),
  ('plank', 'sk', 'Plank'),
  ('cat-cow', 'cs', 'Kočičí hřbet'),
  ('cat-cow', 'en', 'Cat-cow'),
  ('cat-cow', 'sk', 'Mačacie chrbty'),
  ('wall-slide', 'cs', 'Zvedání rukou zády o zeď'),
  ('wall-slide', 'en', 'Wall slides'),
  ('wall-slide', 'sk', 'Kĺzanie rúk po stene')
) as t(slug, language_code, name) on t.slug = e.slug
on conflict (exercise_id, language_code) do nothing;
