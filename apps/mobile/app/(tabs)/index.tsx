import { useCallback, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { useZona } from "../../hooks/useZona"
import { useActiveVisit } from "../../hooks/useActiveVisit"
import { useLocation } from "../../hooks/useLocation"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { startBackgroundLocation, stopBackgroundLocation } from "../../lib/background-location"
import type { ZonaStopDetail, ClientPoint, VisitWithPoint, ResultadoVisita } from "@suplai/types"

export default function HomeScreen() {
  const router = useRouter()
  const { zona, loading, refetch } = useZona()
  const { activeVisit, checkActiveVisit } = useActiveVisit()
  const { getCurrentPosition } = useLocation()
  const { setActiveVisit, gpsTracking, setGpsTracking } = useStore()

  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ClientPoint[]>([])
  const [searching, setSearching] = useState(false)

  useFocusEffect(
    useCallback(() => {
      refetch()
      checkActiveVisit()
    }, [refetch, checkActiveVisit]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    await checkActiveVisit()
    setRefreshing(false)
  }, [refetch, checkActiveVisit])

  const pedirResultadoPendiente = useCallback(
    (visitas: VisitWithPoint[], index: number, onDone: () => void) => {
      if (index >= visitas.length) { onDone(); return }
      const visita = visitas[index]
      if (!visita) { onDone(); return }
      Alert.alert(
        `¿Qué pasó en ${visita.client_point_nombre}?`,
        undefined,
        [
          {
            text: "Venta",
            onPress: () => {
              api.patch(`/api/tracking/visits/${visita.id}/resultado`, { resultado: "venta" as ResultadoVisita }).catch(() => null)
              pedirResultadoPendiente(visitas, index + 1, onDone)
            },
          },
          {
            text: "No venta",
            onPress: () => {
              api.patch(`/api/tracking/visits/${visita.id}/resultado`, { resultado: "no_venta" as ResultadoVisita }).catch(() => null)
              pedirResultadoPendiente(visitas, index + 1, onDone)
            },
          },
          {
            text: "Omitir",
            style: "cancel",
            onPress: () => pedirResultadoPendiente(visitas, index + 1, onDone),
          },
        ],
      )
    },
    [],
  )

  const handleCheckin = useCallback(async (clientPointId: string, clientPointNombre: string) => {
    const pos = await getCurrentPosition()
    if (!pos) return

    const doCheckin = async () => {
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
        if (!gpsTracking) {
          const ok = await startBackgroundLocation()
          if (ok) setGpsTracking(true)
        }
        router.push("/visita-activa")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al registrar visita"
        Alert.alert("Error", message)
      }
    }

    try {
      const { visits } = await api.get<{ visits: VisitWithPoint[] }>("/api/tracking/my-visits?pendiente_resultado=true")
      if (visits && visits.length > 0) {
        pedirResultadoPendiente(visits, 0, doCheckin)
        return
      }
    } catch {
      // Si falla, continuar igual
    }

    await doCheckin()
  }, [getCurrentPosition, setActiveVisit, router, gpsTracking, setGpsTracking, pedirResultadoPendiente])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
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
      if (ok) setGpsTracking(true)
      else Alert.alert("Permiso denegado", "Para registrar el recorrido necesitamos permiso de ubicación.")
    } catch (err) {
      Alert.alert("Error al iniciar", err instanceof Error ? err.message : String(err))
    }
  }, [setGpsTracking])

  const stops = zona?.stops ?? []
  const completedStops = stops.filter((s) => s.visitado).length
  const totalStops = stops.length

  const finalizarRecorrido = useCallback(() => {
    const todasVisitadas = totalStops > 0 && completedStops === totalStops
    if (todasVisitadas) {
      Alert.alert("Finalizar recorrido", "¿Confirmar que completaste todas las paradas?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Finalizar", onPress: async () => { await stopBackgroundLocation(); setGpsTracking(false) } },
      ])
    } else {
      Alert.alert(
        "Paradas pendientes",
        `Quedan ${totalStops - completedStops} paradas sin visitar. ¿Finalizar igual?`,
        [
          { text: "Volver", style: "cancel" },
          { text: "Finalizar igual", style: "destructive", onPress: async () => { await stopBackgroundLocation(); setGpsTracking(false) } },
        ],
      )
    }
  }, [totalStops, completedStops, setGpsTracking])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando zona...</Text>
      </View>
    )
  }

  if (activeVisit) {
    return (
      <View style={styles.container}>
        <View style={styles.activeVisitBanner}>
          <Text style={styles.activeVisitLabel}>Visita en curso</Text>
          <Text style={styles.activeVisitName}>{activeVisit.clientPointNombre}</Text>
          <TouchableOpacity style={styles.activeVisitButton} onPress={() => router.push("/visita-activa")}>
            <Text style={styles.activeVisitButtonText}>Volver a la visita</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!zona) {
    return (
      <View style={styles.container}>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              <Text style={styles.noPlanText}>Sin zona asignada</Text>
              <Text style={styles.searchLabel}>Buscar punto de venta</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 Nombre o dirección..."
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator style={{ marginTop: 16 }} />}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchResult}
              onPress={() => handleCheckin(item.id, item.nombre)}
            >
              <Text style={styles.searchResultName}>{item.nombre}</Text>
              {item.direccion ? <Text style={styles.searchResultDir}>{item.direccion}</Text> : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !searching && searchQuery.length >= 2
              ? <Text style={styles.noResults}>Sin resultados</Text>
              : null
          }
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{completedStops}/{totalStops} paradas visitadas hoy</Text>
      </View>

      <FlatList
        data={stops}
        keyExtractor={(item: ZonaStopDetail) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }: { item: ZonaStopDetail }) => (
          <TouchableOpacity
            style={[styles.stopItem, item.visitado && styles.stopVisited]}
            onPress={() => { if (!item.visitado) handleCheckin(item.client_point_id, item.client_point_nombre) }}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },
  header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  list: { paddingBottom: 8 },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  stopVisited: { opacity: 0.5 },
  stopBullet: { width: 24, alignItems: "center" },
  bullet: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#2563eb", backgroundColor: "transparent" },
  bulletVisited: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  stopInfo: { flex: 1, marginLeft: 8 },
  stopName: { fontSize: 15, fontWeight: "500", color: "#1a1a2e" },
  textVisited: { textDecorationLine: "line-through", color: "#999" },
  stopClient: { fontSize: 13, color: "#666", marginTop: 2 },
  gpsButton: { margin: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#2563eb", alignItems: "center" },
  gpsButtonActive: { margin: 16, padding: 14, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  gpsButtonText: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  gpsButtonTextActive: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  noPlanText: { fontSize: 18, fontWeight: "600", color: "#333", textAlign: "center", marginTop: 32, marginBottom: 24 },
  searchLabel: { fontSize: 14, color: "#666", marginBottom: 8, paddingHorizontal: 20 },
  searchInput: { marginHorizontal: 20, height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 14, fontSize: 15, backgroundColor: "#f9f9f9" },
  searchResult: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  searchResultName: { fontSize: 15, fontWeight: "500", color: "#1a1a2e" },
  searchResultDir: { fontSize: 13, color: "#666", marginTop: 2 },
  noResults: { textAlign: "center", color: "#999", marginTop: 24, fontSize: 14 },
  activeVisitBanner: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12 },
  activeVisitLabel: { fontSize: 13, color: "#666", textTransform: "uppercase", letterSpacing: 1 },
  activeVisitName: { fontSize: 22, fontWeight: "700", color: "#1a1a2e", textAlign: "center" },
  activeVisitButton: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: "#2563eb", borderRadius: 10 },
  activeVisitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
})
