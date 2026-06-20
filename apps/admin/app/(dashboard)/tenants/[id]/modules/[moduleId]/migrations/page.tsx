import { getMigrations } from "@/actions/tenants"
import { notFound } from "next/navigation"
import Link from "next/link"
import { RunMigrationButton } from "./RunMigrationButton"

export default async function MigrationsPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>
}): Promise<React.ReactElement> {
  const { id, moduleId } = await params
  const migrations = await getMigrations(id, moduleId).catch(() => null)
  if (!migrations) return notFound()

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/tenants/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
        <h1 className="text-xl font-semibold">Migraciones — {moduleId}</h1>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Migración</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aplicada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {migrations.map((m) => (
              <tr key={m.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.name}</td>
                <td className="px-4 py-3">
                  {m.applied ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                      ✓ Aplicada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                      ⚠ Pendiente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {m.applied_at ? new Date(m.applied_at).toLocaleString("es-AR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <RunMigrationButton
                    tenantId={id}
                    moduleId={moduleId}
                    migrationName={m.name}
                    applied={m.applied}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
