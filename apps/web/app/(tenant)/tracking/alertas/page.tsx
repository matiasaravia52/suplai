import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getFraudAlerts } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"

export default async function AlertasPage() {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()
  const { schemaName } = ctx

  await requireFeatureAndPermission(claims, "tracking", "field_tracking", "tracking:field_tracking:view")
  const alerts = await getFraudAlerts(schemaName)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alertas de posición</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check-ins registrados a más de 150m del punto de venta.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">No hay alertas registradas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Punto de venta</th>
                <th className="px-4 py-3 text-left">Distancia</th>
                <th className="px-4 py-3 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map((alert: any) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{alert.user_nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{alert.client_point_nombre}</td>
                  <td className="px-4 py-3">
                    <span className="text-red-600 font-semibold">{alert.distancia_metros}m</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(alert.created_at).toLocaleString("es-AR")}
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
