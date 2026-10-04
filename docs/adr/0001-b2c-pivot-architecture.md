# ADR 0001: B2C pivot + architektura „Vlastní mozek, koupené smysly“ (varianta B), start jako B-lite

- **Status:** Accepted
- **Datum:** 2026-10-02
- **Kontext:** navazuje na `docs/architecture-handoff.md` a architektonický návrh (3 varianty A/B/C) zpracovaný modelem Claude Opus 5.5

## Rozhodnutí

1. **Produkt se mění z trainer/client na B2C pro jednotlivce.** Přepínač klient/trenér a trenérský self-serve flow se odstraňují z uživatelsky dostupných cest. Trenérské obrazovky se nemažou, přestavují se na interní „Studio“ (správa cviků, programů, médií) dostupné jen přes admin roli.
2. **Architektura: varianta B „Vlastní mozek, koupené smysly“.**
   - Vlastní vývoj: coaching engine (Davidova metodika jako data, ne jako prompt), znalostní graf cviků (vážené svaly, varianty, pravidla pro kameru), validátor bezpečnosti dávek s auditním logem.
   - Nákup/komodita: wearables agregátor (až ve fázi 3), avatary a dabing, auto-titulky, platby (RevenueCat), video hosting (Bunny Stream / Mux).
   - Kontrola techniky cvičení běží on-device (VisionCamera + MediaPipe Pose) — video neopouští telefon, na server jdou jen odvozená čísla (úhly, počty opakování).
3. **Start jako „B-lite“**: první ~3 měsíce běží coach service na Supabase Edge Functions (žádná nová backend služba zatím), ale datový model a rozhraní se od začátku píšou v cílové podobě B (nástroje/tools, validátor, auditní log), aby se nic nepřepisovalo při přechodu na plné B (vlastní coach service + workflow engine) ve fázi 2.
4. **Nativní appka hned**, ne web-first. Apple Health / Health Connect, kamera a notifikace vyžadují nativní prostředí. Řeší se přes Expo development build + config pluginy — **ne** nutně opuštění Expo ekosystému (oprava oproti dřívějšímu handoff dokumentu).
5. **Jazyky**: ZH a HI se zatím nepřidávají. Pořadí trhů: CZ/SK → PL → DE/AT → ES/IT/FR.
6. **Video**: cvičební videa v appce přes vlastní platformu (Bunny Stream), v betě prozatím může zůstat YouTube embed/link. YouTube se používá jako marketingový kanál, ne jako nosič placeného obsahu.
7. **Platby**: RevenueCat nad App Store / Google Play pro předplatné v appce; Stripe jen pro web (founding membership před launchem appky, B2B faktury).
8. **Analytika**: PostHog (EU region), s explicitním vyloučením zdravotních hodnot z eventů a maskováním citlivých polí v session replay.
9. **Regulace jako architektonická podmínka, ne dodatek**: wellness pozicování (ne diagnostika), granulární souhlasy, DPIA před betou, mentální sekce jako oddělený modul bez přístupu k tréninkovým nástrojům a s pevným krizovým protokolem.

## Roadmapa (fáze s brankami)

- **F0 (měsíc 1):** pivot v kódu, light/dark mode, nativní buildy, staging prostředí, PostHog + Sentry, právní minimum.
- **F1 (měsíce 2–4):** onboarding, training engine v1, Apple Health/Health Connect, AI coach + validátor, jídlo z fotky/hlasu, počasí v2.
- **F2 (měsíce 5–7):** kamera na 10–15 cviků, přehrávač s překryvy a titulky, digitální avatar, jídelníček podle priorit, přechod na plné B, veřejný launch CZ/SK.
- **F3 (měsíc 8+):** body scan, wearables agregátor, senioři, rodinný režim, hlasový coach, DE.

Detailní zdůvodnění, srovnávací tabulka variant, ekonomika AI a kompletní seznam rizik: viz publikovaný návrh architektury (odkaz v `project-progressbyme-pivot-vision` memory).

## Zamítnuté alternativy

- **Varianta A („Rychlá skládačka“):** rychlejší start, ale slabé odlišení (kopírovatelná skládačka cizích API), horší marže při růstu, žádná reálná kontrola nad AI radami. Zamítnuto jako cílová architektura — jako *rychlost* B-lite ji ale v prvních měsících fakticky využíváme.
- **Varianta C („AI-nativní platforma“):** nejvyšší potenciál, ale staví technologii (agenti, vlastní modely) dřív, než je ověřená poptávka, a vyžaduje tým 8–15 lidí a investici. Zamítnuto pro teď, ponecháno jako cesta po ověření PMF.

## Důsledky

- Trenérský kód se nemaže, ale krátkodobě zůstává nevyužitý / přesunutý za admin roli — nutné zohlednit při úklidu RLS politik.
- Vyžaduje Apple Developer účet (firma, D-U-N-S) a Google Play Console založené před koncem F0.
- Staging Supabase projekt nutný dřív, než se začne měnit datový model (role, RLS) — migrace přestává být „ruční SQL v produkci“.
