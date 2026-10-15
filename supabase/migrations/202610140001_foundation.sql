-- CareAtHome foundation. SQL migrations are the schema source of truth.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create extension if not exists btree_gist with schema extensions;

create type public.account_role as enum ('patient','provider','admin');
create type public.profession as enum ('nurse','physiotherapist');
create type public.verification_status as enum ('Pending','Verified','Rejected','Suspended');
create type public.booking_status as enum ('Requested','Pending Assignment','Confirmed','In Progress','Completed','Cancelled','Reassignment Required');

create table public.profiles (
 id uuid primary key references auth.users(id), name text not null check(length(name) between 2 and 100),
 role public.account_role not null default 'patient', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.patient_profiles (
 id uuid primary key references public.profiles(id), address text not null default '',
 area text not null default '', updated_at timestamptz not null default now()
);
create table public.provider_profiles (
 id uuid primary key references public.profiles(id),
 profession public.profession not null, public_name text not null,
 qualifications text not null default '', experience_years integer not null default 0 check(experience_years between 0 and 70),
 specialisation text not null default '', areas text[] not null default '{}',
 verification public.verification_status not null default 'Pending',
 created_at timestamptz not null default now()
);
create table public.credentials (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id),
 object_path text not null unique, expires_on date not null, created_at timestamptz not null default now()
);
create table public.verification_history (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id),
 status public.verification_status not null, actor uuid not null references public.profiles(id),
 reason text not null check(length(reason) between 3 and 500), created_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 3 and 100),
 category public.profession not null, description text not null,
 duration_minutes integer not null check(duration_minutes between 15 and 480),
 price_minor integer not null check(price_minor >= 0), currency text not null default 'PKR' check(currency ~ '^[A-Z]{3}$'),
 active boolean not null default true
);
create table public.settings (
 id boolean primary key default true check(id),
 timezone text not null default 'Asia/Karachi',
 currency text not null default 'PKR',
 travel_buffer_minutes integer not null default 30 check(travel_buffer_minutes between 0 and 180),
 cancellation_cutoff_hours integer not null default 24 check(cancellation_cutoff_hours >= 0),
 enforce_credential_expiry boolean not null default true
);
insert into public.settings(id) values(true);
create table public.availability (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id),
 starts_at timestamptz not null, ends_at timestamptz not null, check(ends_at > starts_at),
 exclude using gist(provider_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id),
 service_id uuid not null references public.services(id), provider_id uuid references public.provider_profiles(id),
 starts_at timestamptz not null, ends_at timestamptz not null, busy_until timestamptz not null,
 address text not null check(length(address) between 5 and 500), area text not null check(length(area) between 2 and 100),
 status public.booking_status not null default 'Requested',
 price_minor integer not null check(price_minor >= 0), currency text not null,
 request_key uuid not null, created_at timestamptz not null default now(),
 unique(patient_id,request_key), check(ends_at > starts_at), check(busy_until >= ends_at),
 check(status not in ('Confirmed','In Progress','Completed') or provider_id is not null),
 exclude using gist (provider_id with =, tstzrange(starts_at,busy_until,'[)') with &&)
 where (status in ('Confirmed','In Progress'))
);
create table public.booking_history (
 id bigint generated always as identity primary key, booking_id uuid not null references public.bookings(id),
 old_status public.booking_status, new_status public.booking_status not null,
 old_provider uuid references public.provider_profiles(id), new_provider uuid references public.provider_profiles(id),
 actor uuid not null references public.profiles(id), reason text not null, created_at timestamptz not null default now()
);
create table public.audit_log (
 id bigint generated always as identity primary key, actor uuid references public.profiles(id),
 action text not null, target uuid, created_at timestamptz not null default now()
);

create function private.has_role(wanted public.account_role) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and active and role=wanted);
$$;
create function private.active_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and active);
$$;
create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen public.account_role; prof public.profession; display_name text;
begin
 chosen := case when new.raw_user_meta_data->>'role'='provider' then 'provider'::public.account_role else 'patient'::public.account_role end;
 display_name := left(trim(coalesce(new.raw_user_meta_data->>'name','New user')),100);
 if length(display_name)<2 then raise exception 'Invalid name'; end if;
 insert into public.profiles(id,name,role) values(new.id,display_name,chosen);
 if chosen='patient' then insert into public.patient_profiles(id) values(new.id);
 else
  prof := (new.raw_user_meta_data->>'profession')::public.profession;
  if prof is null then raise exception 'Profession is required'; end if;
  insert into public.provider_profiles(id,profession,public_name) values(new.id,prof,display_name);
 end if;
 return new;
end;
$$;
create trigger create_account after insert on auth.users for each row execute function private.on_signup();

