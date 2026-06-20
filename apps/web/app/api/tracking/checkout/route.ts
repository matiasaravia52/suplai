import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { checkout } from "@suplai/tracking/service"

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { visitId?: string; lat?: number; lng?: number; resultado?: string }
  if (!body.visitId) {
    return NextResponse.json({ error: "visitId es requerido" }, { status: 400 })
  }

  const resultado = body.resultado === "venta" || body.resultado === "no_venta" ? body.resultado : undefined

  try {
    const visit = await checkout(claims.schema_name, body.visitId, claims.app_user_id, body.lat ?? 0, body.lng ?? 0, resultado)
    return NextResponse.json({ visit })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
