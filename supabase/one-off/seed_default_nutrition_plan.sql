-- Migration: reusable admin helper to give a client the same starter
-- nutrition plan built for jan.vrubel.f@gmail.com (breakfast/lunch/snack/
-- dinner from the food library). Callable by any trainer for any client
-- email, so new testers/colleagues can be seeded the same way without a
-- bespoke SQL script per person. Run in the Supabase SQL editor.

create or replace function seed_default_nutrition_plan(target_email text)
returns text
language plpgsql
security definer
as $$
declare
  v_client_id uuid;
  v_trainer_id uuid;
  v_plan_id uuid;
  v_breakfast_id uuid;
  v_lunch_id uuid;
  v_snack_id uuid;
  v_dinner_id uuid;
begin
  select p.id, coalesce(p.trainer_id, p.id)
  into v_client_id, v_trainer_id
  from profiles p
  join auth.users u on u.id = p.id
  where u.email = target_email;

  if v_client_id is null then
    return 'no profile found for ' || target_email || ' — they need to sign up first';
  end if;

  if exists (select 1 from nutrition_plans where client_id = v_client_id) then
    return target_email || ' already has a nutrition plan — skipped';
  end if;

  insert into nutrition_plans (client_id, trainer_id, title, target_kcal, target_protein, target_carbs, target_fat)
  values (v_client_id, v_trainer_id, '2500 kcal + potrénink', 2276, 170, 232, 75)
  returning id into v_plan_id;

  insert into meals (nutrition_plan_id, name, order_index) values (v_plan_id, 'Snídaně', 0) returning id into v_breakfast_id;
  insert into meals (nutrition_plan_id, name, order_index) values (v_plan_id, 'Oběd', 1) returning id into v_lunch_id;
  insert into meals (nutrition_plan_id, name, order_index) values (v_plan_id, 'Svačina', 2) returning id into v_snack_id;
  insert into meals (nutrition_plan_id, name, order_index) values (v_plan_id, 'Večeře', 3) returning id into v_dinner_id;

  insert into meal_items (meal_id, food_id, name, amount, kcal, protein, carbs, fat)
  select v_breakfast_id, id, name, '150 g', round(kcal_100g * 1.5), round((protein_100g * 1.5)::numeric, 1), round((carbs_100g * 1.5)::numeric, 1), round((fat_100g * 1.5)::numeric, 1)
  from foods where name = 'Vejce'
  union all
  select v_breakfast_id, id, name, '60 g', round(kcal_100g * 0.6), round((protein_100g * 0.6)::numeric, 1), round((carbs_100g * 0.6)::numeric, 1), round((fat_100g * 0.6)::numeric, 1)
  from foods where name = 'Ovesné vločky'
  union all
  select v_breakfast_id, id, name, '120 g', round(kcal_100g * 1.2), round((protein_100g * 1.2)::numeric, 1), round((carbs_100g * 1.2)::numeric, 1), round((fat_100g * 1.2)::numeric, 1)
  from foods where name = 'Banán';

  insert into meal_items (meal_id, food_id, name, amount, kcal, protein, carbs, fat)
  select v_lunch_id, id, name, '200 g', round(kcal_100g * 2), round((protein_100g * 2)::numeric, 1), round((carbs_100g * 2)::numeric, 1), round((fat_100g * 2)::numeric, 1)
  from foods where name = 'Kuřecí prsa'
  union all
  select v_lunch_id, id, name, '250 g', round(kcal_100g * 2.5), round((protein_100g * 2.5)::numeric, 1), round((carbs_100g * 2.5)::numeric, 1), round((fat_100g * 2.5)::numeric, 1)
  from foods where name = 'Rýže bílá, vařená'
  union all
  select v_lunch_id, id, name, '150 g', round(kcal_100g * 1.5), round((protein_100g * 1.5)::numeric, 1), round((carbs_100g * 1.5)::numeric, 1), round((fat_100g * 1.5)::numeric, 1)
  from foods where name = 'Brokolice vařená'
  union all
  select v_lunch_id, id, name, '10 g', round(kcal_100g * 0.1), round((protein_100g * 0.1)::numeric, 1), round((carbs_100g * 0.1)::numeric, 1), round((fat_100g * 0.1)::numeric, 1)
  from foods where name = 'Olivový olej';

  insert into meal_items (meal_id, food_id, name, amount, kcal, protein, carbs, fat)
  select v_snack_id, id, name, '200 g', round(kcal_100g * 2), round((protein_100g * 2)::numeric, 1), round((carbs_100g * 2)::numeric, 1), round((fat_100g * 2)::numeric, 1)
  from foods where name = 'Řecký jogurt bílý (0%)'
  union all
  select v_snack_id, id, name, '20 g', round(kcal_100g * 0.2), round((protein_100g * 0.2)::numeric, 1), round((carbs_100g * 0.2)::numeric, 1), round((fat_100g * 0.2)::numeric, 1)
  from foods where name = 'Mandle'
  union all
  select v_snack_id, id, name, '100 g', round(kcal_100g * 1), round((protein_100g * 1)::numeric, 1), round((carbs_100g * 1)::numeric, 1), round((fat_100g * 1)::numeric, 1)
  from foods where name = 'Borůvky';

  insert into meal_items (meal_id, food_id, name, amount, kcal, protein, carbs, fat)
  select v_dinner_id, id, name, '180 g', round(kcal_100g * 1.8), round((protein_100g * 1.8)::numeric, 1), round((carbs_100g * 1.8)::numeric, 1), round((fat_100g * 1.8)::numeric, 1)
  from foods where name = 'Losos'
  union all
  select v_dinner_id, id, name, '250 g', round(kcal_100g * 2.5), round((protein_100g * 2.5)::numeric, 1), round((carbs_100g * 2.5)::numeric, 1), round((fat_100g * 2.5)::numeric, 1)
  from foods where name = 'Batáty pečené'
  union all
  select v_dinner_id, id, name, '100 g', round(kcal_100g * 1), round((protein_100g * 1)::numeric, 1), round((carbs_100g * 1)::numeric, 1), round((fat_100g * 1)::numeric, 1)
  from foods where name = 'Špenát čerstvý';

  return 'seeded nutrition plan for ' || target_email;
end;
$$;

grant execute on function seed_default_nutrition_plan(text) to authenticated;
