import { getTenantContext } from "@/lib/tenant"
import { getSessionClaims } from "@/lib/session"
import { requireFeatureAndPermission } from "@/lib/access"
import { getVisitHistory, marcarResultadoVisita } from "@/actions/tracking"
import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { ResultadoButtons } from "./ResultadoButtons"
import type { ResultadoVisita } from "@suplai/types"

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string; pendiente?: string }>
}): Promise<React.ReactElement> {
  const claims = await getSessionClaims()
  if (!claims) redirect("/login")

  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()
  const { schemaName } = ctx

  await requireFeatureAndPermission(claims, "tracking", "field_tracking", "tracking:field_tracking:view")
  const params = await searchParams

  const soloPendientes = params.pendiente === "true"

  const visits = await getVisitHistory(schemaName, {
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.from   ? { fechaDesde: params.from } : {}),
    ...(params.to     ? { fechaHasta: params.to }   : {}),
  })

  const visitsFiltered = soloPendientes
    ? visits.filter((v: any) => v.checkout_at && v.resultado == null)
    : visits

  const exportUrl = `/api/tracking/export?${new URLSearchParams({
    ...(params.from   ? { from: params.from } : {}),
    ...(params.to     ? { to: params.to }     : {}),
    ...(params.userId ? { userId: params.userId } : {}),
  }).toString()}`

  async function marcar(visitId: string, resultado: ResultadoVisita) {
    "use server"
    await marcarResultadoVisita(schemaName, visitId, resultado)
  }

  const pendientesCount = visits.filter((v: any) => v.checkout_at && v.resultado == null).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de visitas</h1>
        <div className="flex items-center gap-3">
          {pendientesCount > 0 && (
            <a
              href={`?${new URLSearchParams({ ...params, pendiente: soloPendientes ? "false" : "true" }).toString()}`}
              className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                soloPendientes
                  ? "bg-orange-500 text-white border-orange-500"
                  : "border-orange-300 text-orange-700 hover:bg-orange-50"
              }`}
            >
              Sin resultado ({pendientesCount})
            </a>
          )}
          <a
            href={exportUrl}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            Exportar Excel
          </a>
        </div>
      </div>

      {visitsFiltered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {soloPendientes ? "No hay visitas pendientes de resultado." : "No hay visitas en el período seleccionado."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Punto de venta</th>
                <th className="px-4 py-3 text-left">Llegada</th>
                <th className="px-4 py-3 text-left">Salida</th>
                <th className="px-4 py-3 text-left">Duración</th>
                <th className="px-4 py-3 text-left">Resultado</th>
                <th className="px-4 py-3 text-left">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visitsFiltered.map((v: any) => {
                const durMin = v.checkout_at
                  ? Math.round((new Date(v.checkout_at).getTime() - new Date(v.checkin_at).getTime()) / 60000)
                  : null
                const sinResultado = v.checkout_at && v.resultado == null
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${sinResultado ? "bg-orange-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{v.user_nombre}</td>
                    <td className="px-4 py-3 text-gray-700">{v.client_point_nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(v.checkin_at).toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.checkout_at
                        ? new Date(v.checkout_at).toLocaleString("es-AR")
                        : <span className="text-blue-600">En curso</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {durMin != null ? `${durMin} min` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.checkout_at ? (
                        <ResultadoButtons
                          visitId={v.id}
                          resultado={v.resultado}
                          schemaName={schemaName}
                          onMark={marcar}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">En curso</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.tiene_alerta ? (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Alerta</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
