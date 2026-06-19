-- Módulo: tracking
-- Migración 001: tablas principales
-- Se ejecuta dentro del schema del tenant vía format() en create_tenant_schema()

create table %I.tracking__visits (
  id               uuid primary key default gen_random_uuid(),
  client_point_id  uuid not null references %I.client_points(id) on delete restrict,
  user_id          uuid not null references %I.users(id) on delete restrict,
  checkin_at       timestamptz not null default now(),
  checkin_lat      double precision not null,
  checkin_lng      double precision not null,
  checkout_at      timestamptz,
  checkout_lat     double precision,
  checkout_lng     double precision,
  created_at       timestamptz not null default now()
);

create index on %I.tracking__visits (user_id, checkout_at);
create index on %I.tracking__visits (client_point_id, checkin_at);

-- Una fila por empleado de campo. Upsert en cada flush GPS.
-- RLS habilitado para que Supabase Realtime funcione con schema custom.
create table %I.tracking__employee_status (
  user_id      uuid primary key references %I.users(id) on delete cascade,
  current_lat  double precision,
  current_lng  double precision,
  last_seen_at timestamptz,
  visit_id     uuid references %I.tracking__visits(id) on delete set null
);

alter table %I.tracking__employee_status enable row level security;

create table %I.tracking__route_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references %I.users(id) on delete restrict,
  visit_id    uuid references %I.tracking__visits(id) on delete set null,
  lat         double precision not null,
  lng         double precision not null,
  speed_kmh   integer,
  heading     float,
  recorded_at timestamptz not null,
  created_at  timestamptz not null default now()
);

create index on %I.tracking__route_points (user_id, recorded_at);

create table %I.tracking__fraud_alerts (
  id                uuid primary key default gen_random_uuid(),
  visit_id          uuid not null references %I.tracking__visits(id) on delete cascade,
  user_id           uuid not null references %I.users(id) on delete restrict,
  client_point_id   uuid not null references %I.client_points(id) on delete restrict,
  distancia_metros  integer not null,
  created_at        timestamptz not null default now()
);

create index on %I.tracking__fraud_alerts (user_id, created_at);

create table %I.tracking__unknown_points (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references %I.users(id) on delete restrict,
  client_point_id  uuid references %I.client_points(id) on delete set null,
  lat              double precision not null,
  lng              double precision not null,
  created_at       timestamptz not null default now()
);
