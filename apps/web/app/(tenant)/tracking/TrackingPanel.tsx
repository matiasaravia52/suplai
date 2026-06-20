"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  getEmployeesOnDate,
  getPlansForEmployee,
  getPlanDetail,
  getRouteForDate,
} from "@/actions/tracking"
import type { FieldEmployee, RoutePoint, RoutePlanDetail } from "@suplai/types"

const TrackingMap = dynamic(
  () => import("@/components/tracking/TrackingMap").then((m) => m.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />,
  }
)

interface PlanSummary {
  id: string
  estado: string
  total_stops: number
  stops_visitados: number
  created_at: string
}

interface Props {
  schemaName: string
  mapboxToken: string
  todayAR: string
}

function todayLabel(fecha: string, todayAR: string) {
  if (fecha === todayAR) return "Hoy"
  const [y, m, d] = fecha.split("-")
  return `${d}/${m}/${y}`
}

function estadoBadge(estado: string, visitados: number, total: number) {
  const pct = total > 0 ? Math.round((visitados / total) * 100) : 0
  if (estado === "completada") return { label: "Completada", color: "bg-green-100 text-green-700" }
  if (estado === "activa") return { label: `En curso · ${pct}%`, color: "bg-blue-100 text-blue-700" }
  return { label: "Borrador", color: "bg-gray-100 text-gray-500" }
}

export function TrackingPanel({ schemaName, mapboxToken, todayAR }: Props): React.ReactElement {
  const [fecha, setFecha] = useState(todayAR)
  const [employees, setEmployees] = useState<FieldEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>()
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>()
  const [activePlan, setActivePlan] = useState<RoutePlanDetail | null>(null)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Cargar empleados cuando cambia la fecha
  useEffect(() => {
    setLoadingEmployees(true)
    setSelectedEmployeeId(undefined)
    setPlans([])
    setSelectedPlanId(undefined)
    setActivePlan(null)
    setRoutePoints([])
    getEmployeesOnDate(schemaName, fecha)
      .then(setEmployees)
      .finally(() => setLoadingEmployees(false))
  }, [schemaName, fecha])

  // Cargar planes cuando cambia el empleado
  const handleSelectEmployee = useCallback(async (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setSelectedPlanId(undefined)
    setActivePlan(null)
    setRoutePoints([])
    setLoadingPlans(true)
    try {
      const result = await getPlansForEmployee(schemaName, employeeId, fecha)
      setPlans(result as PlanSummary[])
      // Si solo hay un plan, seleccionarlo automáticamente
      if (result.length === 1 && result[0]) {
        handleSelectPlan(result[0].id, employeeId)
      }
    } finally {
      setLoadingPlans(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName, fecha])

  // Cargar detalle del plan y recorrido GPS
  const handleSelectPlan = useCallback(async (planId: string, employeeId?: string) => {
    const userId = employeeId ?? selectedEmployeeId
    if (!userId) return
    setSelectedPlanId(planId)
    setActivePlan(null)
    setRoutePoints([])
    setLoadingPlan(true)
    try {
      const [detail, points] = await Promise.all([
        getPlanDetail(schemaName, planId),
        getRouteForDate(schemaName, userId, fecha, planId),
      ])
      console.log("[Tracking] plan detail:", detail?.id, "stops:", detail?.stops?.length)
      console.log("[Tracking] route points:", points?.length, "userId:", userId, "fecha:", fecha)
      setActivePlan(detail)
      setRoutePoints(points)
    } catch (err) {
      console.error("[Tracking] error cargando plan:", err)
    } finally {
      setLoadingPlan(false)
    }
  }, [schemaName, fecha, selectedEmployeeId])

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Date picker */}
        <div className="p-3 border-b border-gray-100">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Empleados */}
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Empleados con actividad
            </p>
            {loadingEmployees ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : employees.length === 0 ? (
              <p className="text-xs text-gray-400">Sin actividad el {todayLabel(fecha, todayAR)}</p>
            ) : (
              <div className="space-y-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedEmployeeId === emp.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        emp.status?.visit_id ? "bg-green-500" : emp.status?.current_lat ? "bg-gray-400" : "bg-gray-200"
                      }`}
                    />
                    {emp.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Planes del empleado */}
          {selectedEmployeeId && (
            <div className="p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {selectedEmployee?.nombre} · {todayLabel(fecha, todayAR)}
              </p>
              {loadingPlans ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : plans.length === 0 ? (
                <p className="text-xs text-gray-400">Sin hojas de ruta</p>
              ) : (
                <div className="space-y-1">
                  {plans.map((plan, i) => {
                    const badge = estadoBadge(plan.estado, plan.stops_visitados, plan.total_stops)
                    const isSelected = selectedPlanId === plan.id
                    return (
                      <button
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-colors border ${
                          isSelected
                            ? "bg-blue-50 border-blue-200"
                            : "hover:bg-gray-50 border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            Hoja {i + 1}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {plan.stops_visitados}/{plan.total_stops} paradas
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Estado del plan cargando */}
        {loadingPlan && (
          <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            Cargando recorrido…
          </div>
        )}
      </div>

      {/* Mapa — siempre montado para que Mapbox inicialice antes de que lleguen los datos */}
      <div className="flex-1 p-3 relative">
        <TrackingMap
          employees={selectedEmployee ? [selectedEmployee] : []}
          schemaName={schemaName}
          accessToken={mapboxToken}
          routePoints={routePoints}
          activePlan={activePlan}
          selectedUserId={selectedEmployeeId}
        />
        {!selectedPlanId && (
          <div className="absolute inset-3 bg-gray-50/90 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-sm font-medium">
                {!selectedEmployeeId ? "Seleccioná un empleado" : "Seleccioná una hoja de ruta"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
