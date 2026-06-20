"use server"

import {
  listFieldEmployees, listVisits, listFraudAlerts, getRoutePoints,
  createZona, listZonas, getZonaDetail, getZonaDetailForDate, getZonaForEmployee,
  deleteZona, updateZona, setResultadoSupervisor,
  getEmployeesWithZona, getRoutePointsForDate,
} from "@suplai/tracking/service"
import { revalidatePath } from "next/cache"
import type { FieldEmployee, VisitFilters, AlertFilters, RoutePoint, ResultadoVisita } from "@suplai/types"

export async function getFieldEmployees(schemaName: string): Promise<FieldEmployee[]> {
  return listFieldEmployees(schemaName)
}

export async function getVisitHistory(schemaName: string, filters: VisitFilters = {}) {
  return listVisits(schemaName, filters)
}

export async function getFraudAlerts(schemaName: string, filters: AlertFilters = {}) {
  return listFraudAlerts(schemaName, filters)
}

export async function getEmployeeRoute(
  schemaName: string,
  userId: string,
  visitId?: string,
): Promise<RoutePoint[]> {
  return getRoutePoints(schemaName, userId, visitId)
}

export async function crearZona(
  schemaName: string,
  input: { userId: string; nombre?: string; createdBy: string; clientPointIds: string[] },
) {
  const zona = await createZona(schemaName, input)
  revalidatePath("/tracking/zonas")
  return zona
}

export async function getZonas(schemaName: string, filters: { userId?: string } = {}) {
  return listZonas(schemaName, filters)
}

export async function getZona(schemaName: string, zonaId: string) {
  return getZonaDetail(schemaName, zonaId)
}

export async function getZonaConFecha(schemaName: string, zonaId: string, fecha: string) {
  return getZonaDetailForDate(schemaName, zonaId, fecha)
}

export async function getZonaEmpleado(schemaName: string, userId: string) {
  return getZonaForEmployee(schemaName, userId)
}

export async function eliminarZona(schemaName: string, zonaId: string) {
  await deleteZona(schemaName, zonaId)
  revalidatePath("/tracking/zonas")
}

export async function editarZona(
  schemaName: string,
  zonaId: string,
  input: { userId: string; nombre?: string; clientPointIds: string[] },
) {
  await updateZona(schemaName, zonaId, input)
  revalidatePath("/tracking/zonas")
  revalidatePath(`/tracking/zonas/${zonaId}`)
}

export async function getEmpleadosConZona(schemaName: string) {
  return getEmployeesWithZona(schemaName)
}

export async function getRouteForDate(schemaName: string, userId: string, fecha: string) {
  return getRoutePointsForDate(schemaName, userId, fecha)
}

export async function marcarResultadoVisita(
  schemaName: string,
  visitId: string,
  resultado: ResultadoVisita,
) {
  await setResultadoSupervisor(schemaName, visitId, resultado)
  revalidatePath("/tracking/historial")
}
