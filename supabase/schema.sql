-- Adaptive Coaching — initial schema
-- Run this in the Supabase SQL editor of a fresh project.

create type user_role as enum ('client', 'trainer');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role not null default 'client',
  trainer_id uuid references profiles (id) on delete set null,
  avatar_url text,
  -- Training/nutrition-relevant profile info (all optional, client-editable).
  date_of_birth date,
  sex text,
  height_cm numeric,
  fitness_goal text,
  activity_level text,
  health_conditions text,
  dietary_restrictions text,
  phone text,
  -- Structured onboarding fields for the training engine. injury_tags is
  -- the structured counterpart to health_conditions (free text) — matched
  -- against exercises.contraindications.
  experience_level text,
  equipment_access text[] not null default '{}',
  injury_tags text[] not null default '{}',
  training_days_per_week smallint,
  preferred_categories text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A trainer's roster entry for a client who hasn't signed up yet. Filled in
-- by the trainer (name, contact info, starting stats); once someone signs
-- up with a matching email, the app auto-links them to this trainer and
-- copies these fields onto their profile (see fetchOrCreateProfile).
create table client_intake (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  age smallint,
  weight_kg numeric,
  height_cm numeric,
  sex text,
  fitness_goal text,
  notes text,
  claimed_by uuid references profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  scheduled_date date,
  -- What kind of session this is (home / gym / cardio / rehab / ...) — lets
  -- the client's workout list group/tab by category instead of one flat list.
  category text,
  created_at timestamptz not null default now()
);

-- Shared exercise library: one canonical exercise (e.g. "squat") can have a
-- translated name + demo video per language, reused across every workout
-- instead of trainers re-typing/re-linking the same video for every client.
create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  -- Coaching metadata (language-independent, so it lives here rather than
  -- in exercise_translations). All optional/free-form-ish so the library
  -- can grow without needing a migration for every new tag.
  muscle_groups text[] not null default '{}',
  movement_type text,
  difficulty text,
  equipment text,
  min_age smallint,
  max_age smallint,
  -- Health conditions this exercise should be avoided/adapted for — cross-
  -- referenced against profiles.health_conditions when suggesting exercises.
  contraindications text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table exercise_translations (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  language_code text not null,
  name text not null,
  description text,
  video_url text,
  unique (exercise_id, language_code)
);

-- Weighted muscle impact per exercise — "this exercise loads quads at 0.6,
-- glutes at 0.3, lower_back at 0.1" — for the training engine's daily
-- per-muscle load calculation. Additive on top of exercises.muscle_groups,
-- which stays as the flat tag list used for simple display/filtering.
create table exercise_muscle_weights (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises (id) on delete cascade,
  -- One of MUSCLE_GROUPS in src/lib/exercise-taxonomy.ts.
  muscle text not null,
  weight numeric not null check (weight > 0 and weight <= 1),
  unique (exercise_id, muscle)
);

-- Per-language workout titles, mirroring exercise_translations. workouts.title
-- stays as the fallback shown when a language has no translation yet (e.g.
-- workouts created before this table existed).
create table workout_translations (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  language_code text not null,
  title text not null,
  unique (workout_id, language_code)
);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  -- References the library for a reusable exercise (name/video resolved via
  -- exercise_translations for the viewer's language). Left null for a
  -- one-off custom exercise, in which case `name`/`video_url` below apply.
  exercise_id uuid references exercises (id) on delete set null,
  order_index int not null default 0,
  name text,
  sets int not null default 0,
  reps text not null default '',
  rest_seconds int,
  tempo text,
  video_url text,
  notes text
);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  client_id uuid not null references profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  notes text
);

-- Shared food/ingredient library (per-100g macros), same pattern as the
-- exercise library — lets the nutrition builder auto-calculate a meal item's
-- macros from an entered gram amount instead of the trainer looking them up.
create table foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kcal_100g numeric not null default 0,
  protein_100g numeric not null default 0,
  carbs_100g numeric not null default 0,
  fat_100g numeric not null default 0,
  created_at timestamptz not null default now()
);

