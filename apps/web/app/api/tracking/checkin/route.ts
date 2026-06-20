import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyBearerToken } from "@/lib/api-auth"
import { checkin, GeofenceError } from "@suplai/tracking/service"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json() as { clientPointId?: string; lat?: number; lng?: number }
  if (!body.clientPointId || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: "clientPointId, lat y lng son requeridos" }, { status: 400 })
  }

  console.log("[checkin] schema:", claims.schema_name, "userId:", claims.app_user_id, "clientPointId:", body.clientPointId)

  const { data: tenantRow } = await supabaseAdmin
    .from("tenants")
    .select("geofence_radius_metros")
    .eq("schema_name", claims.schema_name)
    .single()
  const radioMetros: number = tenantRow?.geofence_radius_metros ?? 100

  try {
    const result = await checkin(
      claims.schema_name,
      {
        clientPointId: body.clientPointId,
        userId:        claims.app_user_id,
        lat:           body.lat,
        lng:           body.lng,
      },
      radioMetros,
    )
    console.log("[checkin] result:", JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof GeofenceError) {
      return NextResponse.json(
        { error: "fuera_de_rango", distanciaMetros: err.distanciaMetros, radioMetros: err.radioMetros },
        { status: 422 },
      )
    }
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[checkin] error:", message)
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
