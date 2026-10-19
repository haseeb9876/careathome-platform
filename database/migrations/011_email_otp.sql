-- Restricted sessions cannot access care data until the application verifies email.
alter table public.identity_sessions add column "emailOtpVerified" boolean not null default false;
-- Preserve already-issued sessions during rollout; every new session uses the gate.
update public.identity_sessions set "emailOtpVerified"=true;

create table private.email_challenges (
 id uuid primary key, actor uuid references public.identity_users(id),
 email text not null, purpose text not null, context_hash text not null,
 code_hash text not null, ip_hash text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes',
 attempts integer not null default 0 check(attempts between 0 and 5),
 delivered_at timestamptz, consumed_at timestamptz, revoked_at timestamptz
);
create index email_challenge_recipient on private.email_challenges(email,created_at desc);
create index email_challenge_ip on private.email_challenges(ip_hash,created_at desc);
create table private.trusted_email_devices (
 token_hash text primary key, actor uuid not null references public.identity_users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 days'
);
alter table private.email_challenges enable row level security;
alter table private.trusted_email_devices enable row level security;
revoke all on private.email_challenges,private.trusted_email_devices from public,anon,authenticated,careathome_app;
grant select,insert,update,delete on private.email_challenges,private.trusted_email_devices to careathome_auth;
create policy authentication_challenges on private.email_challenges to careathome_auth using(true) with check(true);
create policy authentication_devices on private.trusted_email_devices to careathome_auth using(true) with check(true);

create function private.issue_email_challenge(p_id uuid,p_actor uuid,p_email text,p_purpose text,p_context text,p_code text,p_ip text)
returns text language plpgsql security definer set search_path='' as $$
begin
 if p_purpose not in ('login','recover','password','email','admin','email-confirm','invite-accept','revoke-link','sessions','mfa-enroll','mfa-disable','mfa-backup','settings','account','close-account')
 or p_context !~ '^[a-f0-9]{64}$' or p_code !~ '^[a-f0-9]{64}$' or p_ip !~ '^[a-f0-9]{64}$' or length(p_email)>254 then return 'invalid'; end if;
 perform pg_advisory_xact_lock(7400182026);
 if exists(select 1 from private.email_challenges where email=p_email and created_at>now()-interval '60 seconds') then return 'cooldown'; end if;
 if (select count(*) from private.email_challenges where email=p_email and created_at>now()-interval '1 hour')>=10
 or (select count(*) from private.email_challenges where ip_hash=p_ip and created_at>now()-interval '1 hour')>=30
 or (p_email not like '%.test' and (select count(*) from private.email_challenges where email not like '%.test' and created_at>now()-interval '24 hours')>=300) then return 'limited'; end if;
 update private.email_challenges set revoked_at=now() where email=p_email and purpose=p_purpose and consumed_at is null and revoked_at is null;
 insert into private.email_challenges(id,actor,email,purpose,context_hash,code_hash,ip_hash) values(p_id,p_actor,p_email,p_purpose,p_context,p_code,p_ip);
 return 'created';
end;
$$;
create function private.consume_email_challenge(p_id uuid,p_email text,p_purpose text,p_context text,p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c private.email_challenges;
begin
 select * into c from private.email_challenges where id=p_id for update;
 if c.id is null or c.expires_at<=now() or c.delivered_at is null or c.consumed_at is not null or c.revoked_at is not null or c.attempts>=5 then return false; end if;
 update private.email_challenges set attempts=attempts+1 where id=p_id;
 if c.email<>p_email or c.purpose<>p_purpose or c.context_hash<>p_context or c.code_hash<>p_code then return false; end if;
 update private.email_challenges set consumed_at=now() where id=p_id;
 if c.actor is not null then insert into public.audit_log(actor,action,target) values(c.actor,'email_otp_verified:'||c.purpose,c.actor); end if;
 return true;
end;
$$;
revoke all on function private.issue_email_challenge(uuid,uuid,text,text,text,text,text),private.consume_email_challenge(uuid,text,text,text,text) from public;
grant execute on function private.issue_email_challenge(uuid,uuid,text,text,text,text,text),private.consume_email_challenge(uuid,text,text,text,text) to careathome_auth;

create function private.retire_email_trust() returns trigger language plpgsql security definer set search_path='' as $$
declare actor_id uuid;
begin
 if tg_table_name='identity_accounts' then
  if old.password is not distinct from new.password then return new; end if;
  actor_id:=new."userId";
 else
  if old.email is not distinct from new.email and old."twoFactorEnabled" is not distinct from new."twoFactorEnabled" then return new; end if;
  actor_id:=new.id;
 end if;
 delete from private.trusted_email_devices where actor=actor_id;
 update private.email_challenges set revoked_at=now() where actor=actor_id and consumed_at is null and revoked_at is null;
 return new;
end;
$$;
revoke all on function private.retire_email_trust() from public;
create trigger retire_password_trust after update of password on public.identity_accounts for each row execute function private.retire_email_trust();
create trigger retire_identity_trust after update of email,"twoFactorEnabled" on public.identity_users for each row execute function private.retire_email_trust();

create function private.close_own_account(p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor_id uuid; actor_role text;
begin
 actor_id:=private.security_actor(p_session);
 select role::text into actor_role from public.profiles where id=actor_id for update;
 if actor_role='admin' then raise exception 'Administrator accounts require a separate handover before closure'; end if;
 if exists(select 1 from public.bookings where (patient_id=actor_id or provider_id=actor_id) and status::text not in ('Completed','Cancelled')) then raise exception 'Resolve active bookings before closing your account'; end if;
 update public.profiles set active=false where id=actor_id;
 delete from public.identity_sessions where "userId"=actor_id;
 delete from private.trusted_email_devices where actor=actor_id;
 update private.email_challenges set revoked_at=now() where actor=actor_id and consumed_at is null;
 insert into public.audit_log(actor,action,target) values(actor_id,'account_closed',actor_id);
end;
$$;
revoke all on function private.close_own_account(uuid) from public;
grant execute on function private.close_own_account(uuid) to careathome_auth;