create table nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  target_kcal numeric not null default 0,
  target_protein numeric not null default 0,
  target_carbs numeric not null default 0,
  target_fat numeric not null default 0,
  created_at timestamptz not null default now()
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid not null references nutrition_plans (id) on delete cascade,
  name text not null,
  order_index int not null default 0
);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals (id) on delete cascade,
  -- References the food library when the trainer picked one (so the item
  -- can be re-scaled later); left null for a freeform/manual item.
  food_id uuid references foods (id) on delete set null,
  name text not null,
  amount text,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric not null,
  unique (client_id, date)
);

create table step_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  steps int not null default 0,
  unique (client_id, date)
);

create table blood_pressure_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  systolic int not null,
  diastolic int not null,
  pulse int,
  unique (client_id, date)
);

create table water_intake (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  liters numeric not null default 0,
  goal_liters numeric not null default 3,
  unique (client_id, date)
);

-- Daily readiness input (sleep, energy, soreness) feeding the training
-- engine's 0-100 readiness score (see src/lib/readiness.ts) — deliberately
-- separate from check_ins, which is a heavier weekly reflection.
create table readiness_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null default current_date,
  sleep_hours numeric,
  energy_level smallint check (energy_level between 1 and 5),
  soreness_level smallint check (soreness_level between 1 and 5),
  unique (client_id, date)
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  weight numeric,
  sleep_hours numeric,
  water_liters numeric,
  soreness_rating int,
  training_rating int,
  recovery_rating int,
  diet_adherence_rating int,
  notes jsonb,
  measurements jsonb
);

create table check_in_photos (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins (id) on delete cascade,
  storage_path text not null
);

-- Helper: is the current user the trainer of the given client?
create or replace function is_trainer_of(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = target_client_id
      and trainer_id = auth.uid()
  );
$$;

-- Helper: is the current user a trainer at all? (for shared resources like
-- the exercise library, which isn't scoped to one specific client)
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

-- Helper: does a signed-up account already exist for this email? Used by
-- the send-client-invite edge function to decide between a "sign up" email
-- and a "you've been added, just log in" email. security definer because
-- auth.users isn't otherwise readable via the public API.
create or replace function user_exists_with_email(check_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from auth.users
    where email = check_email
  );
$$;

grant execute on function user_exists_with_email(text) to authenticated, service_role;

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table exercise_translations enable row level security;
alter table exercise_muscle_weights enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table workout_logs enable row level security;
alter table nutrition_plans enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table check_ins enable row level security;
alter table check_in_photos enable row level security;
alter table weight_logs enable row level security;
alter table step_logs enable row level security;
alter table blood_pressure_logs enable row level security;
alter table water_intake enable row level security;
alter table client_intake enable row level security;
alter table readiness_logs enable row level security;

-- profiles: a user can read/update their own profile; a trainer can read their clients' profiles
create policy "profiles_select_own_or_trainer" on profiles
  for select using (id = auth.uid() or trainer_id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- client_intake: a trainer manages their own roster entries; a newly
-- signed-up user can see/claim the one entry addressed to their own email.
create policy "client_intake_trainer_all" on client_intake
  for all using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "client_intake_select_own_email" on client_intake
  for select using (email = (auth.jwt() ->> 'email'));

create policy "client_intake_claim_own_email" on client_intake
  for update using (email = (auth.jwt() ->> 'email') and claimed_by is null)
  with check (claimed_by = auth.uid());

-- exercise library: readable by every signed-in user (clients & trainers);
-- writable by any trainer (shared library, not scoped to one trainer).
create policy "exercises_select_all" on exercises
  for select using (true);

create policy "exercises_write_trainer" on exercises
  for all using (is_trainer())
  with check (is_trainer());

create policy "exercise_translations_select_all" on exercise_translations
  for select using (true);

create policy "exercise_translations_write_trainer" on exercise_translations
  for all using (is_trainer())
  with check (is_trainer());

create policy "exercise_muscle_weights_select_all" on exercise_muscle_weights
  for select using (true);

create policy "exercise_muscle_weights_write_trainer" on exercise_muscle_weights
  for all using (is_trainer())
  with check (is_trainer());

-- food library: same shared-read / trainer-write pattern as exercises.
create policy "foods_select_all" on foods
  for select using (true);

create policy "foods_write_trainer" on foods
  for all using (is_trainer())
  with check (is_trainer());

-- workouts
create policy "workouts_select" on workouts
  for select using (client_id = auth.uid() or trainer_id = auth.uid());

create policy "workouts_insert_trainer" on workouts
  for insert with check (trainer_id = auth.uid() and is_trainer_of(client_id));

create policy "workouts_update_trainer" on workouts
  for update using (trainer_id = auth.uid());

create policy "workouts_delete_trainer" on workouts
  for delete using (trainer_id = auth.uid());

-- workout_translations (access follows the parent workout)
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

-- workout_exercises (access follows the parent workout)
create policy "workout_exercises_select" on workout_exercises
  for select using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and (w.client_id = auth.uid() or w.trainer_id = auth.uid())
    )
  );

