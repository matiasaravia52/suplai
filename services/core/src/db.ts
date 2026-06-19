import postgres from "postgres"

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

// Pool singleton — compartido por todos los services en el proceso
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 30,
})

// Ejecuta un bloque de queries en el schema del tenant.
// Usa una transacción con SET LOCAL search_path para aislar el schema por request.
export async function withTenantSchema<T>(
  schemaName: string,
  fn: (db: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SET LOCAL search_path TO ${sql(schemaName)}, public`
    return fn(tx)
  }) as Promise<T>
}

// Para queries sobre el schema public (plataforma global)
export { sql as db }
