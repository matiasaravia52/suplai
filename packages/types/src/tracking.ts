export type ResultadoVisita = 'venta' | 'no_venta'

export interface Visit {
  id: string
  client_point_id: string
  user_id: string
  checkin_at: string
  checkin_lat: number
  checkin_lng: number
  checkout_at?: string
  checkout_lat?: number
  checkout_lng?: number
  resultado?: ResultadoVisita
  created_at: string
}

export interface RoutePoint {
  id: string
  user_id: string
  visit_id?: string
  lat: number
  lng: number
  speed_kmh?: number
  heading?: number
  accuracy_metros?: number
  recorded_at: string
}

export interface FraudAlert {
  id: string
  visit_id: string
  user_id: string
  client_point_id: string
  distancia_metros: number
  created_at: string
}

export interface EmployeeStatus {
  user_id: string
  current_lat?: number
  current_lng?: number
  last_seen_at?: string
  visit_id?: string
}

export interface FieldEmployee {
  id: string
  nombre: string
  email: string
  roles: string[]
  status?: EmployeeStatus
}

export interface CheckinInput {
  clientPointId: string
  userId: string
  lat: number
  lng: number
}

export interface VisitFilters {
  userId?: string
  clientPointId?: string
  fechaDesde?: string
  fechaHasta?: string
}

export interface AlertFilters {
  userId?: string
  fechaDesde?: string
  fechaHasta?: string
}

export interface Zona {
  id: string
  user_id: string
  nombre: string
  created_by: string
  created_at: string
}

export interface ZonaStop {
  id: string
  zona_id: string
  client_point_id: string
  orden: number
  created_at: string
}

export interface ZonaStopDetail extends ZonaStop {
  client_point_nombre: string
  client_point_lat?: number
  client_point_lng?: number
  client_nombre: string
  visitado: boolean
  visit_id?: string
  checkin_at?: string
  checkout_at?: string
}

export interface ZonaDetail extends Zona {
  user_nombre: string
  stops: ZonaStopDetail[]
}

export interface UnknownPoint {
  id: string
  user_id: string
  nombre: string
  descripcion?: string
  lat: number
  lng: number
  created_at: string
}

export interface CreateUnknownPointInput {
  nombre: string
  descripcion?: string
  lat: number
  lng: number
}

export interface VisitWithPoint extends Visit {
  client_point_nombre: string
}
