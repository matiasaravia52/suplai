"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { asignarRol, quitarRol, desactivarUsuario, reactivarUsuario, eliminarUsuario, editarUsuario } from "@/actions/usuarios"
import type { UserTipo } from "@suplai/types"

type RolMin = { id: string; nombre: string; descripcion?: string | null }

export default function UsuarioActions({
  schemaName, userId, nombre, tipo, rolesAsignados, rolesDisponibles, activo,
}: {
  schemaName: string
  userId: string
  nombre: string
  tipo: UserTipo
  rolesAsignados: RolMin[]
  rolesDisponibles: RolMin[]
  activo: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editando, setEditando] = useState(false)
  const [editNombre, setEditNombre] = useState(nombre)
  const [editTipo, setEditTipo] = useState<UserTipo>(tipo)
  const [error, setError] = useState<string | null>(null)

  function handleAsignar(roleId: string) {
    startTransition(async () => {
      await asignarRol(schemaName, userId, roleId)
      router.refresh()
    })
  }

  function handleQuitar(roleId: string) {
    startTransition(async () => {
      await quitarRol(schemaName, userId, roleId)
      router.refresh()
    })
  }

  function handleToggleActivo() {
    startTransition(async () => {
      if (activo) await desactivarUsuario(schemaName, userId)
      else await reactivarUsuario(schemaName, userId)
      router.refresh()
    })
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      await eliminarUsuario(schemaName, userId)
      router.push("/usuarios")
    })
  }

  function handleGuardarEdicion() {
    setError(null)
    const formData = new FormData()
    formData.set("nombre", editNombre)
    formData.set("tipo", editTipo)
    startTransition(async () => {
      const result = await editarUsuario(schemaName, userId, formData)
      if (result?.error) { setError(result.error); return }
      setEditando(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Acciones principales */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditando(!editando)} disabled={isPending}
          className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-md disabled:opacity-50 transition-colors">
          {editando ? "Cancelar" : "Editar"}
        </button>
        <button onClick={handleToggleActivo} disabled={isPending}
          className={`px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 transition-colors ${
            activo
              ? "border-amber-200 text-amber-600 hover:bg-amber-50"
              : "border-green-200 text-green-600 hover:bg-green-50"
          }`}>
          {activo ? "Desactivar" : "Reactivar"}
        </button>
        <button onClick={handleEliminar} disabled={isPending}
          className="px-3 py-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors">
          Eliminar
        </button>
      </div>

      {/* Formulario de edición */}
      {editando && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-900">Editar usuario</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre</label>
            <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={editTipo} onChange={(e) => setEditTipo(e.target.value as UserTipo)}
              className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={handleGuardarEdicion} disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      {/* Roles asignados */}
      <section>
        <h2 className="text-base font-medium text-gray-900 mb-3">Roles asignados</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {rolesAsignados.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">Sin roles asignados.</p>
          ) : rolesAsignados.map((rol) => (
            <div key={rol.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-700">{rol.nombre}</span>
              <button onClick={() => handleQuitar(rol.id)} disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
                Quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Asignar rol */}
      {rolesDisponibles.length > 0 && (
        <section>
          <h2 className="text-base font-medium text-gray-900 mb-3">Asignar rol</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {rolesDisponibles.map((rol) => (
              <div key={rol.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">{rol.nombre}</span>
                  {rol.descripcion && (
                    <span className="text-xs text-gray-400 ml-2">{rol.descripcion}</span>
                  )}
                </div>
                <button onClick={() => handleAsignar(rol.id)} disabled={isPending}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors">
                  Asignar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
