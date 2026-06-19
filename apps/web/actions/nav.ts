"use server"

import "@/lib/modules"
import { db, ModuleRegistry, withTenantSchema } from "@suplai/core"
import type { ModuleNavItem } from "@suplai/module-sdk"

export interface NavGroup {
  moduleId: string
  nombre: string
  items: ModuleNavItem[]
}

export async function getModuleNav(
  tenantId: string,
  schemaName: string,
  appUserId: string,
): Promise<NavGroup[]> {
  // Módulos activos del tenant
  const activeModules = await db<{ module_id: string }[]>`
    select module_id
    from public.tenant_modules
    where tenant_id = ${tenantId}::uuid
      and activo = true
  `

  // Todos los permisos del usuario en una sola query
  const permisos = await withTenantSchema(schemaName, (tx) =>
    tx<{ permiso: string }[]>`
      select rp.permiso
      from user_roles ur
      join role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = ${appUserId}::uuid
    `
  )
  const permSet = new Set(permisos.map((p) => p.permiso))

  const groups: NavGroup[] = []

  for (const { module_id } of activeModules) {
    const manifest = ModuleRegistry.get(module_id)
    if (!manifest || manifest.nav.length === 0) continue

    const items = manifest.nav.filter(
      (item) => !item.permission || permSet.has(item.permission),
    )
    if (items.length > 0) {
      groups.push({ moduleId: module_id, nombre: manifest.nombre, items })
    }
  }

  return groups
}
