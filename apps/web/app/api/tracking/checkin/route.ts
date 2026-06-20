import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { checkin } from "@suplai/tracking/service"

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { clientPointId?: string; lat?: number; lng?: number }
  if (!body.clientPointId || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: "clientPointId, lat y lng son requeridos" }, { status: 400 })
  }

  console.log("[checkin] schema:", claims.schema_name, "userId:", claims.app_user_id, "clientPointId:", body.clientPointId)

  try {
    const result = await checkin(claims.schema_name, {
      clientPointId: body.clientPointId,
      userId:        claims.app_user_id,
      lat:           body.lat,
      lng:           body.lng,
    })
    console.log("[checkin] result:", JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[checkin] error:", message)
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
