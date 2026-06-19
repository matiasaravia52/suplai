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

  nav: ModuleNavItem[]
  mobileScreens: ModuleMobileScreen[]
  notifications: ModuleNotification[]

  coreDepends: string[]
  migrations: string[]
}
