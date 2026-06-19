"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/server"
import { createUser } from "@suplai/users"
import { withTenantSchema } from "@suplai/core"
import type { User } from "@suplai/types"

export async function createTenantUser(
  tenantId: string,
  schemaName: string,
  formData: FormData,
) {
  const email = (formData.get("email") as string).trim()
  const nombre = (formData.get("nombre") as string).trim()
  const password = formData.get("password") as string
  const tipo = formData.get("tipo") as "interno" | "externo"

  if (!email || !nombre || !password) return { error: "Todos los campos son requeridos" }

  // 1. Crear usuario en Supabase Auth
  const supabase = await createServiceClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return { error: error.message }

  // 2. Crear usuario interno + registrar mapeo auth→tenant
  const user = await createUser({
    schemaName,
    tenantId,
    supabaseAuthId: data.user.id,
    email,
    nombre,
    tipo,
  })

  // 3. Asignar rol según el formulario (por defecto tenant_admin para usuarios creados desde el super admin)
  const rolNombre = (formData.get("rol") as string | null) ?? "tenant_admin"
  await withTenantSchema(schemaName, async (tx) => {
    const roles = await tx<{ id: string }[]>`
      select id from roles where nombre = ${rolNombre} limit 1
    `
    if (roles[0]) {
      await tx`
        insert into user_roles (user_id, role_id)
        values (${user.id}::uuid, ${roles[0].id}::uuid)
        on conflict do nothing
      `
    }
  })

  revalidatePath(`/tenants/${tenantId}`)
  return { success: true }
}

export async function getTenantUsers(schemaName: string): Promise<User[]> {
  return withTenantSchema(schemaName, (db) => db<User[]>`
    select id, supabase_auth_id, email, nombre, tipo, client_id, activo
    from users order by nombre
  `)
}
