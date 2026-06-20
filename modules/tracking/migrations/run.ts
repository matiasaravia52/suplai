import { withTenantSchema } from "@suplai/core"

export async function runMigrations(schemaName: string): Promise<void> {
  await withTenantSchema(schemaName, async (db) => {
    // 001: tablas principales
    await db.unsafe(`
      create table if not exists tracking__visits (
        id               uuid primary key default gen_random_uuid(),
        client_point_id  uuid not null references client_points(id) on delete restrict,
        user_id          uuid not null references users(id) on delete restrict,
        checkin_at       timestamptz not null default now(),
        checkin_lat      double precision not null,
        checkin_lng      double precision not null,
        checkout_at      timestamptz,
        checkout_lat     double precision,
        checkout_lng     double precision,
        created_at       timestamptz not null default now()
      )
    `)

    await db.unsafe(`
      create index if not exists tracking__visits_user_checkout_idx
        on tracking__visits (user_id, checkout_at)
    `)
    await db.unsafe(`
      create index if not exists tracking__visits_point_checkin_idx
        on tracking__visits (client_point_id, checkin_at)
    `)

    await db.unsafe(`
      create table if not exists tracking__employee_status (
        user_id      uuid primary key references users(id) on delete cascade,
        current_lat  double precision,
        current_lng  double precision,
        last_seen_at timestamptz,
        visit_id     uuid references tracking__visits(id) on delete set null
      )
    `)

    await db.unsafe(`
      do $$ begin
        if not exists (
          select 1 from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = current_schema() and c.relname = 'tracking__employee_status'
            and c.relrowsecurity = true
        ) then
          execute format('alter table %I.tracking__employee_status enable row level security', current_schema());
        end if;
      end $$
    `)

    await db.unsafe(`
      create table if not exists tracking__route_points (
        id          uuid primary key default gen_random_uuid(),
        user_id     uuid not null references users(id) on delete restrict,
        visit_id    uuid references tracking__visits(id) on delete set null,
        lat         double precision not null,
        lng         double precision not null,
        speed_kmh   integer,
        heading     float,
        recorded_at timestamptz not null,
        created_at  timestamptz not null default now()
      )
    `)

    await db.unsafe(`
      create index if not exists tracking__route_points_user_recorded_idx
        on tracking__route_points (user_id, recorded_at)
    `)

    await db.unsafe(`
      create table if not exists tracking__fraud_alerts (
        id                uuid primary key default gen_random_uuid(),
        visit_id          uuid not null references tracking__visits(id) on delete cascade,
        user_id           uuid not null references users(id) on delete restrict,
        client_point_id   uuid not null references client_points(id) on delete restrict,
        distancia_metros  integer not null,
        created_at        timestamptz not null default now()
      )
    `)

    await db.unsafe(`
      create index if not exists tracking__fraud_alerts_user_created_idx
        on tracking__fraud_alerts (user_id, created_at)
    `)

    await db.unsafe(`
      create table if not exists tracking__unknown_points (
        id               uuid primary key default gen_random_uuid(),
        user_id          uuid not null references users(id) on delete restrict,
        client_point_id  uuid references client_points(id) on delete set null,
        lat              double precision not null,
        lng              double precision not null,
        created_at       timestamptz not null default now()
      )
    `)

    // 002: (route_plans eliminado en 007 — ver abajo)

    // 003: nombre y descripción en unknown_points
    await db.unsafe(`
      alter table tracking__unknown_points
        add column if not exists nombre      text not null default '',
        add column if not exists descripcion  text
    `)

    // 004: accuracy_metros en route_points
    await db.unsafe(`
      alter table tracking__route_points
        add column if not exists accuracy_metros integer
    `)

    // 005: resultado en visits
    await db.unsafe(`
      alter table tracking__visits
        add column if not exists resultado text
          check (resultado in ('venta', 'no_venta'))
    `)

    // 006: zonas (asignación permanente de puntos de venta, reemplaza route_plans)
    await db.unsafe(`
      create table if not exists tracking__zonas (
        id          uuid primary key default gen_random_uuid(),
        user_id     uuid not null references users(id) on delete restrict,
        nombre      text not null default '',
        created_by  uuid not null references users(id) on delete restrict,
        created_at  timestamptz not null default now(),
        unique (user_id)
      )
    `)
    await db.unsafe(`
      create table if not exists tracking__zona_stops (
        id               uuid primary key default gen_random_uuid(),
        zona_id          uuid not null references tracking__zonas(id) on delete cascade,
        client_point_id  uuid not null references client_points(id) on delete restrict,
        orden            integer not null,
        created_at       timestamptz not null default now(),
        unique (zona_id, orden),
        unique (zona_id, client_point_id)
      )
    `)
    await db.unsafe(`
      create index if not exists tracking__zona_stops_zona_orden_idx
        on tracking__zona_stops (zona_id, orden)
    `)

    // 008: accuracy_metros como double precision (GPS devuelve decimales)
    await db.unsafe(`
      alter table tracking__route_points
        alter column accuracy_metros type double precision
    `)
  })
}
