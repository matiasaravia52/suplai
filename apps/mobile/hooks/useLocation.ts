import { useCallback } from "react"
import * as Location from "expo-location"
import { Alert } from "react-native"

interface LocationResult {
  lat: number
  lng: number
}

export function useLocation() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Suplai necesita acceso a tu ubicación para registrar visitas.")
      return false
    }
    return true
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<LocationResult | null> => {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== "granted") {
      const granted = await requestPermission()
      if (!granted) return null
    }

    // Usar última posición conocida (instantánea, sin restricción de antigüedad)
    const last = await Location.getLastKnownPositionAsync()
    if (last) {
      return { lat: last.coords.latitude, lng: last.coords.longitude }
    }

    // Sin posición conocida en cache: esperar máximo 8s con precisión media
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ])

    if (!loc) return null
    return { lat: loc.coords.latitude, lng: loc.coords.longitude }
  }, [requestPermission])

  return { getCurrentPosition, requestPermission }
}
