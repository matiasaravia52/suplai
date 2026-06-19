-- Registra 'clients' como módulo core y siembra permisos en tenants existentes

insert into public.modules (id, nombre, version, is_core)
values ('clients', 'Clientes', '1.0.0', true)
on conflict (id) do nothing;

-- Activar para todos los tenants existentes
insert into public.tenant_modules (tenant_id, module_id, activo, version, features)
select t.id, 'clients', true, '1.0.0', '{}'::jsonb
from public.tenants t
on conflict (tenant_id, module_id) do nothing;

-- Sembrar permiso clients:clients:view para tenant_admin y coordinador en cada schema
do $$
declare
  rec record;
begin
  for rec in select schema_name from public.tenants where activo = true loop
    begin
      execute format($sql$
        insert into %I.role_permissions (role_id, permiso)
        select r.id, 'clients:clients:view'
        from %I.roles r
        where r.nombre in ('tenant_admin', 'coordinador')
        on conflict do nothing
      $sql$, rec.schema_name, rec.schema_name);
    exception
      when others then
        raise warning 'Error en %: %', rec.schema_name, sqlerrm;
    end;
  end loop;
end;
$$;
