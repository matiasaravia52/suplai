export const dynamic = "force-dynamic"

import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getPlans } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  await requireFeatureAndPermission(claims, "tracking", "route_plans", "tracking:route_plans:manage")

  const params = await searchParams
  const fecha = params.fecha ?? new Date().toISOString().slice(0, 10)

  const planes = await getPlans(ctx.schemaName, { fecha })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes de ruta</h1>
          <p className="text-sm text-gray-500 mt-1">Hojas de ruta asignadas a repartidores</p>
        </div>
        <Link
          href="/tracking/planes/nuevo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nuevo plan
        </Link>
      </div>

      {/* Filtro fecha */}
      <form method="GET" className="mb-6 flex items-center gap-3">
        <label className="text-sm text-gray-600">Fecha</label>
        <input
          type="date"
          name="fecha"
          defaultValue={fecha}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
          Filtrar
        </button>
      </form>

      {planes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No hay planes para esta fecha.</p>
          <Link href="/tracking/planes/nuevo" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Repartidor</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Progreso</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planes.map((plan: any) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{plan.user_nombre}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(plan.fecha + "T00:00:00").toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={plan.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: plan.total_stops > 0 ? `${(plan.stops_visitados / plan.total_stops) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{plan.stops_visitados}/{plan.total_stops}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/tracking/planes/${plan.id}`} className="text-blue-600 text-xs hover:underline">
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

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    borrador:   "bg-gray-100 text-gray-600",
    activa:     "bg-blue-100 text-blue-700",
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
