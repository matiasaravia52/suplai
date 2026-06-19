import { createClient } from "@supabase/supabase-js"
import { parseJwtPayload } from "@suplai/auth"
import type { JwtPayload } from "@suplai/types"

// Verifica el Bearer token de un API route (llamado desde mobile u otro cliente).
// Retorna los claims del JWT o null si el token es inválido.
export async function verifyBearerToken(request: Request): Promise<JwtPayload | null> {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { error } = await supabase.auth.getUser(token)
  if (error) return null

  return parseJwtPayload(token)
}
