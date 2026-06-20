import type { ModuleManifest } from "@suplai/module-sdk"
import { ModuleRegistry } from "@suplai/core"
import { runMigrations } from "./migrations/run"

export const manifest: ModuleManifest = {
  id: "tracking",
  version: "1.0.0",
  nombre: "Tracking Operativo",
  icono: "map-pin",
  isCoreModule: false,
  features: [
    { id: "field_tracking", nombre: "Tracking de campo",         defaultEnabled: true  }, // check-in/out, mapa en vivo, historial, alertas de fraude
    { id: "route_plans",    nombre: "Zonas de repartidores",     defaultEnabled: true  }, // asignación permanente de puntos de venta por coordinador
    { id: "route_tracing",  nombre: "Trazabilidad de recorrido", defaultEnabled: false }, // GPS continuo — requiere app mobile (Fase 2)
    { id: "unknown_points", nombre: "Puntos no registrados",     defaultEnabled: false }, // visitas a puntos fuera del catálogo — requiere app mobile (Fase 2)
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
  permissionRoles: {
    "tracking:field_tracking:create":  ["repartidor", "pre_vendedor"],
    "tracking:field_tracking:view":    ["coordinador", "tenant_admin"],
    "tracking:field_tracking:export":  ["coordinador", "tenant_admin"],
    "tracking:route_plans:manage":     ["coordinador", "tenant_admin"],
    "tracking:route_tracing:view":     ["coordinador", "tenant_admin"],
    "tracking:unknown_points:create":  ["repartidor", "pre_vendedor"],
    "tracking:unknown_points:view":    ["coordinador", "tenant_admin"],
  },
  nav: [
    { label: "Tracking en vivo",    ruta: "/tracking",          permission: "tracking:field_tracking:view", feature: "field_tracking" },
    { label: "Zonas",                ruta: "/tracking/zonas",    permission: "tracking:route_plans:manage",  feature: "route_plans"    },
    { label: "Historial de visitas",ruta: "/tracking/historial",permission: "tracking:field_tracking:view", feature: "field_tracking" },
    { label: "Alertas de posición", ruta: "/tracking/alertas",  permission: "tracking:field_tracking:view", feature: "field_tracking" },
  ],
  mobileScreens: [
    { id: "tracking_main", component: "TrackingMainScreen", roles: ["repartidor", "pre_vendedor"] },
  ],
  notifications: [],
  coreDepends: ["users", "clients"],
  migrations: [
    "001_create_tables.sql",
    "002_route_plans.sql",
    "003_add_unknown_point_fields.sql",
    "004_add_accuracy_to_route_points.sql",
    "005_add_resultado_to_visits.sql",
    "006_rename_plans_to_zonas.sql",
    "007_drop_route_plans.sql",
  ],
  runMigrations,
}

ModuleRegistry.register(manifest)
