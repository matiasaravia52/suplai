import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getRoles } from "@/actions/roles"
import NuevoUsuarioForm from "./form"

export default async function NuevoUsuarioPage() {
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const roles = await getRoles(ctx.schemaName)

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo usuario</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <NuevoUsuarioForm schemaName={ctx.schemaName} tenantId={ctx.tenantId} roles={roles} />
      </div>
    </div>
  )
}
