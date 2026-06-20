"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { eliminarZona } from "@/actions/tracking"

export function DeleteZonaButton({ schemaName, zonaId }: { schemaName: string; zonaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm("¿Eliminar esta zona? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      await eliminarZona(schemaName, zonaId)
      router.push("/tracking/zonas")
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Eliminando..." : "Eliminar"}
    </button>
  )
}
