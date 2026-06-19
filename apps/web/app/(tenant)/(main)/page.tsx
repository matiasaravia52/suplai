import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getTenantContext } from "@/lib/tenant"

export default async function Home() {
  const hdrs = await headers()
  const tenantCtx = getTenantContext(hdrs)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Suplai</h1>
        {tenantCtx ? (
          <p className="text-gray-500 text-sm">
            Tenant: <span className="font-mono">{tenantCtx.schemaName}</span>
          </p>
        ) : null}
        {user ? (
          <p className="text-gray-500 text-sm mt-1">Usuario: {user.email}</p>
        ) : null}
        <p className="text-gray-400 text-xs mt-4">Los módulos aparecerán acá</p>
      </div>
    </main>
  )
}
