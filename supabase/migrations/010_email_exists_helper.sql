-- Migration: helper the send-client-invite edge function uses to check
-- whether an account already exists for a given email (auth.users isn't
-- readable via the public API otherwise).
-- Run in the Supabase SQL editor of the existing project.

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
