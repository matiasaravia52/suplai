"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createTenantUser } from "@/actions/users"

export default function NewUserForm({ tenantId, schemaName }: { tenantId: string; schemaName: string }): React.ReactElement {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createTenantUser(tenantId, schemaName, formData)
      if (result?.error) setError(result.error)
      else router.push(`/tenants/${tenantId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input name="nombre" type="text" required placeholder="Juan García"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" required
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input name="password" type="password" required minLength={6}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select name="tipo" defaultValue="interno"
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="interno">Interno (empleado)</option>
          <option value="externo">Externo (cliente)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Creando..." : "Crear usuario"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
