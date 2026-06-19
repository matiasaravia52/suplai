import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getPuntoDeVenta } from "@/actions/clientes"
import EditarPuntoForm from "./form"

export default async function PuntoPage({ params }: { params: Promise<{ id: string; puntoId: string }> }) {
  const { id, puntoId } = await params
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const punto = await getPuntoDeVenta(ctx.schemaName, puntoId)
  if (!punto) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Editar punto de venta</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <EditarPuntoForm
          schemaName={ctx.schemaName}
          clientId={id}
          puntoId={puntoId}
          punto={punto}
        />
      </div>
    </div>
  )
}
