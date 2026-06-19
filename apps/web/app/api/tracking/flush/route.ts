import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { flushRoutePoints } from "@suplai/tracking"
import type { RoutePoint } from "@suplai/types"

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { points?: Omit<RoutePoint, "id" | "created_at">[]; visitId?: string }
  if (!body.points || !Array.isArray(body.points) || body.points.length === 0) {
    return NextResponse.json({ error: "points es requerido y no puede estar vacío" }, { status: 400 })
  }

  try {
    await flushRoutePoints(claims.schema_name, body.points, claims.app_user_id, body.visitId)
    return NextResponse.json({ ok: true, count: body.points.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
