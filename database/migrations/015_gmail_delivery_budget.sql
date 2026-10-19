-- Leave room for personal mail and avoid OTP/notification loops exhausting Gmail.
create table private.gmail_delivery_budget(day date primary key,attempts integer not null);
alter table private.gmail_delivery_budget enable row level security;
revoke all on private.gmail_delivery_budget from public,anon,authenticated,careathome_app;
create function private.reserve_gmail_delivery() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into private.gmail_delivery_budget(day,attempts) values((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set attempts=gmail_delivery_budget.attempts+1 where gmail_delivery_budget.attempts<300
 returning attempts into n;
 return n is not null;
end;
$$;
revoke all on function private.reserve_gmail_delivery() from public;
grant execute on function private.reserve_gmail_delivery() to careathome_auth;
