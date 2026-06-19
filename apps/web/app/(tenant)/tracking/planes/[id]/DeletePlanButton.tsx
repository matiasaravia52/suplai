"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { deletePlan } from "@/actions/tracking"

export function DeletePlanButton({ schemaName, planId }: { schemaName: string; planId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm("¿Eliminar este plan? Esta acción no se puede deshacer.")) return
    startTransition(async () => {
      await deletePlan(schemaName, planId)
      router.push("/tracking/planes")
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
