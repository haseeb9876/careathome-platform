
-- Provider onboarding, scheduling, assignments and clinical records.
alter table public.provider_profiles add column bio text not null default '';
alter table public.provider_profiles add column languages text[] not null default array['English'];
alter table public.provider_profiles add column demo boolean not null default false;
alter table public.credentials add column label text not null default 'Professional credential';
alter table public.credentials add column reviewed_at timestamptz;
alter table public.credentials add column reviewer uuid references public.profiles(id);
alter table public.settings add column require_admin_mfa boolean not null default false;
alter table public.bookings add column preferred_provider_id uuid references public.provider_profiles(id);
alter table public.booking_history add column old_start timestamptz;
alter table public.booking_history add column new_start timestamptz;
create index bookings_patient_time on public.bookings(patient_id,starts_at desc);
create index bookings_provider_time on public.bookings(provider_id,starts_at);
create index history_booking on public.booking_history(booking_id,created_at);

create table public.provider_contacts (
 provider_id uuid primary key references public.provider_profiles(id),
 phone text not null default '' check(length(phone)<=30)
);
create table public.provider_services (
 provider_id uuid references public.provider_profiles(id),service_id uuid references public.services(id),
 primary key(provider_id,service_id)
);
create table public.time_off (
 id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.provider_profiles(id),
 starts_at timestamptz not null,ends_at timestamptz not null,reason text not null default '',
 check(ends_at>starts_at)
);
create table public.session_records (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.bookings(id),
 patient_id uuid not null references public.profiles(id),provider_id uuid not null references public.provider_profiles(id),
 service_id uuid not null references public.services(id),visit_at timestamptz not null,
 observations text not null check(length(observations) between 3 and 10000),
 patient_report text not null default '' check(length(patient_report)<=10000),
 notes text not null default '' check(length(notes)<=10000),
 mobility_minutes integer check(mobility_minutes between 0 and 1440),
 author uuid not null references public.profiles(id),author_name text not null,
 created_at timestamptz not null default now()
);
create table public.record_amendments (
 id uuid primary key default gen_random_uuid(),record_id uuid not null references public.session_records(id),
 author uuid not null references public.profiles(id),author_name text not null,
 content text not null check(length(content) between 3 and 10000),reason text not null check(length(reason) between 3 and 500),
 created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 booking_id uuid references public.bookings(id),title text not null,body text not null,
 event_key text not null unique,read_at timestamptz,created_at timestamptz not null default now()
);
create table private.email_outbox (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null unique references public.notifications(id),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),
 delivered_at timestamptz,locked_until timestamptz,last_error text
);

create function private.admin_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select private.has_role('admin') and (not (select require_admin_mfa from public.settings where id) or coalesce(auth.jwt()->>'aal','')='aal2');
$$;
create function private.account_active(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=p_id and active);
$$;
create function private.audit(p_action text,p_target uuid) returns void language sql security definer set search_path='' as $$
 insert into public.audit_log(actor,action,target) values(auth.uid(),p_action,p_target);
$$;
create function private.notify(p_user uuid,p_booking uuid,p_title text,p_key text) returns void language plpgsql security definer set search_path='' as $$
declare nid uuid;
begin
 if p_user is null then return; end if;
 insert into public.notifications(user_id,booking_id,title,body,event_key)
 values(p_user,p_booking,p_title,'Open your workspace for the latest visit information.',p_key)
 on conflict(event_key) do nothing returning id into nid;
 if nid is not null then insert into private.email_outbox(notification_id) values(nid); end if;
end; $$;
create function private.booking_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.notify((select patient_id from public.bookings where id=new.booking_id),new.booking_id,'Visit update: '||new.new_status,'history:'||new.id||':patient');
 perform private.notify(new.new_provider,new.booking_id,'Visit update: '||new.new_status,'history:'||new.id||':provider');
 if new.old_provider is distinct from new.new_provider then perform private.notify(new.old_provider,new.booking_id,'Your visit assignment changed','history:'||new.id||':previous'); end if;
 return new;
end; $$;
create trigger notify_booking after insert on public.booking_history for each row execute function private.booking_event();

-- Restrict operational admin access when configured MFA is required.
create or replace function private.has_role(wanted public.account_role) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and active and role=wanted)
 and (wanted<>'admin' or not (select require_admin_mfa from public.settings where id) or coalesce(auth.jwt()->>'aal','')='aal2');
$$;

