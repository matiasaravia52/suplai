import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View } from "react-native"
import { useStore } from "../lib/store"
import { setApiAuth } from "../lib/api"

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, apiBaseUrl } = useStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (session && apiBaseUrl) {
      setApiAuth(apiBaseUrl, session.access_token)
    }
  }, [session, apiBaseUrl])

  useEffect(() => {
    const inAuthGroup = segments[0] === "login"

    if (!session && !inAuthGroup) {
      router.replace("/login")
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)")
    }
  }, [session, segments, router])

  return <>{children}</>
}

export default function RootLayout() {
  const { session } = useStore()

  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <AuthGuard>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
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
    </AuthGuard>
  )
}
