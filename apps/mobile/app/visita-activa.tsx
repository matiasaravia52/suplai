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
import * as Location from "expo-location"
import { useStore } from "../lib/store"
import { useLocation } from "../hooks/useLocation"
import { useTripTracking } from "../hooks/useTripTracking"
import { api } from "../lib/api"
import type { ResultadoVisita } from "@suplai/types"

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
  const [resultado, setResultado] = useState<ResultadoVisita | null>(null)

  useEffect(() => {
    if (!activeVisit) {
      router.replace("/(tabs)")
      return
    }

    const checkinTime = new Date(activeVisit.checkinAt).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkinTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeVisit, router])

  const handleCheckout = useCallback(async (res: ResultadoVisita) => {
    if (!activeVisit) return
    setCheckingOut(true)

    try {
      let lat: number | null = null
      let lng: number | null = null

      try {
        const last = await Location.getLastKnownPositionAsync()
        if (last) { lat = last.coords.latitude; lng = last.coords.longitude }
        const current = await Promise.race([
          getCurrentPosition(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ])
        if (current) { lat = current.lat; lng = current.lng }
      } catch {
        // Continuar con lo que tengamos
      }

      await finalFlush()

      await api.post("/api/tracking/checkout", {
        visitId: activeVisit.visitId,
        lat: lat ?? 0,
        lng: lng ?? 0,
        resultado: res,
      })

      clearActiveVisit()
      router.replace("/(tabs)")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cerrar la visita"
      Alert.alert("Error", message)
    } finally {
      setCheckingOut(false)
    }
  }, [activeVisit, getCurrentPosition, finalFlush, clearActiveVisit, router])

  const confirmarSalida = useCallback((res: ResultadoVisita) => {
    setResultado(res)
    const label = res === "venta" ? "Venta" : "Sin venta"
    Alert.alert(
      "Confirmar salida",
      `Marcás esta visita como: ${label}`,
      [
        { text: "Cancelar", style: "cancel", onPress: () => setResultado(null) },
        { text: "Confirmar", onPress: () => handleCheckout(res) },
      ]
    )
  }, [handleCheckout])

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

        <Text style={styles.resultLabel}>¿Cómo fue la visita?</Text>

        <View style={styles.resultRow}>
          <TouchableOpacity
            style={[styles.resultBtn, styles.ventaBtn, checkingOut && styles.buttonDisabled]}
            onPress={() => confirmarSalida("venta")}
            disabled={checkingOut}
          >
            {checkingOut && resultado === "venta"
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.resultBtnText}>✓ Venta</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resultBtn, styles.noVentaBtn, checkingOut && styles.buttonDisabled]}
            onPress={() => confirmarSalida("no_venta")}
            disabled={checkingOut}
          >
            {checkingOut && resultado === "no_venta"
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.resultBtnText}>✗ Sin venta</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  label: { fontSize: 16, color: "#666", marginBottom: 4 },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 32,
  },
  timerContainer: { marginBottom: 32 },
  timer: {
    fontSize: 48,
    fontWeight: "300",
    color: "#2563eb",
    fontVariant: ["tabular-nums"],
  },
  resultLabel: {
    fontSize: 15,
    color: "#555",
    marginBottom: 16,
    fontWeight: "500",
  },
  resultRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  resultBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  ventaBtn: { backgroundColor: "#16a34a" },
  noVentaBtn: { backgroundColor: "#ef4444" },
  buttonDisabled: { opacity: 0.6 },
  resultBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
})
