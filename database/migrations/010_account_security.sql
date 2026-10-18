-- Only the restricted authentication service can operate on verification tokens.
create unique index identity_email_case_unique on public.identity_users(lower(email));
create table private.account_links (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('email','admin')),
 actor uuid not null references public.profiles(id),
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 254),
 previous_email text,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 delivered_at timestamptz, consumed_at timestamptz, revoked_at timestamptz,
 check(expires_at>created_at)
);
alter table private.account_links enable row level security;

create function private.security_actor(p_session uuid,p_admin boolean default false,p_sensitive boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare v record;
begin
 select p.id,p.role,u."twoFactorEnabled" as enabled,s."mfaVerified" as verified into v
 from public.identity_sessions s join public.profiles p on p.id=s."userId"
 join public.identity_users u on u.id=p.id
 where s.id=p_session and s."expiresAt">now() and p.active;
 if v.id is null or (p_admin and v.role<>'admin') then raise exception 'Not permitted'; end if;
 if p_sensitive and ((p_admin and not coalesce(v.enabled,false)) or
   ((coalesce(v.enabled,false) or p_admin) and not v.verified)) then
   raise exception 'Verify two-step security before continuing';
 end if;
 return v.id;
end;
$$;

create function private.account_link_create(p_session uuid,p_kind text,p_email text,p_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; link_id uuid; old_email text;
begin
 if p_kind not in ('email','admin') then raise exception 'Not permitted'; end if;
 actor_id:=private.security_actor(p_session,p_kind='admin');
 p_email:=lower(trim(p_email));
 perform pg_advisory_xact_lock(hashtextextended('account-link:'||p_kind||':'||actor_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('account-email:'||p_email,0));
 if (select count(*) from private.account_links where actor=actor_id and created_at>now()-interval '1 hour')>=10 then
  raise exception 'Too many requests. Try again later';
 end if;
 if exists(select 1 from public.identity_users where lower(email)=p_email) then
  raise exception 'Use a different email address';
 end if;
 select email into old_email from public.identity_users where id=actor_id;
 update private.account_links set revoked_at=now() where consumed_at is null and revoked_at is null
 and ((p_kind='email' and kind='email' and actor=actor_id) or (p_kind='admin' and kind='admin' and email=p_email));
 insert into private.account_links(kind,actor,email,previous_email,token_hash,expires_at)
 values(p_kind,actor_id,p_email,case when p_kind='email' then old_email end,p_hash,
 now()+case when p_kind='email' then interval '30 minutes' else interval '24 hours' end) returning id into link_id;
 insert into public.audit_log(actor,action,target) values(actor_id,case when p_kind='admin' then 'admin_invitation_created' else 'email_change_requested' end,link_id);
 return link_id;
end;
$$;

create function private.account_link_delivery(p_id uuid,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.account_links set delivered_at=case when p_success then now() end,
 revoked_at=case when not p_success then now() else revoked_at end
 where id=p_id and consumed_at is null and revoked_at is null;
end;
$$;

create function private.account_link_preview(p_hash text)
returns table(kind text,email text,expires_at timestamptz) language sql security definer set search_path='' as $$
 select l.kind,l.email,l.expires_at from private.account_links l join public.profiles p on p.id=l.actor
 where l.token_hash=p_hash and l.delivered_at is not null and l.expires_at>now()
 and l.consumed_at is null and l.revoked_at is null and p.active and (l.kind='email' or p.role='admin');
$$;

create function private.account_email_confirm(p_session uuid,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare actor_id uuid; l private.account_links; old_email text;
begin
 actor_id:=private.security_actor(p_session);
 select * into l from private.account_links where token_hash=p_hash for update;
 if l.id is null or l.kind<>'email' or l.actor<>actor_id or l.delivered_at is null or l.expires_at<=now()
 or l.consumed_at is not null or l.revoked_at is not null then raise exception 'Link is invalid, expired or already used'; end if;
 select email into old_email from public.identity_users where id=actor_id for update;
 if old_email<>l.previous_email then raise exception 'Link is invalid, expired or already used'; end if;
 update private.account_links set consumed_at=now() where id=l.id;
 update public.identity_users set email=l.email,"emailVerified"=true,"updatedAt"=now() where id=actor_id;
 delete from public.identity_sessions where "userId"=actor_id;
 return old_email;
end;
$$;

create function private.account_invitation_accept(p_hash text,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare l private.account_links; u record;
begin
 select * into l from private.account_links where token_hash=p_hash for update;
 if l.id is null or l.kind<>'admin' or l.delivered_at is null or l.expires_at<=now()
 or l.consumed_at is not null or l.revoked_at is not null then raise exception 'Link is invalid, expired or already used'; end if;
 perform 1 from public.profiles where id=l.actor and active and role='admin' for share;
 if not found then raise exception 'Invitation is no longer available'; end if;
 select i.email,p.role,p.active into u from public.identity_users i
 join public.profiles p on p.id=i.id where i.id=p_user for update of i,p;
 if u.email is null or lower(u.email)<>l.email or u.role<>'patient' or not u.active
 or exists(select 1 from public.bookings where patient_id=p_user) then raise exception 'Use a separate new administrator account'; end if;
 update private.account_links set consumed_at=now() where id=l.id;
 update public.identity_users set "emailVerified"=true,"updatedAt"=now() where id=p_user;
 update public.profiles set role='admin' where id=p_user;
 delete from public.identity_sessions where "userId"=p_user;
 insert into public.audit_log(actor,action,target) values(l.actor,'admin_invitation_accepted',p_user);
end;
$$;

create function private.account_links_list(p_session uuid,p_kind text)
returns table(id uuid,email text,created_at timestamptz,expires_at timestamptz,status text)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid;
begin
 actor_id:=private.security_actor(p_session,p_kind='admin',false);
 return query select l.id,l.email,l.created_at,l.expires_at,
 case when l.consumed_at is not null then 'Accepted' when l.revoked_at is not null then 'Revoked'
 when l.expires_at<=now() then 'Expired' when l.delivered_at is null then 'Sending' else 'Pending' end
 from private.account_links l where l.kind=p_kind and (p_kind='admin' or l.actor=actor_id)
 order by l.created_at desc limit 30;
end;
$$;

create function private.account_link_revoke(p_session uuid,p_link uuid) returns void
language plpgsql security definer set search_path='' as $$
declare l private.account_links; actor_id uuid;
begin
 select * into l from private.account_links where id=p_link for update;
 if l.id is null then raise exception 'Not permitted'; end if;
 actor_id:=private.security_actor(p_session,l.kind='admin');
 if l.kind='email' and l.actor<>actor_id then raise exception 'Not permitted'; end if;
 update private.account_links set revoked_at=now() where id=l.id and consumed_at is null and revoked_at is null;
 if found then insert into public.audit_log(actor,action,target) values(actor_id,'account_link_revoked',l.id); end if;
end;
$$;

create function private.account_sessions_list(p_session uuid)
returns table(id uuid,agent text,created_at timestamptz,updated_at timestamptz,expires_at timestamptz,is_current boolean)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid;
begin
 actor_id:=private.security_actor(p_session,false,false);
 return query select s.id,left(coalesce(s."userAgent",'Unknown browser'),300),s."createdAt",s."updatedAt",s."expiresAt",s.id=p_session
 from public.identity_sessions s where s."userId"=actor_id and s."expiresAt">now() order by s."updatedAt" desc limit 30;
end;
$$;

create function private.account_sessions_revoke(p_session uuid,p_target uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare actor_id uuid; n integer;
begin
 actor_id:=private.security_actor(p_session);
 if p_target=p_session then raise exception 'Use Sign out for this session'; end if;
 delete from public.identity_sessions where "userId"=actor_id and id<>p_session and (p_target is null or id=p_target);
 get diagnostics n=row_count;
 if n>0 then insert into public.audit_log(actor,action,target) values(actor_id,'sessions_revoked',actor_id); end if;
 return n;
end;
$$;

create function private.audit_identity_password() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.password is distinct from new.password then
  insert into public.audit_log(actor,action,target) values(new."userId",'password_changed',new."userId");
  update private.account_links set revoked_at=now() where actor=new."userId" and kind='email' and consumed_at is null and revoked_at is null;
 end if;
 return new;
end;
$$;
create trigger audit_password_change after update of password on public.identity_accounts for each row execute function private.audit_identity_password();
create function private.audit_identity_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.email is distinct from new.email then
  insert into public.audit_log(actor,action,target) values(new.id,'email_changed',new.id);
  delete from public.identity_sessions where "userId"=new.id;
  update private.account_links set revoked_at=now() where actor=new.id and kind='email' and consumed_at is null and revoked_at is null;
 end if;
 return new;
end;
$$;
create trigger audit_email_change after update of email on public.identity_users for each row execute function private.audit_identity_email();

revoke all on function private.security_actor(uuid,boolean,boolean),private.account_link_create(uuid,text,text,text),
 private.account_link_delivery(uuid,boolean),private.account_link_preview(text),private.account_email_confirm(uuid,text),
 private.account_invitation_accept(text,uuid),private.account_links_list(uuid,text),private.account_link_revoke(uuid,uuid),
 private.account_sessions_list(uuid),private.account_sessions_revoke(uuid,uuid),private.audit_identity_password(),private.audit_identity_email() from public;
grant execute on function private.security_actor(uuid,boolean,boolean),private.account_link_create(uuid,text,text,text),
 private.account_link_delivery(uuid,boolean),private.account_link_preview(text),private.account_email_confirm(uuid,text),
 private.account_invitation_accept(text,uuid),private.account_links_list(uuid,text),private.account_link_revoke(uuid,uuid),
 private.account_sessions_list(uuid),private.account_sessions_revoke(uuid,uuid) to careathome_auth;
