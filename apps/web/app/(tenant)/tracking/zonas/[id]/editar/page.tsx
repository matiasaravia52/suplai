export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getZona, getFieldEmployees } from "@/actions/tracking"
import { listAllClientPoints } from "@suplai/clients"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { EditarZonaForm } from "./EditarZonaForm"

export default async function EditarZonaPage({ params }: { params: Promise<{ id: string }> }) {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const { id } = await params
  const [zona, employees, clientPoints] = await Promise.all([
    getZona(ctx.schemaName, id),
    getFieldEmployees(ctx.schemaName),
    listAllClientPoints(ctx.schemaName),
  ])
  if (!zona) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar zona — {zona.user_nombre}</h1>
      </div>
      <EditarZonaForm
        schemaName={ctx.schemaName}
        zonaId={id}
        zona={zona}
        employees={employees}
        clientPoints={clientPoints as any}
      />
    </div>
  )
}
