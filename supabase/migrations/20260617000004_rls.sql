-- RLS en el schema público.
-- Las tablas del schema público solo son accesibles desde el backend
-- usando la service role key. Los clientes nunca acceden directamente.

alter table public.tenants         enable row level security;
alter table public.modules         enable row level security;
alter table public.tenant_modules  enable row level security;
alter table public.tenant_migrations enable row level security;

-- Solo la service role puede leer/escribir (el backend).
-- El anon key y los JWT de usuarios no tienen acceso.
create policy "service role only" on public.tenants
  using (auth.role() = 'service_role');

create policy "service role only" on public.modules
  using (auth.role() = 'service_role');

create policy "service role only" on public.tenant_modules
  using (auth.role() = 'service_role');

create policy "service role only" on public.tenant_migrations
  using (auth.role() = 'service_role');
