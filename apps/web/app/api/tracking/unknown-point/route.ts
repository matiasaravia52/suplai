import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { createUnknownPoint } from "@suplai/tracking/service"

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { nombre?: string; descripcion?: string; lat?: number; lng?: number }
  if (!body.nombre || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: "nombre, lat y lng son requeridos" }, { status: 400 })
  }

  // Verificar permiso
  const roles = claims.roles ?? []
  const allowedRoles = ["repartidor", "pre_vendedor"]
  const hasPermission = roles.some((r) => allowedRoles.includes(r))
  if (!hasPermission) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 })
  }

  try {
    const point = await createUnknownPoint(claims.schema_name, claims.app_user_id, {
      nombre: body.nombre,
      descripcion: body.descripcion,
      lat: body.lat,
      lng: body.lng,
    })
    return NextResponse.json({ point })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
