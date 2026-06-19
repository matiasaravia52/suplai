import { useEffect, useCallback } from "react"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import type { RoutePlanDetail } from "@suplai/types"

const POLL_INTERVAL_MS = 5 * 60 * 1000

export function useActivePlan() {
  const { plan, planLoading, setPlan, setPlanLoading } = useStore()

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true)
    try {
      const data = await api.get<{ plan: RoutePlanDetail | null }>("/api/tracking/my-plan")
      setPlan(data.plan)
    } catch {
      setPlan(null)
    }
  }, [setPlan, setPlanLoading])

  useEffect(() => {
    fetchPlan()
    const interval = setInterval(fetchPlan, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchPlan])

  return { plan, loading: planLoading, refetch: fetchPlan }
}
