-- Siembra los permisos del módulo tracking en los roles correspondientes
-- para tenants que ya tenían tracking activo antes de que toggleModule lo hiciera automáticamente.

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
      execute format($sql$
        insert into %I.role_permissions (role_id, permiso)
        select r.id, perms.permiso
        from (values
          ('coordinador',  'tracking:field_tracking:view'),
          ('coordinador',  'tracking:field_tracking:export'),
          ('coordinador',  'tracking:route_tracing:view'),
          ('coordinador',  'tracking:unknown_points:view'),
          ('coordinador',  'tracking:route_plans:manage'),
          ('tenant_admin', 'tracking:field_tracking:view'),
          ('tenant_admin', 'tracking:field_tracking:export'),
          ('tenant_admin', 'tracking:route_tracing:view'),
          ('tenant_admin', 'tracking:unknown_points:view'),
          ('tenant_admin', 'tracking:route_plans:manage'),
          ('repartidor',   'tracking:field_tracking:create'),
          ('repartidor',   'tracking:unknown_points:create'),
          ('pre_vendedor', 'tracking:field_tracking:create'),
          ('pre_vendedor', 'tracking:unknown_points:create')
        ) as perms(rol, permiso)
        join %I.roles r on r.nombre = perms.rol
        on conflict do nothing
      $sql$, rec.schema_name, rec.schema_name);
    exception
      when others then
        raise warning 'Error sembrando permisos tracking en %: %', rec.schema_name, sqlerrm;
    end;
  end loop;
end;
$$;
