import { db } from "./db"

export async function hasModuleFeature(
  tenantId: string,
  moduleId: string,
  featureId: string,
): Promise<boolean> {
  const rows = await db<{ active: boolean; features: Record<string, boolean> }[]>`
    select activo as active, features
    from public.tenant_modules
    where tenant_id = ${tenantId}::uuid
      and module_id = ${moduleId}
  `
  const row = rows[0]
  if (!row?.active) return false
  // Si la feature no está en el jsonb, asumimos que está habilitada por defecto
  if (!(featureId in row.features)) return true
  return row.features[featureId] === true
}

export async function hasModule(tenantId: string, moduleId: string): Promise<boolean> {
  const rows = await db<{ active: boolean }[]>`
    select activo as active
    from public.tenant_modules
    where tenant_id = ${tenantId}::uuid
      and module_id = ${moduleId}
  `
  return rows[0]?.active ?? false
}
