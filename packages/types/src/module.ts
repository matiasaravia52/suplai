export interface Module {
  id: string
  nombre: string
  version: string
  is_core: boolean
}

export interface TenantModule {
  tenant_id: string
  module_id: string
  activo: boolean
  version: string
  features: Record<string, boolean>
}
