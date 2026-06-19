import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getRol } from "@/actions/roles"
import { PERMISOS_CORE } from "@/lib/permisos"
import RolForm from "./form"
import EliminarRolButton from "./eliminar"

export default async function RolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const rol = await getRol(ctx.schemaName, id)
  if (!rol) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{rol.nombre}</h1>
        <EliminarRolButton schemaName={ctx.schemaName} roleId={id} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Permisos del rol</h2>
        <RolForm
          schemaName={ctx.schemaName}
          roleId={id}
          nombre={rol.nombre}
          descripcion={rol.descripcion}
          permisos={PERMISOS_CORE}
          asignados={rol.permisos}
        />
      </div>
    </div>
  )
}
