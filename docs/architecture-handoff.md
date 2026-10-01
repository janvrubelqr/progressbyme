# ProgressByMe — Architecture Handoff

**Purpose of this document:** a complete, self-contained brief for a more capable AI model (or human architect) to review the current implementation and the new product direction below, and help design where this goes next. It assumes no prior context on this codebase.

The document has three parts:
1. **What exists today** — stack, data model, features, as actually built and deployed.
2. **Where the product is heading** — a significant pivot and a large feature expansion, in the founder's own words plus structured elaboration.
3. **Three candidate architectures** for the new direction, with tradeoffs.

---

## Part 1 — What exists today

### Summary

ProgressByMe (public branding so far: "Progress by David") started as a **trainer-client fitness coaching app**: one real trainer (David Dubský) manages multiple clients, builds their workouts and nutrition plans, and clients log progress. It is a working, deployed MVP — not a prototype. **This trainer/client model is being abandoned** (see Part 2) in favor of a single-user, individual-facing app, so read this section as "what infrastructure and patterns exist and could be reused," not "what to preserve as-is."

### Tech stack

- **Expo SDK 57** + **Expo Router** (file-based routing; same codebase targets web, iOS, Android — only the web target has actually been exercised so far, via `expo export --platform web`, not a real native build)
- **TypeScript**, **NativeWind 4** (Tailwind for React Native) for styling
- **Zustand** for client-side app state (auth/profile, language)
- **Supabase**: Postgres + Row Level Security + Auth (email/password + Google OAuth) + Storage (not yet used) + one Edge Function. Claude (the AI assistant building this) has no service-role/direct-DB access — only REST calls via the publishable key or a signed-in user's JWT. Schema changes are hand-written SQL run manually by the founder in the Supabase SQL editor; `supabase/schema.sql` is the source of truth, `supabase/migrations/NNN_*.sql` are the incremental scripts actually run against the live DB.
- **react-i18next**, 3 languages today: Czech (primary), English, Slovak.
- **react-native-svg** for custom charts (line charts, concentric "macro ring" progress indicators), plain `Animated` (no Reanimated usage yet despite it being installed) for a small confetti-burst celebration animation and a sliding toggle.
- **expo-location** for device geolocation (used for a live-weather-based water-intake goal).
- No AI/LLM integration exists anywhere in the app yet. No camera/video/ML libraries beyond what's listed.

### Deployment

- **Web build only**, hosted on **Vercel**, connected to GitHub (`janvrubelqr/progressbyme`, branch `main`) for auto-deploy on push. Build command `npm run build:web` → `expo export --platform web` (static SPA-style web export) + a post-processing script that works around a Vercel quirk (it silently drops any file path containing a literal `node_modules` segment, which is where Expo puts hashed font/icon assets).
- Live at `https://progressbyme.vercel.app`. No native (iOS/Android) build has been produced — that requires EAS Build and an Apple Developer account, both still pending.
- No CI/test suite. No staging environment — `main` *is* production.

### Data model (current, trainer/client-shaped)

