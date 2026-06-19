import type { ModuleManifest } from "@suplai/module-sdk"

// Reemplazar TODO con los valores del SCOPING.md aprobado
export const manifest: ModuleManifest = {
  id: "TODO",
  version: "1.0.0",
  nombre: "TODO",
  icono: "TODO",
  isCoreModule: false,

  features: [
    // { id: "feature_id", nombre: "Nombre legible", defaultEnabled: true },
  ],

  permissions: [
    // "modulo:feature:accion",
  ],

  nav: [
    // { label: "Label", ruta: "/modulo/ruta", permission: "modulo:feature:view", feature: "feature_id" },
  ],

  mobileScreens: [
    // { id: "screen_id", component: "ComponentName", roles: ["rol"] },
  ],

  notifications: [
    // { id: "notif_id", label: "Descripción" },
  ],

  coreDepends: ["users"],

  migrations: [
    "001_create_tables.sql",
  ],
}
