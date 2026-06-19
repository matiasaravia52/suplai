"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createTenant } from "@/actions/tenants"

export default function NewTenantPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await createTenant(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo tenant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Se crea el schema de la DB, se asignan los módulos core y queda listo para agregar usuarios.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del distribuidor
            </label>
            <input
              id="nombre" name="nombre" type="text" required placeholder="Ej: Distribuidora López"
              className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="subdominio" className="block text-sm font-medium text-gray-700 mb-1">
              Subdominio
            </label>
            <div className="flex items-center gap-1">
              <input
                id="subdominio" name="subdominio" type="text" required
                placeholder="lopez"
                pattern="[a-z0-9-]+"
                title="Solo letras minúsculas, números y guiones"
                className="flex-1 px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">.suplai.lat</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Creando..." : "Crear tenant"}
            </button>
            <button
              type="button" onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
