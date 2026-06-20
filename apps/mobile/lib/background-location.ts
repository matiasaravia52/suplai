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

  const existing = await AsyncStorage.getItem(BUFFER_KEY)
  const buffer: GpsPoint[] = existing ? JSON.parse(existing) : []
  buffer.push(...points)

  const MAX = 500
  const trimmed = buffer.length > MAX ? buffer.slice(-MAX) : buffer
  await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(trimmed))
})

export async function getBufferedPoints(): Promise<GpsPoint[]> {
  const raw = await AsyncStorage.getItem(BUFFER_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function clearBuffer(): Promise<void> {
  await AsyncStorage.removeItem(BUFFER_KEY)
}

export async function startBackgroundLocation() {
  // Expo Go no soporta background permissions ni foreground service.
  // Intentamos background; si falla, usamos foreground como fallback para testing.
  let useBackground = false
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync()
    useBackground = status === "granted"
  } catch {
    // Expo Go rechaza esta llamada — continuamos con foreground
  }

  if (!useBackground) {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return false
  }

  const options: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.High,
    distanceInterval: 50,
    timeInterval: 10000,
  }

  // foregroundService solo disponible en dev/prod builds de Android
  if (useBackground) {
    options.foregroundService = {
      notificationTitle: "Suplai",
      notificationBody: "Registrando tu recorrido...",
    }
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, options)
  return true
}

export async function stopBackgroundLocation() {
  if (TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  }
}
