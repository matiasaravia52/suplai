import { NextResponse } from "next/server"
import { verifyBearerToken } from "@/lib/api-auth"
import { exportVisitsExcel } from "@suplai/tracking/service"
import type { VisitFilters } from "@suplai/types"

export async function GET(request: Request) {
  const claims = await verifyBearerToken(request)
  if (!claims) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const filters: VisitFilters = {
    ...(url.searchParams.get("userId")       ? { userId:       url.searchParams.get("userId")!       } : {}),
    ...(url.searchParams.get("from")         ? { fechaDesde:   url.searchParams.get("from")!         } : {}),
    ...(url.searchParams.get("to")           ? { fechaHasta:   url.searchParams.get("to")!           } : {}),
    ...(url.searchParams.get("clientPointId")? { clientPointId: url.searchParams.get("clientPointId")!} : {}),
  }

  try {
    const buffer = await exportVisitsExcel(claims.schema_name, filters)
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="visitas-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