drop policy public_providers on public.provider_profiles;
create policy public_providers on public.provider_profiles for select to anon,authenticated using (
 (verification='Verified' and private.account_active(id)) or (id=auth.uid() and private.active_user()) or private.has_role('admin')
);
alter table public.provider_contacts enable row level security;
alter table public.provider_services enable row level security;
alter table public.time_off enable row level security;
alter table public.session_records enable row level security;
alter table public.record_amendments enable row level security;
alter table public.notifications enable row level security;
create policy contact_read on public.provider_contacts for select to authenticated using(private.active_user() and (provider_id=auth.uid() or private.has_role('admin')));
create policy provider_service_read on public.provider_services for select to anon,authenticated using(exists(select 1 from public.provider_profiles p where p.id=provider_id));
create policy time_off_read on public.time_off for select to authenticated using(private.active_user() and (provider_id=auth.uid() or private.has_role('admin')));
create policy record_read on public.session_records for select to authenticated using(private.active_user() and (patient_id=auth.uid() or provider_id=auth.uid()));
create policy amendment_read on public.record_amendments for select to authenticated using(exists(select 1 from public.session_records r where r.id=record_id));
create policy notification_read on public.notifications for select to authenticated using(user_id=auth.uid() and private.active_user());
revoke all on public.provider_contacts,public.provider_services,public.time_off,public.session_records,public.record_amendments,public.notifications from anon,authenticated;
grant select on public.provider_contacts,public.time_off,public.session_records,public.record_amendments,public.notifications to authenticated;
grant select on public.provider_services to anon,authenticated;
revoke all on private.email_outbox from anon,authenticated;

create function private.release_provider(p_provider uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
 for b in select * from public.bookings where provider_id=p_provider and status='Confirmed' and ends_at>now() for update loop
  update public.bookings set status='Reassignment Required' where id=b.id;
  insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason)
  values(b.id,b.status,'Reassignment Required',p_provider,p_provider,auth.uid(),p_reason);
 end loop;
end; $$;

