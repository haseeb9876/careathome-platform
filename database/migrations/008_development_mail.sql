-- Local demonstration delivery replaces Docker/Mailpit. No external email is sent.
alter table private.development_email add column source_id uuid unique;
grant usage on schema private to service_role;
grant insert on private.development_email to service_role;
