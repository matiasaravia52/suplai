import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { getUsuario } from "@/actions/usuarios"
import { getRoles } from "@/actions/roles"
import UsuarioActions from "./actions"

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hdrs = await headers()
  const ctx = getTenantContext(hdrs)
  if (!ctx) notFound()

  const [usuario, todosLosRoles] = await Promise.all([
    getUsuario(ctx.schemaName, id),
    getRoles(ctx.schemaName),
  ])
  if (!usuario) notFound()

  const rolesAsignados = new Set(usuario.roles.map((r) => r.id))
  const rolesDisponibles = todosLosRoles.filter((r) => !rolesAsignados.has(r.id))

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{usuario.nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuario.email}</p>
          <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
            usuario.tipo === "interno" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
          }`}>{usuario.tipo}</span>
        </div>
      </div>

      <UsuarioActions
        schemaName={ctx.schemaName}
        userId={id}
        nombre={usuario.nombre}
        tipo={usuario.tipo}
        rolesAsignados={usuario.roles}
        rolesDisponibles={rolesDisponibles.map((r) => ({ id: r.id, nombre: r.nombre, descripcion: r.descripcion }))}
        activo={usuario.activo}
      />
    </div>
  )
}
