export interface Client {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  activo: boolean
  created_at: string
}

export interface ClientPoint {
  id: string
  client_id: string
  nombre: string
  direccion?: string
  lat?: number
  lng?: number
  telefono?: string
  activo: boolean
  created_at: string
}

export interface CreateClientInput {
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
}

export interface CreateClientPointInput {
  client_id: string
  nombre: string
  direccion?: string
  telefono?: string
  lat?: number
  lng?: number
}
