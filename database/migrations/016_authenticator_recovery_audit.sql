-- Audit encrypted recovery-code changes atomically without granting the auth
-- role direct access to the audit table. This includes replacement and use.
create function private.audit_authenticator_recovery_codes() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old."backupCodes" is distinct from new."backupCodes" then
  insert into public.audit_log(actor,action,target)
  values(new."userId",'authenticator_recovery_codes_updated',new."userId");
 end if;
 return new;
end;
$$;
revoke all on function private.audit_authenticator_recovery_codes() from public;
create trigger audit_authenticator_recovery_codes
after update of "backupCodes" on public.identity_two_factors
for each row execute function private.audit_authenticator_recovery_codes();
