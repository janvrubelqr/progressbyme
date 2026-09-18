-- Adaptive Coaching — initial schema
-- Run this in the Supabase SQL editor of a fresh project.

create type user_role as enum ('client', 'trainer');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role not null default 'client',
  trainer_id uuid references profiles (id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  scheduled_date date,
  created_at timestamptz not null default now()
);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  order_index int not null default 0,
  name text not null,
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
  name text not null,
  amount text,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0
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

alter table profiles enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table workout_logs enable row level security;
alter table nutrition_plans enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table check_ins enable row level security;
alter table check_in_photos enable row level security;

-- profiles: a user can read/update their own profile; a trainer can read their clients' profiles
create policy "profiles_select_own_or_trainer" on profiles
  for select using (id = auth.uid() or trainer_id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- workouts
create policy "workouts_select" on workouts
  for select using (client_id = auth.uid() or trainer_id = auth.uid());

create policy "workouts_insert_trainer" on workouts
  for insert with check (trainer_id = auth.uid() and is_trainer_of(client_id));

create policy "workouts_update_trainer" on workouts
  for update using (trainer_id = auth.uid());

create policy "workouts_delete_trainer" on workouts
  for delete using (trainer_id = auth.uid());

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
  profiles, workouts, workout_exercises, workout_logs,
  nutrition_plans, meals, meal_items, check_ins, check_in_photos
to authenticated;
