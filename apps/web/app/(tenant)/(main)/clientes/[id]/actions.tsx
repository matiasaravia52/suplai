"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { desactivarCliente } from "@/actions/clientes"

export default function ClienteActions({
  schemaName, clientId, activo,
}: {
  schemaName: string
  clientId: string
  activo: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDesactivar() {
    if (!confirm("¿Desactivar este cliente? Sus puntos de venta también se desactivarán.")) return
    startTransition(async () => {
      await desactivarCliente(schemaName, clientId)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => router.push(`/clientes/${clientId}/editar`)}
        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-400 rounded-md hover:bg-gray-50 transition-colors">
        Editar
      </button>
      {activo && (
        <button onClick={handleDesactivar} disabled={isPending}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors">
          {isPending ? "Desactivando..." : "Desactivar"}
        </button>
      )}
    </div>
  )
}
