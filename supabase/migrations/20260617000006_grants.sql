-- PostgREST necesita GRANTs explícitos desde que auto_expose_new_tables está desactivado.
-- La service_role es la única que accede a estas tablas (RLS bloquea anon/authenticated).

grant select on public.tenants to service_role;
grant select on public.modules to service_role;
grant select, insert, update, delete on public.tenant_modules to service_role;
grant select, insert, update, delete on public.tenant_migrations to service_role;
grant select, insert, update, delete on public.user_tenant_map to service_role;
