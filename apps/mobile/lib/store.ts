import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Session } from "@supabase/supabase-js"
import type { ZonaDetail } from "@suplai/types"

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

  zona: ZonaDetail | null
  zonaLoading: boolean
  setZona: (zona: ZonaDetail | null) => void
  setZonaLoading: (loading: boolean) => void

  gpsTracking: boolean
  setGpsTracking: (v: boolean) => void

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
        set({ session: null, apiBaseUrl: null, zona: null, activeVisit: null }),

      zona: null,
      zonaLoading: false,
      setZona: (zona) => set({ zona, zonaLoading: false }),
      setZonaLoading: (zonaLoading) => set({ zonaLoading }),

      gpsTracking: false,
      setGpsTracking: (gpsTracking) => set({ gpsTracking }),

      activeVisit: null,
      setActiveVisit: (activeVisit) => set({ activeVisit }),
      clearActiveVisit: () => set({ activeVisit: null }),
    }),
    {
      name: "suplai-store-v2",
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
