import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getFieldEmployees } from "@/actions/tracking"
import { getTodosLosPuntosDeVenta } from "@/actions/clientes"
import { NuevoPlanForm } from "./NuevoPlanForm"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"

export default async function NuevoPlanPage() {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const [employees, clientPoints] = await Promise.all([
    getFieldEmployees(ctx.schemaName),
    getTodosLosPuntosDeVenta(ctx.schemaName),
  ])

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo plan de ruta</h1>
        <p className="text-sm text-gray-500 mt-1">Asigná una hoja de ruta a un repartidor</p>
      </div>
      <NuevoPlanForm
        schemaName={ctx.schemaName}
        createdBy={claims.app_user_id}
        employees={employees}
        clientPoints={clientPoints as any}
      />
    </div>
  )
}
