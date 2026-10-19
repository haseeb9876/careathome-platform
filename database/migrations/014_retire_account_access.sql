create function private.retire_account_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (old.active and not new.active) or old.role is distinct from new.role then
  delete from public.identity_sessions where "userId"=new.id;
  delete from private.trusted_email_devices where actor=new.id;
  update private.email_challenges set revoked_at=now() where actor=new.id and consumed_at is null and revoked_at is null;
 end if;
 return new;
end;
$$;
revoke all on function private.retire_account_access() from public;
create trigger retire_account_access after update of active,role on public.profiles for each row execute function private.retire_account_access();
create index email_challenge_expiry on private.email_challenges(expires_at);
