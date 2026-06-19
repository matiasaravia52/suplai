import { useEffect, useRef, useCallback } from "react"
import * as Location from "expo-location"
import { api } from "../lib/api"
import { getBufferedPoints, clearBuffer } from "../lib/background-location"

const FLUSH_INTERVAL_MS = 30_000
const MAX_BUFFER_SIZE = 500

interface GpsPoint {
  lat: number
  lng: number
  speed_kmh?: number
  heading?: number
  recorded_at: string
}

export function useTripTracking(visitId: string | null) {
  const bufferRef = useRef<GpsPoint[]>([])
  const watcherRef = useRef<Location.LocationSubscription | null>(null)
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const flushBuffer = useCallback(async () => {
    const buffer = bufferRef.current
    const bgBuffer = await getBufferedPoints()

    const allPoints = [...bgBuffer, ...buffer]
    if (allPoints.length === 0) return

    try {
      await api.post<{ ok: boolean; count: number }>("/api/tracking/flush", {
        points: allPoints,
        visitId,
      })
      bufferRef.current = []
      await clearBuffer()
    } catch {
      // Reintenta en el próximo flush
    }
  }, [visitId])

  useEffect(() => {
    if (!visitId) return

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 50,
          timeInterval: 5000,
        },
        (loc) => {
          const point: GpsPoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            speed_kmh: loc.coords.speed != null
              ? Math.round(loc.coords.speed * 3.6)
              : undefined,
            heading: loc.coords.heading ?? undefined,
            recorded_at: new Date(loc.timestamp).toISOString(),
          }
          bufferRef.current.push(point)
          if (bufferRef.current.length > MAX_BUFFER_SIZE) {
            bufferRef.current = bufferRef.current.slice(-MAX_BUFFER_SIZE)
          }
        },
      )

      flushIntervalRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS)
    }

    startTracking()

    return () => {
      watcherRef.current?.remove()
      watcherRef.current = null
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current)
        flushIntervalRef.current = null
      }
    }
  }, [visitId, flushBuffer])

  const finalFlush = useCallback(async () => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }
    watcherRef.current?.remove()
    watcherRef.current = null
    await flushBuffer()
  }, [flushBuffer])

  return { finalFlush }
}
