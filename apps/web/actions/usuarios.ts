"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/server"
import { createUser, deactivateUser, reactivateUser, updateUser, deleteUser } from "@suplai/users"
import { withTenantSchema } from "@suplai/core"
import type { User, UserTipo } from "@suplai/types"

export async function getUsuarios(schemaName: string): Promise<
  (User & { roles: string[] })[]
> {
  return withTenantSchema(schemaName, (db) => db<(User & { roles: string[] })[]>`
    select
      u.id, u.supabase_auth_id, u.email, u.nombre, u.tipo, u.client_id, u.activo,
      coalesce(array_agg(r.nombre) filter (where r.nombre is not null), '{}') as roles
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    group by u.id
    order by u.nombre
  `)
}

export async function getUsuario(schemaName: string, userId: string): Promise<
  (User & { roles: { id: string; nombre: string }[] }) | null
> {
  const rows = await withTenantSchema(schemaName, (db) => db<(User & { roles: { id: string; nombre: string }[] })[]>`
    select
      u.id, u.supabase_auth_id, u.email, u.nombre, u.tipo, u.client_id, u.activo,
      coalesce(
        json_agg(json_build_object('id', r.id, 'nombre', r.nombre))
        filter (where r.id is not null),
        '[]'
      ) as roles
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    where u.id = ${userId}::uuid
    group by u.id
  `)
  return rows[0] ?? null
}

export async function crearUsuario(schemaName: string, tenantId: string, formData: FormData) {
  const email = (formData.get("email") as string).trim()
  const nombre = (formData.get("nombre") as string).trim()
  const password = formData.get("password") as string
  const tipo = formData.get("tipo") as UserTipo

  if (!email || !nombre || !password) return { error: "Todos los campos son requeridos" }
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" }

  const supabase = await createServiceClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return { error: error.message }

  const user = await createUser({
    schemaName,
    tenantId,
    supabaseAuthId: data.user.id,
    email,
    nombre,
    tipo,
  })

  const rolId = formData.get("rol_id") as string | null
  if (rolId) {
    await withTenantSchema(schemaName, (db) => db`
      insert into user_roles (user_id, role_id)
      values (${user.id}::uuid, ${rolId}::uuid)
      on conflict do nothing
    `)
  }

  revalidatePath("/usuarios")
  return { success: true }
}

export async function asignarRol(schemaName: string, userId: string, roleId: string) {
  await withTenantSchema(schemaName, (db) => db`
    insert into user_roles (user_id, role_id)
    values (${userId}::uuid, ${roleId}::uuid)
    on conflict do nothing
  `)
  revalidatePath(`/usuarios/${userId}`)
}

export async function quitarRol(schemaName: string, userId: string, roleId: string) {
  await withTenantSchema(schemaName, (db) => db`
    delete from user_roles where user_id = ${userId}::uuid and role_id = ${roleId}::uuid
  `)
  revalidatePath(`/usuarios/${userId}`)
}

export async function editarUsuario(schemaName: string, userId: string, formData: FormData) {
  const nombre = (formData.get("nombre") as string).trim()
  const tipo = formData.get("tipo") as UserTipo
  if (!nombre) return { error: "El nombre es requerido" }
  await updateUser(schemaName, userId, { nombre, tipo })
  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
  return { success: true }
}

export async function desactivarUsuario(schemaName: string, userId: string) {
  await deactivateUser(schemaName, userId)
  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
}

export async function reactivarUsuario(schemaName: string, userId: string) {
  await reactivateUser(schemaName, userId)
  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
}

export async function eliminarUsuario(schemaName: string, userId: string) {
  const { supabaseAuthId } = await deleteUser(schemaName, userId)
  const supabase = await createServiceClient()
  await supabase.auth.admin.deleteUser(supabaseAuthId)
  revalidatePath("/usuarios")
}
