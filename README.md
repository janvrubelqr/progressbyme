# ProgressByMe

Fitness coachingová appka (Expo / React Native + Supabase). Jeden codebase pro web (vývoj/ladění) i nativní iOS/Android appku.

## Setup

1. Nainstaluj závislosti

   ```bash
   npm install
   ```

2. Založ nový projekt na [supabase.com](https://supabase.com), otevři SQL editor a spusť `supabase/schema.sql` (tabulky + RLS politiky).

3. Zkopíruj `.env.example` do `.env.local` a doplň URL a publishable key z Supabase projektu (Project Settings → API Keys — Supabase teď doporučuje `publishable` klíč místo staršího `anon` klíče):

   ```bash
   cp .env.example .env.local
   ```

4. Spusť appku ve webu (rychlé ladění):

   ```bash
   npm run web
   ```

   Nebo nativně: `npm run ios` / `npm run android`.

## Role: klient vs. trenér

Při registraci se každý nový uživatel založí jako `role = 'client'` (viz `src/hooks/use-auth.ts`). Aby appka rozpoznala trenéra, je potřeba v Supabase ručně přepnout `profiles.role` daného uživatele na `'trainer'` a klientům nastavit `profiles.trainer_id` na id trenéra — appka pak podle role přesměruje na klientskou nebo trenérskou sekci (`src/app/_layout.tsx`).

## Struktura

- `src/app` — obrazovky (expo-router, file-based routing)
- `src/app/(client)` — klientská sekce (Home, Workout, Nutrition, Check-in)
- `src/app/(trainer)` — trenérská sekce (seznam klientů, workout/nutrition builder, přehled check-inů)
- `src/lib/supabase.ts` — Supabase klient
- `src/stores/auth-store.ts` — zustand store s auth stavem
- `src/hooks/use-auth.ts`, `src/hooks/use-auth-session.ts` — přihlašovací logika
- `src/types/database.ts` — TypeScript typy pro tabulky
- `supabase/schema.sql` — databázové schéma a RLS politiky
