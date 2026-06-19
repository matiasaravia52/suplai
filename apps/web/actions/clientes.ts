"use server"

import { revalidatePath } from "next/cache"
import { withTenantSchema } from "@suplai/core"
import {
  createClient,
  updateClient,
  deactivateClient,
  createClientPoint,
  updateClientPoint,
  deactivateClientPoint,
  listClients,
  getClientById,
  listClientPoints,
  getClientPointById,
  listAllClientPoints,
} from "@suplai/clients"
import type { Client, ClientPoint } from "@suplai/types"

export async function getTodosLosPuntosDeVenta(schemaName: string) {
  return listAllClientPoints(schemaName)
}

export async function getClientes(schemaName: string): Promise<(Client & { puntos_count: number })[]> {
  return listClients(schemaName)
}

export async function getCliente(schemaName: string, clientId: string): Promise<Client | null> {
  return getClientById(schemaName, clientId)
}

export async function getPuntosDeVenta(schemaName: string, clientId: string): Promise<ClientPoint[]> {
  return listClientPoints(schemaName, clientId)
}

export async function getPuntoDeVenta(schemaName: string, puntoId: string): Promise<ClientPoint | null> {
  return getClientPointById(schemaName, puntoId)
}

export async function crearCliente(schemaName: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const direccion = (formData.get("direccion") as string | null)?.trim()
  const telefono = (formData.get("telefono") as string | null)?.trim()
  const email = (formData.get("email") as string | null)?.trim()

  if (!nombre) return { error: "El nombre es requerido" }

  const client = await createClient(schemaName, { nombre, direccion, telefono, email })
  revalidatePath("/clientes")
  return { success: true, id: client.id }
}

export async function editarCliente(schemaName: string, clientId: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const direccion = (formData.get("direccion") as string | null)?.trim()
  const telefono = (formData.get("telefono") as string | null)?.trim()
  const email = (formData.get("email") as string | null)?.trim()

  if (!nombre) return { error: "El nombre es requerido" }

  await updateClient(schemaName, clientId, { nombre, direccion, telefono, email })
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${clientId}`)
  return { success: true }
}

export async function desactivarCliente(schemaName: string, clientId: string) {
  await deactivateClient(schemaName, clientId)
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${clientId}`)
}

export async function crearPuntoDeVenta(schemaName: string, clientId: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const direccion = (formData.get("direccion") as string | null)?.trim()
  const telefono = (formData.get("telefono") as string | null)?.trim()
  const latRaw = formData.get("lat") as string | null
  const lngRaw = formData.get("lng") as string | null
  const lat = latRaw && latRaw.trim() ? parseFloat(latRaw) : undefined
  const lng = lngRaw && lngRaw.trim() ? parseFloat(lngRaw) : undefined

  if (!nombre) return { error: "El nombre es requerido" }

  await createClientPoint(schemaName, { client_id: clientId, nombre, direccion, telefono, lat, lng })
  revalidatePath(`/clientes/${clientId}`)
  return { success: true }
}

export async function editarPuntoDeVenta(schemaName: string, puntoId: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const direccion = (formData.get("direccion") as string | null)?.trim()
  const telefono = (formData.get("telefono") as string | null)?.trim()
  const latRaw = formData.get("lat") as string | null
  const lngRaw = formData.get("lng") as string | null
  const lat = latRaw && latRaw.trim() ? parseFloat(latRaw) : undefined
  const lng = lngRaw && lngRaw.trim() ? parseFloat(lngRaw) : undefined

  if (!nombre) return { error: "El nombre es requerido" }

  await updateClientPoint(schemaName, puntoId, { nombre, direccion, telefono, lat, lng })
  revalidatePath(`/clientes/${formData.get("client_id")}`)
  return { success: true }
}

export async function desactivarPuntoDeVenta(schemaName: string, puntoId: string, clientId: string) {
  await deactivateClientPoint(schemaName, puntoId)
  revalidatePath(`/clientes/${clientId}`)
  revalidatePath(`/clientes/${clientId}/puntos/${puntoId}`)
}
