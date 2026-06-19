"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { editarPuntoDeVenta, desactivarPuntoDeVenta } from "@/actions/clientes"
import type { ClientPoint } from "@suplai/types"
import AddressGeocoder from "@/components/address-geocoder"

export default function EditarPuntoForm({
  schemaName, clientId, puntoId, punto,
}: {
  schemaName: string
  clientId: string
  puntoId: string
  punto: ClientPoint
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("client_id", clientId)
    startTransition(async () => {
      const result = await editarPuntoDeVenta(schemaName, puntoId, formData)
      if (result?.error) setError(result.error)
      else router.push(`/clientes/${clientId}`)
    })
  }

  function handleDesactivar() {
    if (!confirm("¿Desactivar este punto de venta?")) return
    startTransition(async () => {
      await desactivarPuntoDeVenta(schemaName, puntoId, clientId)
      router.push(`/clientes/${clientId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input name="nombre" type="text" required defaultValue={punto.nombre}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <AddressGeocoder
          defaultValue={punto.direccion ?? ""}
          defaultLat={punto.lat}
          defaultLng={punto.lng}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input name="telefono" type="text" defaultValue={punto.telefono ?? ""}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => router.push(`/clientes/${clientId}`)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancelar
        </button>
      </div>

      {punto.activo && (
        <div className="border-t border-gray-200 pt-4 mt-6">
          <button type="button" onClick={handleDesactivar} disabled={isPending}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors">
            Desactivar punto de venta
          </button>
        </div>
      )}
    </form>
  )
}
