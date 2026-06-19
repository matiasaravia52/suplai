import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getCliente } from "@/actions/clientes"
import NuevoPuntoForm from "./form"

export default async function NuevoPuntoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const cliente = await getCliente(ctx.schemaName, id)
  if (!cliente) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Nuevo punto de venta</h1>
      <p className="text-sm text-gray-500 mb-6">{cliente.nombre}</p>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <NuevoPuntoForm schemaName={ctx.schemaName} clientId={id} />
      </div>
    </div>
  )
}
