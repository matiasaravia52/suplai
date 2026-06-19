import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getRoles } from "@/actions/roles"

export default async function RolesPage() {
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const roles = await getRoles(ctx.schemaName)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Roles</h1>
        <Link href="/roles/nuevo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Nuevo rol
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {roles.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">No hay roles todavía.</div>
        ) : roles.map((rol) => (
          <Link key={rol.id} href={`/roles/${rol.id}`}
            className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-800">{rol.nombre}</p>
              {rol.descripcion && <p className="text-xs text-gray-400 mt-0.5">{rol.descripcion}</p>}
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{rol.permisos.length} permisos</p>
              <p>{rol.usuarios} usuario{rol.usuarios !== 1 ? "s" : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
