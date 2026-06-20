import Link from "next/link"
import { notFound } from "next/navigation"
import { getTenant, getModuleFeatureConfig, updateModuleFeature } from "@/actions/tenants"

export default async function ModuleFeaturesPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>
}): Promise<React.ReactElement> {
  const { id, moduleId } = await params
  const [tenant, config] = await Promise.all([
    getTenant(id),
    getModuleFeatureConfig(id, moduleId),
  ])

  if (!tenant || !config) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/tenants" className="hover:text-gray-700">Tenants</Link>
          <span>/</span>
          <Link href={`/tenants/${id}`} className="hover:text-gray-700">{tenant.nombre}</Link>
          <span>/</span>
          <span>{config.manifest.nombre}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          Features de {config.manifest.nombre}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Activá o desactivá las features de este módulo para {tenant.nombre}.
        </p>
      </div>

      {config.features.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          Este módulo no tiene features configurables.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {config.features.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{feature.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {feature.defaultEnabled ? "Habilitada por defecto" : "Deshabilitada por defecto"}
                </p>
              </div>
              <form
                action={async () => {
                  "use server"
                  await updateModuleFeature(id, moduleId, feature.id, !feature.enabled)
                }}
              >
                <button
                  type="submit"
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    feature.enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      feature.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
