import { useEffect, useCallback } from "react"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import type { RoutePlanDetail } from "@suplai/types"

const POLL_INTERVAL_MS = 5 * 60 * 1000

export function useActivePlan() {
  const { plans, planLoading, setPlans, setPlanLoading } = useStore()

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    try {
      const data = await api.get<{ plans: RoutePlanDetail[] }>(`/api/tracking/my-plan?fecha=${today}`)
      setPlans(data.plans ?? [])
    } catch (err) {
      console.error("[useActivePlan] error:", err instanceof Error ? err.message : err)
      setPlans([])
    }
  }, [setPlans, setPlanLoading])

  useEffect(() => {
    fetchPlan()
    const interval = setInterval(fetchPlan, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchPlan])

  return { plans, loading: planLoading, refetch: fetchPlan }
}
