export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { TrackingPanel } from "./TrackingPanel"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"

export default async function TrackingPage(): Promise<React.ReactElement> {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()
  const { schemaName } = ctx

  await requireFeatureAndPermission(claims, "tracking", "field_tracking", "tracking:field_tracking:view")

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
  const todayAR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

  return (
    <div className="h-full">
      <TrackingPanel
        schemaName={schemaName}
        mapboxToken={mapboxToken}
        todayAR={todayAR}
      />
    </div>
  )
}
