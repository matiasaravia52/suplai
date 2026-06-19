"use client"

import { useState, useTransition } from "react"
import { actualizarRol, actualizarPermisos } from "@/actions/roles"

type Permiso = { id: string; label: string }

export default function RolForm({
  schemaName, roleId, nombre: nombreInicial, descripcion: descripcionInicial, permisos, asignados,
}: {
  schemaName: string
  roleId: string
  nombre: string
  descripcion?: string | null
  permisos: Permiso[]
  asignados: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const [savedInfo, setSavedInfo] = useState(false)
  const [savedPermisos, setSavedPermisos] = useState(false)
  const [nombre, setNombre] = useState(nombreInicial)
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? "")
  const [error, setError] = useState<string | null>(null)

  function handleGuardarInfo(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedInfo(false)
    const formData = new FormData()
    formData.set("nombre", nombre)
    formData.set("descripcion", descripcion)
    startTransition(async () => {
      const result = await actualizarRol(schemaName, roleId, formData)
      if (result?.error) { setError(result.error); return }
      setSavedInfo(true)
    })
  }

  function handleGuardarPermisos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavedPermisos(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await actualizarPermisos(schemaName, roleId, formData)
      setSavedPermisos(true)
    })
  }

  return (
    <div className="space-y-6">
      {/* Editar info del rol */}
      <form onSubmit={handleGuardarInfo} className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Información</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional"
            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          {savedInfo && <span className="text-sm text-green-600">Guardado</span>}
        </div>
      </form>

      <hr className="border-gray-100" />

      {/* Permisos */}
      <form onSubmit={handleGuardarPermisos} className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Permisos</h3>
        <div className="space-y-2">
          {permisos.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" name="permisos" value={p.id}
                defaultChecked={asignados.includes(p.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="text-sm text-gray-700">{p.label}</span>
              <code className="text-xs text-gray-400 font-mono">{p.id}</code>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isPending ? "Guardando..." : "Guardar permisos"}
          </button>
          {savedPermisos && <span className="text-sm text-green-600">Guardado</span>}
        </div>
      </form>
    </div>
  )
}
