import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getClientes } from "@/actions/clientes"

export default async function ClientesPage() {
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const clientes = await getClientes(ctx.schemaName)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
        <Link href="/clientes/nuevo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Nuevo cliente
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {clientes.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">No hay clientes todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Puntos de venta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono || <span className="text-gray-300">&mdash;</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || <span className="text-gray-300">&mdash;</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {c.puntos_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>{c.activo ? "Activo" : "Inactivo"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
