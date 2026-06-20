import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { setResultado, setResultadoSupervisor } from "@suplai/tracking/service"
import type { ResultadoVisita } from "@suplai/types"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
): Promise<NextResponse> {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { visitId } = await params
  const body = await request.json() as { resultado?: string; asSupervisor?: boolean }
  const resultado = body.resultado as ResultadoVisita | undefined

  if (resultado !== "venta" && resultado !== "no_venta") {
    return NextResponse.json({ error: "resultado debe ser 'venta' o 'no_venta'" }, { status: 400 })
  }

  try {
    const visit = body.asSupervisor
      ? await setResultadoSupervisor(claims.schema_name, visitId, resultado)
      : await setResultado(claims.schema_name, visitId, claims.app_user_id, resultado)
    return NextResponse.json({ visit })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
