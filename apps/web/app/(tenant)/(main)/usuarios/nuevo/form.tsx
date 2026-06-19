"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearUsuario } from "@/actions/usuarios"
import type { Role } from "@suplai/types"

export default function NuevoUsuarioForm({
  schemaName, tenantId, roles,
}: {
  schemaName: string
  tenantId: string
  roles: (Role & { permisos: string[]; usuarios: number })[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearUsuario(schemaName, tenantId, formData)
      if (result?.error) setError(result.error)
      else router.push("/usuarios")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input name="nombre" type="text" required placeholder="Juan García"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" required
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input name="password" type="password" required minLength={6}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select name="tipo" defaultValue="interno"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="interno">Interno (empleado)</option>
          <option value="externo">Externo (cliente)</option>
        </select>
      </div>
      {roles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol inicial</label>
          <select name="rol_id"
            className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sin rol</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? "Creando..." : "Crear usuario"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
