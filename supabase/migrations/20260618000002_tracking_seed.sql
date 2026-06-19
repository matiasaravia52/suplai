-- Módulo tracking: actualiza nombre y crea tablas en tenants existentes.
-- Para tenants nuevos, las tablas se crean al activar el módulo desde el admin.

-- 1. Actualizar registro del módulo
update public.modules
set nombre = 'Tracking Operativo'
where id = 'tracking';

-- 2. Backfill: crear tablas de tracking en schemas de tenants que ya tienen tracking activo
do $$
declare
  rec record;
begin
  for rec in
    select t.schema_name
    from public.tenants t
    join public.tenant_modules tm on tm.tenant_id = t.id
    where tm.module_id = 'tracking'
      and tm.activo = true
      and t.activo = true
  loop
    begin
      -- tracking__visits
      execute format('
        create table if not exists %I.tracking__visits (
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
        )', rec.schema_name, rec.schema_name, rec.schema_name);

      execute format('
        create index if not exists %I_tracking_visits_user_checkout_idx
        on %I.tracking__visits (user_id, checkout_at)
      ', rec.schema_name, rec.schema_name);

      execute format('
        create index if not exists %I_tracking_visits_point_checkin_idx
        on %I.tracking__visits (client_point_id, checkin_at)
      ', rec.schema_name, rec.schema_name);

      -- tracking__employee_status
      execute format('
        create table if not exists %I.tracking__employee_status (
          user_id      uuid primary key references %I.users(id) on delete cascade,
          current_lat  double precision,
          current_lng  double precision,
          last_seen_at timestamptz,
          visit_id     uuid references %I.tracking__visits(id) on delete set null
        )', rec.schema_name, rec.schema_name, rec.schema_name);

      execute format('alter table %I.tracking__employee_status enable row level security', rec.schema_name);

      -- tracking__route_points
      execute format('
        create table if not exists %I.tracking__route_points (
          id          uuid primary key default gen_random_uuid(),
          user_id     uuid not null references %I.users(id) on delete restrict,
          visit_id    uuid references %I.tracking__visits(id) on delete set null,
          lat         double precision not null,
          lng         double precision not null,
          speed_kmh   integer,
          heading     float,
          recorded_at timestamptz not null,
          created_at  timestamptz not null default now()
        )', rec.schema_name, rec.schema_name, rec.schema_name);

      execute format('
        create index if not exists %I_tracking_route_points_user_recorded_idx
        on %I.tracking__route_points (user_id, recorded_at)
      ', rec.schema_name, rec.schema_name);

      -- tracking__fraud_alerts
      execute format('
        create table if not exists %I.tracking__fraud_alerts (
          id                uuid primary key default gen_random_uuid(),
          visit_id          uuid not null references %I.tracking__visits(id) on delete cascade,
          user_id           uuid not null references %I.users(id) on delete restrict,
          client_point_id   uuid not null references %I.client_points(id) on delete restrict,
          distancia_metros  integer not null,
          created_at        timestamptz not null default now()
        )', rec.schema_name, rec.schema_name, rec.schema_name, rec.schema_name);

      execute format('
        create index if not exists %I_tracking_fraud_alerts_user_created_idx
        on %I.tracking__fraud_alerts (user_id, created_at)
      ', rec.schema_name, rec.schema_name);

      -- tracking__unknown_points
      execute format('
        create table if not exists %I.tracking__unknown_points (
          id               uuid primary key default gen_random_uuid(),
          user_id          uuid not null references %I.users(id) on delete restrict,
          client_point_id  uuid references %I.client_points(id) on delete set null,
          lat              double precision not null,
          lng              double precision not null,
          created_at       timestamptz not null default now()
        )', rec.schema_name, rec.schema_name, rec.schema_name);

    exception
      when others then
        raise warning 'Error creando tablas tracking en schema %: %', rec.schema_name, sqlerrm;
    end;
  end loop;
end;
$$;
