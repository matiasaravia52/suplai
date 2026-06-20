import { withTenantSchema } from "@suplai/core"
import type {
  Visit,
  RoutePoint,
  FraudAlert,
  FieldEmployee,
  EmployeeStatus,
  CheckinInput,
  VisitFilters,
  AlertFilters,
  Zona,
  ZonaDetail,
  UnknownPoint,
  CreateUnknownPointInput,
  VisitWithPoint,
  ResultadoVisita,
} from "@suplai/types"
import { updateClientPointCoords } from "@suplai/clients"
import * as XLSX from "xlsx"

function haversineMetros(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getActiveVisit(
  schemaName: string,
  userId: string,
): Promise<Visit | null> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db<Visit[]>`
      select * from tracking__visits
      where user_id = ${userId}
        and checkout_at is null
      limit 1
    `
    return rows[0] ?? null
  })
}

export async function checkin(
  schemaName: string,
  input: CheckinInput,
): Promise<{ visit: Visit; fraudAlert?: FraudAlert }> {
  return withTenantSchema(schemaName, async (db) => {
    // Verificar que no tiene visita activa
    const active = await db`
      select id from tracking__visits
      where user_id = ${input.userId}
        and checkout_at is null
      limit 1
    `
    if (active.length > 0) {
      throw new Error("El empleado ya tiene una visita activa")
    }

    // Leer coordenadas del punto de venta
    const pointRows = await db`
      select id, lat, lng from client_points
      where id = ${input.clientPointId}
        and activo = true
      limit 1
    `
    if (pointRows.length === 0) throw new Error("Punto de venta no encontrado")
    const point = pointRows[0] as { id: string; lat: number | null; lng: number | null }

    // Si el punto no tiene coords, guardar las del check-in
    if (point.lat == null || point.lng == null) {
      await updateClientPointCoords(schemaName, input.clientPointId, input.lat, input.lng)
    }

    // Crear la visita
    const visitRows = await db<Visit[]>`
      insert into tracking__visits
        (client_point_id, user_id, checkin_lat, checkin_lng)
      values
        (${input.clientPointId}, ${input.userId}, ${input.lat}, ${input.lng})
      returning *
    `
    const visit = visitRows[0]
    if (!visit) throw new Error("Error al crear la visita")

    // Upsert employee_status
    await db`
      insert into tracking__employee_status (user_id, current_lat, current_lng, last_seen_at, visit_id)
      values (${input.userId}, ${input.lat}, ${input.lng}, now(), ${visit.id})
      on conflict (user_id) do update set
        current_lat  = excluded.current_lat,
        current_lng  = excluded.current_lng,
        last_seen_at = excluded.last_seen_at,
        visit_id     = excluded.visit_id
    `

    // Fraud check — solo si el punto tenía coordenadas previas
    if (point.lat != null && point.lng != null) {
      const distancia = Math.round(haversineMetros(input.lat, input.lng, point.lat, point.lng))
      if (distancia > 150) {
        const alertRows = await db<FraudAlert[]>`
          insert into tracking__fraud_alerts
            (visit_id, user_id, client_point_id, distancia_metros)
          values
            (${visit.id}, ${input.userId}, ${input.clientPointId}, ${distancia})
          returning *
        `
        const fraudAlert = alertRows[0]
        if (fraudAlert) return { visit, fraudAlert }
      }
    }

    return { visit }
  })
}

export async function checkout(
  schemaName: string,
  visitId: string,
  userId: string,
  lat: number,
  lng: number,
  resultado?: "venta" | "no_venta",
): Promise<Visit> {
  return withTenantSchema(schemaName, async (db) => {
    const visitRows = await db<Visit[]>`
      update tracking__visits
      set checkout_at  = now(),
          checkout_lat = ${lat},
          checkout_lng = ${lng},
          resultado    = ${resultado ?? null}
      where id = ${visitId}
        and user_id = ${userId}
        and checkout_at is null
      returning *
    `
    if (visitRows.length === 0) throw new Error("Visita no encontrada o ya cerrada")
    const visit = visitRows[0]
    if (!visit) throw new Error("Error al cerrar la visita")

    await db`
      update tracking__employee_status
      set visit_id     = null,
          current_lat  = ${lat},
          current_lng  = ${lng},
          last_seen_at = now()
      where user_id = ${userId}
    `

    return visit
  })
}

