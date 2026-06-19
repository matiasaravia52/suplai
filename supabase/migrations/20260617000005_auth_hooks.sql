-- Mapeo auth_user → tenant. Se popula al crear usuarios desde el Users Service.
create table public.user_tenant_map (
  auth_user_id uuid primary key references auth.users on delete cascade,
  tenant_id    uuid not null references public.tenants on delete cascade
);

create index on public.user_tenant_map (tenant_id);

-- Solo el backend (service_role) puede leer/escribir esta tabla
alter table public.user_tenant_map enable row level security;
create policy "service role only" on public.user_tenant_map
  using (auth.role() = 'service_role');

-- Hook custom_access_token: agrega tenant_id, schema_name, app_user_id y roles al JWT.
-- Supabase lo llama cada vez que emite un token para un usuario autenticado.
create or replace function public.custom_access_token(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  v_auth_user_id uuid;
  v_tenant_id    uuid;
  v_schema_name  text;
  v_app_user_id  uuid;
  v_roles        text[];
  v_claims       jsonb;
begin
  v_auth_user_id := (event ->> 'user_id')::uuid;

  -- Buscar tenant del usuario
  select utm.tenant_id, t.schema_name
  into v_tenant_id, v_schema_name
  from public.user_tenant_map utm
  join public.tenants t on t.id = utm.tenant_id and t.activo = true
  where utm.auth_user_id = v_auth_user_id;

  -- Si no tiene tenant asociado es un super admin — no agregar claims de tenant
  if v_tenant_id is null then
    return event;
  end if;

  -- Obtener user_id interno del tenant y sus roles
  execute format(
    $q$
    select u.id, array_remove(array_agg(r.nombre), null)
    from %I.users u
    left join %I.user_roles ur on ur.user_id = u.id
    left join %I.roles r on r.id = ur.role_id
    where u.supabase_auth_id = $1 and u.activo = true
    group by u.id
    $q$,
    v_schema_name, v_schema_name, v_schema_name
  ) using v_auth_user_id into v_app_user_id, v_roles;

  -- Agregar claims al JWT
  v_claims := event -> 'claims';
  v_claims := v_claims
    || jsonb_build_object(
        'tenant_id',    v_tenant_id::text,
        'schema_name',  v_schema_name,
        'app_user_id',  v_app_user_id::text,
        'roles',        coalesce(to_jsonb(v_roles), '[]'::jsonb)
       );

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- Dar permisos de ejecución al rol supabase_auth_admin (quien llama al hook)
grant execute on function public.custom_access_token(jsonb) to supabase_auth_admin;
