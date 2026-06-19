"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearRol } from "@/actions/roles"

type Permiso = { id: string; label: string }

export default function NuevoRolForm({
  schemaName, permisos,
}: {
  schemaName: string
  permisos: Permiso[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearRol(schemaName, formData)
      if (result?.error) setError(result.error)
      else router.push("/roles")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
        <input name="nombre" type="text" required placeholder="coordinador"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <input name="descripcion" type="text" placeholder="Descripción del rol (opcional)"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Permisos</legend>
        <div className="space-y-2">
          {permisos.map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" name="permisos" value={p.id}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span className="text-sm text-gray-700">{p.label}</span>
              <code className="text-xs text-gray-400 font-mono">{p.id}</code>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Creando..." : "Crear rol"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