export async function flushRoutePoints(
  schemaName: string,
  points: Omit<RoutePoint, "id" | "created_at">[],
  userId: string,
  visitId?: string,
): Promise<void> {
  if (points.length === 0) return

  return withTenantSchema(schemaName, async (db) => {
    // INSERT batch
    await db`
      insert into tracking__route_points ${db(
        points.map((p) => ({
          user_id:         userId,
          visit_id:        visitId ?? null,
          lat:             p.lat,
          lng:             p.lng,
          speed_kmh:       p.speed_kmh ?? null,
          heading:         p.heading ?? null,
          accuracy_metros: p.accuracy_metros != null ? Math.round(p.accuracy_metros) : null,
          recorded_at:     p.recorded_at,
        })),
      )}
    `

    // Upsert posición actual con el punto más reciente
    const last = points[points.length - 1]!
    await db`
      insert into tracking__employee_status (user_id, current_lat, current_lng, last_seen_at)
      values (${userId}, ${last.lat}, ${last.lng}, now())
      on conflict (user_id) do update set
        current_lat  = excluded.current_lat,
        current_lng  = excluded.current_lng,
        last_seen_at = excluded.last_seen_at
    `
  })
}

export async function listFieldEmployees(
  schemaName: string,
): Promise<FieldEmployee[]> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db`
      select
        u.id,
        u.nombre,
        u.email,
        array_agg(r.nombre) as roles,
        es.current_lat,
        es.current_lng,
        es.last_seen_at,
        es.visit_id
      from users u
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id
      left join tracking__employee_status es on es.user_id = u.id
      where r.nombre in ('repartidor', 'pre_vendedor')
        and u.activo = true
      group by u.id, u.nombre, u.email, es.current_lat, es.current_lng, es.last_seen_at, es.visit_id
    `
    return rows.map((row): FieldEmployee => {
      const status: EmployeeStatus | undefined = row.current_lat != null
        ? {
            user_id:    row.id as string,
            current_lat: row.current_lat as number,
            current_lng: row.current_lng as number,
            ...(row.last_seen_at != null ? { last_seen_at: row.last_seen_at as string } : {}),
            ...(row.visit_id     != null ? { visit_id:     row.visit_id     as string } : {}),
          }
        : undefined
      return {
        id:     row.id as string,
        nombre: row.nombre as string,
        email:  row.email as string,
        roles:  row.roles as string[],
        ...(status !== undefined ? { status } : {}),
      }
    })
  })
}

export async function getRoutePoints(
  schemaName: string,
  userId: string,
  visitId?: string,
): Promise<RoutePoint[]> {
  return withTenantSchema(schemaName, (db) => {
    if (visitId) {
      return db<RoutePoint[]>`
        select id, user_id, visit_id, lat, lng, speed_kmh, heading, accuracy_metros, recorded_at, created_at
        from tracking__route_points
        where user_id = ${userId} and visit_id = ${visitId}
        order by recorded_at asc
        limit 2000
      `
    }
    // Sin visitId activo: todos los puntos del día para ver el recorrido completo
    return db<RoutePoint[]>`
      select rp.id, rp.user_id, rp.visit_id, rp.lat, rp.lng, rp.speed_kmh, rp.heading, rp.accuracy_metros, rp.recorded_at, rp.created_at
      from tracking__route_points rp
      where rp.user_id = ${userId}
        and rp.recorded_at >= current_date
      order by rp.recorded_at asc
      limit 2000
    `
  })
}

