"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { eliminarRol } from "@/actions/roles"

export default function EliminarRolButton({ schemaName, roleId }: { schemaName: string; roleId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEliminar() {
    if (!confirm("¿Eliminar este rol? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      await eliminarRol(schemaName, roleId)
      router.push("/roles")
    })
  }

  return (
    <button onClick={handleEliminar} disabled={isPending}
      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-md transition-colors">
      {isPending ? "Eliminando..." : "Eliminar rol"}
    </button>
  )
}
