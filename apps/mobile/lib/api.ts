import { useStore } from "./store"

let _baseUrl: string | null = null
let _token: string | null = null

export function setApiAuth(baseUrl: string, token: string) {
  _baseUrl = baseUrl.replace(/\/+$/, "")
  _token = token
}

export function getApiBaseUrl(): string | null {
  return _baseUrl
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { session } = useStore.getState()
  const token = session?.access_token ?? _token
  if (!token) throw new Error("No autenticado")
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
