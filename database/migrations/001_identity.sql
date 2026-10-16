-- Generated from pinned Better Auth configuration. Reviewed and applied by the migration runner.
create table "identity_users" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "twoFactorEnabled" boolean, "accountType" text not null, "profession" text);

create table "identity_sessions" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" uuid not null references "identity_users" ("id") on delete cascade, "mfaVerified" boolean not null);

create table "identity_accounts" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "accountId" text not null, "providerId" text not null, "userId" uuid not null references "identity_users" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "identity_verifications" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "identity_two_factors" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "secret" text not null, "backupCodes" text not null, "userId" uuid not null references "identity_users" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create table "identity_rate_limits" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "identity_sessions_userId_idx" on "identity_sessions" ("userId");

create index "identity_accounts_userId_idx" on "identity_accounts" ("userId");

create index "identity_verifications_identifier_idx" on "identity_verifications" ("identifier");

create index "identity_two_factors_secret_idx" on "identity_two_factors" ("secret");

create index "identity_two_factors_userId_idx" on "identity_two_factors" ("userId");
