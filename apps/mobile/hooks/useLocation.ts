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

    // Usar última posición conocida (instantánea) mientras se obtiene una más precisa
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
    if (last) {
      // Retornar inmediatamente con la última conocida
      return { lat: last.coords.latitude, lng: last.coords.longitude }
    }

    // Sin posición conocida: esperar con timeout de 8s y precisión reducida
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ])

    if (!loc) return null
    return { lat: loc.coords.latitude, lng: loc.coords.longitude }
  }, [requestPermission])

  return { getCurrentPosition, requestPermission }
}
