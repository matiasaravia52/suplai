import * as TaskManager from "expo-task-manager"
import * as Location from "expo-location"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "./api"
import { useStore } from "./store"
import type { GpsPoint } from "./gps-filter"
import { esPuntoValido } from "./gps-filter"

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION"

const BUFFER_KEY = "gps_buffer"
const LAST_POINT_KEY = "gps_last_point"
const FLUSH_INTERVAL_MS = 30_000

export const ACTIVE_VISIT_KEY = "active_visit_snapshot"

interface ActiveVisitSnapshot {
  visitId: string
  clientPointLat: number
  clientPointLng: number
  radioMetros: number
}

export async function setActiveVisitSnapshot(snapshot: ActiveVisitSnapshot): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_VISIT_KEY, JSON.stringify(snapshot))
}

export async function clearActiveVisitSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_VISIT_KEY)
}

function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Background task (solo disponible en dev/prod builds, no Expo Go)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return
  const { locations } = data as { locations: Location.LocationObject[] }

  try {
    const [existing, lastSentRaw] = await Promise.all([
      AsyncStorage.getItem(BUFFER_KEY),
      AsyncStorage.getItem(LAST_POINT_KEY),
    ])
    const buffer: GpsPoint[] = existing ? JSON.parse(existing) : []
    const lastSentPoint: GpsPoint | null = lastSentRaw ? JSON.parse(lastSentRaw) : null

    for (const loc of locations) {
      const point: GpsPoint = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed_kmh: loc.coords.speed != null ? Math.round(loc.coords.speed * 3.6) : undefined,
        heading: loc.coords.heading ?? undefined,
        accuracy_metros: loc.coords.accuracy != null ? Math.round(loc.coords.accuracy) : undefined,
        recorded_at: new Date(loc.timestamp).toISOString(),
      }
      const ultimoGuardado = buffer.length > 0 ? buffer[buffer.length - 1] : lastSentPoint
      if (esPuntoValido(point, ultimoGuardado)) {
        buffer.push(point)
      }
    }

    if (buffer.length > 500) buffer.splice(0, buffer.length - 500)
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer))

    // Auto-checkout si el vendedor se alejó del punto de venta
    const lastLoc = locations[locations.length - 1]
    if (lastLoc) {
      const visitSnapshotRaw = await AsyncStorage.getItem(ACTIVE_VISIT_KEY)
      if (visitSnapshotRaw) {
        const snapshot: ActiveVisitSnapshot = JSON.parse(visitSnapshotRaw)
        const distancia = haversineMetros(
          lastLoc.coords.latitude, lastLoc.coords.longitude,
          snapshot.clientPointLat, snapshot.clientPointLng,
        )
        if (distancia > snapshot.radioMetros) {
          await AsyncStorage.removeItem(ACTIVE_VISIT_KEY)
          try {
            await api.post("/api/tracking/checkout", { visitId: snapshot.visitId })
            useStore.getState().clearActiveVisit()
          } catch {
            // Si falla el checkout, restaurar el snapshot para reintentar
            await AsyncStorage.setItem(ACTIVE_VISIT_KEY, visitSnapshotRaw)
          }
        }
      }
    }
  } catch {
    // Silently fail
  }
})

export async function getBufferedPoints(): Promise<GpsPoint[]> {
  const raw = await AsyncStorage.getItem(BUFFER_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function clearBuffer(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(BUFFER_KEY),
    AsyncStorage.removeItem(LAST_POINT_KEY),
  ])
}

async function flushBuffer(visitId?: string): Promise<void> {
  if (!useStore.getState().gpsTracking) return
  const raw = await AsyncStorage.getItem(BUFFER_KEY)
  if (!raw) return
  const buffer: GpsPoint[] = JSON.parse(raw)
  if (buffer.length === 0) return

  try {
    console.log("[GPS] flush →", buffer.length, "puntos, visitId:", visitId)
    const res = await api.post<{ ok: boolean; count: number }>("/api/tracking/flush", { points: buffer, visitId })
    console.log("[GPS] flush OK:", res)
    const lastPoint = buffer[buffer.length - 1]
    await Promise.all([
      AsyncStorage.setItem(BUFFER_KEY, JSON.stringify([])),
      AsyncStorage.setItem(LAST_POINT_KEY, JSON.stringify(lastPoint)),
    ])
  } catch (err) {
    console.error("[GPS] flush ERROR:", err instanceof Error ? err.message : err)
  }
}

