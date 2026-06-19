import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { getActiveVisit } from "@suplai/tracking/service"

export async function GET(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const visit = await getActiveVisit(claims.schema_name, claims.app_user_id)
    if (!visit) {
      return NextResponse.json({ visit: null })
    }

    const nombre = await getClientPointNombre(claims.schema_name, visit.client_point_id)
    const clientPointNombre = nombre ?? "Visitando..."

    return NextResponse.json({
      visit: {
        visitId: visit.id,
        clientPointId: visit.client_point_id,
        clientPointNombre,
        checkinAt: visit.checkin_at,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function getClientPointNombre(schemaName: string, clientPointId: string): Promise<string | null> {
  const { withTenantSchema } = await import("@suplai/core")
  return withTenantSchema(schemaName, async (db) => {
    const rows = await db`
      select nombre from client_points where id = ${clientPointId} limit 1
    `
    return rows.length > 0 ? (rows[0].nombre as string) : null
  })
}
