export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getFieldEmployees } from "@/actions/tracking"
import { TrackingPanel } from "./TrackingPanel"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"

export default async function TrackingPage() {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()
  const { schemaName } = ctx

  await requireFeatureAndPermission(claims, "tracking", "field_tracking", "tracking:field_tracking:view")

  const employees = await getFieldEmployees(schemaName)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

  return (
    <div className="h-full">
      <TrackingPanel
        employees={employees}
        schemaName={schemaName}
        mapboxToken={mapboxToken}
      />
    </div>
  )
}
