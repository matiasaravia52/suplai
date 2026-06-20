import { useEffect } from "react"
import { Stack, useRouter, useSegments, useNavigationContainerRef } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useStore } from "../lib/store"
import { setApiAuth } from "../lib/api"
import { supabase } from "../lib/supabase"

function AuthGuard() {
  const { session, apiBaseUrl, setSession, clearSession } = useStore()
  const segments = useSegments()
  const router = useRouter()
  const navigationRef = useNavigationContainerRef()

  // Escuchar cambios de sesión de Supabase (refresh de token, logout, etc.)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession && apiBaseUrl) {
        setSession(newSession, apiBaseUrl)
        setApiAuth(apiBaseUrl, newSession.access_token)
      } else if (event === "SIGNED_OUT") {
        clearSession()
      }
    })
    return () => subscription.unsubscribe()
  }, [apiBaseUrl, setSession, clearSession])

  useEffect(() => {
    if (session && apiBaseUrl) {
      setApiAuth(apiBaseUrl, session.access_token)
    }
  }, [session, apiBaseUrl])

  useEffect(() => {
    if (!navigationRef.isReady()) return

    const inAuthGroup = segments[0] === "login"
    if (session === undefined) return // cargando

    if (!session && !inAuthGroup) {
      router.replace("/login")
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)")
    }
  }, [session, segments, router, navigationRef.isReady()])

  return null
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="visita-activa"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Visita activa",
            headerBackTitle: "Salir",
          }}
        />
        <Stack.Screen
          name="punto-nuevo"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Punto nuevo",
          }}
        />
      </Stack>
      <AuthGuard />
    </>
  )
}
