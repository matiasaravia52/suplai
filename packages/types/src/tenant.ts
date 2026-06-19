export interface Tenant {
  id: string
  nombre: string
  subdominio: string
  schema_name: string
  config_visual: TenantVisualConfig
  activo: boolean
  created_at: string
}

export interface TenantVisualConfig {
  logo?: string
  primaryColor?: string
  secondaryColor?: string
}
