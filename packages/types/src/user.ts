export type UserTipo = "interno" | "externo"

export interface User {
  id: string
  supabase_auth_id: string
  email: string
  nombre: string
  tipo: UserTipo
  client_id?: string
  activo: boolean
}

export interface Role {
  id: string
  nombre: string
  descripcion?: string
}

// Claims que agrega el hook custom_access_token al JWT de Supabase
export interface TenantJwtClaims {
  tenant_id: string      // UUID del tenant
  schema_name: string    // ej: 'tenant_lopez'
  app_user_id: string    // UUID interno del usuario en el schema del tenant
  roles: string[]        // nombres de roles asignados
}

// JWT completo (claims de Supabase + claims del tenant)
export interface JwtPayload extends TenantJwtClaims {
  sub: string            // auth user id (Supabase)
  email: string
  role: string           // 'authenticated'
  iat: number
  exp: number
}

// Super admin no tiene tenant asociado
export interface SuperAdminJwtPayload {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}
