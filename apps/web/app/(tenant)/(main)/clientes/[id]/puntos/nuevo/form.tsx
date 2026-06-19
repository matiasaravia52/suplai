"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearPuntoDeVenta } from "@/actions/clientes"
import AddressGeocoder from "@/components/address-geocoder"

export default function NuevoPuntoForm({
  schemaName, clientId,
}: {
  schemaName: string
  clientId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearPuntoDeVenta(schemaName, clientId, formData)
      if (result?.error) setError(result.error)
      else router.push(`/clientes/${clientId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input name="nombre" type="text" required placeholder="Sucursal Centro"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <AddressGeocoder />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input name="telefono" type="text" placeholder="+54 11 5555-5678"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Creando..." : "Crear punto de venta"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
