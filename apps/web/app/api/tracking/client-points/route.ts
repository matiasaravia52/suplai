import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { withTenantSchema } from "@suplai/core"
import type { ClientPoint } from "@suplai/types"

// Lista todos los client_points activos del tenant — usado por la app mobile
export async function GET(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const clientIdParam = url.searchParams.get("clientId")
  const qParam = url.searchParams.get("q")

  try {
    const points = await withTenantSchema(claims.schema_name, (db) => {
      if (qParam) {
        const search = `%${qParam}%`
        return db<ClientPoint[]>`
          select * from client_points
          where activo = true
            and (nombre ilike ${search} or direccion ilike ${search})
          order by nombre
          limit 20
        `
      }
      return clientIdParam
        ? db<ClientPoint[]>`select * from client_points where client_id = ${clientIdParam} and activo = true order by nombre`
        : db<ClientPoint[]>`select * from client_points where activo = true order by nombre`
    })
    return NextResponse.json({ points })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
