"use client"

import { useTransition } from "react"
import { deleteTenant } from "@/actions/tenants"

export function DeleteTenantButton({
  tenantId,
  tenantNombre,
}: {
  tenantId: string
  tenantNombre: string
}): React.ReactElement {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const input = window.prompt(
      `Para confirmar, escribí el nombre del tenant:\n\n"${tenantNombre}"\n\nEsta acción es IRREVERSIBLE. Se eliminarán todos los datos, usuarios y el schema de base de datos.`,
    )
    if (input !== tenantNombre) return
    startTransition(async () => { await deleteTenant(tenantId) })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Eliminando..." : "Eliminar tenant"}
    </button>
  )
}
