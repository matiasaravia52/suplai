"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import {
  getEmpleadosConZona,
  getZonaEmpleado,
  getZonaConFecha,
  getRouteForDate,
} from "@/actions/tracking"
import { createClient } from "@/lib/supabase/client"
import type { FieldEmployee, RoutePoint, ZonaDetail, EmployeeStatus } from "@suplai/types"

const TrackingMap = dynamic(
  () => import("@/components/tracking/TrackingMap").then((m) => m.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />,
  }
)

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

export function TrackingPanel({ schemaName, mapboxToken, todayAR }: Props): React.ReactElement {
  const [fecha, setFecha] = useState(todayAR)
  const [employees, setEmployees] = useState<FieldEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>()
  const [activeZona, setActiveZona] = useState<ZonaDetail | null>(null)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [loadingZona, setLoadingZona] = useState(false)
  const selectedEmployeeIdRef = useRef(selectedEmployeeId)
  const fechaRef = useRef(fecha)
  useEffect(() => { selectedEmployeeIdRef.current = selectedEmployeeId }, [selectedEmployeeId])
  useEffect(() => { fechaRef.current = fecha }, [fecha])

  // Cargar empleados con zona al montar (la lista no depende de la fecha)
  useEffect(() => {
    getEmpleadosConZona(schemaName)
      .then(setEmployees)
      .finally(() => setLoadingEmployees(false))
  }, [schemaName])

  // Cuando cambia la fecha y hay empleado seleccionado, recargar zona y recorrido
  useEffect(() => {
    if (!selectedEmployeeId) return
    loadZonaAndRoute(selectedEmployeeId, fecha)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  // Realtime: actualizar posición del empleado seleccionado y recargar ruta GPS
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`panel-employee-status-${schemaName}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: schemaName, table: "tracking__employee_status" },
        async (payload: { new: EmployeeStatus }) => {
          const status = payload.new
          // Actualizar posición en la lista de empleados
          setEmployees((prev) =>
            prev.map((e) => e.id === status.user_id ? { ...e, status } : e)
          )
          // Si es el empleado seleccionado, recargar ruta (en fecha de hoy)
          const empId = selectedEmployeeIdRef.current
          if (status.user_id === empId) {
            const pts = await getRouteForDate(schemaName, empId, fechaRef.current)
            setRoutePoints(pts)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName])

  async function loadZonaAndRoute(employeeId: string, targetFecha: string) {
    setActiveZona(null)
    setRoutePoints([])
    setLoadingZona(true)
    try {
      // Primero obtenemos la zona del empleado para sacar el zonaId
      const zonaBase = await getZonaEmpleado(schemaName, employeeId)
      const [zonaConFecha, points] = await Promise.all([
        zonaBase ? getZonaConFecha(schemaName, zonaBase.id, targetFecha) : Promise.resolve(null),
        getRouteForDate(schemaName, employeeId, targetFecha),
      ])
      setActiveZona(zonaConFecha)
      setRoutePoints(points)
    } finally {
      setLoadingZona(false)
    }
  }

  const handleSelectEmployee = useCallback((employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    loadZonaAndRoute(employeeId, fecha)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName, fecha])

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
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

        {/* Repartidores */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Repartidores
          </p>
          {loadingEmployees ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-xs text-gray-400">
              Ningún repartidor tiene zona asignada.
            </p>
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
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    emp.status?.visit_id   ? "bg-green-500" :
                    emp.status?.current_lat ? "bg-gray-400"  : "bg-gray-200"
                  }`} />
                  {emp.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingZona && (
          <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            Cargando recorrido del {todayLabel(fecha, todayAR)}…
          </div>
        )}
      </div>

      {/* Mapa — siempre montado */}
      <div className="flex-1 p-3 relative">
        <TrackingMap
          employees={employees}
          schemaName={schemaName}
          accessToken={mapboxToken}
          routePoints={routePoints}
          activeZona={activeZona}
          selectedUserId={selectedEmployeeId}
        />
        {!selectedEmployeeId && (
          <div className="absolute inset-3 bg-gray-50/90 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-sm font-medium">Seleccioná un repartidor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
