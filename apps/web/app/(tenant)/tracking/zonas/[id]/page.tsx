export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getZona } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { DeleteZonaButton } from "./DeleteZonaButton"

export default async function ZonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const { id } = await params
  const zona = await getZona(ctx.schemaName, id)
  if (!zona) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/tracking/zonas" className="text-sm text-gray-500 hover:text-gray-700">
              ← Zonas
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{zona.user_nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{zona.stops.length} puntos de venta</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tracking/zonas/${id}/editar`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          <DeleteZonaButton schemaName={ctx.schemaName} zonaId={id} />
        </div>
      </div>

      {zona.stops.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay paradas en esta zona.</p>
      ) : (
        <div className="space-y-2">
          {zona.stops.map((stop, i) => (
            <div
              key={stop.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white border-2 border-gray-300 text-gray-600">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{stop.client_point_nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {stop.client_nombre}
                  {stop.client_point_lat == null && (
                    <span className="ml-1 text-amber-500">· Sin coordenadas</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
