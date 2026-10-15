-- Additional integrity and query support identified during application review.
create index notifications_user_created on public.notifications(user_id,created_at desc);
create index records_patient_visit on public.session_records(patient_id,visit_at desc);
create index records_provider_visit on public.session_records(provider_id,visit_at desc);
create index reports_patient_created on public.reports(patient_id,created_at desc);
create index credentials_provider_expiry on public.credentials(provider_id,expires_on);
create index support_owner_created on public.support_requests(user_id,created_at desc);
alter table public.settings add constraint supported_timezone check(timezone in ('Asia/Karachi','UTC','Asia/Dubai'));
alter table public.settings add constraint bounded_cutoff check(cancellation_cutoff_hours<=168);

-- Only unregistered uploads may be removed, for retry cleanup.
create policy cleanup_unregistered_credentials on storage.objects for delete to authenticated
using(bucket_id='credentials' and private.has_role('provider') and (storage.foldername(name))[1]=auth.uid()::text
and not exists(select 1 from public.credentials c where c.object_path=name));

create or replace function public.assign_booking(p_booking uuid,p_provider uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; buffer integer;
begin
 if not private.admin_allowed() then raise exception 'Not permitted'; end if;
 perform 1 from public.provider_profiles where id=p_provider for update;
 select * into b from public.bookings where id=p_booking for update;
 if not found or b.status not in ('Pending Assignment','Reassignment Required') or b.starts_at<=now() or length(trim(p_reason)) not between 3 and 500 then raise exception 'Booking must be in an assignment queue with a future time and reason'; end if;
 if not private.account_active(b.patient_id) then raise exception 'Patient account is inactive'; end if;
 select travel_buffer_minutes into buffer from public.settings where id;
 if not private.eligible(p_provider,b.service_id,b.area,b.starts_at,b.ends_at,b.ends_at+make_interval(mins=>buffer),b.id) then raise exception 'Provider is ineligible or unavailable for this visit'; end if;
 update public.bookings set provider_id=p_provider,status='Confirmed',busy_until=ends_at+make_interval(mins=>buffer) where id=b.id;
 insert into public.booking_history(booking_id,old_status,new_status,old_provider,new_provider,actor,reason)
 values(b.id,b.status,'Confirmed',b.provider_id,p_provider,auth.uid(),p_reason);
 perform private.audit('booking_assigned',b.id);
end; $$;
create or replace function public.read_shared_report(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.report_shares; result jsonb;
begin
 if length(p_token)<>64 then return null; end if;
 select * into s from public.report_shares where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now() for share;
 if not found then return null; end if;
 select jsonb_build_object('id',r.id,'title',r.title,'period_start',r.period_start,'period_end',r.period_end,'summary',r.summary,'source_records',r.source_records,'adapter',r.adapter,'created_at',r.created_at,'reviewed_at',r.reviewed_at) into result from public.reports r where r.id=s.report_id and private.account_active(r.patient_id);
 if result is null then return null; end if;
 insert into public.report_access(share_id) values(s.id);
 return result;
end; $$;

-- A delayed failure callback must never undo a successful outbox delivery.
create or replace function public.finish_email(p_id uuid,p_success boolean) returns void language sql security definer set search_path='' as $$
 update private.email_outbox
 set delivered_at=case when p_success then now() else null end,
 locked_until=null,
 next_attempt_at=now()+interval '1 minute'*least(60,power(2,attempts)::integer),
 last_error=case when p_success then null else 'Local delivery unavailable' end
 where id=p_id and delivered_at is null;
$$;
