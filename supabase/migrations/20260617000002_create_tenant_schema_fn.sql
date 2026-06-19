-- Función que crea el schema de un tenant y sus tablas core.
-- Se llama desde el backend al dar de alta un tenant nuevo.
-- Recibe el schema_name del tenant (ej: 'tenant_lopez').

create or replace function public.create_tenant_schema(p_schema text)
returns void
language plpgsql
security definer
as $$
begin
  -- Crear el schema
  execute format('create schema if not exists %I', p_schema);

  -- Tabla de usuarios internos y externos del tenant
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

  -- Roles del tenant
  execute format('
    create table %I.roles (
      id          uuid primary key default gen_random_uuid(),
      nombre      text not null,
      descripcion text,
      created_at  timestamptz not null default now()
    )', p_schema);

  -- Permisos asignados a roles (formato: modulo:feature:accion)
  execute format('
    create table %I.role_permissions (
      role_id uuid references %I.roles on delete cascade,
      permiso text not null,
      primary key (role_id, permiso)
    )', p_schema, p_schema);

  -- Roles asignados a usuarios
  execute format('
    create table %I.user_roles (
      user_id uuid references %I.users on delete cascade,
      role_id uuid references %I.roles on delete cascade,
      primary key (user_id, role_id)
    )', p_schema, p_schema, p_schema);

  -- Clientes (locales minoristas) del distribuidor
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

  -- FK de users.client_id ahora que clients existe
  execute format('
    alter table %I.users
      add constraint fk_users_client
      foreign key (client_id) references %I.clients(id)
  ', p_schema, p_schema);

  -- Productos que maneja el distribuidor
  execute format('
    create table %I.products (
      id         uuid primary key default gen_random_uuid(),
      nombre     text not null,
      sku        text,
      unidad     text,
      activo     boolean not null default true,
      created_at timestamptz not null default now()
    )', p_schema);

  -- Notificaciones para usuarios del tenant
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

  -- Índices core
  execute format('create index on %I.users (supabase_auth_id)', p_schema);
  execute format('create index on %I.notifications (user_id) where leida = false', p_schema);
end;
$$;
