import Link from "next/link"
import { logout } from "@/actions/auth"
import { getSessionClaims } from "@/lib/session"
import { getModuleNav } from "@/actions/nav"

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims()
  const moduleNav = claims
    ? await getModuleNav(claims.tenant_id, claims.schema_name, claims.app_user_id)
    : []

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <span className="text-base font-semibold text-gray-900">Suplai</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Core — siempre visible, no dependen de módulos */}
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/clientes">Clientes</NavLink>

          {/* Nav dinámica por módulo */}
          {moduleNav.map((group) => (
            <div key={group.moduleId}>
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {group.nombre}
                </p>
              </div>
              {group.items.map((item) => (
                <NavLink key={item.ruta} href={item.ruta}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-gray-200">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
    >
      {children}
    </Link>
  )
}
