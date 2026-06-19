import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import NuevoClienteForm from "./form"

export default async function NuevoClientePage() {
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo cliente</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <NuevoClienteForm schemaName={ctx.schemaName} />
      </div>
    </div>
  )
}
