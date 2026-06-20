export interface GpsPoint {
  lat: number
  lng: number
  speed_kmh?: number
  heading?: number
  accuracy_metros?: number
  recorded_at: string
}

const MAX_ACCURACY_METROS = 200
const MAX_VELOCIDAD_KMH = 150
const MIN_DISTANCIA_METROS = 10

function haversineMetros(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function esPuntoValido(punto: GpsPoint, ultimoGuardado: GpsPoint | null): boolean {
  if (punto.accuracy_metros != null && punto.accuracy_metros > MAX_ACCURACY_METROS) {
    return false
  }

  if (ultimoGuardado) {
    const distancia = haversineMetros(ultimoGuardado.lat, ultimoGuardado.lng, punto.lat, punto.lng)

    const deltaSegundos =
      (new Date(punto.recorded_at).getTime() - new Date(ultimoGuardado.recorded_at).getTime()) / 1000
    if (deltaSegundos > 0) {
      const velocidadKmh = (distancia / deltaSegundos) * 3.6
      if (velocidadKmh > MAX_VELOCIDAD_KMH) return false
    }

    if (distancia < MIN_DISTANCIA_METROS) return false
  }

  return true
}
