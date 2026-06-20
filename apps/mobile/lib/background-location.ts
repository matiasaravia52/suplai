import * as TaskManager from "expo-task-manager"
import * as Location from "expo-location"
import AsyncStorage from "@react-native-async-storage/async-storage"

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION"

const BUFFER_KEY = "gps_buffer"

interface GpsPoint {
  lat: number
  lng: number
  speed_kmh?: number
  heading?: number
  recorded_at: string
}

// Background task (solo disponible en dev/prod builds, no Expo Go)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return
  const { locations } = data as { locations: Location.LocationObject[] }

  const points: GpsPoint[] = locations.map((loc) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    speed_kmh: loc.coords.speed != null ? Math.round(loc.coords.speed * 3.6) : undefined,
    heading: loc.coords.heading ?? undefined,
    recorded_at: new Date(loc.timestamp).toISOString(),
  }))

  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY)
    const buffer: GpsPoint[] = existing ? JSON.parse(existing) : []
    buffer.push(...points)
    if (buffer.length > 500) buffer.splice(0, buffer.length - 500)
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer))
  } catch {
    // Silently fail
  }
})

export async function getBufferedPoints(): Promise<GpsPoint[]> {
  const raw = await AsyncStorage.getItem(BUFFER_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function clearBuffer(): Promise<void> {
  await AsyncStorage.removeItem(BUFFER_KEY)
}

// Suscripción activa de foreground (watchPositionAsync)
let _watchSubscription: Location.LocationSubscription | null = null

export async function startBackgroundLocation(): Promise<boolean> {
  // Pedir permiso de foreground (funciona en Expo Go)
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
  if (fgStatus !== "granted") return false

  // Intentar permiso de background sin lanzar error si no está disponible (Expo Go)
  const bgPermission = await Location.getBackgroundPermissionsAsync().catch(() => null)
  const bgGranted = bgPermission?.status === "granted"

  // Tracking de foreground con watchPositionAsync (funciona siempre, incluso en Expo Go)
  _watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50,
      timeInterval: 15_000,
    },
    async (location) => {
      const point: GpsPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed_kmh: location.coords.speed != null ? Math.round(location.coords.speed * 3.6) : undefined,
        heading: location.coords.heading ?? undefined,
        recorded_at: new Date(location.timestamp).toISOString(),
      }
      const existing = await AsyncStorage.getItem(BUFFER_KEY)
      const buffer: GpsPoint[] = existing ? JSON.parse(existing) : []
      buffer.push(point)
      if (buffer.length > 500) buffer.splice(0, buffer.length - 500)
      await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer))
    },
  )

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

  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
    if (registered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    }
  } catch {
    // Silently fail
  }
}