create function public.save_provider(p_name text,p_qualifications text,p_experience integer,p_specialisation text,p_areas text[],p_bio text,p_phone text,p_services uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles;
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 select * into p from public.provider_profiles where id=auth.uid() for update;
 if length(trim(p_name)) not between 2 and 100 or length(trim(p_qualifications)) not between 3 and 2000 or length(p_bio)>2000 or length(p_specialisation)>200 or p_experience not between 0 and 70 or coalesce(cardinality(p_areas),0) not between 1 and 20 or p_phone !~ '^\+?[0-9 ()-]{7,25}$' then raise exception 'Check professional profile fields'; end if;
 if p.verification='Suspended' then raise exception 'Contact administration to update a suspended application'; end if;
 if exists(select 1 from unnest(p_services) s where not exists(select 1 from public.services where id=s and category=p.profession and active)) then raise exception 'Service does not match your profession'; end if;
 if p.verification='Verified' then perform private.release_provider(p.id,'Professional details changed; re-verification required'); end if;
 update public.provider_profiles set public_name=trim(p_name),qualifications=p_qualifications,experience_years=p_experience,specialisation=p_specialisation,areas=p_areas,bio=p_bio,verification='Pending' where id=p.id;
 update public.profiles set name=trim(p_name) where id=p.id;
 insert into public.provider_contacts(provider_id,phone) values(p.id,p_phone) on conflict(provider_id) do update set phone=excluded.phone;
 delete from public.provider_services where provider_id=p.id;
 insert into public.provider_services select p.id,unnest(p_services);
 insert into public.verification_history(provider_id,status,actor,reason) values(p.id,'Pending',auth.uid(),'Provider submitted professional details');
 perform private.audit('provider_application_updated',p.id);
end; $$;

create function public.register_credential(p_path text,p_expiry date,p_label text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 if split_part(p_path,'/',1)<>auth.uid()::text or p_expiry<current_date or length(p_label) not between 3 and 100 or not exists(select 1 from storage.objects where bucket_id='credentials' and name=p_path and owner_id=auth.uid()::text) then raise exception 'Invalid credential'; end if;
 insert into public.credentials(provider_id,object_path,expires_on,label) values(auth.uid(),p_path,p_expiry,p_label) returning id into result;
 perform private.audit('credential_submitted',result);
 return result;
end; $$;

create function public.verify_provider(p_provider uuid,p_status public.verification_status,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.provider_profiles;
begin
 if not private.admin_allowed() then raise exception 'Administrator verification required'; end if;
 select * into p from public.provider_profiles where id=p_provider for update;
 if not found or length(trim(p_reason)) not between 3 and 500 then raise exception 'A decision reason is required'; end if;
 if not ((p.verification='Pending' and p_status in ('Verified','Rejected')) or (p.verification='Verified' and p_status='Suspended') or (p.verification='Suspended' and p_status='Verified')) then raise exception 'Invalid verification transition'; end if;
 if p_status='Verified' and (length(p.qualifications)<3 or cardinality(p.areas)=0 or not private.account_active(p.id) or not exists(select 1 from public.credentials where provider_id=p.id and expires_on>=current_date) or not exists(select 1 from public.provider_services where provider_id=p.id)) then raise exception 'Complete profile, eligible service and current credential required'; end if;
 update public.provider_profiles set verification=p_status where id=p.id;
 if p_status='Verified' then update public.credentials set reviewed_at=now(),reviewer=auth.uid() where provider_id=p.id and expires_on>=current_date; end if;
 insert into public.verification_history(provider_id,status,actor,reason) values(p.id,p_status,auth.uid(),p_reason);
 if p_status='Suspended' then perform private.release_provider(p.id,p_reason); end if;
 perform private.audit('provider_'||lower(p_status::text),p.id);
 perform private.notify(p.id,null,'Application update: '||p_status,'verification:'||gen_random_uuid());
end; $$;

create function public.save_availability(p_id uuid,p_start timestamptz,p_end timestamptz,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare old public.availability;
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 perform 1 from public.provider_profiles where id=auth.uid() and verification='Verified' for update;
 if not found then raise exception 'Verification required'; end if;
 if p_id is not null then
  select * into old from public.availability where id=p_id and provider_id=auth.uid() for update;
  if not found then raise exception 'Availability not found'; end if;
  if exists(select 1 from public.bookings where provider_id=auth.uid() and status in ('Confirmed','In Progress') and tstzrange(starts_at,ends_at,'[)') && tstzrange(old.starts_at,old.ends_at,'[)')) then raise exception 'Reassign or cancel associated visits first'; end if;
 end if;
 if p_delete then delete from public.availability where id=p_id and provider_id=auth.uid(); return; end if;
 if p_end<=p_start or p_end<=now() then raise exception 'Choose a valid future time range'; end if;
 if p_id is null then insert into public.availability(provider_id,starts_at,ends_at) values(auth.uid(),p_start,p_end);
 else update public.availability set starts_at=p_start,ends_at=p_end where id=p_id; end if;
end; $$;

create function public.manage_time_off(p_id uuid,p_start timestamptz,p_end timestamptz,p_reason text,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 perform 1 from public.provider_profiles where id=auth.uid() for update;
 if p_delete then delete from public.time_off where id=p_id and provider_id=auth.uid(); return; end if;
 if p_end<=p_start or p_end<=now() or length(p_reason)>500 then raise exception 'Invalid time off'; end if;
 if exists(select 1 from public.bookings where provider_id=auth.uid() and status in ('Confirmed','In Progress') and tstzrange(starts_at,busy_until,'[)')&&tstzrange(p_start,p_end,'[)')) then raise exception 'Reassign confirmed visits before adding time off'; end if;
 insert into public.time_off(provider_id,starts_at,ends_at,reason) values(auth.uid(),p_start,p_end,p_reason);
end; $$;

create function private.eligible(p_provider uuid,p_service uuid,p_area text,p_start timestamptz,p_end timestamptz,p_busy timestamptz,p_except uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.provider_profiles p join public.services s on s.id=p_service
 where p.id=p_provider and p.verification='Verified' and private.account_active(p.id) and s.active and p.profession=s.category
 and exists(select 1 from unnest(p.areas) a where lower(trim(a))=lower(trim(p_area)))
 and exists(select 1 from public.provider_services ps where ps.provider_id=p.id and ps.service_id=s.id)
 and (not (select enforce_credential_expiry from public.settings where id) or exists(select 1 from public.credentials c where c.provider_id=p.id and c.reviewed_at is not null and c.expires_on>=(p_end at time zone (select timezone from public.settings where id))::date))
 and exists(select 1 from public.availability a where a.provider_id=p.id and a.starts_at<=p_start and a.ends_at>=p_end)
 and not exists(select 1 from public.time_off t where t.provider_id=p.id and tstzrange(t.starts_at,t.ends_at,'[)')&&tstzrange(p_start,p_busy,'[)'))
 and not exists(select 1 from public.bookings b where b.provider_id=p.id and b.id is distinct from p_except and b.status in ('Confirmed','In Progress') and tstzrange(b.starts_at,b.busy_until,'[)')&&tstzrange(p_start,p_busy,'[)')));
$$;

create function public.assign_booking(p_booking uuid,p_provider uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; buffer integer;
begin
 if not private.admin_allowed() then raise exception 'Not permitted'; end if;
 perform 1 from public.provider_profiles where id=p_provider for update;
 select * into b from public.bookings where id=p_booking for update;
 if not found or b.status not in ('Pending Assignment','Reassignment Required') or b.starts_at<=now() or length(trim(p_reason)) not between 3 and 500 then raise exception 'Booking must be in an assignment queue with a future time and reason'; end if;
 select travel_buffer_minutes into buffer from public.settings where id;
 if not private.eligible(p_provider,b.service_id,b.area,b.starts_at,b.ends_at,b.ends_at+make_interval(mins=>buffer),b.id) then raise exception 'Provider is ineligible or unavailable for this visit'; end if;
 update public.bookings set provider_id=p_provider,status='Confirmed',busy_until=ends_at+make_interval(mins=>buffer) where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason)
 values(b.id,b.status,'Confirmed',b.provider_id,p_provider,auth.uid(),p_reason);
 perform private.audit('booking_assigned',b.id);
end; $$;

create function public.require_reassignment(p_booking uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
 select * into b from public.bookings where id=p_booking for update;
 if not found or not(private.admin_allowed() or (private.has_role('provider') and b.provider_id=auth.uid())) then raise exception 'Not permitted'; end if;
 if b.status<>'Confirmed' or length(trim(p_reason)) not between 3 and 500 then raise exception 'Confirmed visit and reason required'; end if;
 update public.bookings set status='Reassignment Required' where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason) values(b.id,b.status,'Reassignment Required',b.provider_id,b.provider_id,auth.uid(),p_reason);
end; $$;

create function public.reschedule_booking(p_booking uuid,p_start timestamptz,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; new_end timestamptz; conf public.settings;
begin
 -- Lock provider first, in the same order used by assignment/availability.
 perform 1 from public.provider_profiles where id=(select provider_id from public.bookings where id=p_booking) for update;
 select * into b from public.bookings where id=p_booking for update;
 if not found or not(private.admin_allowed() or (private.has_role('patient') and b.patient_id=auth.uid())) then raise exception 'Not permitted'; end if;
 select * into conf from public.settings where id;
 if b.status not in ('Requested','Pending Assignment','Confirmed','Reassignment Required') or p_start<=now() or p_start>now()+interval '180 days' or length(trim(p_reason)) not between 3 and 500 then raise exception 'Invalid reschedule'; end if;
 if not private.admin_allowed() and b.starts_at<now()+make_interval(hours=>conf.cancellation_cutoff_hours) then raise exception 'Rescheduling cutoff reached; contact support'; end if;
 new_end:=p_start+(b.ends_at-b.starts_at);
 if b.status='Confirmed' and not private.eligible(b.provider_id,b.service_id,b.area,p_start,new_end,new_end+make_interval(mins=>conf.travel_buffer_minutes),b.id) then raise exception 'Provider unavailable at the new time'; end if;
 update public.bookings set starts_at=p_start,ends_at=new_end,busy_until=new_end+make_interval(mins=>conf.travel_buffer_minutes) where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason,old_start,new_start) values(b.id,b.status,b.status,b.provider_id,b.provider_id,auth.uid(),p_reason,b.starts_at,p_start);
end; $$;

create function public.start_visit(p_booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 select * into b from public.bookings where id=p_booking and provider_id=auth.uid() for update;
 if not found or b.status<>'Confirmed' or b.starts_at>now()+interval '30 minutes' then raise exception 'Visit can start within 30 minutes of its scheduled time'; end if;
 if not exists(select 1 from public.provider_profiles where id=auth.uid() and verification='Verified') then raise exception 'Verification required'; end if;
 update public.bookings set status='In Progress' where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason) values(b.id,b.status,'In Progress',b.provider_id,b.provider_id,auth.uid(),'Provider started visit');
end; $$;

create function public.complete_visit(p_booking uuid,p_observations text,p_patient_report text,p_notes text,p_mobility integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; result uuid;
begin
 if not private.has_role('provider') then raise exception 'Not permitted'; end if;
 select * into b from public.bookings where id=p_booking and provider_id=auth.uid() for update;
 if not found or b.status<>'In Progress' then raise exception 'An assigned visit must be in progress'; end if;
 insert into public.session_records(booking_id,patient_id,provider_id,service_id,visit_at,observations,patient_report,notes,mobility_minutes,author,author_name)
 values(b.id,b.patient_id,b.provider_id,b.service_id,b.starts_at,p_observations,p_patient_report,p_notes,p_mobility,auth.uid(),(select name from public.profiles where id=auth.uid())) returning id into result;
 update public.bookings set status='Completed' where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason) values(b.id,b.status,'Completed',b.provider_id,b.provider_id,auth.uid(),'Provider completed visit and entered session record');
 return result;
end; $$;

create function public.amend_record(p_record uuid,p_content text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role('provider') or not exists(select 1 from public.session_records where id=p_record and author=auth.uid()) then raise exception 'Only the original author can amend this record'; end if;
 insert into public.record_amendments(record_id,author,author_name,content,reason) values(p_record,auth.uid(),(select name from public.profiles where id=auth.uid()),p_content,p_reason);
 perform private.audit('record_amended',p_record);
end; $$;

create function public.mark_notification_read(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() then raise exception 'Not permitted'; end if;
 update public.notifications set read_at=now() where id=p_id and user_id=auth.uid();
end; $$;

create function public.save_service(p_id uuid,p_name text,p_category public.profession,p_description text,p_duration integer,p_price integer,p_currency text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.admin_allowed() then raise exception 'Not permitted'; end if;
 if length(p_description) not between 10 and 2000 then raise exception 'Description must be 10 to 2000 characters'; end if;
 if p_id is null then insert into public.services(name,category,description,duration_minutes,price_minor,currency,active) values(p_name,p_category,p_description,p_duration,p_price,p_currency,p_active) returning id into result;
 else update public.services set name=p_name,category=p_category,description=p_description,duration_minutes=p_duration,price_minor=p_price,currency=p_currency,active=p_active where id=p_id returning id into result; end if;
 if result is null then raise exception 'Service not found'; end if;
 perform private.audit('service_saved',result); return result;
end; $$;

create function public.set_account_active(p_user uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_allowed() or p_user=auth.uid() or exists(select 1 from public.profiles where id=p_user and role='admin') then raise exception 'Cannot modify this account'; end if;
 perform 1 from public.provider_profiles where id=p_user for update;
 update public.profiles set active=p_active where id=p_user;
 if not found then raise exception 'Account not found'; end if;
 if not p_active then perform private.release_provider(p_user,'Provider account deactivated'); end if;
 perform private.audit(case when p_active then 'account_activated' else 'account_deactivated' end,p_user);
end; $$;

create function public.save_settings(p_timezone text,p_currency text,p_buffer integer,p_cutoff integer,p_expiry boolean,p_mfa boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_allowed() then raise exception 'Not permitted'; end if;
 if p_timezone not in ('Asia/Karachi','UTC','Asia/Dubai') or p_currency !~ '^[A-Z]{3}$' then raise exception 'Unsupported settings'; end if;
 if p_mfa and coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'Verify your authenticator before requiring MFA'; end if;
 update public.settings set timezone=p_timezone,currency=p_currency,travel_buffer_minutes=p_buffer,cancellation_cutoff_hours=p_cutoff,enforce_credential_expiry=p_expiry,require_admin_mfa=p_mfa where id;
 perform private.audit('settings_updated',auth.uid());
end; $$;

create function public.prefer_provider(p_booking uuid,p_provider uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role('patient') or not exists(select 1 from public.provider_profiles where id=p_provider and verification='Verified') then raise exception 'Provider unavailable'; end if;
 update public.bookings set preferred_provider_id=p_provider where id=p_booking and patient_id=auth.uid() and status='Requested';
end; $$;

revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.update_patient_profile(text,text,text),public.request_booking(uuid,timestamptz,text,text,uuid),public.queue_booking(uuid),public.cancel_booking(uuid,text),
 public.save_provider(text,text,integer,text,text[],text,text,uuid[]),public.register_credential(text,date,text),public.verify_provider(uuid,public.verification_status,text),
 public.save_availability(uuid,timestamptz,timestamptz,boolean),public.manage_time_off(uuid,timestamptz,timestamptz,text,boolean),
 public.assign_booking(uuid,uuid,text),public.require_reassignment(uuid,text),public.reschedule_booking(uuid,timestamptz,text),public.start_visit(uuid),
 public.complete_visit(uuid,text,text,text,integer),public.amend_record(uuid,text,text),public.mark_notification_read(uuid),
 public.save_service(uuid,text,public.profession,text,integer,integer,text,boolean),public.set_account_active(uuid,boolean),
 public.save_settings(text,text,integer,integer,boolean,boolean),public.prefer_provider(uuid,uuid) to authenticated;
revoke execute on all functions in schema private from public;
grant execute on function private.account_active(uuid) to anon,authenticated;

