import type { Tenant } from "@suplai/types"

// Cache en memoria por worker. Suficiente para MVP — se invalida en redeploy.
const cache = new Map<string, { tenant: Tenant; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 1 minuto

export function extractSubdomain(host: string): string | null {
  // Quitar puerto si existe
  const hostname = host.split(":")[0] ?? ""

  // En local: lopez.localhost → 'lopez'
  // En prod:  lopez.suplai.app → 'lopez'
  // Sin subdominio: localhost, suplai.app → null
  const parts = hostname.split(".")
  if (parts.length < 2) return null

  const subdomain = parts[0] ?? ""

  // Ignorar subdominios reservados
  if (["www", "admin", ""].includes(subdomain)) return null

  return subdomain
}

export async function resolveTenant(subdomain: string): Promise<Tenant | null> {
  const now = Date.now()
  const cached = cache.get(subdomain)
  if (cached && cached.expiresAt > now) return cached.tenant

  const url = new URL(
    `/rest/v1/tenants?subdominio=eq.${encodeURIComponent(subdomain)}&activo=eq.true&select=*&limit=1`,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )

  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    // No cachear en la capa de fetch — el cache lo manejamos nosotros
    cache: "no-store",
  })

  if (!res.ok) return null

  const rows = (await res.json()) as Tenant[]
  const tenant = rows[0] ?? null

  if (tenant) {
    cache.set(subdomain, { tenant, expiresAt: now + CACHE_TTL_MS })
  }

  return tenant
}

// Para usar en Server Components y API Routes — lee los headers que puso el middleware
export function getTenantContext(headers: Headers): {
  tenantId: string
  schemaName: string
} | null {
  const tenantId = headers.get("x-tenant-id")
  const schemaName = headers.get("x-schema-name")
  if (!tenantId || !schemaName) return null
  return { tenantId, schemaName }
}
