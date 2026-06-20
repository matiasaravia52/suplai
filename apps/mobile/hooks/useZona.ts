import { useEffect, useCallback } from "react"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import type { ZonaDetail } from "@suplai/types"

export function useZona() {
  const { zona, zonaLoading, setZona, setZonaLoading } = useStore()

  const fetchZona = useCallback(async () => {
    setZonaLoading(true)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    try {
      const data = await api.get<{ zona: ZonaDetail | null }>(`/api/tracking/my-zona?fecha=${today}`)
      setZona(data.zona ?? null)
    } catch (err) {
      console.error("[useZona] error:", err instanceof Error ? err.message : err)
      setZona(null)
    }
  }, [setZona, setZonaLoading])

  useEffect(() => {
    fetchZona()
  }, [fetchZona])

  return { zona, loading: zonaLoading, refetch: fetchZona }
}
