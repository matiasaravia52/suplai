"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { createClient } from "@/lib/supabase/client"
import type { FieldEmployee, EmployeeStatus, RoutePoint, RoutePlanDetail } from "@suplai/types"

const ROUTE_SOURCE = "employee-route"
const ROUTE_LAYER  = "employee-route-line"
const PLAN_SOURCE  = "plan-stops"
const PLAN_LAYER   = "plan-stops-line"

interface Props {
  employees: FieldEmployee[]
  schemaName: string
  accessToken: string
  routePoints?: RoutePoint[]
  activePlan?: RoutePlanDetail | null
  selectedUserId?: string
  onEmployeeSelect?: (userId: string) => void
}

export function TrackingMap({ employees, schemaName, accessToken, routePoints = [], activePlan, selectedUserId, onEmployeeSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const planMarkers = useRef<mapboxgl.Marker[]>([])
  const mapReady = useRef(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = accessToken

    const firstWithPos = employees.find((e) => e.status?.current_lat != null)
    const center: [number, number] = firstWithPos?.status
      ? [firstWithPos.status.current_lng!, firstWithPos.status.current_lat!]
      : [-58.3816, -34.6037]

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 13,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    map.current.on("load", () => {
      // Fuente para recorrido GPS real
      map.current!.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      })
      map.current!.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 3, "line-opacity": 0.8 },
      })
      // Fuente para línea del plan (punteada)
      map.current!.addSource(PLAN_SOURCE, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      })
      map.current!.addLayer({
        id: PLAN_LAYER,
        type: "line",
        source: PLAN_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#9ca3af", "line-width": 2, "line-dasharray": [2, 3], "line-opacity": 0.7 },
      })
      mapReady.current = true
    })

    return () => {
      mapReady.current = false
      map.current?.remove()
      map.current = null
      markers.current.clear()
      planMarkers.current = []
    }
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Markers de empleados
  useEffect(() => {
    if (!map.current) return
    for (const employee of employees) {
      const { status } = employee
      if (!status?.current_lat || !status?.current_lng) continue

      const isSelected = employee.id === selectedUserId
      const existing = markers.current.get(employee.id)

      if (existing) {
        existing.setLngLat([status.current_lng, status.current_lat])
        const el = existing.getElement()
        el.style.background = status.visit_id ? "#16a34a" : "#6b7280"
        el.style.border = isSelected ? "3px solid #2563eb" : "3px solid white"
      } else {
        const el = document.createElement("div")
        el.style.cssText = `
          width: 36px; height: 36px; border-radius: 50%;
          background: ${status.visit_id ? "#16a34a" : "#6b7280"};
          border: ${isSelected ? "3px solid #2563eb" : "3px solid white"};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 16px;
        `
        el.innerHTML = "👤"
        el.addEventListener("click", () => onEmployeeSelect?.(employee.id))

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([status.current_lng, status.current_lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<p class="font-semibold text-sm">${employee.nombre}</p>
               <p class="text-xs text-gray-500">${status.visit_id ? "En visita" : "En tránsito"}</p>`
            )
          )
          .addTo(map.current!)
        markers.current.set(employee.id, marker)
      }
    }
  }, [employees, selectedUserId, onEmployeeSelect])

  // Recorrido GPS real
  useEffect(() => {
    console.log("[TrackingMap] routePoints update:", routePoints.length, "mapReady:", mapReady.current)
    const draw = () => {
      const m = map.current
      if (!m || !mapReady.current) return
      const source = m.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined
      if (!source) return

      if (routePoints.length < 2) {
        source.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} })
        return
      }
      const coordinates = routePoints.map((p) => [p.lng, p.lat] as [number, number])
      source.setData({ type: "Feature", geometry: { type: "LineString", coordinates }, properties: {} })
    }

    if (mapReady.current) draw()
    else map.current?.once("load", draw)
  }, [routePoints])

  // Paradas del plan
  useEffect(() => {
    const draw = () => {
      const m = map.current
      if (!m || !mapReady.current) return

      // Limpiar markers anteriores
      planMarkers.current.forEach((pm) => pm.remove())
      planMarkers.current = []

      // Limpiar línea del plan
      const planSource = m.getSource(PLAN_SOURCE) as mapboxgl.GeoJSONSource | undefined
      if (!planSource) return

      if (!activePlan || activePlan.stops.length === 0) {
        planSource.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} })
        return
      }

      const stopsWithCoords = activePlan.stops.filter(
        (s) => s.client_point_lat != null && s.client_point_lng != null
      )

      // Línea punteada entre paradas
      if (stopsWithCoords.length >= 2) {
        const coords = stopsWithCoords.map((s) => [s.client_point_lng!, s.client_point_lat!] as [number, number])
        planSource.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} })
      } else {
        planSource.setData({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} })
      }

      // Pines numerados para cada parada
      const bounds = new mapboxgl.LngLatBounds()
      let hasBounds = false

      activePlan.stops.forEach((stop, i) => {
        const visited = stop.visitado
        const hasCoords = stop.client_point_lat != null && stop.client_point_lng != null

        const el = document.createElement("div")
        el.style.cssText = `
          width: 28px; height: 28px; border-radius: 50%;
          background: ${visited ? "#16a34a" : "#ffffff"};
          border: 2px solid ${visited ? "#16a34a" : "#6b7280"};
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: ${visited ? "#ffffff" : "#374151"};
          cursor: default;
        `
        el.innerHTML = visited ? "✓" : String(i + 1)
        el.title = `${i + 1}. ${stop.client_point_nombre}${stop.client_point_lat == null ? " (sin coords)" : ""}`

        if (hasCoords) {
          const lng = stop.client_point_lng!
          const lat = stop.client_point_lat!
          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 16 }).setHTML(
                `<p class="font-semibold text-sm">${i + 1}. ${stop.client_point_nombre}</p>
                 <p class="text-xs text-gray-500">${stop.client_nombre}</p>
                 <p class="text-xs mt-1 ${visited ? "text-green-600" : "text-gray-400"}">${visited ? "✓ Visitado" : "Pendiente"}</p>`
              )
            )
            .addTo(m)
          planMarkers.current.push(marker)
          bounds.extend([lng, lat])
          hasBounds = true
        }
      })

      // Incluir recorrido GPS en el fit si hay
      if (routePoints.length > 0) {
        routePoints.forEach((p) => { bounds.extend([p.lng, p.lat]); hasBounds = true })
      }

      if (hasBounds) {
        m.fitBounds(bounds, { padding: 60, maxZoom: 15 })
      }
    }

    if (mapReady.current) draw()
    else map.current?.once("load", draw)
  }, [activePlan, routePoints])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`tracking-${schemaName}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: schemaName, table: "tracking__employee_status" },
        (payload: { new: EmployeeStatus }) => {
          const status = payload.new
          if (!status.current_lat || !status.current_lng) return
          const marker = markers.current.get(status.user_id)
          if (marker) {
            marker.setLngLat([status.current_lng, status.current_lat])
            const el = marker.getElement()
            el.style.background = status.visit_id ? "#16a34a" : "#6b7280"
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [schemaName])

  return <div ref={mapContainer} className="w-full h-full" />
}
