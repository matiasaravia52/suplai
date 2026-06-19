import type { JwtPayload } from "@suplai/types"

export function hasPermission(payload: JwtPayload, permission: string): boolean {
  return payload.roles.includes(permission)
}

export function requirePermission(payload: JwtPayload | null, permission: string): asserts payload is JwtPayload {
  if (!payload || !hasPermission(payload, permission)) {
    throw new Error(`Forbidden: missing permission '${permission}'`)
  }
}
