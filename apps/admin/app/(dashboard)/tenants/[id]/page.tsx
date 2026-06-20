import Link from "next/link"
import { notFound } from "next/navigation"
import { getTenant, getTenantModules, toggleModule, toggleTenant, reRunMigrations } from "@/actions/tenants"
import { getTenantUsers } from "@/actions/users"
import { DeleteTenantButton } from "./DeleteTenantButton"

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params
  const [tenant, modules, users] = await Promise.all([
    getTenant(id),
    getTenantModules(id),
    getTenant(id).then((t) => t ? getTenantUsers(t.schema_name) : []),
  ])

  if (!tenant) notFound()

  const coreModules = modules.filter((m) => m.is_core)
  const optionalModules = modules.filter((m) => !m.is_core)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/tenants" className="hover:text-gray-700">Tenants</Link>
            <span>/</span>
            <span>{tenant.nombre}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{tenant.nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenant.subdominio}.suplai.lat
            <span className="font-mono text-xs ml-2 text-gray-400">({tenant.schema_name})</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={async () => { "use server"; await toggleTenant(id, !tenant.activo) }}>
            <button
              type="submit"
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                tenant.activo
                  ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                  : "border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {tenant.activo ? "Desactivar" : "Activar"}
            </button>
          </form>
          <DeleteTenantButton tenantId={id} tenantNombre={tenant.nombre} />
        </div>
      </div>

      {/* Módulos */}
      <section>
        <h2 className="text-base font-medium text-gray-900 mb-3">Módulos</h2>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {coreModules.map((m) => (
            <div key={m.module_id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-700">{m.nombre}</span>
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">core</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Siempre activo</span>
            </div>
          ))}

          {optionalModules.map((m) => (
            <div key={m.module_id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{m.nombre}</span>
              <div className="flex items-center gap-3">
                {m.activo && (
                  <>
                    <form action={async () => { "use server"; await reRunMigrations(id, m.module_id) }}>
                      <button type="submit" className="text-xs text-orange-600 hover:underline">
                        Migrar
                      </button>
                    </form>
                    <Link
                      href={`/tenants/${id}/modules/${m.module_id}/migrations`}
                      className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                    >
                      Migraciones
                    </Link>
                    <Link
                      href={`/tenants/${id}/modules/${m.module_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Configurar
                    </Link>
                  </>
                )}
                <form action={async () => { "use server"; await toggleModule(id, m.module_id, !m.activo) }}>
                  <button
                    type="submit"
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      m.activo ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      m.activo ? "translate-x-4" : "translate-x-0.5"
                    }`} />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usuarios */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-gray-900">Usuarios</h2>
          <Link
            href={`/tenants/${id}/users/new`}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Nuevo usuario
          </Link>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">No hay usuarios todavía.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.tipo === "interno" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {u.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
