export interface ModuleFeature {
  id: string
  nombre: string
  defaultEnabled: boolean
}

export interface ModuleNavItem {
  label: string
  ruta: string
  permission?: string
  feature?: string
}

export interface ModuleMobileScreen {
  id: string
  component: string
  roles: string[]
}

export interface ModuleNotification {
  id: string
  label: string
}

export interface ModuleManifest {
  id: string
  version: string
  nombre: string
  icono: string
  isCoreModule?: boolean

  features: ModuleFeature[]
  permissions: string[]
  // Mapeo de permiso → roles que lo reciben por defecto al activar el módulo
  permissionRoles?: Record<string, string[]>

  nav: ModuleNavItem[]
  mobileScreens: ModuleMobileScreen[]
  notifications: ModuleNotification[]

  coreDepends: string[]
  migrations: string[]
  // Función que crea las tablas del módulo en el schema del tenant
  runMigrations?: (schemaName: string) => Promise<void>
}
