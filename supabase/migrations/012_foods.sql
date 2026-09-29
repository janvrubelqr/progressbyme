-- Migration: shared food/ingredient library (per-100g macros), so the
-- nutrition builder can auto-calculate a meal item's kcal/protein/carbs/fat
-- from an entered gram amount instead of the trainer looking values up by
-- hand. Seeded with common Czech staple foods. Run in the Supabase SQL
-- editor of the existing project.

create table foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kcal_100g numeric not null default 0,
  protein_100g numeric not null default 0,
  carbs_100g numeric not null default 0,
  fat_100g numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table foods enable row level security;

create policy "foods_select_all" on foods
  for select using (true);

create policy "foods_write_trainer" on foods
  for all using (is_trainer())
  with check (is_trainer());

grant select, insert, update, delete on foods to authenticated;

alter table meal_items add column food_id uuid references foods (id) on delete set null;

insert into foods (name, kcal_100g, protein_100g, carbs_100g, fat_100g) values
  ('Vejce', 155, 13, 1.1, 11),
  ('Kuřecí prsa', 165, 31, 0, 3.6),
  ('Kuřecí stehno bez kůže', 172, 20, 0, 9.6),
  ('Hovězí maso libové', 187, 26, 0, 8.7),
  ('Vepřová panenka', 143, 22, 0, 5.7),
  ('Losos', 208, 20, 0, 13),
  ('Tuňák ve vlastní šťávě', 116, 26, 0, 1),
  ('Tvaroh měkký', 102, 12.5, 3.4, 4),
  ('Cottage cheese', 98, 11, 3.4, 4.3),
  ('Řecký jogurt bílý (0%)', 59, 10, 3.6, 0.4),
  ('Bílý jogurt (3,5%)', 61, 3.5, 4.7, 3.3),
  ('Mléko polotučné (1,5%)', 47, 3.3, 4.8, 1.5),
  ('Eidam 30%', 264, 25, 0.5, 18),
  ('Mozzarella', 280, 22, 2.2, 21),
  ('Rýže bílá, vařená', 130, 2.7, 28, 0.3),
  ('Rýže basmati, vařená', 121, 2.5, 25, 0.4),
  ('Rýže natural, vařená', 112, 2.3, 24, 0.9),
  ('Brambory vařené', 87, 1.9, 20, 0.1),
  ('Batáty pečené', 90, 2, 21, 0.1),
  ('Těstoviny vařené', 131, 5, 25, 1.1),
  ('Celozrnné těstoviny vařené', 124, 5.3, 25, 1.4),
  ('Ovesné vločky', 379, 13, 67, 7),
  ('Žitný chléb', 259, 8.5, 48, 1.5),
  ('Celozrnný chléb', 246, 9, 41, 3.4),
  ('Rohlík bílý', 290, 9, 55, 3),
  ('Banán', 89, 1.1, 23, 0.3),
  ('Jablko', 52, 0.3, 14, 0.2),
  ('Pomeranč', 47, 0.9, 12, 0.1),
  ('Jahody', 32, 0.7, 7.7, 0.3),
  ('Borůvky', 57, 0.7, 14, 0.3),
  ('Brokolice vařená', 35, 2.4, 7, 0.4),
  ('Špenát čerstvý', 23, 2.9, 3.6, 0.4),
  ('Mrkev syrová', 41, 0.9, 10, 0.2),
  ('Rajče', 18, 0.9, 3.9, 0.2),
  ('Okurka', 15, 0.7, 3.6, 0.1),
  ('Paprika červená', 31, 1, 6, 0.3),
  ('Cuketa', 17, 1.2, 3.1, 0.3),
  ('Avokádo', 160, 2, 8.5, 14.7),
  ('Mandle', 579, 21, 22, 50),
  ('Vlašské ořechy', 654, 15, 14, 65),
  ('Arašídové máslo', 588, 25, 20, 50),
  ('Olivový olej', 884, 0, 0, 100),
  ('Máslo', 717, 0.9, 0.1, 81),
  ('Čočka vařená', 116, 9, 20, 0.4),
  ('Cizrna vařená', 164, 8.9, 27, 2.6),
  ('Fazole černé vařené', 132, 8.9, 24, 0.5),
  ('Tofu', 76, 8, 1.9, 4.8),
  ('Syrovátkový protein (prášek)', 380, 80, 8, 5),
  ('Med', 304, 0.3, 82, 0),
  ('Quinoa vařená', 120, 4.4, 21, 1.9);
