"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { EmployeeList } from "@/components/tracking/EmployeeList"
import { getEmployeeRoute, getEmployeeActivePlan } from "@/actions/tracking"
import type { FieldEmployee, RoutePoint, RoutePlanDetail } from "@suplai/types"

const TrackingMap = dynamic(
  () => import("@/components/tracking/TrackingMap").then((m) => m.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />,
  }
)

interface Props {
  employees: FieldEmployee[]
  schemaName: string
  mapboxToken: string
}

export function TrackingPanel({ employees, schemaName, mapboxToken }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [activePlan, setActivePlan] = useState<RoutePlanDetail | null>(null)

  const handleSelect = useCallback(async (userId: string) => {
    setSelectedId(userId)
    setRoutePoints([])
    setActivePlan(null)

    const [points, plan] = await Promise.all([
      getEmployeeRoute(schemaName, userId), // siempre todos los puntos del día
      getEmployeeActivePlan(schemaName, userId),
    ])
    setRoutePoints(points)
    setActivePlan(plan)
  }, [schemaName, employees])

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
        <EmployeeList
          employees={employees}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>
      <div className="flex-1 p-3">
        <TrackingMap
          employees={employees}
          schemaName={schemaName}
          accessToken={mapboxToken}
          routePoints={routePoints}
          activePlan={activePlan}
          selectedUserId={selectedId}
          onEmployeeSelect={handleSelect}
        />
      </div>
    </div>
  )
}