export async function listVisits(
  schemaName: string,
  filters: VisitFilters = {},
): Promise<(Visit & { user_nombre: string; client_point_nombre: string; tiene_alerta: boolean })[]> {
  return withTenantSchema(schemaName, async (db) => {
    return db`
      select
        v.*,
        u.nombre as user_nombre,
        cp.nombre as client_point_nombre,
        exists(
          select 1 from tracking__fraud_alerts fa where fa.visit_id = v.id
        ) as tiene_alerta
      from tracking__visits v
      join users u on u.id = v.user_id
      join client_points cp on cp.id = v.client_point_id
      where true
        ${filters.userId       ? db`and v.user_id = ${filters.userId}`             : db``}
        ${filters.clientPointId ? db`and v.client_point_id = ${filters.clientPointId}` : db``}
        ${filters.fechaDesde   ? db`and v.checkin_at >= ${filters.fechaDesde}`     : db``}
        ${filters.fechaHasta   ? db`and v.checkin_at <= ${filters.fechaHasta}`     : db``}
      order by v.checkin_at desc
      limit 500
    ` as any
  })
}

export async function listFraudAlerts(
  schemaName: string,
  filters: AlertFilters = {},
): Promise<(FraudAlert & { user_nombre: string; client_point_nombre: string })[]> {
  return withTenantSchema(schemaName, async (db) => {
    return db`
      select
        fa.*,
        u.nombre  as user_nombre,
        cp.nombre as client_point_nombre
      from tracking__fraud_alerts fa
      join users u  on u.id  = fa.user_id
      join client_points cp on cp.id = fa.client_point_id
      where true
        ${filters.userId     ? db`and fa.user_id = ${filters.userId}`         : db``}
        ${filters.fechaDesde ? db`and fa.created_at >= ${filters.fechaDesde}` : db``}
        ${filters.fechaHasta ? db`and fa.created_at <= ${filters.fechaHasta}` : db``}
      order by fa.created_at desc
      limit 500
    ` as any
  })
}

// ─── Zonas ───────────────────────────────────────────────────────────────────

export async function createZona(
  schemaName: string,
  input: { userId: string; nombre?: string; createdBy: string; clientPointIds: string[] },
): Promise<Zona> {
  return withTenantSchema(schemaName, async (db) => {
    const [zona] = await db<Zona[]>`
      insert into tracking__zonas (user_id, nombre, created_by)
      values (${input.userId}, ${input.nombre ?? ''}, ${input.createdBy})
      on conflict (user_id) do update set nombre = excluded.nombre
      returning *
    `
    await db`delete from tracking__zona_stops where zona_id = ${zona!.id}`
    if (input.clientPointIds.length > 0) {
      await db`
        insert into tracking__zona_stops (zona_id, client_point_id, orden)
        select ${zona!.id}, unnest(${input.clientPointIds}::uuid[]), generate_series(1, ${input.clientPointIds.length})
      `
    }
    return zona!
  })
}

export async function listZonas(
  schemaName: string,
  filters: { userId?: string } = {},
): Promise<(Zona & { user_nombre: string; total_stops: number })[]> {
  return withTenantSchema(schemaName, (db) => db`
    select
      z.id, z.user_id, z.nombre, z.created_by, z.created_at,
      u.nombre as user_nombre,
      count(s.id)::int as total_stops
    from tracking__zonas z
    join users u on u.id = z.user_id
    left join tracking__zona_stops s on s.zona_id = z.id
    where true
      ${filters.userId ? db`and z.user_id = ${filters.userId}` : db``}
    group by z.id, u.nombre
    order by u.nombre
  ` as any)
}

export async function getZonaDetail(
  schemaName: string,
  zonaId: string,
): Promise<ZonaDetail | null> {
  return withTenantSchema(schemaName, async (db) => {
    const [zona] = await db<(Zona & { user_nombre: string })[]>`
      select z.id, z.user_id, z.nombre, z.created_by, z.created_at,
             u.nombre as user_nombre
      from tracking__zonas z
      join users u on u.id = z.user_id
      where z.id = ${zonaId}
    `
    if (!zona) return null
    const stops = await db`
      select s.id, s.zona_id, s.client_point_id, s.orden, s.created_at,
             cp.nombre as client_point_nombre,
             cp.lat    as client_point_lat,
             cp.lng    as client_point_lng,
             c.nombre  as client_nombre,
             false     as visitado
      from tracking__zona_stops s
      join client_points cp on cp.id = s.client_point_id
      join clients c on c.id = cp.client_id
      where s.zona_id = ${zonaId}
      order by s.orden
    `
    return { ...zona, stops: stops as any }
  })
}

