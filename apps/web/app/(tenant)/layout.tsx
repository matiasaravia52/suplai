import Link from "next/link"
import { logout } from "@/actions/auth"

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <span className="text-base font-semibold text-gray-900">Suplai</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          <Link href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Inicio
          </Link>
          <Link href="/usuarios"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Usuarios
          </Link>
          <Link href="/roles"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Roles
          </Link>
          <Link href="/clientes"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Clientes
          </Link>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tracking</p>
          </div>
          <Link href="/tracking"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Tracking en vivo
          </Link>
          <Link href="/tracking/planes"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Planes de ruta
          </Link>
          <Link href="/tracking/historial"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Historial de visitas
          </Link>
          <Link href="/tracking/alertas"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            Alertas de posición
          </Link>
        </nav>

        <div className="px-2 py-4 border-t border-gray-200">
          <form action={logout}>
            <button type="submit"
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
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