// Suscripción activa de foreground (watchPositionAsync)
let _watchSubscription: Location.LocationSubscription | null = null
let _flushInterval: ReturnType<typeof setInterval> | null = null

export async function startBackgroundLocation(visitId?: string): Promise<boolean> {
  // Pedir permiso de foreground (funciona en Expo Go)
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
  if (fgStatus !== "granted") return false

  // Intentar permiso de background sin lanzar error si no está disponible (Expo Go)
  const bgPermission = await Location.getBackgroundPermissionsAsync().catch(() => null)
  const bgGranted = bgPermission?.status === "granted"

  // Tracking de foreground con watchPositionAsync (funciona siempre, incluso en Expo Go)
  _watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 0,   // actualiza aunque no haya movimiento
      timeInterval: 10_000,  // cada 10 segundos
    },
    async (location) => {
      if (!useStore.getState().gpsTracking) return
      const point: GpsPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed_kmh: location.coords.speed != null ? Math.round(location.coords.speed * 3.6) : undefined,
        heading: location.coords.heading ?? undefined,
        accuracy_metros: location.coords.accuracy != null ? Math.round(location.coords.accuracy) : undefined,
        recorded_at: new Date(location.timestamp).toISOString(),
      }

      const existing = await AsyncStorage.getItem(BUFFER_KEY)
      const buffer: GpsPoint[] = existing ? JSON.parse(existing) : []
      const lastSentRaw = buffer.length === 0 ? await AsyncStorage.getItem(LAST_POINT_KEY) : null
      const ultimoGuardado: GpsPoint | null =
        buffer.length > 0 ? buffer[buffer.length - 1] : lastSentRaw ? JSON.parse(lastSentRaw) : null

      if (!esPuntoValido(point, ultimoGuardado)) {
        console.log("[GPS] punto DESCARTADO:", point.lat, point.lng, "accuracy:", point.accuracy_metros)
        return
      }

      console.log("[GPS] punto capturado:", point.lat, point.lng, "accuracy:", point.accuracy_metros)
      buffer.push(point)
      if (buffer.length > 500) buffer.splice(0, buffer.length - 500)
      await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer))

      // Auto-checkout si el vendedor se alejó del punto de venta
      const visitSnapshotRaw = await AsyncStorage.getItem(ACTIVE_VISIT_KEY)
      if (visitSnapshotRaw) {
        const snapshot: ActiveVisitSnapshot = JSON.parse(visitSnapshotRaw)
        const distancia = haversineMetros(point.lat, point.lng, snapshot.clientPointLat, snapshot.clientPointLng)
        if (distancia > snapshot.radioMetros) {
          await AsyncStorage.removeItem(ACTIVE_VISIT_KEY)
          try {
            await api.post("/api/tracking/checkout", { visitId: snapshot.visitId })
            useStore.getState().clearActiveVisit()
          } catch {
            // Si falla el checkout, restaurar el snapshot para reintentar
            await AsyncStorage.setItem(ACTIVE_VISIT_KEY, visitSnapshotRaw)
          }
        }
      }

      // Flush inmediato con el primer punto para actualizar el mapa enseguida
      if (buffer.length === 1) {
        flushBuffer(visitId)
      }
    },
  )

  // Flush periódico al servidor cada 30 segundos
  _flushInterval = setInterval(() => flushBuffer(visitId), FLUSH_INTERVAL_MS)

  // También iniciar background task si tenemos permiso (dev/prod builds)
  if (bgGranted) {
    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 50,
        timeInterval: 15_000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Suplai",
          notificationBody: "Registrando tu recorrido...",
        },
      })
    } catch {
      // Expo Go rechaza esto — el watchPositionAsync ya cubre el foreground
    }
  }

  return true
}

export async function stopBackgroundLocation(): Promise<void> {
  _watchSubscription?.remove()
  _watchSubscription = null

  if (_flushInterval) {
    clearInterval(_flushInterval)
    _flushInterval = null
  }

  // Flush final antes de detener
  await flushBuffer()

  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
    if (registered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    }
  } catch {
    // Silently fail
  }
}