export async function getZonaDetailForDate(
  schemaName: string,
  zonaId: string,
  fecha: string,
): Promise<ZonaDetail | null> {
  return withTenantSchema(schemaName, async (db) => {
    const [zona] = await db<(Zona & { user_nombre: string })[]>`
      select z.id, z.user_id, z.nombre, z.created_by, z.created_at,
             u.nombre as user_nombre
      from tracking__zonas z
      join users u on u.id = z.user_id
      where z.id = ${zonaId}
    `
    if (!zona) return null
    const stops = await db`
      select s.id, s.zona_id, s.client_point_id, s.orden, s.created_at,
             cp.nombre as client_point_nombre,
             cp.lat    as client_point_lat,
             cp.lng    as client_point_lng,
             c.nombre  as client_nombre,
             (v.id is not null)  as visitado,
             v.id                as visit_id,
             v.checkin_at,
             v.checkout_at
      from tracking__zona_stops s
      join client_points cp on cp.id = s.client_point_id
      join clients c on c.id = cp.client_id
      left join tracking__visits v
        on  v.client_point_id = s.client_point_id
        and v.user_id         = ${zona.user_id}
        and v.checkin_at >= ${fecha}::date
        and v.checkin_at <  ${fecha}::date + interval '1 day'
      where s.zona_id = ${zonaId}
      order by s.orden
    `
    return { ...zona, stops: stops as any }
  })
}

export async function getZonaForEmployee(
  schemaName: string,
  userId: string,
): Promise<ZonaDetail | null> {
  return withTenantSchema(schemaName, async (db) => {
    const [row] = await db<{ id: string }[]>`
      select id from tracking__zonas where user_id = ${userId} limit 1
    `
    if (!row) return null
    return getZonaDetail(schemaName, row.id)
  })
}

export async function getMyZona(
  schemaName: string,
  userId: string,
  fecha?: string,
): Promise<ZonaDetail | null> {
  const targetDate = fecha ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  return withTenantSchema(schemaName, async (db) => {
    const [row] = await db<{ id: string }[]>`
      select id from tracking__zonas where user_id = ${userId} limit 1
    `
    if (!row) return null
    return getZonaDetailForDate(schemaName, row.id, targetDate)
  })
}

