export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getPlanDetail } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { DeletePlanButton } from "./DeletePlanButton"

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const { id } = await params
  const plan = await getPlanDetail(ctx.schemaName, id)
  if (!plan) notFound()

  const stopsVisitados = plan.stops.filter((s) => s.visitado).length

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/tracking/planes" className="text-sm text-gray-500 hover:text-gray-700">
              ← Planes de ruta
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.user_nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(plan.fecha + "T00:00:00").toLocaleDateString("es-AR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EstadoBadge estado={plan.estado} />
          <Link
            href={`/tracking/planes/${id}/editar`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          <DeletePlanButton schemaName={ctx.schemaName} planId={id} />
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{stopsVisitados} de {plan.stops.length} visitas</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: plan.stops.length > 0 ? `${(stopsVisitados / plan.stops.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Lista de paradas */}
      {plan.stops.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay paradas en este plan.</p>
      ) : (
        <div className="space-y-2">
          {plan.stops.map((stop, i) => (
            <div
              key={stop.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                stop.visitado ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                stop.visitado ? "bg-green-500 text-white" : "bg-white border-2 border-gray-300 text-gray-600"
              }`}>
                {stop.visitado ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${stop.visitado ? "text-green-800" : "text-gray-900"}`}>
                  {stop.client_point_nombre}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {stop.client_nombre}
                  {stop.client_point_lat == null && (
                    <span className="ml-1 text-amber-500">· Sin coordenadas</span>
                  )}
                </p>
              </div>
              {stop.visitado && (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">Visitado</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-600",
    activa: "bg-blue-100 text-blue-700",
    completada: "bg-green-100 text-green-700",
  }
  const labels: Record<string, string> = {
    borrador: "Borrador", activa: "Activa", completada: "Completada",
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[estado] ?? styles.borrador}`}>
      {labels[estado] ?? estado}
    </span>
  )
}
