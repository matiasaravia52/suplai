import { useEffect, useCallback } from "react"
import { useStore } from "../lib/store"
import { api } from "../lib/api"

interface ActiveVisitInfo {
  visitId: string
  clientPointId: string
  clientPointNombre: string
  checkinAt: string
}

export function useActiveVisit() {
  const { activeVisit, setActiveVisit, clearActiveVisit } = useStore()

  const checkActiveVisit = useCallback(async () => {
    try {
      const data = await api.get<{ visit: ActiveVisitInfo | null }>(
        "/api/tracking/active-visit",
      )

      if (data.visit) {
        setActiveVisit(data.visit)
      } else {
        clearActiveVisit()
      }
    } catch {
      // Si falla la red, mantener el estado actual
    }
  }, [setActiveVisit, clearActiveVisit])

  useEffect(() => {
    if (!activeVisit) {
      checkActiveVisit()
    }
  }, [activeVisit, checkActiveVisit])

  return { activeVisit, checkActiveVisit, clearActiveVisit }
}
