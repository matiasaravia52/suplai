-- Schema público: datos globales de la plataforma

create table public.tenants (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  subdominio   text not null unique,
  schema_name  text not null unique,
  config_visual jsonb not null default '{}',
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.modules (
  id       text primary key,   -- 'tracking', 'fuel', etc.
  nombre   text not null,
  version  text not null,
  is_core  boolean not null default false
);

create table public.tenant_modules (
  tenant_id  uuid references public.tenants on delete cascade,
  module_id  text references public.modules on delete restrict,
  activo     boolean not null default true,
  version    text not null,
  features   jsonb not null default '{}',
  primary key (tenant_id, module_id)
);

create table public.tenant_migrations (
  tenant_id   uuid references public.tenants on delete cascade,
  module_id   text not null,
  migration   text not null,
  applied_at  timestamptz not null default now(),
  primary key (tenant_id, module_id, migration)
);

-- Índices útiles
create index on public.tenants (subdominio);
create index on public.tenant_modules (tenant_id) where activo = true;
