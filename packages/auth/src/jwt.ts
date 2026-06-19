import type { JwtPayload } from "@suplai/types"

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>

    const tenant_id = decoded["tenant_id"] as string | undefined
    const schema_name = decoded["schema_name"] as string | undefined
    const app_user_id = decoded["app_user_id"] as string | undefined

    // Super admin — no tiene claims de tenant
    if (!tenant_id || !schema_name || !app_user_id) return null

    return {
      sub: decoded["sub"] as string,
      email: decoded["email"] as string,
      role: decoded["role"] as string,
      iat: decoded["iat"] as number,
      exp: decoded["exp"] as number,
      tenant_id,
      schema_name,
      app_user_id,
      roles: (decoded["roles"] as string[]) ?? [],
    }
  } catch {
    return null
  }
}
