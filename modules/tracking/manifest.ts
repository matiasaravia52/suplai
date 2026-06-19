import type { ModuleManifest } from "@suplai/module-sdk"
import { ModuleRegistry } from "@suplai/core"

export const manifest: ModuleManifest = {
  id: "tracking",
  version: "1.0.0",
  nombre: "Tracking Operativo",
  icono: "map-pin",
  isCoreModule: false,
  features: [
    { id: "field_tracking", nombre: "Tracking de campo",         defaultEnabled: true  },
    { id: "route_tracing",  nombre: "Trazabilidad de recorrido", defaultEnabled: false },
    { id: "unknown_points", nombre: "Puntos no registrados",     defaultEnabled: false },
  ],
  permissions: [
    "tracking:field_tracking:create",
    "tracking:field_tracking:view",
    "tracking:field_tracking:export",
    "tracking:route_tracing:view",
    "tracking:unknown_points:create",
    "tracking:unknown_points:view",
    "tracking:route_plans:manage",
  ],
  nav: [
    { label: "Tracking en vivo",     ruta: "/tracking",               permission: "tracking:field_tracking:view",   feature: "field_tracking" },
    { label: "Planes de ruta",        ruta: "/tracking/planes",        permission: "tracking:route_plans:manage",   feature: "field_tracking" },
    { label: "Historial de visitas",  ruta: "/tracking/historial",     permission: "tracking:field_tracking:view",  feature: "field_tracking" },
    { label: "Alertas de posición",   ruta: "/tracking/alertas",       permission: "tracking:field_tracking:view",  feature: "field_tracking" },
  ],
  mobileScreens: [
    { id: "tracking_main", component: "TrackingMainScreen", roles: ["repartidor", "pre_vendedor"] },
  ],
  notifications: [],
  coreDepends: ["users", "clients"],
  migrations: ["001_create_tables.sql"],
}

ModuleRegistry.register(manifest)
