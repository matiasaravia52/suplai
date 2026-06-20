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

async function logout() {
  useStore.getState().clearSession()
  await supabase.auth.signOut()
  router.replace("/login")
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Pedir sesión refrescada — Supabase renueva el access_token si está por vencer
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    // Intentar un refresh explícito antes de desloguear
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session?.access_token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshed.session.access_token}`,
      }
    }
    await logout()
    throw new Error("No autorizado")
  }
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
      await logout()
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
