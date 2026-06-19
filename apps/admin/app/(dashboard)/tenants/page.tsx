import Link from "next/link"
import { getTenants } from "@/actions/tenants"

export const dynamic = "force-dynamic"

export default async function TenantsPage() {
  const tenants = await getTenants()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
        <Link
          href="/tenants/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Nuevo tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">No hay tenants todavía.</p>
          <Link href="/tenants/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subdominio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Schema</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tenants/${t.id}`} className="font-medium text-blue-600 hover:underline">
                      {t.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.subdominio}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.schema_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString("es-AR")}
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