create policy "workout_exercises_write_trainer" on workout_exercises
  for all using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.trainer_id = auth.uid()
    )
  );

-- workout_logs
create policy "workout_logs_select" on workout_logs
  for select using (
    client_id = auth.uid()
    or exists (select 1 from workouts w where w.id = workout_logs.workout_id and w.trainer_id = auth.uid())
  );

create policy "workout_logs_insert_client" on workout_logs
  for insert with check (client_id = auth.uid());

-- nutrition_plans
create policy "nutrition_plans_select" on nutrition_plans
  for select using (client_id = auth.uid() or trainer_id = auth.uid());

create policy "nutrition_plans_write_trainer" on nutrition_plans
  for all using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and is_trainer_of(client_id));

-- meals (access follows the parent nutrition plan)
create policy "meals_select" on meals
  for select using (
    exists (
      select 1 from nutrition_plans p
      where p.id = meals.nutrition_plan_id
        and (p.client_id = auth.uid() or p.trainer_id = auth.uid())
    )
  );

create policy "meals_write_trainer" on meals
  for all using (
    exists (
      select 1 from nutrition_plans p
      where p.id = meals.nutrition_plan_id
        and p.trainer_id = auth.uid()
    )
  );

-- meal_items (access follows the parent meal -> nutrition plan)
create policy "meal_items_select" on meal_items
  for select using (
    exists (
      select 1 from meals m
      join nutrition_plans p on p.id = m.nutrition_plan_id
      where m.id = meal_items.meal_id
        and (p.client_id = auth.uid() or p.trainer_id = auth.uid())
    )
  );

create policy "meal_items_write_trainer" on meal_items
  for all using (
    exists (
      select 1 from meals m
      join nutrition_plans p on p.id = m.nutrition_plan_id
      where m.id = meal_items.meal_id
        and p.trainer_id = auth.uid()
    )
  );

-- weight_logs
create policy "weight_logs_select" on weight_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "weight_logs_write_client" on weight_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- step_logs
create policy "step_logs_select" on step_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "step_logs_write_client" on step_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- blood_pressure_logs
create policy "blood_pressure_logs_select" on blood_pressure_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "blood_pressure_logs_write_client" on blood_pressure_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- water_intake
create policy "water_intake_select" on water_intake
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "water_intake_write_client" on water_intake
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- readiness_logs
create policy "readiness_logs_select" on readiness_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "readiness_logs_write_client" on readiness_logs
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- check_ins
create policy "check_ins_select" on check_ins
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "check_ins_insert_client" on check_ins
  for insert with check (client_id = auth.uid());

-- check_in_photos (access follows the parent check-in)
create policy "check_in_photos_select" on check_in_photos
  for select using (
    exists (
      select 1 from check_ins c
      where c.id = check_in_photos.check_in_id
        and (c.client_id = auth.uid() or is_trainer_of(c.client_id))
    )
  );

create policy "check_in_photos_insert_client" on check_in_photos
  for insert with check (
    exists (
      select 1 from check_ins c
      where c.id = check_in_photos.check_in_id
        and c.client_id = auth.uid()
    )
  );

-- Table-level grants: RLS policies above still govern per-row access,
-- but the `authenticated` role also needs baseline table privileges.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  profiles, workouts, workout_translations, workout_exercises, workout_logs,
  nutrition_plans, meals, meal_items, check_ins, check_in_photos, water_intake,
  weight_logs, step_logs, blood_pressure_logs, client_intake, readiness_logs
to authenticated;
grant select, insert, update, delete on exercises, exercise_translations, foods, exercise_muscle_weights to authenticated;
