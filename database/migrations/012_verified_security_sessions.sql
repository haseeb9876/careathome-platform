create or replace function private.security_actor(p_session uuid,p_admin boolean default false,p_sensitive boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare v record;
begin
 select p.id,p.role,u."twoFactorEnabled" as enabled,s."mfaVerified" as verified into v
 from public.identity_sessions s join public.profiles p on p.id=s."userId"
 join public.identity_users u on u.id=p.id
 where s.id=p_session and s."expiresAt">now() and s."createdAt">now()-interval '24 hours' and s."emailOtpVerified" and p.active;
 if v.id is null or (p_admin and v.role<>'admin') then raise exception 'Not permitted'; end if;
 if p_sensitive and ((p_admin and not coalesce(v.enabled,false)) or
   ((coalesce(v.enabled,false) or p_admin) and not v.verified)) then
   raise exception 'Verify two-step security before continuing';
 end if;
 return v.id;
end;
$$;
