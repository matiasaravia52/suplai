import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { getMyVisits } from "@suplai/tracking/service"

export async function GET(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const visits = await getMyVisits(claims.schema_name, claims.app_user_id)
    return NextResponse.json({ visits })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
