create role careathome_app nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role careathome_auth nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role careathome_worker nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant anon,authenticated to careathome_app;
grant service_role to careathome_worker;
grant usage on schema public to careathome_app,careathome_auth,careathome_worker,anon,authenticated,service_role;
revoke create on schema public from public;
grant select,insert,update,delete on public.identity_users,public.identity_sessions,public.identity_accounts,
 public.identity_verifications,public.identity_two_factors,public.identity_rate_limits to careathome_auth;
grant select(id,active) on public.profiles to careathome_auth;
create policy authentication_account_status on public.profiles for select to careathome_auth using(true);
alter table public.identity_users add constraint registration_account_type check("accountType" in ('patient','provider'));
alter table public.identity_users add constraint registration_profession check("accountType"<>'provider' or profession in ('nurse','physiotherapist'));
create table private.development_email (
 id uuid primary key default gen_random_uuid(), recipient text not null,
 payload_encrypted text not null, created_at timestamptz not null default now()
);
grant usage on schema private to careathome_auth;
grant insert on private.development_email to careathome_auth;
-- Only authentication internals can stamp a session after successful MFA.
-- Other logged-in sessions remain aal1 even when a user enrolls a factor.
