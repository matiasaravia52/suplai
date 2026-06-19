// Registra todos los módulos en el ModuleRegistry.
// Agregar una entrada por cada módulo nuevo que se incorpore al sistema.
import "@suplai/tracking"
import { ModuleRegistry } from "@suplai/core"

// Módulos core — no tienen package propio, se registran inline
ModuleRegistry.register({
  id: "users",
  version: "1.0.0",
  nombre: "Usuarios y Roles",
  icono: "users",
  isCoreModule: true,
  features: [],
  permissions: ["users:internal_users:manage", "users:external_users:manage", "users:roles:manage"],
  permissionRoles: {
    "users:internal_users:manage": ["tenant_admin"],
    "users:external_users:manage": ["tenant_admin"],
    "users:roles:manage":          ["tenant_admin"],
  },
  nav: [
    { label: "Usuarios", ruta: "/usuarios", permission: "users:internal_users:manage" },
    { label: "Roles",    ruta: "/roles",    permission: "users:roles:manage" },
  ],
  mobileScreens: [],
  notifications: [],
  coreDepends: [],
  migrations: [],
})
