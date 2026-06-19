import { hasPermission } from "@suplai/users"
import { hasModuleFeature } from "@suplai/core"
import type { TenantJwtClaims } from "@suplai/types"
import { notFound } from "next/navigation"

export async function requireFeatureAndPermission(
  claims: TenantJwtClaims,
  moduleId: string,
  featureId: string,
  permiso: string,
): Promise<void> {
  const [featureOk, permissionOk] = await Promise.all([
    hasModuleFeature(claims.tenant_id, moduleId, featureId),
    hasPermission(claims, permiso),
  ])
  if (!featureOk || !permissionOk) notFound()
}
