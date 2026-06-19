import type { Role } from "@suplai/types"
import { withTenantSchema } from "@suplai/core"

export async function listRoles(schemaName: string): Promise<Role[]> {
  return withTenantSchema(schemaName, (db) => db<Role[]>`
    select id, nombre, descripcion from roles order by nombre
  `)
}

export async function createRole(
  schemaName: string,
  data: { nombre: string; descripcion?: string },
): Promise<Role> {
  const rows = await withTenantSchema(schemaName, (db) => db<Role[]>`
    insert into roles (nombre, descripcion)
    values (${data.nombre}, ${data.descripcion ?? null})
    returning id, nombre, descripcion
  `)
  return rows[0]!
}

export async function updateRole(
  schemaName: string,
  roleId: string,
  data: { nombre: string; descripcion?: string },
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update roles set nombre = ${data.nombre}, descripcion = ${data.descripcion ?? null}
    where id = ${roleId}::uuid
  `)
}

export async function assignPermissions(
  schemaName: string,
  roleId: string,
  permisos: string[],
): Promise<void> {
  await withTenantSchema(schemaName, async (db) => {
    // Reemplazar permisos del rol
    await db`delete from role_permissions where role_id = ${roleId}::uuid`
    if (permisos.length === 0) return
    await db`
      insert into role_permissions (role_id, permiso)
      select ${roleId}::uuid, unnest(${permisos}::text[])
    `
  })
}

export async function getPermissions(
  schemaName: string,
  roleId: string,
): Promise<string[]> {
  const rows = await withTenantSchema(schemaName, (db) => db<{ permiso: string }[]>`
    select permiso from role_permissions where role_id = ${roleId}::uuid order by permiso
  `)
  return rows.map((r) => r.permiso)
}

export async function assignRoleToUser(
  schemaName: string,
  userId: string,
  roleId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    insert into user_roles (user_id, role_id)
    values (${userId}::uuid, ${roleId}::uuid)
    on conflict do nothing
  `)
}

export async function removeRoleFromUser(
  schemaName: string,
  userId: string,
  roleId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    delete from user_roles
    where user_id = ${userId}::uuid and role_id = ${roleId}::uuid
  `)
}
