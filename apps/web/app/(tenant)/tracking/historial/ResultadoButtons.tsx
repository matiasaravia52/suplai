"use client"

import { useTransition } from "react"
import type { ResultadoVisita } from "@suplai/types"

interface Props {
  visitId: string
  resultado: ResultadoVisita | null | undefined
  schemaName: string
  onMark: (visitId: string, resultado: ResultadoVisita) => Promise<void>
}

export function ResultadoButtons({ visitId, resultado, onMark }: Props): React.ReactElement {
  const [pending, startTransition] = useTransition()

  if (resultado === "venta") {
    return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Venta</span>
  }
  if (resultado === "no_venta") {
    return <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">No venta</span>
  }

  return (
    <div className="flex gap-1">
      <button
        disabled={pending}
        onClick={() => startTransition(() => onMark(visitId, "venta"))}
        className="text-xs px-2 py-0.5 rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
      >
        Venta
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => onMark(visitId, "no_venta"))}
        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        No venta
      </button>
    </div>
  )
}
