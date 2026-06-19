import { createClient } from "@/lib/supabase/server"
import { parseJwtPayload } from "@suplai/auth"
import type { JwtPayload } from "@suplai/types"

export async function getSessionClaims(): Promise<JwtPayload | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return parseJwtPayload(session.access_token)
}
