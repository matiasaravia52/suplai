import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { getMyPlansForDate } from "@suplai/tracking/service"

export async function GET(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const fecha = url.searchParams.get("fecha") ?? undefined

  try {
    const plans = await getMyPlansForDate(claims.schema_name, claims.app_user_id, fecha)
    return NextResponse.json({ plans })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
