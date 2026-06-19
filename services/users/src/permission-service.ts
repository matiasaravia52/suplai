import type { TenantJwtClaims } from "@suplai/types"
import { withTenantSchema } from "@suplai/core"

// Verifica si el usuario tiene un permiso (formato: modulo:feature:accion)
// contra los roles asignados en la DB.
export async function hasPermission(
  claims: TenantJwtClaims,
  permiso: string,
): Promise<boolean> {
  const rows = await withTenantSchema(claims.schema_name, async (db) => {
    return db<{ exists: boolean }[]>`
      select exists(
        select 1
        from user_roles ur
        join role_permissions rp on rp.role_id = ur.role_id
        where ur.user_id = ${claims.app_user_id}::uuid
          and rp.permiso = ${permiso}
      ) as exists
    `
  })
  return rows[0]?.exists ?? false
}

// Verifica si el usuario tiene alguno de los roles indicados
export function hasRole(claims: TenantJwtClaims, ...roles: string[]): boolean {
  return roles.some((r) => claims.roles.includes(r))
}

// Lanza error si no tiene el permiso (para usar en API Routes)
export async function requirePermission(
  claims: TenantJwtClaims | null,
  permiso: string,
): Promise<void> {
  if (!claims) throw new ForbiddenError("No autenticado")
  const ok = await hasPermission(claims, permiso)
  if (!ok) throw new ForbiddenError(`Sin permiso: ${permiso}`)
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message: string) {
    super(message)
    this.name = "ForbiddenError"
  }
}
