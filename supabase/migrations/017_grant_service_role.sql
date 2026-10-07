-- Migration: grant the service_role full table privileges in the public
-- schema. RLS bypass (which service_role gets automatically) and table-
-- level GRANTs are separate Postgres permission layers — schema.sql only
-- ever granted to `authenticated`, so every Edge Function using the
-- service-role client (generate-starter-plan, send-client-invite) has
-- been hitting "permission denied for table X" on every query, silently
-- swallowed wherever the calling code didn't surface the underlying error.
-- `alter default privileges` covers tables created by future migrations
-- too, so this shouldn't need repeating.
-- Run this in the Supabase SQL editor of the existing project.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
