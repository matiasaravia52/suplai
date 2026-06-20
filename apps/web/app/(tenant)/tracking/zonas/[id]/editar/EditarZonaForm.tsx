"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { editarZona } from "@/actions/tracking"
import type { FieldEmployee, ClientPoint, ZonaDetail } from "@suplai/types"

interface ClientPointWithClient extends ClientPoint {
  client_nombre: string
}

interface Props {
  schemaName: string
  zonaId: string
  zona: ZonaDetail
  employees: FieldEmployee[]
  clientPoints: ClientPointWithClient[]
}

export function EditarZonaForm({ schemaName, zonaId, zona, employees, clientPoints }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState(zona.user_id)

  const initialStops = zona.stops.map((s) => {
    const cp = clientPoints.find((cp) => cp.id === s.client_point_id)
    return cp ?? {
      id: s.client_point_id,
      client_id: "",
      nombre: s.client_point_nombre,
      client_nombre: s.client_nombre,
      direccion: null,
      lat: s.client_point_lat ?? null,
      lng: s.client_point_lng ?? null,
      telefono: null,
      activo: true,
      created_at: "",
    }
  })

  const [stops, setStops] = useState<ClientPointWithClient[]>(initialStops as ClientPointWithClient[])
  const [search, setSearch] = useState("")

  const available = clientPoints.filter(
    (cp) =>
      !stops.find((s) => s.id === cp.id) &&
      (search === "" ||
        cp.nombre.toLowerCase().includes(search.toLowerCase()) ||
        cp.client_nombre.toLowerCase().includes(search.toLowerCase()) ||
        (cp.direccion ?? "").toLowerCase().includes(search.toLowerCase()))
  )

  function addStop(cp: ClientPointWithClient) {
    setStops((prev) => [...prev, cp])
    setSearch("")
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  function moveStop(index: number, dir: -1 | 1) {
    const next = [...stops]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setStops(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { setError("Seleccioná un repartidor"); return }
    if (stops.length === 0) { setError("Agregá al menos un punto de venta"); return }
    setError(null)
    startTransition(async () => {
      await editarZona(schemaName, zonaId, {
        userId,
        clientPointIds: stops.map((s) => s.id),
      })
      router.push(`/tracking/zonas/${zonaId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Repartidor</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar...</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Puntos de venta <span className="text-gray-400 font-normal">({stops.length} agregados)</span>
        </label>

        {stops.length > 0 && (
          <div className="mb-3 border border-gray-200 rounded-lg divide-y divide-gray-100">
            {stops.map((stop, i) => (
              <div key={stop.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{stop.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {stop.client_nombre}{stop.direccion ? ` · ${stop.direccion}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button type="button" onClick={() => moveStop(i, -1)} disabled={i === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeStop(stop.id)}
                    className="p-1 text-red-400 hover:text-red-600">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="Buscar punto de venta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && available.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {available.slice(0, 10).map((cp) => (
                <button key={cp.id} type="button" onClick={() => addStop(cp)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{cp.nombre}</p>
                  <p className="text-xs text-gray-500">{cp.client_nombre}{cp.direccion ? ` · ${cp.direccion}` : " · Sin dirección"}</p>
                </button>
              ))}
            </div>
          )}
          {search && available.length === 0 && (
            <p className="mt-1 text-xs text-gray-400 px-1">No hay resultados.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
      </div>
    </form>
  )
}
