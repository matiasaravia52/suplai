import type { User, UserTipo } from "@suplai/types"
import { db, withTenantSchema } from "@suplai/core"

export interface CreateUserInput {
  schemaName: string
  tenantId: string
  supabaseAuthId: string
  email: string
  nombre: string
  tipo: UserTipo
  clientId?: string
}

// Crea el usuario en el schema del tenant y registra el mapeo auth → tenant
export async function createUser(input: CreateUserInput): Promise<User> {
  const user = await withTenantSchema(input.schemaName, async (tx) => {
    const rows = await tx<User[]>`
      insert into users (supabase_auth_id, email, nombre, tipo, client_id)
      values (
        ${input.supabaseAuthId}::uuid,
        ${input.email},
        ${input.nombre},
        ${input.tipo},
        ${input.clientId ?? null}::uuid
      )
      returning id, supabase_auth_id, email, nombre, tipo, client_id, activo
    `
    return rows[0]!
  })

  // Registrar mapeo en public.user_tenant_map para el hook de JWT
  await db`
    insert into public.user_tenant_map (auth_user_id, tenant_id)
    values (${input.supabaseAuthId}::uuid, ${input.tenantId}::uuid)
    on conflict (auth_user_id) do nothing
  `

  return user
}

export async function getUserById(
  schemaName: string,
  userId: string,
): Promise<User | null> {
  const rows = await withTenantSchema(schemaName, (db) => db<User[]>`
    select id, supabase_auth_id, email, nombre, tipo, client_id, activo
    from users
    where id = ${userId}::uuid
  `)
  return rows[0] ?? null
}

export async function getUserByAuthId(
  schemaName: string,
  authId: string,
): Promise<User | null> {
  const rows = await withTenantSchema(schemaName, (db) => db<User[]>`
    select id, supabase_auth_id, email, nombre, tipo, client_id, activo
    from users
    where supabase_auth_id = ${authId}::uuid
  `)
  return rows[0] ?? null
}

export async function listUsers(
  schemaName: string,
  opts: { tipo?: UserTipo } = {},
): Promise<User[]> {
  return withTenantSchema(schemaName, (db) => {
    if (opts.tipo) {
      return db<User[]>`
        select id, supabase_auth_id, email, nombre, tipo, client_id, activo
        from users where tipo = ${opts.tipo} order by nombre
      `
    }
    return db<User[]>`
      select id, supabase_auth_id, email, nombre, tipo, client_id, activo
      from users order by nombre
    `
  })
}

export async function deactivateUser(schemaName: string, userId: string): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update users set activo = false where id = ${userId}::uuid
  `)
}

export async function reactivateUser(schemaName: string, userId: string): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update users set activo = true where id = ${userId}::uuid
  `)
}

export async function updateUser(
  schemaName: string,
  userId: string,
  data: { nombre: string; tipo: UserTipo },
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update users set nombre = ${data.nombre}, tipo = ${data.tipo}
    where id = ${userId}::uuid
  `)
}

export async function deleteUser(
  schemaName: string,
  userId: string,
): Promise<{ supabaseAuthId: string }> {
  const rows = await withTenantSchema(schemaName, (db) => db<{ supabase_auth_id: string }[]>`
    delete from users where id = ${userId}::uuid
    returning supabase_auth_id
  `)
  const authId = rows[0]?.supabase_auth_id
  if (!authId) throw new Error("Usuario no encontrado")

  await db`delete from public.user_tenant_map where auth_user_id = ${authId}::uuid`

  return { supabaseAuthId: authId }
}
