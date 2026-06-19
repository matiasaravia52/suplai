"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db, withTenantSchema } from "@suplai/core"
import type { Tenant } from "@suplai/types"

function toSchemaName(subdominio: string): string {
  return "tenant_" + subdominio.toLowerCase().replace(/[^a-z0-9]/g, "_")
}

export async function createTenant(formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const subdominio = (formData.get("subdominio") as string).trim().toLowerCase()

  if (!nombre || !subdominio) return { error: "Nombre y subdominio son requeridos" }
  if (!/^[a-z0-9-]+$/.test(subdominio)) return { error: "Subdominio solo puede tener letras minúsculas, números y guiones" }

  const schemaName = toSchemaName(subdominio)

  // Insertar tenant
  const rows = await db<{ id: string }[]>`
    insert into public.tenants (nombre, subdominio, schema_name, config_visual)
    values (${nombre}, ${subdominio}, ${schemaName}, '{}')
    returning id
  `
  const tenantId = rows[0]!.id

  // Crear schema con tablas core
  await db`select public.create_tenant_schema(${schemaName})`

  // Asignar módulos core automáticamente
  await db`
    insert into public.tenant_modules (tenant_id, module_id, activo, version, features)
    select ${tenantId}::uuid, id, true, version, '{}'::jsonb
    from public.modules
    where is_core = true
  `

  // Crear roles por defecto en el schema del tenant
  await withTenantSchema(schemaName, async (tx) => {
    const roles = await tx<{ id: string; nombre: string }[]>`
      insert into roles (nombre, descripcion) values
        ('tenant_admin',  'Acceso total al tenant'),
        ('coordinador',   'Gestión de operaciones y repartidores'),
        ('repartidor',    'Acceso solo a la app móvil')
      returning id, nombre
    `
    const adminRole = roles.find((r) => r.nombre === "tenant_admin")!
    await tx`
      insert into role_permissions (role_id, permiso)
      select ${adminRole.id}::uuid, unnest(array[
        'users:internal_users:manage',
        'users:external_users:manage',
        'users:roles:manage'
      ])
    `
  })

  redirect(`/tenants/${tenantId}`)
}

export async function toggleModule(tenantId: string, moduleId: string, activo: boolean) {
  await db`
    insert into public.tenant_modules (tenant_id, module_id, activo, version, features)
    select ${tenantId}::uuid, id, ${activo}, version, '{}'::jsonb
    from public.modules where id = ${moduleId}
    on conflict (tenant_id, module_id)
    do update set activo = excluded.activo
  `
  revalidatePath(`/tenants/${tenantId}`)
}

export async function toggleTenant(tenantId: string, activo: boolean) {
  await db`update public.tenants set activo = ${activo} where id = ${tenantId}::uuid`
  revalidatePath(`/tenants/${tenantId}`)
  revalidatePath("/tenants")
}

// Datos para las páginas

export async function getTenants(): Promise<Tenant[]> {
  return db<Tenant[]>`
    select id, nombre, subdominio, schema_name, config_visual, activo, created_at
    from public.tenants
    order by created_at desc
  `
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const rows = await db<Tenant[]>`
    select id, nombre, subdominio, schema_name, config_visual, activo, created_at
    from public.tenants where id = ${id}::uuid
  `
  return rows[0] ?? null
}

export async function getTenantModules(tenantId: string) {
  return db<{ module_id: string; nombre: string; is_core: boolean; activo: boolean }[]>`
    select m.id as module_id, m.nombre, m.is_core,
           coalesce(tm.activo, false) as activo
    from public.modules m
    left join public.tenant_modules tm
      on tm.module_id = m.id and tm.tenant_id = ${tenantId}::uuid
    order by m.is_core desc, m.nombre
  `
}
