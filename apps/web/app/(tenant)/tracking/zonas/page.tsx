export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getZonas } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"

export default async function ZonasPage() {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const zonas = await getZonas(ctx.schemaName)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zonas</h1>
          <p className="text-sm text-gray-500 mt-1">Puntos de venta asignados a cada repartidor</p>
        </div>
        <Link
          href="/tracking/zonas/nueva"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nueva zona
        </Link>
      </div>

      {zonas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-sm">No hay zonas configuradas todavía.</p>
          <Link href="/tracking/zonas/nueva" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Repartidor</th>
                <th className="px-4 py-3 text-left">Puntos de venta</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(zonas as any[]).map((zona) => (
                <tr key={zona.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{zona.user_nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{zona.total_stops} paradas</td>
                  <td className="px-4 py-3">
                    <Link href={`/tracking/zonas/${zona.id}`} className="text-blue-600 text-xs hover:underline">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
