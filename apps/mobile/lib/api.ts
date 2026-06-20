import { useStore } from "./store"
import { supabase } from "./supabase"
import { router } from "expo-router"

let _baseUrl: string | null = null

export function setApiAuth(baseUrl: string, _token: string) {
  _baseUrl = baseUrl.replace(/\/+$/, "")
}

export function getApiBaseUrl(): string | null {
  return _baseUrl
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Siempre pedir el token fresco a Supabase — maneja el refresh automático
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error("No autorizado")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const store = useStore.getState()
  const baseUrl = store.apiBaseUrl ?? _baseUrl
  if (!baseUrl) throw new Error("API base URL no configurada")

  const headers = await getAuthHeaders()
  const url = `${baseUrl}${path}`

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) {
      // Sesión expirada — limpiar y redirigir al login
      useStore.getState().clearSession()
      await supabase.auth.signOut()
      router.replace("/login")
    }
    throw new Error(body.error ?? `Error HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
    }),
}
