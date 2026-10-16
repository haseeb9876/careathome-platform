-- Shared by HTTP endpoints and server actions; never store raw email/token keys.
create table private.auth_attempts (
  key_hash text primary key,
  window_started timestamptz not null default now(),
  attempts integer not null default 1
);
grant select,insert,update,delete on private.auth_attempts to careathome_auth;
