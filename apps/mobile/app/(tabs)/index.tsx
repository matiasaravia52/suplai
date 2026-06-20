import { useEffect, useCallback, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { useActivePlan } from "../../hooks/useActivePlan"
import { useActiveVisit } from "../../hooks/useActiveVisit"
import { useLocation } from "../../hooks/useLocation"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { startBackgroundLocation, stopBackgroundLocation } from "../../lib/background-location"
import type { RoutePlanStopDetail, ClientPoint } from "@suplai/types"

export default function HomeScreen() {
  const router = useRouter()
  const { plan, loading, refetch } = useActivePlan()
  const { activeVisit, checkActiveVisit } = useActiveVisit()
  const { getCurrentPosition } = useLocation()
  const { setActiveVisit, gpsTracking, setGpsTracking } = useStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ClientPoint[]>([])
  const [searching, setSearching] = useState(false)

  const completedCount = plan?.stops.filter((s) => s.visitado).length ?? 0
  const totalCount = plan?.stops.length ?? 0

  // Refetch el plan cada vez que la pantalla recupera el foco (ej: al volver de visita-activa)
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  useEffect(() => {
    if (activeVisit) {
      router.push("/visita-activa")
    }
  }, [activeVisit, router])

  const handleCheckin = useCallback(async (clientPointId: string, clientPointNombre: string) => {
    const pos = await getCurrentPosition()
    if (!pos) return

    try {
      const data = await api.post<{ visit: { id: string; checkin_at: string } }>(
        "/api/tracking/checkin",
        { clientPointId, lat: pos.lat, lng: pos.lng },
      )

      setActiveVisit({
        visitId: data.visit.id,
        clientPointId,
        clientPointNombre,
        checkinAt: data.visit.checkin_at,
      })

      router.push("/visita-activa")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar visita"
      Alert.alert("Error", message)
    }
  }, [getCurrentPosition, setActiveVisit, router])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const data = await api.get<{ points: ClientPoint[] }>(
        `/api/tracking/client-points?q=${encodeURIComponent(query)}`,
      )
      setSearchResults(data.points ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const iniciarRecorrido = useCallback(async () => {
    try {
      const ok = await startBackgroundLocation()
      if (ok) {
        setGpsTracking(true)
      } else {
        Alert.alert(
          "Permiso denegado",
          "Para registrar el recorrido necesitamos permiso de ubicación. Habilitalo en Configuración > Suplai > Ubicación.",
        )
      }
    } catch (err) {
      console.error("[GPS] error:", err)
      const msg = err instanceof Error ? err.message : String(err)
      Alert.alert("Error al iniciar", msg)
    }
  }, [])

  const finalizarRecorrido = useCallback(() => {
    const todasVisitadas = plan?.stops.every((s) => s.visitado) ?? false

    if (todasVisitadas) {
      Alert.alert(
        "Finalizar recorrido",
        "¿Confirmar que completaste todas las paradas?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Finalizar",
            onPress: async () => {
              await stopBackgroundLocation()
              setGpsTracking(false)
            },
          },
        ],
      )
    } else {
      Alert.alert(
        "Paradas pendientes",
        `Todavía quedan ${(plan?.stops.length ?? 0) - completedCount} paradas sin visitar. ¿Finalizar igual y marcar el recorrido como incompleto?`,
        [
          { text: "Volver", style: "cancel" },
          {
            text: "Finalizar igual",
            style: "destructive",
            onPress: async () => {
              await stopBackgroundLocation()
              setGpsTracking(false)
            },
          },
        ],
      )
    }
  }, [plan, completedCount])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando plan...</Text>
      </View>
    )
  }

  const showSearch = !plan || plan.stops.every((s) => s.visitado)

  return (
    <View style={styles.container}>
      {plan && totalCount > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {completedCount}/{totalCount} paradas
            </Text>
          </View>

          <FlatList
            data={plan.stops}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.stopItem, item.visitado && styles.stopVisited]}
                onPress={() => {
                  if (!item.visitado) {
                    handleCheckin(item.client_point_id, item.client_point_nombre)
                  }
                }}
                disabled={item.visitado}
              >
                <View style={styles.stopBullet}>
                  <View style={[styles.bullet, item.visitado && styles.bulletVisited]} />
                </View>
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, item.visitado && styles.textVisited]}>
                    {item.client_point_nombre}
                  </Text>
                  {item.client_nombre ? (
                    <Text style={styles.stopClient}>{item.client_nombre}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />

          {!gpsTracking ? (
            <TouchableOpacity style={styles.gpsButton} onPress={iniciarRecorrido}>
              <Text style={styles.gpsButtonText}>▶ Iniciar recorrido</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.gpsButtonActive} onPress={finalizarRecorrido}>
              <Text style={styles.gpsButtonTextActive}>■ Finalizar recorrido</Text>
            </TouchableOpacity>
          )}
        </>
      ) : showSearch ? (
        <>
          <Text style={styles.noPlanText}>Sin plan asignado para hoy</Text>
          <Text style={styles.searchLabel}>Buscar punto de venta</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Nombre o dirección..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searching ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResult}
                  onPress={() => handleCheckin(item.id, item.nombre)}
                >
                  <Text style={styles.searchResultName}>{item.nombre}</Text>
                  {item.direccion ? (
                    <Text style={styles.searchResultDir}>{item.direccion}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.length >= 2 ? (
            <Text style={styles.noResults}>Sin resultados</Text>
          ) : null}
        </>
      ) : null}
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
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  list: {
    paddingVertical: 8,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stopVisited: {
    opacity: 0.5,
  },
  stopBullet: {
    width: 24,
    alignItems: "center",
  },
  bullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "transparent",
  },
  bulletVisited: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  stopInfo: {
    flex: 1,
    marginLeft: 8,
  },
  stopName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  textVisited: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  stopClient: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  gpsButton: {
    margin: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    alignItems: "center",
  },
  gpsButtonActive: {
    backgroundColor: "#2563eb",
  },
  gpsButtonText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 14,
  },
  gpsButtonTextActive: {
    color: "#ffffff",
  },
  noPlanText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 24,
  },
  searchLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  searchInput: {
    marginHorizontal: 20,
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
  },
  searchResult: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a2e",
  },
  searchResultDir: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  noResults: {
    textAlign: "center",
    color: "#999",
    marginTop: 24,
    fontSize: 14,
  },
})
