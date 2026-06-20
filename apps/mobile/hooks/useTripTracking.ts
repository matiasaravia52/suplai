import { useCallback } from "react"
import { api } from "../lib/api"
import { getBufferedPoints, clearBuffer } from "../lib/background-location"

export function useTripTracking(visitId: string | null) {
  const finalFlush = useCallback(async () => {
    const points = await getBufferedPoints()
    if (points.length === 0) return

    try {
      await api.post<{ ok: boolean; count: number }>("/api/tracking/flush", {
        points,
        visitId,
      })
      await clearBuffer()
    } catch {
      // Si falla, los puntos quedan en el buffer para el próximo flush periódico
    }
  }, [visitId])

  return { finalFlush }
}
