-- Ported from 202610140003_operations_reports.sql; preserves business rules and row policies.

create table public.payments (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.bookings(id),
 patient_id uuid not null references public.profiles(id),amount_minor integer not null check(amount_minor>=0),
 currency text not null,method text not null default 'Local simulation',reference text not null unique,
 status text not null check(status in ('Pending','Paid','Failed','Refunded')),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.payment_history (
 id uuid primary key default gen_random_uuid(),payment_id uuid not null references public.payments(id),
 status text not null,actor uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.bookings(id),
 patient_id uuid not null references public.profiles(id),provider_id uuid not null references public.provider_profiles(id),
 rating integer not null check(rating between 1 and 5),comment text not null check(length(comment)<=2000),
 visible boolean not null default true,moderation_reason text,moderator uuid references public.profiles(id),created_at timestamptz not null default now()
);
create table public.support_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 booking_id uuid references public.bookings(id),subject text not null check(length(subject) between 3 and 150),
 message text not null check(length(message) between 5 and 5000),status text not null default 'Open' check(status in ('Open','In review','Resolved')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.support_replies (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.support_requests(id),
 author uuid not null references public.profiles(id),author_name text not null,body text not null check(length(body) between 3 and 5000),
 created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.profiles(id),
 creator uuid not null references public.profiles(id),period_start date not null,period_end date not null check(period_end>=period_start),
 title text not null,summary text not null,source_records jsonb not null,adapter text not null default 'local-template-v1',
 reviewed_at timestamptz,reviewed_by uuid references public.profiles(id),created_at timestamptz not null default now()
);
create table public.report_shares (
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.reports(id),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now()
);
create table public.report_access (
 id bigint generated always as identity primary key,share_id uuid not null references public.report_shares(id),
 accessed_at timestamptz not null default now()
);
create table public.review_moderation (
 id uuid primary key default gen_random_uuid(),review_id uuid not null references public.reviews(id),actor uuid not null references public.profiles(id),
 visible boolean not null,reason text not null,created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
alter table public.payment_history enable row level security;
alter table public.reviews enable row level security;
alter table public.support_requests enable row level security;
alter table public.support_replies enable row level security;
alter table public.reports enable row level security;
alter table public.report_shares enable row level security;
alter table public.report_access enable row level security;
alter table public.review_moderation enable row level security;
create policy payments_read on public.payments for select to authenticated using(private.active_user() and (patient_id=auth.uid() or private.has_role('admin')));
create policy payment_history_read on public.payment_history for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id));
-- Public ratings come through a privacy-preserving RPC, not this table.
create policy reviews_read on public.reviews for select to authenticated using(private.active_user() and (patient_id=auth.uid() or provider_id=auth.uid() or private.has_role('admin')));
create policy support_read on public.support_requests for select to authenticated using(private.active_user() and (user_id=auth.uid() or private.has_role('admin')));
create policy replies_read on public.support_replies for select to authenticated using(exists(select 1 from public.support_requests s where s.id=request_id));
create policy reports_read on public.reports for select to authenticated using(private.active_user() and (patient_id=auth.uid() or creator=auth.uid()));
create policy shares_read on public.report_shares for select to authenticated using(exists(select 1 from public.reports r where r.id=report_id and r.patient_id=auth.uid()) and private.active_user());
create policy access_read on public.report_access for select to authenticated using(exists(select 1 from public.report_shares s where s.id=share_id));
create policy moderation_read on public.review_moderation for select to authenticated using(private.has_role('admin'));
revoke all on public.payments,public.payment_history,public.reviews,public.support_requests,public.support_replies,public.reports,public.report_shares,public.report_access,public.review_moderation from anon,authenticated;
grant select on public.payments,public.payment_history,public.reviews,public.support_requests,public.support_replies,public.reports,public.report_access,public.review_moderation to authenticated;
-- Never expose even token hashes through table reads.
grant select(id,report_id,expires_at,revoked_at,created_at) on public.report_shares to authenticated;

create function public.simulate_payment(p_booking uuid,p_outcome text) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; pay public.payments;
begin
 select * into b from public.bookings where id=p_booking for update;
 if not found or not (private.has_role('patient') and b.patient_id=auth.uid()) then raise exception 'Not permitted'; end if;
 if b.status not in ('Confirmed','In Progress','Completed') or p_outcome not in ('Paid','Failed') then raise exception 'Payment simulation requires an assigned visit'; end if;
 select * into pay from public.payments where booking_id=b.id for update;
 if found and pay.status in ('Paid','Refunded') then return pay.id; end if;
 if pay.id is null then
 insert into public.payments(booking_id,patient_id,amount_minor,currency,reference,status) values(b.id,b.patient_id,b.price_minor,b.currency,'SIM-'||gen_random_uuid(),p_outcome) returning * into pay;
 else update public.payments set status=p_outcome,updated_at=now() where id=pay.id returning * into pay; end if;
 insert into public.payment_history(payment_id,status,actor) values(pay.id,p_outcome,auth.uid());
 perform private.audit('simulated_payment_'||lower(p_outcome),b.id);
 return pay.id;
end; $$;
create function public.refund_payment(p_payment uuid) returns void language plpgsql security definer set search_path='' as $$
declare pay public.payments;
begin
 if not private.admin_allowed() then raise exception 'Not permitted'; end if;
 select * into pay from public.payments where id=p_payment for update;
 if not found or pay.status<>'Paid' then raise exception 'Only paid simulations can be refunded'; end if;
 update public.payments set status='Refunded',updated_at=now() where id=pay.id;
 insert into public.payment_history(payment_id,status,actor) values(pay.id,'Refunded',auth.uid());
 perform private.audit('simulated_refund',pay.id);
end; $$;

create function public.submit_review(p_booking uuid,p_rating integer,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
 select * into b from public.bookings where id=p_booking;
 if not private.has_role('patient') or b.patient_id is distinct from auth.uid() or b.status<>'Completed' then raise exception 'Only your completed visits can be reviewed'; end if;
 insert into public.reviews(booking_id,patient_id,provider_id,rating,comment) values(b.id,auth.uid(),b.provider_id,p_rating,p_comment);
end; $$;
create function public.moderate_review(p_review uuid,p_visible boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_allowed() or length(trim(p_reason)) not between 3 and 500 then raise exception 'Administrator and reason required'; end if;
 update public.reviews set visible=p_visible,moderation_reason=p_reason,moderator=auth.uid() where id=p_review;
 if not found then raise exception 'Review not found'; end if;
 insert into public.review_moderation(review_id,actor,visible,reason) values(p_review,auth.uid(),p_visible,p_reason);
 perform private.audit('review_moderated',p_review);
end; $$;

create function public.create_support(p_booking uuid,p_subject text,p_message text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.active_user() then raise exception 'Not permitted'; end if;
 if p_booking is not null and not exists(select 1 from public.bookings where id=p_booking and (patient_id=auth.uid() or provider_id=auth.uid())) then raise exception 'Visit not accessible'; end if;
 insert into public.support_requests(user_id,booking_id,subject,message) values(auth.uid(),p_booking,p_subject,p_message) returning id into result;
 return result;
end; $$;
create function public.reply_support(p_request uuid,p_body text,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() or not exists(select 1 from public.support_requests where id=p_request and (user_id=auth.uid() or private.has_role('admin'))) then raise exception 'Not permitted'; end if;
 insert into public.support_replies(request_id,author,author_name,body) values(p_request,auth.uid(),(select name from public.profiles where id=auth.uid()),p_body);
 if private.has_role('admin') then update public.support_requests set status=p_status,updated_at=now() where id=p_request; perform private.audit('support_updated',p_request); end if;
end; $$;

create function public.create_report(p_patient uuid,p_from date,p_to date) returns uuid language plpgsql security definer set search_path='' as $$
declare sources jsonb; result uuid; n integer;
begin
 if not private.active_user() or not (private.has_role('patient') or private.has_role('provider')) or (private.has_role('patient') and p_patient<>auth.uid()) then raise exception 'Not permitted'; end if;
 if p_to<p_from or p_to-p_from>366 then raise exception 'Choose a date range of up to one year'; end if;
 select jsonb_agg(to_jsonb(r)||jsonb_build_object('amendments',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.record_amendments a where a.record_id=r.id),'[]'::jsonb)) order by r.visit_at)
 into sources from public.session_records r where r.patient_id=p_patient and (r.patient_id=auth.uid() or r.provider_id=auth.uid()) and (r.visit_at at time zone (select timezone from public.settings where id))::date between p_from and p_to;
 if sources is null then raise exception 'No authorised session records in this period'; end if;
 n:=jsonb_array_length(sources);
 insert into public.reports(patient_id,creator,period_start,period_end,title,summary,source_records)
 values(p_patient,auth.uid(),p_from,p_to,'Care journey report',
 'DEMO / TEMPLATE SUMMARY. This report contains '||n||' recorded visit(s) during the selected period. Read the original observations and any amendments below. It makes no diagnosis, treatment recommendation or prediction of recovery.',sources)
 returning id into result;
 return result;
end; $$;
create function public.review_report(p_report uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() then raise exception 'Not permitted'; end if;
 update public.reports set reviewed_at=now(),reviewed_by=auth.uid() where id=p_report and (patient_id=auth.uid() or creator=auth.uid());
 if not found then raise exception 'Report not accessible'; end if;
end; $$;
create function public.share_report(p_report uuid,p_hash text,p_expiry timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role('patient') or not exists(select 1 from public.reports where id=p_report and patient_id=auth.uid() and reviewed_at is not null) then raise exception 'Review your own report before sharing'; end if;
 if p_expiry<=now() or p_expiry>now()+interval '30 days' then raise exception 'Expiry must be within 30 days'; end if;
 insert into public.report_shares(report_id,token_hash,expires_at) values(p_report,p_hash,p_expiry) returning id into result;
 perform private.audit('report_shared',p_report);return result;
end; $$;
create function public.revoke_share(p_share uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role('patient') then raise exception 'Not permitted'; end if;
 update public.report_shares set revoked_at=now() where id=p_share and report_id in(select id from public.reports where patient_id=auth.uid());
 if not found then raise exception 'Share not accessible'; end if;
 perform private.audit('report_share_revoked',p_share);
end; $$;
create function public.read_shared_report(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.report_shares; result jsonb;
begin
 if length(p_token)<>64 then return null; end if;
 select * into s from public.report_shares where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now() for share;
 if not found then return null; end if;
 select jsonb_build_object('id',r.id,'title',r.title,'period_start',r.period_start,'period_end',r.period_end,'summary',r.summary,'source_records',r.source_records,'adapter',r.adapter,'created_at',r.created_at) into result from public.reports r where r.id=s.report_id and private.account_active(r.patient_id);
 if result is null then return null; end if;
 insert into public.report_access(share_id) values(s.id);
 return result;
end; $$;

create function public.discover_providers(p_profession text default '',p_area text default '',p_service uuid default null,p_start timestamptz default null,p_specialisation text default '',p_max_price integer default null,p_min_rating integer default null)
returns table(id uuid,public_name text,profession public.profession,qualifications text,experience_years integer,specialisation text,areas text[],bio text,demo boolean,rating numeric,review_count bigint,min_price integer,services jsonb)
language sql stable security definer set search_path='' as $$
 select p.id,p.public_name,p.profession,p.qualifications,p.experience_years,p.specialisation,p.areas,p.bio,p.demo,
 (select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id and r.visible),
 (select count(*) from public.reviews r where r.provider_id=p.id and r.visible),
 (select min(s.price_minor) from public.provider_services ps join public.services s on s.id=ps.service_id where ps.provider_id=p.id and s.active),
 (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'price_minor',s.price_minor,'currency',s.currency,'duration_minutes',s.duration_minutes)),'[]') from public.provider_services ps join public.services s on s.id=ps.service_id where ps.provider_id=p.id and s.active)
 from public.provider_profiles p where p.verification='Verified' and private.account_active(p.id)
 and (p_profession='' or p.profession::text=p_profession)
 and (p_area='' or exists(select 1 from unnest(p.areas) a where lower(a) like '%'||lower(p_area)||'%'))
 and (p_specialisation='' or p.specialisation ilike '%'||p_specialisation||'%')
 and (p_service is null or exists(select 1 from public.provider_services where provider_id=p.id and service_id=p_service))
 and (p_max_price is null or exists(select 1 from public.provider_services ps join public.services s on s.id=ps.service_id where ps.provider_id=p.id and s.active and s.price_minor<=p_max_price))
 and (p_min_rating is null or (select avg(r.rating) from public.reviews r where r.provider_id=p.id and r.visible)>=p_min_rating)
 and (p_start is null or exists(select 1 from public.provider_services ps join public.services s on s.id=ps.service_id where ps.provider_id=p.id and (p_service is null or s.id=p_service) and private.eligible(p.id,s.id,case when p_area='' then p.areas[1] else p_area end,p_start,p_start+make_interval(mins=>s.duration_minutes),p_start+make_interval(mins=>s.duration_minutes+(select travel_buffer_minutes from public.settings where id)))))
 order by p.public_name;
$$;

-- Outbox worker is local/server-only; no logged-in user can run it directly.
create function public.enqueue_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare b public.bookings; n integer:=0;
begin
 for b in select * from public.bookings where status='Confirmed' and starts_at between now() and now()+interval '24 hours' loop
  perform private.notify(b.patient_id,b.id,'Upcoming home visit','reminder:'||b.id||':'||b.starts_at||':patient');
  perform private.notify(b.provider_id,b.id,'Upcoming home visit','reminder:'||b.id||':'||b.starts_at||':provider');
  n:=n+1;
 end loop;return n;
end; $$;
create function public.claim_emails() returns table(id uuid,email text,title text,body text,attempts integer) language plpgsql security definer set search_path='' as $$
begin
 return query with batch as (
 select o.id from private.email_outbox o where o.delivered_at is null and o.next_attempt_at<=now() and (o.locked_until is null or o.locked_until<now()) and o.attempts<8 order by o.next_attempt_at for update skip locked limit 20
 ), claimed as (
 update private.email_outbox o set locked_until=now()+interval '2 minutes',attempts=o.attempts+1 from batch b where o.id=b.id returning o.*
 )
 select c.id,u.email::text,n.title,n.body,c.attempts from claimed c join public.notifications n on n.id=c.notification_id join public.identity_users u on u.id=n.user_id;
end; $$;
create function public.finish_email(p_id uuid,p_success boolean) returns void language sql security definer set search_path='' as $$
 update private.email_outbox set delivered_at=case when p_success then now() else null end,locked_until=null,next_attempt_at=now()+interval '1 minute'*least(60,power(2,attempts)::integer),last_error=case when p_success then null else 'Local delivery unavailable' end where id=p_id;
$$;

revoke execute on function public.simulate_payment(uuid,text),public.refund_payment(uuid),public.submit_review(uuid,integer,text),public.moderate_review(uuid,boolean,text),public.create_support(uuid,text,text),public.reply_support(uuid,text,text),public.create_report(uuid,date,date),public.review_report(uuid),public.share_report(uuid,text,timestamptz),public.revoke_share(uuid),public.read_shared_report(text),public.discover_providers(text,text,uuid,timestamptz,text,integer,integer),public.enqueue_reminders(),public.claim_emails(),public.finish_email(uuid,boolean) from public,anon,authenticated;
grant execute on function public.simulate_payment(uuid,text),public.refund_payment(uuid),public.submit_review(uuid,integer,text),public.moderate_review(uuid,boolean,text),public.create_support(uuid,text,text),public.reply_support(uuid,text,text),public.create_report(uuid,date,date),public.review_report(uuid),public.share_report(uuid,text,timestamptz),public.revoke_share(uuid) to authenticated;
grant execute on function public.read_shared_report(text),public.discover_providers(text,text,uuid,timestamptz,text,integer,integer) to anon,authenticated;
grant execute on function public.enqueue_reminders(),public.claim_emails(),public.finish_email(uuid,boolean) to service_role;

