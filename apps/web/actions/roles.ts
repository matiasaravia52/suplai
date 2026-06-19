"use server"

import { revalidatePath } from "next/cache"
import { withTenantSchema } from "@suplai/core"
import { createRole, updateRole, assignPermissions } from "@suplai/users"
import type { Role } from "@suplai/types"

export async function getRoles(schemaName: string): Promise<(Role & { permisos: string[]; usuarios: number })[]> {
  return withTenantSchema(schemaName, (db) => db<(Role & { permisos: string[]; usuarios: number })[]>`
    select
      r.id, r.nombre, r.descripcion,
      coalesce(array_agg(rp.permiso) filter (where rp.permiso is not null), '{}') as permisos,
      count(distinct ur.user_id)::int as usuarios
    from roles r
    left join role_permissions rp on rp.role_id = r.id
    left join user_roles ur on ur.role_id = r.id
    group by r.id
    order by r.nombre
  `)
}

export async function getRol(schemaName: string, roleId: string): Promise<
  (Role & { permisos: string[] }) | null
> {
  const rows = await withTenantSchema(schemaName, (db) => db<(Role & { permisos: string[] })[]>`
    select
      r.id, r.nombre, r.descripcion,
      coalesce(array_agg(rp.permiso) filter (where rp.permiso is not null), '{}') as permisos
    from roles r
    left join role_permissions rp on rp.role_id = r.id
    where r.id = ${roleId}::uuid
    group by r.id
  `)
  return rows[0] ?? null
}

export async function crearRol(schemaName: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const descripcion = (formData.get("descripcion") as string | null)?.trim()
  const permisos = formData.getAll("permisos") as string[]

  if (!nombre) return { error: "El nombre es requerido" }

  const role = await createRole(schemaName, { nombre, descripcion })
  if (permisos.length > 0) {
    await assignPermissions(schemaName, role.id, permisos)
  }

  revalidatePath("/roles")
  return { success: true, id: role.id }
}

export async function actualizarRol(schemaName: string, roleId: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const descripcion = (formData.get("descripcion") as string | null)?.trim()
  if (!nombre) return { error: "El nombre es requerido" }
  await updateRole(schemaName, roleId, { nombre, descripcion })
  revalidatePath("/roles")
  revalidatePath(`/roles/${roleId}`)
  return { success: true }
}

export async function actualizarPermisos(schemaName: string, roleId: string, formData: FormData) {
  const permisos = formData.getAll("permisos") as string[]
  await assignPermissions(schemaName, roleId, permisos)
  revalidatePath(`/roles/${roleId}`)
}

export async function eliminarRol(schemaName: string, roleId: string) {
  await withTenantSchema(schemaName, (db) => db`
    delete from roles where id = ${roleId}::uuid
  `)
  revalidatePath("/roles")
}