export async function deleteZona(schemaName: string, zonaId: string): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    delete from tracking__zonas where id = ${zonaId}
  `)
}

export async function updateZona(
  schemaName: string,
  zonaId: string,
  input: { userId: string; nombre?: string; clientPointIds: string[] },
): Promise<void> {
  await withTenantSchema(schemaName, async (db) => {
    await db`
      update tracking__zonas
      set user_id = ${input.userId}, nombre = ${input.nombre ?? ''}
      where id = ${zonaId}
    `
    await db`delete from tracking__zona_stops where zona_id = ${zonaId}`
    if (input.clientPointIds.length > 0) {
      await db`
        insert into tracking__zona_stops (zona_id, client_point_id, orden)
        select ${zonaId}, unnest(${input.clientPointIds}::uuid[]), generate_series(1, ${input.clientPointIds.length})
      `
    }
  })
}

export async function getEmployeesWithZona(
  schemaName: string,
): Promise<FieldEmployee[]> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db`
      select
        u.id,
        u.nombre,
        u.email,
        array_agg(distinct r.nombre) as roles,
        es.current_lat,
        es.current_lng,
        es.last_seen_at,
        es.visit_id
      from tracking__zonas z
      join users u on u.id = z.user_id
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id
      left join tracking__employee_status es on es.user_id = u.id
      group by u.id, u.nombre, u.email, es.current_lat, es.current_lng, es.last_seen_at, es.visit_id
      order by u.nombre
    `
    return rows.map((row): FieldEmployee => {
      const status: EmployeeStatus | undefined = row.current_lat != null
        ? {
            user_id:      row.id as string,
            current_lat:  row.current_lat as number,
            current_lng:  row.current_lng as number,
            ...(row.last_seen_at != null ? { last_seen_at: row.last_seen_at as string } : {}),
            ...(row.visit_id != null     ? { visit_id:     row.visit_id     as string } : {}),
          }
        : undefined
      return {
        id:     row.id as string,
        nombre: row.nombre as string,
        email:  row.email as string,
        roles:  row.roles as string[],
        ...(status !== undefined ? { status } : {}),
      }
    })
  })
}

export async function getRoutePointsForDate(
  schemaName: string,
  userId: string,
  fecha: string,
): Promise<RoutePoint[]> {
  return withTenantSchema(schemaName, (db) => db<RoutePoint[]>`
    select id, user_id, visit_id, lat, lng, speed_kmh, heading, accuracy_metros, recorded_at, created_at
    from tracking__route_points
    where user_id = ${userId}
      and recorded_at >= ${fecha}::date
      and recorded_at <  ${fecha}::date + interval '1 day'
    order by recorded_at asc
    limit 2000
  `)
}

export async function getMyVisits(
  schemaName: string,
  userId: string,
  limitDays = 7,
): Promise<VisitWithPoint[]> {
  return withTenantSchema(schemaName, async (db) => {
    return db`
      select
        v.*,
        cp.nombre as client_point_nombre
      from tracking__visits v
      join client_points cp on cp.id = v.client_point_id
      where v.user_id = ${userId}
        and v.checkin_at >= current_date - ${limitDays}::int
        and v.checkout_at is not null
      order by v.checkin_at desc
      limit 50
    ` as any
  })
}

export async function getVisitasPendientesResultado(
  schemaName: string,
  userId: string,
): Promise<VisitWithPoint[]> {
  return withTenantSchema(schemaName, async (db) => {
    return db`
      select
        v.*,
        cp.nombre as client_point_nombre
      from tracking__visits v
      join client_points cp on cp.id = v.client_point_id
      where v.user_id = ${userId}
        and v.checkout_at is not null
        and v.resultado is null
      order by v.checkout_at desc
      limit 10
    ` as any
  })
}

export async function setResultado(
  schemaName: string,
  visitId: string,
  userId: string,
  resultado: ResultadoVisita,
): Promise<Visit> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db<Visit[]>`
      update tracking__visits
      set resultado = ${resultado}
      where id = ${visitId}
        and user_id = ${userId}
        and checkout_at is not null
      returning *
    `
    if (rows.length === 0) throw new Error("Visita no encontrada o sin checkout")
    const visit = rows[0]
    if (!visit) throw new Error("Error al actualizar resultado")
    return visit
  })
}

export async function setResultadoSupervisor(
  schemaName: string,
  visitId: string,
  resultado: ResultadoVisita,
): Promise<Visit> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db<Visit[]>`
      update tracking__visits
      set resultado = ${resultado}
      where id = ${visitId}
        and checkout_at is not null
      returning *
    `
    if (rows.length === 0) throw new Error("Visita no encontrada o sin checkout")
    const visit = rows[0]
    if (!visit) throw new Error("Error al actualizar resultado")
    return visit
  })
}

export async function createUnknownPoint(
  schemaName: string,
  userId: string,
  input: CreateUnknownPointInput,
): Promise<UnknownPoint> {
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db`
      insert into tracking__unknown_points (user_id, nombre, descripcion, lat, lng)
      values (${userId}, ${input.nombre}, ${input.descripcion ?? null}, ${input.lat}, ${input.lng})
      returning *
    `
    if (rows.length === 0) throw new Error("Error al crear el punto")
    return rows[0] as UnknownPoint
  })
}

export async function exportVisitsExcel(
  schemaName: string,
  filters: VisitFilters = {},
): Promise<Buffer> {
  const visits = await listVisits(schemaName, filters)

  const rows = visits.map((v: any) => ({
    Empleado:         v.user_nombre,
    "Punto de venta": v.client_point_nombre,
    Llegada:          new Date(v.checkin_at).toLocaleString("es-AR"),
    Salida:           v.checkout_at ? new Date(v.checkout_at).toLocaleString("es-AR") : "—",
    "Duración (min)": v.checkout_at
      ? Math.round((new Date(v.checkout_at).getTime() - new Date(v.checkin_at).getTime()) / 60000)
      : "—",
    Alerta:           v.tiene_alerta ? "Sí" : "No",
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Visitas")
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}
