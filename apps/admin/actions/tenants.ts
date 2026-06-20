"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db, withTenantSchema, ModuleRegistry } from "@suplai/core"
import type { Tenant } from "@suplai/types"
// Registra todos los módulos en el registry para que toggleModule pueda leer sus manifests
import "@suplai/tracking"

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
    const coordRole = roles.find((r) => r.nombre === "coordinador")!
    await tx`
      insert into role_permissions (role_id, permiso)
      select ${adminRole.id}::uuid, unnest(array[
        'users:internal_users:manage',
        'users:external_users:manage',
        'users:roles:manage',
        'clients:clients:view'
      ])
    `
    await tx`
      insert into role_permissions (role_id, permiso)
      values (${coordRole.id}::uuid, 'clients:clients:view')
    `
  })

  revalidatePath("/tenants")
  redirect(`/tenants/${tenantId}`)
}

export async function reRunMigrations(tenantId: string, moduleId: string) {
  const tenant = await getTenant(tenantId)
  if (!tenant) return
  const manifest = ModuleRegistry.get(moduleId)
  if (!manifest?.runMigrations) return
  await manifest.runMigrations(tenant.schema_name)
  revalidatePath(`/tenants/${tenantId}`)
}

export async function toggleModule(tenantId: string, moduleId: string, activo: boolean) {
  const tenant = await getTenant(tenantId)
  if (!tenant) return

  await db`
    insert into public.tenant_modules (tenant_id, module_id, activo, version, features)
    select ${tenantId}::uuid, id, ${activo}, version, '{}'::jsonb
    from public.modules where id = ${moduleId}
    on conflict (tenant_id, module_id)
    do update set activo = excluded.activo
  `

  const manifest = ModuleRegistry.get(moduleId)

  if (activo && manifest) {
    // Al activar: correr migraciones + sembrar role_permissions
    if (manifest.runMigrations) {
      await manifest.runMigrations(tenant.schema_name)
    }
    if (manifest.permissionRoles) {
      await withTenantSchema(tenant.schema_name, async (tx) => {
        for (const [permiso, roles] of Object.entries(manifest.permissionRoles!)) {
          for (const rolNombre of roles) {
            await tx`
              insert into role_permissions (role_id, permiso)
              select r.id, ${permiso}
              from roles r
              where r.nombre = ${rolNombre}
              on conflict do nothing
            `
          }
        }
      })
    }
  }

  if (!activo && manifest?.permissionRoles) {
    // Al desactivar: eliminar los permisos del módulo de todos los roles
    const permisos = Object.keys(manifest.permissionRoles)
    await withTenantSchema(tenant.schema_name, async (tx) => {
      for (const permiso of permisos) {
        await tx`delete from role_permissions where permiso = ${permiso}`
      }
    })
  }

  revalidatePath(`/tenants/${tenantId}`)
}

export async function toggleTenant(tenantId: string, activo: boolean) {
  await db`update public.tenants set activo = ${activo} where id = ${tenantId}::uuid`
  revalidatePath(`/tenants/${tenantId}`)
  revalidatePath("/tenants")
}

export async function deleteTenant(tenantId: string) {
  const tenant = await getTenant(tenantId)
  if (!tenant) return { error: "Tenant no encontrado" }

  // 1. Obtener todos los auth_user_id del schema del tenant
  const authUsers = await withTenantSchema(tenant.schema_name, (tx) =>
    tx<{ supabase_auth_id: string }[]>`select supabase_auth_id from users`
  )

  // 2. Borrar usuarios de Supabase Auth (requiere service role)
  const { createServiceClient } = await import("@/lib/supabase/server")
  const supabase = await createServiceClient()
  for (const { supabase_auth_id } of authUsers) {
    await supabase.auth.admin.deleteUser(supabase_auth_id)
  }

  // 3. Drop del schema CASCADE (elimina todas las tablas del tenant)
  await db.unsafe(`drop schema if exists "${tenant.schema_name}" cascade`)

  // 4. Borrar el tenant (cascade elimina tenant_modules, tenant_migrations)
  await db`delete from public.tenants where id = ${tenantId}::uuid`

  redirect("/tenants")
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

export async function getModuleFeatureConfig(tenantId: string, moduleId: string) {
  const rows = await db<{ features: Record<string, boolean> }[]>`
    select features
    from public.tenant_modules
    where tenant_id = ${tenantId}::uuid and module_id = ${moduleId}
  `
  const saved = rows[0]?.features ?? {}
  const manifest = ModuleRegistry.get(moduleId)
  if (!manifest) return null

  return {
    manifest,
    features: manifest.features.map((f) => ({
      ...f,
      enabled: f.id in saved ? saved[f.id] : f.defaultEnabled,
    })),
  }
}

export async function getMigrations(tenantId: string, moduleId: string) {
  const tenant = await getTenant(tenantId)
  if (!tenant) throw new Error("Tenant no encontrado")
  const manifest = ModuleRegistry.get(moduleId)
  if (!manifest) throw new Error("Módulo no encontrado")
  const { getMigrationStatus } = await import("@suplai/tracking/service")
  return getMigrationStatus(tenant.schema_name, manifest.migrations ?? [])
}

export async function runMigration(tenantId: string, moduleId: string, migrationName: string) {
  const tenant = await getTenant(tenantId)
  if (!tenant) throw new Error("Tenant no encontrado")
  if (moduleId === "tracking") {
    const { runSingleMigration } = await import("@suplai/tracking/migrations")
    await runSingleMigration(tenant.schema_name, migrationName)
  } else {
    throw new Error(`Módulo '${moduleId}' no soporta migraciones individuales`)
  }
  revalidatePath(`/tenants/${tenantId}/modules/${moduleId}/migrations`)
}

export async function updateModuleFeature(
  tenantId: string,
  moduleId: string,
  featureId: string,
  enabled: boolean,
) {
  await db`
    update public.tenant_modules
    set features = features || jsonb_build_object(${featureId}::text, ${enabled}::boolean)
    where tenant_id = ${tenantId}::uuid and module_id = ${moduleId}
  `
  revalidatePath(`/tenants/${tenantId}/modules/${moduleId}`)
}
