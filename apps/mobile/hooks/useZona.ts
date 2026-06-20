import { useEffect, useCallback } from "react"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import type { ZonaDetail } from "@suplai/types"

export function todayAR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

export function addDays(fecha: string, days: number): string {
  const d = new Date(fecha + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

export function useZona(fecha: string) {
  const { zona, zonaLoading, setZona, setZonaLoading } = useStore()

  const fetchZona = useCallback(async () => {
    setZonaLoading(true)
    try {
      const data = await api.get<{ zona: ZonaDetail | null }>(`/api/tracking/my-zona?fecha=${fecha}`)
      setZona(data.zona ?? null)
    } catch (err) {
      console.error("[useZona] error:", err instanceof Error ? err.message : err)
      setZona(null)
    }
  }, [fecha, setZona, setZonaLoading])

  useEffect(() => {
    fetchZona()
  }, [fetchZona])

  return { zona, loading: zonaLoading, refetch: fetchZona }
}
