-- Additive ledger: sandbox/live payments never overwrite simulation receipts.
create table public.gateway_payments (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id),
 patient_id uuid not null references public.profiles(id), amount_minor integer not null check(amount_minor>0),
 currency text not null check(currency='PKR'), environment text not null check(environment in ('sandbox','production')),
 tracker text unique, status text not null default 'Initializing' check(status in ('Initializing','Pending','Failed','Paid','Partially refunded','Refunded','Needs review')),
 refunded_minor integer not null default 0 check(refunded_minor>=0 and refunded_minor<=amount_minor),
 setup_nonce uuid not null default gen_random_uuid(), setup_attempts integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.gateway_payments enable row level security;
create policy gateway_payments_read on public.gateway_payments for select to authenticated
 using(private.active_user() and (patient_id=auth.uid() or private.has_role('admin')));
revoke all on public.gateway_payments from public,anon,authenticated;
grant select(id,booking_id,patient_id,amount_minor,currency,environment,status,refunded_minor,created_at,updated_at)
 on public.gateway_payments to authenticated;
create table private.gateway_events (
 environment text not null, event_id text not null, payment_id uuid not null references public.gateway_payments(id),
 kind text not null, created_at timestamptz not null default now(), primary key(environment,event_id)
);
alter table private.gateway_events enable row level security;
revoke all on private.gateway_events from public,anon,authenticated;

create function private.gateway_begin(p_session uuid,p_booking uuid,p_environment text)
returns public.gateway_payments language plpgsql security definer set search_path='' as $$
declare actor_id uuid; b public.bookings; p public.gateway_payments;
begin
 actor_id:=private.security_actor(p_session,false,false);
 if p_environment not in ('sandbox','production') or p_environment is null then raise exception 'Invalid environment'; end if;
 if not exists(select 1 from public.identity_sessions where id=p_session and "emailOtpVerified") then raise exception 'Not permitted'; end if;
 select * into b from public.bookings where id=p_booking for update;
 if not found or b.patient_id<>actor_id or not exists(select 1 from public.profiles where id=actor_id and role='patient') then raise exception 'Not permitted'; end if;
 if b.status not in ('Confirmed','In Progress','Completed') or b.price_minor<1 or b.currency<>'PKR' then raise exception 'Visit is not payable'; end if;
 if exists(select 1 from public.payments where booking_id=b.id) then raise exception 'Simulation visits cannot take online payments'; end if;
 select * into p from public.gateway_payments where booking_id=b.id for update;
 if found then
   if p.environment<>p_environment then raise exception 'Payment environment mismatch'; end if;
   if p.amount_minor<>b.price_minor then raise exception 'Payment amount changed; contact support'; end if;
   if p.tracker is null then
     if p.updated_at>now()-interval '2 minutes' or p.setup_attempts>=3 then raise exception 'Checkout initialization is pending; try later or contact support'; end if;
     update public.gateway_payments set setup_nonce=gen_random_uuid(),setup_attempts=setup_attempts+1,updated_at=now() where id=p.id returning * into p;
   end if;
   return p;
 end if;
 insert into public.gateway_payments(booking_id,patient_id,amount_minor,currency,environment)
 values(b.id,actor_id,b.price_minor,b.currency,p_environment) returning * into p;
 return p;
end; $$;

create function private.gateway_bind(p_session uuid,p_payment uuid,p_nonce uuid,p_tracker text)
returns void language plpgsql security definer set search_path='' as $$
declare actor_id uuid;
begin
 actor_id:=private.security_actor(p_session,false,false);
 if p_tracker is null or p_tracker !~ '^track_[a-zA-Z0-9-]{8,100}$' then raise exception 'Invalid tracker'; end if;
 update public.gateway_payments set tracker=p_tracker,status='Pending',updated_at=now()
 where id=p_payment and patient_id=actor_id and setup_nonce=p_nonce and tracker is null and status='Initializing';
 if not found then raise exception 'Checkout initialization changed'; end if;
end; $$;

create function private.gateway_event(p_environment text,p_event text,p_tracker text,p_kind text,p_amount integer,p_currency text,p_balance integer)
returns void language plpgsql security definer set search_path='' as $$
declare p public.gateway_payments; new_refunded integer;
begin
 if p_event is null or p_event !~ '^evt_[a-zA-Z0-9-]{8,100}$' or p_kind not in ('payment.succeeded','payment.failed','payment.refunded','void.succeeded') or p_kind is null then raise exception 'Invalid event'; end if;
 select * into p from public.gateway_payments where tracker=p_tracker and environment=p_environment for update;
 if not found then raise exception 'Unknown payment; retry notification'; end if;
 if exists(select 1 from private.gateway_events where environment=p_environment and event_id=p_event) then return; end if;
 if p_kind='payment.succeeded' then
   if p_amount is distinct from p.amount_minor or p_currency is distinct from p.currency then raise exception 'Payment total mismatch'; end if;
   if p.status in ('Initializing','Pending','Failed') then
     update public.gateway_payments set status='Paid',updated_at=now() where id=p.id;
   end if;
 elsif p_kind='payment.failed' then
   if p.status in ('Initializing','Pending') then update public.gateway_payments set status='Failed',updated_at=now() where id=p.id; end if;
 elsif p_kind='payment.refunded' then
   if p_balance is null or p_balance<0 or p_balance>p.amount_minor or p_currency is distinct from p.currency then raise exception 'Invalid refund balance'; end if;
   new_refunded:=greatest(p.refunded_minor,p.amount_minor-p_balance);
   if new_refunded=0 then raise exception 'Invalid refund balance'; end if;
   update public.gateway_payments set refunded_minor=new_refunded,
     status=case when new_refunded=amount_minor then 'Refunded' else 'Partially refunded' end,updated_at=now() where id=p.id;
 else
   -- A void requires reconciliation; never invent a refund or keep showing Paid.
   update public.gateway_payments set status='Needs review',updated_at=now() where id=p.id;
 end if;
 insert into private.gateway_events(environment,event_id,payment_id,kind) values(p_environment,p_event,p.id,p_kind);
end; $$;

-- Preserve the original simulation implementation while preventing mixed ledgers.
alter function public.simulate_payment(uuid,text) rename to simulate_payment_legacy;
revoke all on function public.simulate_payment_legacy(uuid,text) from public,anon,authenticated;
create function public.simulate_payment(p_booking uuid,p_outcome text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.bookings where id=p_booking for update;
 if exists(select 1 from public.gateway_payments where booking_id=p_booking) then raise exception 'Online checkout cannot be simulated'; end if;
 return public.simulate_payment_legacy(p_booking,p_outcome);
end; $$;
revoke all on function public.simulate_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.simulate_payment(uuid,text) to authenticated;
revoke all on function private.gateway_begin(uuid,uuid,text),private.gateway_bind(uuid,uuid,uuid,text),private.gateway_event(text,text,text,text,integer,text,integer) from public,anon,authenticated;
grant execute on function private.gateway_begin(uuid,uuid,text),private.gateway_bind(uuid,uuid,uuid,text),private.gateway_event(text,text,text,text,integer,text,integer) to careathome_auth;
