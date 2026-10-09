-- Lets a client edit their own workout: check off an exercise as done,
-- reorder/add/remove exercises. Workouts no longer always have a human
-- trainer (engine-generated ones have trainer_id null, see
-- generate-starter-plan), so the existing trainer-only write policy left
-- clients with no way to touch their own plan at all.

alter table workout_exercises add column completed_at timestamptz;

create policy "workout_exercises_write_client" on workout_exercises
  for all using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.client_id = auth.uid()
    )
  );
