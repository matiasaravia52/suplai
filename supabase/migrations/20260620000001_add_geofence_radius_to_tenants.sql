alter table public.tenants
  add column if not exists geofence_radius_metros integer not null default 100
  check (geofence_radius_metros between 10 and 2000);
