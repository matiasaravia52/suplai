import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { checkout } from "@suplai/tracking"

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { visitId?: string; lat?: number; lng?: number }
  if (!body.visitId || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: "visitId, lat y lng son requeridos" }, { status: 400 })
  }

  try {
    const visit = await checkout(claims.schema_name, body.visitId, claims.app_user_id, body.lat, body.lng)
    return NextResponse.json({ visit })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
