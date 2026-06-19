-- Agrega la tabla client_points a la función create_tenant_schema
-- y la crea en todos los schemas de tenants existentes.

-- 1. Actualizar la función para que los tenants nuevos tengan la tabla
create or replace function public.create_tenant_schema(p_schema text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('create schema if not exists %I', p_schema);

  execute format('
    create table %I.users (
      id               uuid primary key default gen_random_uuid(),
      supabase_auth_id uuid unique not null,
      email            text not null,
      nombre           text not null,
      tipo             text not null check (tipo in (''interno'', ''externo'')),
      client_id        uuid,
      activo           boolean not null default true,
      created_at       timestamptz not null default now()
    )', p_schema);

  execute format('
    create table %I.roles (
      id          uuid primary key default gen_random_uuid(),
      nombre      text not null,
      descripcion text,
      created_at  timestamptz not null default now()
    )', p_schema);

  execute format('
    create table %I.role_permissions (
      role_id uuid references %I.roles on delete cascade,
      permiso text not null,
      primary key (role_id, permiso)
    )', p_schema, p_schema);

  execute format('
    create table %I.user_roles (
      user_id uuid references %I.users on delete cascade,
      role_id uuid references %I.roles on delete cascade,
      primary key (user_id, role_id)
    )', p_schema, p_schema, p_schema);

  execute format('
    create table %I.clients (
      id         uuid primary key default gen_random_uuid(),
      nombre     text not null,
      direccion  text,
      telefono   text,
      email      text,
      activo     boolean not null default true,
      created_at timestamptz not null default now()
    )', p_schema);

  execute format('
    alter table %I.users
      add constraint fk_users_client
      foreign key (client_id) references %I.clients(id)
  ', p_schema, p_schema);

  execute format('
    create table %I.products (
      id         uuid primary key default gen_random_uuid(),
      nombre     text not null,
      sku        text,
      unidad     text,
      activo     boolean not null default true,
      created_at timestamptz not null default now()
    )', p_schema);

  -- Puntos de venta (ubicaciones físicas de un cliente)
  execute format('
    create table %I.client_points (
      id         uuid primary key default gen_random_uuid(),
      client_id  uuid references %I.clients(id) on delete cascade,
      nombre     text not null,
      direccion  text,
      lat        double precision,
      lng        double precision,
      telefono   text,
      activo     boolean not null default true,
      created_at timestamptz not null default now()
    )', p_schema, p_schema);

  execute format('create index on %I.client_points (client_id)', p_schema);

  execute format('
    create table %I.notifications (
      id         uuid primary key default gen_random_uuid(),
      user_id    uuid references %I.users on delete cascade,
      modulo     text not null,
      tipo       text not null,
      titulo     text not null,
      cuerpo     text not null,
      leida      boolean not null default false,
      payload    jsonb not null default ''{}'',
      created_at timestamptz not null default now()
    )', p_schema, p_schema);

  execute format('create index on %I.users (supabase_auth_id)', p_schema);
  execute format('create index on %I.notifications (user_id) where leida = false', p_schema);
end;
$$;

-- 2. Backfill: crear client_points en todos los schemas de tenants existentes
do $$
declare
  rec record;
begin
  for rec in
    select schema_name
    from public.tenants
    where activo = true
  loop
    begin
      execute format('
        create table if not exists %I.client_points (
          id         uuid primary key default gen_random_uuid(),
          client_id  uuid references %I.clients(id) on delete cascade,
          nombre     text not null,
          direccion  text,
          lat        double precision,
          lng        double precision,
          telefono   text,
          activo     boolean not null default true,
          created_at timestamptz not null default now()
        )', rec.schema_name, rec.schema_name);

      execute format('
        create index if not exists %I_client_points_client_id_idx
        on %I.client_points (client_id)
      ', rec.schema_name, rec.schema_name);
    exception
      when others then
        raise warning 'Error creando client_points en schema %: %', rec.schema_name, sqlerrm;
    end;
  end loop;
end;
$$;
