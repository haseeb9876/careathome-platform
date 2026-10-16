-- ON CONFLICT(source_id) requires read access to the conflict-key column only.
grant select(source_id) on private.development_email to service_role;
