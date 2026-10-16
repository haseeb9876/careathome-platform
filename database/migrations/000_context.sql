-- Native PostgreSQL request context; no Supabase services are required.
create role anon nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role authenticated nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role service_role nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create schema auth;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema auth from public;
grant usage on schema auth to anon,authenticated;
create function auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub','')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable set search_path='' as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
$$;
revoke all on all functions in schema auth from public;
grant execute on all functions in schema auth to anon,authenticated;

-- Private S3 object metadata. Actual bytes live in the private Neon bucket.
create schema storage;
revoke all on schema storage from public;
grant usage on schema storage to authenticated;
create table storage.buckets (
 id text primary key, name text not null, public boolean not null default false check(not public),
 file_size_limit bigint not null, allowed_mime_types text[] not null
);
create table storage.objects (
 id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id),
 name text not null, owner_id text not null, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), unique(bucket_id,name)
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable set search_path='' as $$
 select string_to_array(name,'/');
$$;
revoke all on function storage.foldername(text) from public;
grant execute on function storage.foldername(text) to authenticated;
grant select,insert,delete on storage.objects to authenticated;
