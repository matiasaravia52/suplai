-- Crear tablas de zonas (asignacion permanente de puntos de venta, sin fecha)
create table if not exists tracking__zonas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete restrict,
  nombre      text not null default '',
  created_by  uuid not null references users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create table if not exists tracking__zona_stops (
  id               uuid primary key default gen_random_uuid(),
  zona_id          uuid not null references tracking__zonas(id) on delete cascade,
  client_point_id  uuid not null references client_points(id) on delete restrict,
  orden            integer not null,
  created_at       timestamptz not null default now(),
  unique (zona_id, orden),
  unique (zona_id, client_point_id)
);

create index if not exists tracking__zona_stops_zona_orden_idx
  on tracking__zona_stops (zona_id, orden);
