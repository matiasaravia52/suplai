import { useState, useCallback } from "react"
import * as Location from "expo-location"
import { Alert } from "react-native"

interface LocationResult {
  lat: number
  lng: number
}

export function useLocation() {
  const [loading, setLoading] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    const granted = status === "granted"
    setPermissionGranted(granted)
    if (!granted) {
      Alert.alert("Permiso denegado", "Suplai necesita acceso a tu ubicación para registrar visitas.")
    }
    return granted
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<LocationResult | null> => {
    setLoading(true)
    try {
      if (!permissionGranted) {
        const granted = await requestPermission()
        if (!granted) return null
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      }
    } finally {
      setLoading(false)
    }
  }, [permissionGranted, requestPermission])

  return {
    loading,
    permissionGranted,
    requestPermission,
    getCurrentPosition,
  }
}
