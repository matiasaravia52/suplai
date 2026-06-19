import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getUsuarios } from "@/actions/usuarios"

export default async function UsuariosPage() {
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const usuarios = await getUsuarios(ctx.schemaName)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
        <Link href="/usuarios/nuevo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Nuevo usuario
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">No hay usuarios todavía.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Roles</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/usuarios/${u.id}`} className="font-medium text-blue-600 hover:underline">
                      {u.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.tipo === "interno" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>{u.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.roles.length > 0 ? u.roles.join(", ") : <span className="text-gray-400">Sin roles</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>{u.activo ? "Activo" : "Inactivo"}</span>
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
