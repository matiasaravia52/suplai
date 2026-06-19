-- Módulo: tracking
-- Migración 002: hojas de ruta

create table %I.tracking__route_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references %I.users(id) on delete restrict,
  fecha       date not null,
  estado      text not null default 'borrador' check (estado in ('borrador', 'activa', 'completada')),
  created_by  uuid not null references %I.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index on %I.tracking__route_plans (user_id, fecha);

create table %I.tracking__route_plan_stops (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references %I.tracking__route_plans(id) on delete cascade,
  client_point_id  uuid not null references %I.client_points(id) on delete restrict,
  orden            integer not null,
  visit_id         uuid references %I.tracking__visits(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (plan_id, orden)
);

create index on %I.tracking__route_plan_stops (plan_id, orden);
