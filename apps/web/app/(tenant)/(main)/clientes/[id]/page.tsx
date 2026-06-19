import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getCliente, getPuntosDeVenta } from "@/actions/clientes"
import ClienteActions from "./actions"

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const [cliente, puntos] = await Promise.all([
    getCliente(ctx.schemaName, id),
    getPuntosDeVenta(ctx.schemaName, id),
  ])
  if (!cliente) notFound()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{cliente.nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {[cliente.direccion, cliente.telefono, cliente.email].filter(Boolean).join(" · ") || "Sin datos"}
          </p>
          <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
            cliente.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>{cliente.activo ? "Activo" : "Inactivo"}</span>
        </div>
        <ClienteActions schemaName={ctx.schemaName} clientId={id} activo={cliente.activo} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Puntos de venta</h2>
          <Link href={`/clientes/${id}/puntos/nuevo`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
            Nuevo punto de venta
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {puntos.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              Este cliente no tiene puntos de venta todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dirección</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Coordenadas</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {puntos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${id}/puntos/${p.id}`} className="font-medium text-blue-600 hover:underline">
                        {p.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.direccion || <span className="text-gray-300">&mdash;</span>}</td>
                    <td className="px-4 py-3">
                      {p.lat != null && p.lng != null ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          ✗ Sin coordenadas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>{p.activo ? "Activo" : "Inactivo"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
