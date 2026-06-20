import { createClient } from "@supabase/supabase-js"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppState } from "react-native"

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: AsyncStorage,
    detectSessionInUrl: false,
  },
})

// Refresca el token cuando la app vuelve al primer plano
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
