"use server"

import {
  listFieldEmployees, listVisits, listFraudAlerts, getRoutePoints,
  createRoutePlan, listRoutePlans, getRoutePlanDetail, getActivePlanForEmployee,
  deleteRoutePlan, updateRoutePlan,
} from "@suplai/tracking/service"
import { revalidatePath } from "next/cache"
import type { FieldEmployee, VisitFilters, AlertFilters, RoutePoint, RoutePlanEstado } from "@suplai/types"

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

export async function createPlan(
  schemaName: string,
  input: { userId: string; fecha: string; createdBy: string; clientPointIds: string[] },
) {
  return createRoutePlan(schemaName, input)
}

export async function getPlans(
  schemaName: string,
  filters: { fecha?: string; userId?: string; estado?: RoutePlanEstado } = {},
) {
  return listRoutePlans(schemaName, filters)
}

export async function getPlanDetail(schemaName: string, planId: string) {
  return getRoutePlanDetail(schemaName, planId)
}

export async function getEmployeeActivePlan(schemaName: string, userId: string) {
  return getActivePlanForEmployee(schemaName, userId)
}

export async function deletePlan(schemaName: string, planId: string) {
  await deleteRoutePlan(schemaName, planId)
  revalidatePath("/tracking/planes")
}

export async function updatePlan(
  schemaName: string,
  planId: string,
  input: { userId: string; fecha: string; clientPointIds: string[] },
) {
  await updateRoutePlan(schemaName, planId, input)
  revalidatePath("/tracking/planes")
  revalidatePath(`/tracking/planes/${planId}`)
}
