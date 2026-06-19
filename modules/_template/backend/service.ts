import { withTenantSchema, eventBus } from "@suplai/core"

// Renombrar este archivo a {modulo}-service.ts
// Todas las funciones reciben schemaName como primer parámetro
// Solo acceder a tablas propias ({modulo}__*) o tablas del core

// export async function ejemplo(schemaName: string, input: EjemploInput) {
//   const result = await withTenantSchema(schemaName, (db) => db`
//     select * from {modulo}__tabla where ...
//   `)
//   eventBus.emit("{modulo}.entidad.accion", { id: result.id, schemaName })
//   return result
// }