- `profiles` — one row per auth user. `role: 'client' | 'trainer'`. Client-relevant fields: `date_of_birth, sex, height_cm, fitness_goal (lose_weight|gain_muscle|maintain|improve_endurance), activity_level, health_conditions (free text), dietary_restrictions (free text), phone, trainer_id` (FK to the trainer's own profile row).
- `client_intake` — a trainer can pre-register a client (name/email/phone/age/weight/height/sex/goal) before they sign up; on matching-email signup the client auto-links to that trainer and inherits the pre-filled fields. Paired with a Resend-based invite email Edge Function (`supabase/functions/send-client-invite`) — built but not fully live (no verified sending domain yet).
- `exercises` + `exercise_translations` — a **shared exercise library** (not per-trainer): slug, `muscle_groups text[]`, `movement_type` (strength/cardio/mobility/stretch/isometric/plyometric/balance), `difficulty`, `equipment`, `min_age/max_age`, `contraindications text[]` (cross-referenced loosely against `health_conditions`); translations carry name/description/video_url per language. Seeded with ~106 exercises (105 imported from a reference spreadsheet + a few hand-made). **Each exercise currently has exactly one "primary" muscle-group array with no per-muscle weighting** — this is explicitly called out as insufficient in Part 2.
- `workouts` + `workout_translations` + `workout_exercises` + `workout_logs` — a workout is trainer-assigned, has a `category` (home/gym/cardio/rehab), a per-language title, an ordered list of exercises (each either a library reference or a one-off custom entry with its own sets/reps/rest/tempo/video/notes), and a client-side "mark as done" log.
- `foods` — a shared ingredient library (name + kcal/protein/carbs/fat **per 100g**), ~50 common items seeded. `nutrition_plans` → `meals` → `meal_items` (each item can reference a `food_id`, auto-scaling macros by entered grams, or be a manual one-off entry).
- Daily trackers, each `(client_id, date)` unique: `weight_logs`, `step_logs`, `blood_pressure_logs (systolic, diastolic, pulse)`, `water_intake (liters, goal_liters)`.
- `check_ins` + `check_in_photos` — weekly check-in with measurements/ratings as JSON, photo attachments (table exists; UI is minimal/incomplete).
- RLS throughout: clients see only their own rows; trainers see rows of clients where `trainer_id = auth.uid()`; a `is_trainer()` / `is_trainer_of(client_id)` pair of `security definer` SQL functions gate writes to shared library tables.

### Feature surface (client side — the part most relevant going forward)

- **Auth**: email/password + Google OAuth, i18n-aware.
- **Home dashboard**: next scheduled workout, quick links to nutrition/check-in, and four "progress" trackers.
- **Weight / Steps / Blood pressure trackers**: inline on Home, **auto-save** (debounced ~700ms after typing stops, no explicit save button — this was an explicit, deliberate UX decision after initially shipping save buttons and then removing them), a 4-day sparkline inline + a full history screen (30-day chart + list + a rule-based trend comment, e.g. "down 4.8 kg this month — great progress toward your goal", goal-aware). **Celebration pattern**: when a new entry moves in a "good" direction versus the last one (steps up; weight down, or up if goal is `gain_muscle`; blood pressure moving back toward the 90–120 systolic band from outside it), a small confetti burst + a one-line motivational comment fires. This "detect improvement → confetti + comment" pattern is the established house style for positive reinforcement and is explicitly meant to be reused for new metrics.
- **BMI**: computed client-side from latest weight + profile height, shown with a category-specific motivational comment (not just a number).
- **Water tracker**: the most "intelligent" feature so far — the daily goal is **not static**. It's computed from: latest logged body weight (ml/kg formula with a literature-sourced coefficient, documented in `knowledge-base/hydration-guidelines.md`), a bonus if a workout is scheduled today (scaled by workout category as an exertion proxy), and a **live weather lookup** (Open-Meteo, no API key, via device geolocation) adding a bonus above 30°C. This is the one place real external-data-driven personalization already exists.
- **Weather card** on Home: current temp/condition/today's high-low via the same weather hook, plus a rule-based advisory ("rain/cold expected, consider training indoors") with **concrete exercise suggestions pulled from the exercise library** (filtered by `movement_type=cardio, equipment=bodyweight`) when today's workout is outdoor-ish and the weather is bad. This is a hand-rolled, non-AI version of "weather-appropriate training" — Part 2 asks for this to become a real AI capability.
- **Nutrition**: a client-visible plan (trainer-authored) with concentric "macro ring" progress visuals (kcal/protein/carbs/fat vs. target, Apple-Fitness-style), meals broken into items. The *trainer-side* builder has a food-library autocomplete that auto-computes macros from grams entered.
- **Calendar**: month-grid + list view of scheduled workouts.
- **"My Account"** (client only): name/email(read-only)/phone/DOB/sex/height/goal/activity-level/health-conditions/dietary-restrictions, reachable via a settings gear icon.
- **Role switch**: client ⇄ trainer toggle (self-serve role flip, used mainly for testing) — **this entire concept is being removed** per Part 2.
- No light/dark mode — the app is **hard-coded dark** (`userInterfaceStyle: "dark"` in `app.json`, every component uses fixed dark-palette hex colors, no theming layer exists).
- No camera, video analysis, AI chat, body scanning, wearable integration, or voice input anywhere today.

### Known limitations worth flagging to an architect

- Everything above was built web-first for fast iteration; **no native build has ever been produced or tested**. Some requested features (live camera pose analysis, on-device ML, wearable SDKs) are native-only or native-much-better capabilities and will force a move off the pure-managed-Expo-web workflow.
- Exercise↔muscle relationship is a flat tag array, not a weighted many-to-many mapping — insufficient for "this exercise impacts chest 70%, triceps 30%" style reasoning requested in Part 2.
- No AI/LLM calls exist; no backend service layer beyond Supabase (PostgREST + one Edge Function) — any "AI coach," image/voice processing, or agent-orchestration work starts from zero.
- No payment/subscription infrastructure.
- No automated tests.

---

## Part 2 — Where the product is heading (founder's direction, verbatim + structured)

The founder's own words (Czech), preserved verbatim for fidelity, followed by a structured breakdown:

> rad bych nas design aplikace a architekturu prohnal lepsim modelem [...] aplikaci nebudeme stavet pro trenery ale pro jednotlivce, cast kde se prepina na trenera vyhodime. budeme chtit aby aplikace mela jak light tak i dark mode. aby byla v jazycich ktere davaji smysl a maji dosah (tj. vedle anglictiny a spanelstiny, asi i nemcina, italstina, francouzstina, polstina - co cinstina a indstina?) budeme chtit byt schopni udelat AI Scan tela a odhadnout ruzne ukazatele ktere jsou dulezite pro zdravi, vahu a zdravy zivotni styl... a pak mit moznost zapnout docasne kameru aby mi rekla, ktere chyby delam pri posilovani ci jinych cvicich... chceme AI interaktivniho coache, ktery bude lidi motivovat, dynamicky menit trenink na zaklade soucasne zdravotni situace, vyspani, predchozi zatezi... u cviku bychom meli vedet i jednotlivy impact na ruzne svaly, jeden cvik muze impaktovat vice nez jeden sval.... menu se bude moci menit dle priorit klienta bude tam nejaky uvodni dotaznik ci pokec ohledne soucasne situace a cilu videa by mela i detailne ukazovat na ktere casti tela si davat u cviku pozor (nejak graficky zvyraznit) mit moznost vytvaret digitalni trenery s videi v ruznych jazycich a skinech bere to vstupy ze vsech moznych health devices, pridat mental sekci, ale davat pozor abychom se nedostali do problemu v ramci mentalnich "rad" interaktivni moznost i vyfotit co jsi jedl a reakce, vypocet kalorii na zaklade fotky ci voicem a uprava pripadne treninku kdyby se clovek citil precpany... zaroven kontrolovat pocasi a navrhovat weather appropriate treninky tj. pokud je treba hrozne horko tak nedavat venku cardio, nebo kdyz bude hodne prset tak take neco uvnitr. videa aby mela automaticke transcripce zapnutelne ve vsech tech jazycich co by tam mely byt. Motivacni, ne sterilni a presny, ale chces mit AI coache jako oporu s kterym muzes pokecat a ktery upravi davky tak aby te to bavilo... treninky budou ne jen posilovani, ale stretching, cardio, cokoliv co ti dava smysl, aby to bylo i pro starsi generace ci mlade kde je cviceni formou hry.... chci mit moznost vytvaret videa - ne nutne v mem toolu.

### Structured feature list

1. **Business-model pivot: B2C individual app, not trainer/client.** Remove the trainer role and the client↔trainer switcher entirely. Every user is a self-directed individual.
2. **Theming**: light mode + dark mode (today: dark-only, hard-coded).
3. **Localization expansion**: beyond cs/en/sk, add at minimum ES, DE, IT, FR, PL. Open question from the founder: should ZH (Chinese) and HI (Hindi) be included? (Both are large-reach but have meaningfully different localization costs: ZH needs its own font/CJK rendering considerations and often a separate content/market strategy; HI needs Devanagari script support. Flag as a decision point, not a default yes/no.)
4. **AI body scan**: estimate health-relevant body indicators (implied: body composition, posture, proportions — not specified further) from some kind of scan, likely photo/video-based given the rest of the ask.
5. **Live camera form-check**: user can temporarily turn on the camera during strength/other exercises and get real-time (or near-real-time) feedback on form mistakes.
6. **AI interactive coach**: conversational, motivational (explicitly: "ne sterilni a presny" — not sterile/clinical — "chces mit AI coache jako oporu s kterym muzes pokecat" — a coach you can chat with as support), that:
   - dynamically adjusts the day's training based on current health status, sleep, and recent training load,
   - adjusts "dosage" (intensity/volume) to keep the user engaged and not burned out.
7. **Per-muscle exercise impact weighting**: an exercise can impact more than one muscle, with relative weighting (not just a flat tag list as today).
8. **Priority-driven, editable "menu"** (nutrition) that adapts to the client's stated priorities.
9. **Onboarding questionnaire / conversational intake** about current situation and goals (richer than today's static profile form).
10. **Exercise videos with visual body-part callouts**: graphically highlight which part of the body to pay attention to / protect during a given exercise.
11. **"Digital trainers"**: creatable video presenters with different skins/appearances, dubbed/presented in multiple languages.
12. **Health device integration**: ingest data from "all possible health devices" (wearables, phone health platforms — Apple Health / Google Health Connect, and third-party wearables by extension).
13. **Mental health section** — explicitly flagged by the founder as needing care: *"pridat mental sekci, ale davat pozor abychom se nedostali do problemu v ramci mentalnich 'rad'"* — add a mental-health section, but be careful not to get into trouble over mental-health "advice." This is a direct ask to scope this conservatively (wellness/journaling/breathing content, clear disclaimers, no diagnostic or therapeutic claims) rather than letting an LLM freely dispense mental-health guidance.
14. **Photo/voice-based food logging**: photograph what you ate, get a reaction + calorie estimate from the photo or via voice description; optionally adjust the day's training if the user reports feeling overly full.
15. **Weather-appropriate training** (already partly built as a rule-based v1 — see Part 1 — to be upgraded): extreme heat → no outdoor cardio; heavy rain → indoor alternative, etc.
16. **Auto-transcription for all exercise/trainer videos**, toggleable, in every supported language.
17. **Tone requirement, restated for emphasis**: motivational and conversational, not sterile/clinical; the AI coach should feel like genuine support, adjusting load so the user keeps enjoying it.
18. **Training variety beyond strength**: stretching, cardio, anything that "makes sense" for the user — explicitly including older generations and children/younger users, for whom exercise should be gamified ("cviceni formou hry").
19. **Video creation capability**: the founder wants the *ability* to create videos (for the digital trainers / exercise library), but explicitly says it doesn't need to be built as an in-house tool — integrating an existing third-party video-generation tool is acceptable and likely preferable.

### Explicit open questions the founder raised

- Which additional languages beyond the clear EN/ES/DE/IT/FR/PL set are worth it — specifically ZH and HI?

### Open questions this document is adding (for the architecture review, not yet asked of the founder)

- **Regulatory/liability surface is large and should be scoped deliberately before building**:
  - AI-estimated body composition / health indicators from photos can brush up against "medical device" or health-claims regulation depending on jurisdiction and how results are framed (wellness estimate vs. diagnostic claim) — the EU (founder is Czech/EU-based) also has the AI Act's risk-tiering to consider for health-adjacent AI features.
  - Photos/video of a user's body and any inferred health data are **special-category personal data under GDPR** — this affects storage, consent flow, retention, and whether raw media should ever leave the device at all for some features (see Architecture B/C below).
  - A "mental health section" powered by an LLM needs explicit guardrails (scope to wellness content, crisis-resource fallback, no therapeutic/diagnostic framing) — the founder already flagged this; it should be a hard architectural boundary (a separately-prompted, separately-reviewed module), not just a system-prompt instruction.
- **Monetization model** is undetermined but will shape architecture significantly (AI inference costs scale with usage — a subscription tier structure, usage caps, or cost-aware model routing (cheap model for routine coaching chat, expensive model only for complex planning) may be needed).
- **Platform target**: does this become a real native app now (required for on-device camera ML, HealthKit/Health Connect, background wearable sync), or does it stay web-first longer? Several requested features (live camera, wearables, offline-capable chat) are meaningfully harder or impossible in a pure web build.
- **Video/digital-trainer pipeline**: is this founder-facing content tooling (David/the founder produces videos admin-side) or literally AI-generated per-user content? The ask reads as the former ("chci mit moznost vytvaret videa" — a tool *the founder* can use) rather than runtime AI video generation per workout, but this should be confirmed.

---

## Part 3 — Three candidate architectures

All three keep the existing Expo + Supabase foundation for the "boring" 80% (auth, profiles, workout/nutrition data, trackers, i18n, the already-working weather/hydration logic) rather than throwing it away — that layer is proven and the pivot is additive (minus the trainer role, which is a deletion, not a rewrite). They differ in **how far AI/ML processing moves on-device vs. cloud, and how much new backend infrastructure gets introduced.**

### Architecture A — "Managed AI Platform" (cloud-first, fastest to ship)

Keep the app on Expo's managed workflow as long as possible. Every AI capability is a call to a third-party or first-party cloud API from a thin backend layer (Supabase Edge Functions, or a small serverless API if Edge Functions prove too limited).

- **AI coach / chat**: Claude (or similar) via a backend proxy function with tool-calling against the user's own Supabase data (read workouts/trackers/sleep, propose plan edits written back through the same RLS-protected tables).
- **Body scan & form-check**: send photos/video frames to a cloud vision/pose model (e.g., a hosted pose-estimation API, or multimodal LLM vision calls) rather than running anything on-device. Simpler to build; introduces network latency unsuitable for true real-time form feedback (more "post-set review" than "live rep-by-rep correction"), and raises the GDPR/special-category-data stakes described above since media leaves the device.
- **Food photo logging**: multimodal LLM call (photo + optional voice transcript) → calories/macros.
- **Wearables**: a managed aggregator (e.g. a service like Terra/Spike) normalizes Apple Health/Google Health Connect/third-party wearables into one feed, consumed via webhook/polling — avoids writing N native integrations by hand.
- **Video dubbing/transcription/digital trainers**: integrate an existing third-party pipeline (matches the founder's own "doesn't need to be my tool" stance) rather than building one.
- **Theming/i18n/trainer removal**: pure app-layer work, same regardless of architecture choice.

**Tradeoffs**: fastest to a demoable product; lowest up-front engineering investment; but per-user AI cost scales directly with usage with little control, no real-time camera feedback is possible this way, and most health-sensitive media transits to third parties (compliance surface is largest here).

### Architecture B — "Hybrid Edge + Cloud" (pragmatic middle ground)

Same cloud-AI usage as A for anything that tolerates latency (coaching chat, plan generation, food-photo estimation, translation/dubbing pipeline), but moves **latency- and privacy-sensitive inference on-device**:

- Requires leaving Expo's pure managed workflow for a **custom dev client / bare workflow** (still Expo-tooled, just with native modules) to embed an on-device pose-estimation model (e.g., MediaPipe Pose / ML Kit / Core ML depending on platform) for the live camera form-check — gives real near-real-time rep feedback without a network round-trip, and keeps raw video off any server by default (only derived skeleton/joint-angle data, if anything, could optionally be sent up).
- Body scan: either an on-device estimation model (lower accuracy, strong privacy story) or an explicit, clearly-consented cloud upload path with short retention — architecture should support both and let policy decide later rather than hard-coding one.
- Introduces a proper **backend service** (not just Edge Functions) to orchestrate: the AI coach's access to a growing "health signals" dataset (sleep, HRV, recent load, wearable feed, mood/check-in entries), dynamic plan adjustment logic, and async jobs (video transcription, body-scan processing) via a job queue rather than synchronous request/response.
- Exercise data model gains a **weighted muscle-impact table** (exercise → muscle → weight, many-to-many) and a **body-region-callout schema** per exercise (for video overlays), both straightforward Postgres additions.
- Mental-health module is a **separately scoped, separately prompted** feature behind its own guardrail layer (distinct system prompt, content filters, crisis-resource fallback), not mixed into the general coach prompt.

**Tradeoffs**: meaningfully more engineering than A (native modules, a real backend service, a job queue), but delivers the one feature that's genuinely hard to fake well in pure-cloud (live form correction) and gives a much better privacy/compliance story for body-related data. This is the natural "grow into it" path from what exists today.

### Architecture C — "Modular AI-Agent Platform" (most ambitious, long-horizon)

Everything in B, plus treating the AI coach as a true **orchestrating agent with tool access** (in the spirit of the Claude Agent SDK / function-calling agent pattern) rather than a chat wrapper around fixed app logic — the agent itself decides, within guardrails, what to read and what to propose (adjust today's workout, log a meal, nudge a check-in) by calling well-defined tools against the data layer, instead of the app hard-coding "if sleep < X then reduce volume by Y."

- **Agent-orchestration service** as its own backend component, with a tool registry (read trackers, read/write workout plan, read wearable feed, log food, schedule a check-in, etc.), each tool scoped by the same RLS-equivalent authorization the data layer already has.
- **Content/exercise pipeline as its own module**: structured per-exercise metadata (muscle-impact weights, body-region callouts, difficulty/variant graph for "stretching/cardio/anything, for any age") becomes the shared substrate consumed by the agent (for planning), the video player (for overlays), and the live form-checker (for ground-truth joint angles to check against) — one schema, three consumers, instead of three separate ad-hoc systems.
- **Unified health-data layer**: wearable/device inputs normalized into one internal schema regardless of source, so the agent and the UI never special-case "this came from Apple Health vs. a manual log."
- **Mental-health module** as a hard architectural boundary (own service/prompt/guardrails, explicitly not given the same tool-calling freedom as the fitness coach — e.g., no ability to "prescribe," only to suggest wellness content and surface crisis resources).
- **Video/digital-trainer content** stays an external pipeline/integration (per the founder's own preference), publishing into the same exercise-video schema the rest of the system consumes.

**Tradeoffs**: most future-proof and most personalized at the core — new capabilities become new tools for the same agent rather than new bolted-on features — but by far the most upfront complexity and cost, and likely overkill before there's a real user base validating demand for dynamic, agentic coaching versus simpler rule-based personalization (which is what's already working for the weather/hydration feature today).

### A light-touch recommendation (not a decision — for the reviewing model to weigh in on)

Given what's already built and working (B2C pivot aside, the hydration/weather logic proves rule-based personalization works and is cheap), **B as a starting point with a clear path to C** seems like the pragmatic middle: it unlocks the one feature (live camera form-check) that's genuinely bad as a pure cloud round-trip, forces the native-app decision that several other requested features need anyway (wearables, HealthKit), and doesn't require betting the whole coach on agent orchestration before there's evidence users want that depth of dynamism. A is worth prototyping first for the conversational coach alone, since that part is architecture-agnostic and can ship fastest regardless of which option wins for the harder features.