-- No client receives direct write grants to authority-bearing tables.
alter table public.profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.credentials enable row level security;
alter table public.verification_history enable row level security;
alter table public.services enable row level security;
alter table public.settings enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_history enable row level security;
alter table public.audit_log enable row level security;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.services,public.provider_profiles,public.settings to anon,authenticated;
grant select on public.profiles,public.patient_profiles,public.credentials,public.verification_history,public.availability,public.bookings,public.booking_history,public.audit_log to authenticated;
create policy own_account on public.profiles for select to authenticated using (private.active_user() and (id=auth.uid() or private.has_role('admin')));
create policy own_patient on public.patient_profiles for select to authenticated using (id=auth.uid() and private.has_role('patient'));
create policy public_providers on public.provider_profiles for select to anon,authenticated using (
 (verification='Verified' and exists(select 1 from public.services where active and category=profession))
 or (id=auth.uid() and private.active_user()) or private.has_role('admin')
);
create policy own_credentials on public.credentials for select to authenticated using (private.active_user() and (provider_id=auth.uid() or private.has_role('admin')));
create policy verification_access on public.verification_history for select to authenticated using (private.active_user() and (provider_id=auth.uid() or private.has_role('admin')));
create policy service_catalogue on public.services for select to anon,authenticated using(active or private.has_role('admin'));
create policy public_settings on public.settings for select to anon,authenticated using(true);
create policy own_availability on public.availability for select to authenticated using(private.active_user() and (provider_id=auth.uid() or private.has_role('admin')));
create policy booking_access on public.bookings for select to authenticated using(private.active_user() and (patient_id=auth.uid() or provider_id=auth.uid() or private.has_role('admin')));
create policy history_access on public.booking_history for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id));
create policy admin_audit on public.audit_log for select to authenticated using(private.has_role('admin'));

create function public.update_patient_profile(p_name text,p_address text,p_area text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role('patient') then raise exception 'Not permitted'; end if;
 if length(trim(p_name)) not between 2 and 100 or length(p_address)>500 or length(p_area)>100 then raise exception 'Invalid profile'; end if;
 update public.profiles set name=trim(p_name) where id=auth.uid();
 update public.patient_profiles set address=p_address,area=p_area,updated_at=now() where id=auth.uid();
end; $$;

create function public.request_booking(p_service uuid,p_start timestamptz,p_address text,p_area text,p_request_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare svc public.services; config public.settings; new_id uuid; end_time timestamptz;
begin
 if not private.has_role('patient') then raise exception 'Not permitted'; end if;
 -- Serialise retries per patient; return the original request, never change it.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into new_id from public.bookings where patient_id=auth.uid() and request_key=p_request_key;
 if new_id is not null then return new_id; end if;
 select * into svc from public.services where id=p_service and active for share;
 if not found then raise exception 'Service unavailable'; end if;
 if p_start<=now() or p_start>now()+interval '180 days' then raise exception 'Choose a future visit within 180 days'; end if;
 if length(trim(p_address)) not between 5 and 500 or length(trim(p_area)) not between 2 and 100 then raise exception 'Invalid location'; end if;
 select * into config from public.settings where id;
 end_time:=p_start+make_interval(mins=>svc.duration_minutes);
 insert into public.bookings(patient_id,service_id,starts_at,ends_at,busy_until,address,area,price_minor,currency,request_key)
 values(auth.uid(),svc.id,p_start,end_time,end_time+make_interval(mins=>config.travel_buffer_minutes),trim(p_address),trim(p_area),svc.price_minor,svc.currency,p_request_key)
 returning id into new_id;
 insert into public.booking_history(booking_id,new_status,actor,reason) values(new_id,'Requested',auth.uid(),'Patient submitted request');
 return new_id;
end; $$;

-- Explicit progression to the assignment queue. Client cannot write status directly.
create function public.queue_booking(p_booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
 if not private.has_role('admin') then raise exception 'Not permitted'; end if;
 select * into b from public.bookings where id=p_booking for update;
 if not found or b.status<>'Requested' then raise exception 'Invalid transition'; end if;
 update public.bookings set status='Pending Assignment' where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,actor,reason) values(b.id,b.status,'Pending Assignment',auth.uid(),'Administrator reviewed request');
end; $$;

create function public.cancel_booking(p_booking uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; cutoff integer;
begin
 select * into b from public.bookings where id=p_booking for update;
 if not found or not (private.has_role('admin') or (private.has_role('patient') and b.patient_id=auth.uid())) then raise exception 'Not permitted'; end if;
 if b.status not in ('Requested','Pending Assignment','Confirmed','Reassignment Required') then raise exception 'Invalid transition'; end if;
 if length(trim(p_reason)) not between 3 and 500 then raise exception 'Reason is required'; end if;
 select cancellation_cutoff_hours into cutoff from public.settings where id;
 if not private.has_role('admin') and b.starts_at < now()+make_interval(hours=>cutoff) then raise exception 'Cancellation cutoff reached. Contact support.'; end if;
 update public.bookings set status='Cancelled' where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason)
 values(b.id,b.status,'Cancelled',b.provider_id,b.provider_id,auth.uid(),p_reason);
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('credentials','credentials',false,5242880,array['application/pdf','image/jpeg','image/png']);
create policy credential_upload on storage.objects for insert to authenticated with check(
 bucket_id='credentials' and (storage.foldername(name))[1]=auth.uid()::text and private.has_role('provider')
);
create policy credential_read on storage.objects for select to authenticated using(
 bucket_id='credentials' and private.active_user() and ((storage.foldername(name))[1]=auth.uid()::text or private.has_role('admin'))
);
-- No UPDATE/DELETE on credential objects: replacement uploads retain history.
revoke execute on all functions in schema private from public;
grant execute on function private.has_role(public.account_role),private.active_user() to anon,authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.update_patient_profile(text,text,text),public.request_booking(uuid,timestamptz,text,text,uuid),public.queue_booking(uuid),public.cancel_booking(uuid,text) to authenticated;
