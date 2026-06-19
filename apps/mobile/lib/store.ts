import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Session } from "@supabase/supabase-js"
import type { RoutePlanDetail } from "@suplai/types"

interface ActiveVisit {
  visitId: string
  clientPointId: string
  clientPointNombre: string
  checkinAt: string
}

interface AppStore {
  session: Session | null
  apiBaseUrl: string | null
  hasUnknownPoints: boolean
  setSession: (session: Session, apiBaseUrl: string) => void
  clearSession: () => void

  plan: RoutePlanDetail | null
  planLoading: boolean
  setPlan: (plan: RoutePlanDetail | null) => void
  setPlanLoading: (loading: boolean) => void

  activeVisit: ActiveVisit | null
  setActiveVisit: (v: ActiveVisit | null) => void
  clearActiveVisit: () => void
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      session: null,
      apiBaseUrl: null,
      hasUnknownPoints: false,

      setSession: (session, apiBaseUrl) =>
        set({ session, apiBaseUrl }),

      clearSession: () =>
        set({ session: null, apiBaseUrl: null, plan: null, activeVisit: null }),

      plan: null,
      planLoading: false,
      setPlan: (plan) => set({ plan, planLoading: false }),
      setPlanLoading: (planLoading) => set({ planLoading }),

      activeVisit: null,
      setActiveVisit: (activeVisit) => set({ activeVisit }),
      clearActiveVisit: () => set({ activeVisit: null }),
    }),
    {
      name: "suplai-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        apiBaseUrl: state.apiBaseUrl,
        hasUnknownPoints: state.hasUnknownPoints,
        activeVisit: state.activeVisit,
      }),
    },
  ),
)
