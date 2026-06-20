import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { useStore } from "../lib/store"
import { useLocation } from "../hooks/useLocation"
import { useTripTracking } from "../hooks/useTripTracking"
import { api } from "../lib/api"

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export default function VisitaActivaScreen() {
  const router = useRouter()
  const { activeVisit, clearActiveVisit } = useStore()
  const { getCurrentPosition } = useLocation()
  const { finalFlush } = useTripTracking(activeVisit?.visitId ?? null)

  const [elapsed, setElapsed] = useState(0)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    if (!activeVisit) {
      router.back()
      return
    }

    const checkinTime = new Date(activeVisit.checkinAt).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkinTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeVisit, router])

  const handleCheckout = useCallback(async () => {
    if (!activeVisit) return
    setCheckingOut(true)

    try {
      const pos = await getCurrentPosition()
      if (!pos) {
        setCheckingOut(false)
        return
      }

      await finalFlush()

      await api.post("/api/tracking/checkout", {
        visitId: activeVisit.visitId,
        lat: pos.lat,
        lng: pos.lng,
      })

      clearActiveVisit()
      router.back()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cerrar la visita"
      Alert.alert("Error", message)
    } finally {
      setCheckingOut(false)
    }
  }, [activeVisit, getCurrentPosition, finalFlush, clearActiveVisit, router])

  if (!activeVisit) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Estás en:</Text>
        <Text style={styles.name}>{activeVisit.clientPointNombre}</Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTimer(elapsed)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutButton, checkingOut && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutText}>Me voy</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 32,
  },
  timerContainer: {
    marginBottom: 40,
  },
  timer: {
    fontSize: 48,
    fontWeight: "300",
    color: "#2563eb",
    fontVariant: ["tabular-nums"],
  },
  checkoutButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
})
