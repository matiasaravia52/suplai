import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { extractSubdomain, resolveTenant } from "@/lib/tenant"

export async function proxy(request: NextRequest) {
  // 1. Crear respuesta mutable para que Supabase pueda setear cookies de sesión
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Propagar cookies al request y a la response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 2. Refrescar sesión (NUNCA remover esto — es requerimiento de @supabase/ssr)
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Resolver tenant desde el subdominio
  const host = request.headers.get("host") ?? ""
  const subdomain = extractSubdomain(host)

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth")

  if (subdomain) {
    const tenant = await resolveTenant(subdomain)

    if (!tenant) {
      return NextResponse.rewrite(new URL("/not-found", request.url))
    }

    // Sin sesión → login (preservando el subdominio en la URL)
    if (!user && !isAuthRoute) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // 4. Inyectar contexto del tenant en headers para que lo lean Server Components y API Routes
    supabaseResponse.headers.set("x-tenant-id", tenant.id)
    supabaseResponse.headers.set("x-schema-name", tenant.schema_name)
  } else {
    if (!user && !isAuthRoute) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Ejecutar en todas las rutas excepto assets estáticos y archivos Next.js internos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
