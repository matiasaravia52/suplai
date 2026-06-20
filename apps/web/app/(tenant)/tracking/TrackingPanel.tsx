"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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

const REFRESH_INTERVAL = 15_000

export function TrackingPanel({ employees, schemaName, mapboxToken }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [activePlan, setActivePlan] = useState<RoutePlanDetail | null>(null)
  const selectedIdRef = useRef<string | undefined>()
  selectedIdRef.current = selectedId

  const refreshSelected = useCallback(async (userId: string) => {
    const [points, plan] = await Promise.all([
      getEmployeeRoute(schemaName, userId),
      getEmployeeActivePlan(schemaName, userId),
    ])
    setRoutePoints(points)
    setActivePlan(plan)
  }, [schemaName])

  const handleSelect = useCallback(async (userId: string) => {
    setSelectedId(userId)
    setRoutePoints([])
    setActivePlan(null)
    await refreshSelected(userId)
  }, [refreshSelected])

  useEffect(() => {
    const id = setInterval(async () => {
      router.refresh()
      if (selectedIdRef.current) {
        await refreshSelected(selectedIdRef.current)
      }
    }, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [router, refreshSelected])

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
