import type { Client, ClientPoint, CreateClientInput, CreateClientPointInput } from "@suplai/types"
import { withTenantSchema } from "@suplai/core"

// ── Clients ──

export async function createClient(
  schemaName: string,
  input: CreateClientInput,
): Promise<Client> {
  const rows = await withTenantSchema(schemaName, (db) => db<Client[]>`
    insert into clients (nombre, direccion, telefono, email)
    values (
      ${input.nombre},
      ${input.direccion ?? null},
      ${input.telefono ?? null},
      ${input.email ?? null}
    )
    returning id, nombre, direccion, telefono, email, activo, created_at
  `)
  return rows[0]!
}

export async function listClients(schemaName: string): Promise<(Client & { puntos_count: number })[]> {
  return withTenantSchema(schemaName, (db) => db<(Client & { puntos_count: number })[]>`
    select
      c.id, c.nombre, c.direccion, c.telefono, c.email, c.activo, c.created_at,
      count(cp.id)::int as puntos_count
    from clients c
    left join client_points cp on cp.client_id = c.id and cp.activo = true
    group by c.id
    order by c.nombre
  `)
}

export async function getClientById(
  schemaName: string,
  clientId: string,
): Promise<Client | null> {
  const rows = await withTenantSchema(schemaName, (db) => db<Client[]>`
    select id, nombre, direccion, telefono, email, activo, created_at
    from clients
    where id = ${clientId}::uuid
  `)
  return rows[0] ?? null
}

export async function updateClient(
  schemaName: string,
  clientId: string,
  data: { nombre?: string; direccion?: string; telefono?: string; email?: string },
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update clients set
      nombre = coalesce(${data.nombre ?? null}, nombre),
      direccion = coalesce(${data.direccion ?? null}, direccion),
      telefono = coalesce(${data.telefono ?? null}, telefono),
      email = coalesce(${data.email ?? null}, email)
    where id = ${clientId}::uuid
  `)
}

export async function deactivateClient(
  schemaName: string,
  clientId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update clients set activo = false where id = ${clientId}::uuid
  `)
}

// ── Client Points ──

export async function createClientPoint(
  schemaName: string,
  input: CreateClientPointInput,
): Promise<ClientPoint> {
  const rows = await withTenantSchema(schemaName, (db) => db<ClientPoint[]>`
    insert into client_points (client_id, nombre, direccion, telefono, lat, lng)
    values (
      ${input.client_id}::uuid,
      ${input.nombre},
      ${input.direccion ?? null},
      ${input.telefono ?? null},
      ${input.lat ?? null},
      ${input.lng ?? null}
    )
    returning id, client_id, nombre, direccion, lat, lng, telefono, activo, created_at
  `)
  return rows[0]!
}

export async function listClientPoints(
  schemaName: string,
  clientId: string,
): Promise<ClientPoint[]> {
  return withTenantSchema(schemaName, (db) => db<ClientPoint[]>`
    select id, client_id, nombre, direccion, lat, lng, telefono, activo, created_at
    from client_points
    where client_id = ${clientId}::uuid
    order by nombre
  `)
}

export async function getClientPointById(
  schemaName: string,
  pointId: string,
): Promise<ClientPoint | null> {
  const rows = await withTenantSchema(schemaName, (db) => db<ClientPoint[]>`
    select id, client_id, nombre, direccion, lat, lng, telefono, activo, created_at
    from client_points
    where id = ${pointId}::uuid
  `)
  return rows[0] ?? null
}

export async function updateClientPoint(
  schemaName: string,
  pointId: string,
  data: { nombre?: string; direccion?: string; telefono?: string; lat?: number; lng?: number },
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update client_points set
      nombre = coalesce(${data.nombre ?? null}, nombre),
      direccion = coalesce(${data.direccion ?? null}, direccion),
      telefono = coalesce(${data.telefono ?? null}, telefono),
      lat = coalesce(${data.lat ?? null}::double precision, lat),
      lng = coalesce(${data.lng ?? null}::double precision, lng)
    where id = ${pointId}::uuid
  `)
}

export async function updateClientPointCoords(
  schemaName: string,
  pointId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update client_points set lat = ${lat}, lng = ${lng}
    where id = ${pointId}::uuid
  `)
}

export async function deactivateClientPoint(
  schemaName: string,
  pointId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (db) => db`
    update client_points set activo = false where id = ${pointId}::uuid
  `)
}
