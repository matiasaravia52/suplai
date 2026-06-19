# Workflow: Creación de Módulos y Features

Todo módulo nuevo, y toda feature nueva dentro de un módulo existente, debe seguir este proceso en orden. No se escribe código hasta que la Fase 0 (Scoping) está completa y aprobada.

---

## Cómo iniciar el proceso

Usá los comandos de Claude Code:

```
/nuevo-modulo {nombre}     ← scoping + planificación técnica (flujo completo)
/planificar {nombre}       ← solo planificación técnica (si el scoping ya existe)
```

`/nuevo-modulo` guía el scoping y, al aprobarlo, automáticamente genera el SPEC.md y PLAN.md. No hace falta invocar `/planificar` por separado.

`/planificar` se puede invocar directamente para tareas técnicas complejas que no son módulos nuevos (migraciones, integraciones, refactors), o para re-planificar un módulo después de cambios en el scoping.

---

## Por qué este proceso existe

Un módulo mal definido genera:
- Features que se solapan entre módulos
- Permisos nombrados inconsistentemente
- Tablas que violan el aislamiento entre módulos
- Features que no se pueden habilitar/deshabilitar limpiamente
- Código que no se puede extraer a microservicio sin romper todo

El scoping fuerza a pensar el diseño antes de implementarlo. El `manifest.ts` es el contrato que el resto del sistema usa para descubrir el módulo — si está mal pensado, todo lo que se construye encima está mal.

---

## Fase 0: Scoping (antes de cualquier código)

Crear el archivo `modules/{nombre}/SCOPING.md` completando **todas** las secciones. No avanzar a Fase 1 hasta que este documento esté completo.

### Template de SCOPING.md

```markdown
# Módulo: {nombre}

## Identidad

- **ID:** {snake_case, ej: tracking}
- **Nombre legible:** {ej: Tracking de Repartos}
- **¿Es módulo core?** Sí / No
  - Core = siempre activo, no vendible (users, settings, notifications)
  - Opcional = activable por tenant, vendible
- **Versión inicial:** 1.0.0

## Problema que resuelve

_Una oración. Si necesitás más de una, el módulo está haciendo demasiado._

## Límites del módulo (bounded context)

**¿Qué es responsabilidad de este módulo?**
- ...

**¿Qué NO es responsabilidad de este módulo?**
- ...

_Si algo "podría" ir acá pero también en otro módulo, pertenece al módulo que lo necesita primero. Se mueve cuando el otro módulo lo necesite._

## Usuarios del módulo

| Rol | Qué hace en este módulo |
|-----|------------------------|
| coordinador | ... |
| repartidor | ... |

## Features

_Cada feature es una capacidad del módulo que se puede habilitar/deshabilitar por tenant._
_Nombre en snake_case. Pensar todas las features posibles; marcar cuáles van en v1._

| ID | Nombre legible | Descripción | Habilitada por defecto | v1 |
|----|---------------|-------------|----------------------|-----|
| live_map | Mapa en tiempo real | Ver ubicación de repartidores en un mapa | true | ✓ |
| route_history | Historial de rutas | Ver recorridos históricos | false | ✓ |
| geofencing | Geocercas | Alertas al entrar/salir de zonas | false | ✗ |

## Permisos

_Formato obligatorio: `{modulo}:{feature}:{accion}`_
_Acciones estándar: `view`, `create`, `edit`, `delete`, `manage`, `view_own`_
_Cada permiso debe mapear a exactamente una feature (o a "general" si aplica al módulo entero)._

| Permiso | Feature | Quién lo tiene |
|---------|---------|---------------|
| tracking:live_map:view | live_map | coordinador |
| tracking:drivers:manage | general | coordinador |
| tracking:locations:view_own | general | repartidor |

## Navegación

_Items que este módulo agrega al sidebar de la app web._

| Label | Ruta | Permiso requerido | Feature requerida |
|-------|------|-------------------|-------------------|
| Mapa en vivo | /tracking/mapa | tracking:live_map:view | live_map |
| Repartidores | /tracking/repartidores | tracking:drivers:manage | - |

## Datos propios

_Tablas que posee este módulo. Prefijo obligatorio: `{modulo}__`_
_Nunca van tablas de otros módulos acá._

| Tabla | Descripción |
|-------|-------------|
| tracking__drivers | Repartidores registrados |
| tracking__shifts | Turnos de trabajo |
| tracking__locations | Ubicaciones registradas durante un turno |

## Datos que necesita de otros módulos

_Si necesita datos de otro módulo, definir cómo los obtiene. NUNCA hacer JOIN cross-módulo._

| Dato necesario | Módulo origen | Cómo se obtiene |
|----------------|---------------|-----------------|
| ID del usuario interno | users | Del JWT (app_user_id) — disponible en todo request |
| Nombre del cliente | clients (futuro) | Evento `cliente.actualizado` o API pública del módulo |

## Eventos que emite

_Nombre en formato `{modulo}.{entidad}.{accion}` — pasado._

| Evento | Cuándo | Payload |
|--------|--------|---------|
| tracking.shift.iniciado | Al iniciar turno | `{ shiftId, driverId, tenantId }` |
| tracking.shift.finalizado | Al cerrar turno | `{ shiftId, driverId, duracion }` |

## Eventos que consume

| Evento | Módulo origen | Qué hace |
|--------|---------------|----------|
| users.user.desactivado | users | Finaliza turnos activos del usuario |

## Preguntas abiertas

_Todo lo que no está claro todavía. No avanzar si hay preguntas que afectan el diseño._

- [ ] ¿Con qué frecuencia se registran ubicaciones? (afecta el volumen de `tracking__locations`)
- [ ] ¿La app móvil envía ubicaciones o es el browser?

## Decisiones tomadas

_Registro de decisiones y su justificación. Completar durante el scoping._

- **Frecuencia de ubicaciones:** cada 30s. Justificación: balance entre precisión y batería del dispositivo.
```

---

## Checklist de aprobación del Scoping

Antes de pasar a la Fase de Planificación Técnica, verificar:

- [ ] El ID del módulo es único y en snake_case
- [ ] El problema que resuelve cabe en una oración
- [ ] Los límites del bounded context están claros (qué es y qué NO es)
- [ ] Cada feature tiene ID único en snake_case dentro del módulo
- [ ] Cada permiso sigue el formato `{modulo}:{feature}:{accion}` o `{modulo}:general:{accion}`
- [ ] No hay permisos que hagan referencia a features de otros módulos
- [ ] Las tablas propias tienen prefijo `{modulo}__`
- [ ] Los datos necesarios de otros módulos se obtienen por evento o API (no JOIN)
- [ ] Las preguntas abiertas que afectan el diseño están resueltas

---

## Fase 0.5: Planificación Técnica

Con el SCOPING.md aprobado, `/nuevo-modulo` ejecuta automáticamente este paso (o podés correr `/planificar {nombre}` directamente).

Genera dos archivos en `specs/{nombre}/`:

**`SPEC.md`** — Decisiones técnicas: modelo de datos (SQL exacto), stack, flujos, estructura de archivos, consideraciones técnicas, variables de entorno nuevas.

**`PLAN.md`** — Orden de implementación: pasos concretos con archivos exactos, comandos de verificación (tsc, tests), y flujo de prueba final end-to-end.

El SPEC.md y PLAN.md se revisan antes de escribir código. Si hay algo que cambiar, se ajusta en estos documentos primero, no durante la implementación.

---

## Fase 1: Manifest

Con el scoping aprobado, crear `modules/{nombre}/manifest.ts`.

El manifest es la implementación TypeScript del SCOPING.md. Si hay diferencias entre ambos, actualizar el SCOPING.md primero.

```typescript
// modules/{nombre}/manifest.ts
import type { ModuleManifest } from "@suplai/module-sdk"

export const manifest: ModuleManifest = {
  id: "tracking",
  version: "1.0.0",
  nombre: "Tracking de Repartos",
  icono: "truck",
  isCoreModule: false,

  features: [
    { id: "live_map",       nombre: "Mapa en tiempo real", defaultEnabled: true  },
    { id: "route_history",  nombre: "Historial de rutas",  defaultEnabled: false },
    { id: "geofencing",     nombre: "Geocercas",           defaultEnabled: false },
  ],

  permissions: [
    "tracking:live_map:view",
    "tracking:drivers:manage",
    "tracking:locations:view_own",
  ],

  nav: [
    { label: "Mapa en vivo",   ruta: "/tracking/mapa",         permission: "tracking:live_map:view", feature: "live_map" },
    { label: "Repartidores",   ruta: "/tracking/repartidores", permission: "tracking:drivers:manage" },
  ],

  mobileScreens: [
    { id: "tracking_active", component: "TrackingScreen", roles: ["repartidor"] },
  ],

  notifications: [
    { id: "shift_started", label: "Turno iniciado" },
  ],

  coreDepends: ["users"],

  migrations: [
    "001_create_tables.sql",
    "002_add_indexes.sql",
  ],
}
```

---

## Fase 2: Migraciones

Crear `modules/{nombre}/migrations/001_create_tables.sql`.

Reglas:
- Prefijo `{modulo}__` en todas las tablas
- FK a tablas del core (`{schema}.users`, `{schema}.clients`) permitidas
- FK a tablas de otro módulo: prohibido
- Un archivo por cambio lógico, numerados secuencialmente
- Nunca modificar un archivo ya aplicado

```sql
-- modules/tracking/migrations/001_create_tables.sql
create table {schema}.tracking__drivers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references {schema}.users(id),
  nombre      text not null,
  telefono    text,
  vehiculo    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
-- ... resto de tablas
```

---

## Fase 3: Service (backend)

Crear `modules/{nombre}/backend/{nombre}-service.ts`.

Reglas:
- Usa `withTenantSchema(schemaName, fn)` para todas las queries
- Solo accede a tablas propias del módulo (prefijo `{modulo}__`) y tablas del core
- Expone funciones públicas claras — esta es la API del módulo
- Emite eventos via EventBus cuando ocurre algo relevante
- Se suscribe a eventos de otros módulos en el init del módulo

```typescript
// modules/tracking/backend/tracking-service.ts
import { withTenantSchema, eventBus } from "@suplai/core"

export async function createDriver(schemaName: string, data: CreateDriverInput) {
  const driver = await withTenantSchema(schemaName, (db) => db`
    insert into tracking__drivers (...) returning ...
  `)
  eventBus.emit("tracking.driver.creado", { driverId: driver.id, schemaName })
  return driver
}
```

---

## Fase 4: Frontend

Crear `modules/{nombre}/frontend/`.

Reglas:
- Las páginas van en `modules/{nombre}/frontend/pages/`
- Verificar feature con `hasFeature(tenantModules, "feature_id")` antes de renderizar
- Verificar permiso con `requirePermission(claims, "modulo:feature:accion")` en server actions
- Los items de nav se generan desde el manifest, no se hardcodean en el layout

```typescript
// Verificación de feature en un server component
if (!hasFeature(tenantModules, "live_map")) notFound()

// Verificación de permiso en server action
await requirePermission(claims, "tracking:live_map:view")
```

---

## Fase 5: Registro y activación

1. Registrar en `services/core/src/module-registry.ts`
2. Agregar a `supabase/migrations/003_seed_modules.sql` (o nueva migración)
3. Activar para tenants desde el Super Admin

---

## Workflow para agregar una Feature a un módulo existente

Agregar una feature es un cambio de contrato del módulo. Requiere:

1. **Actualizar `SCOPING.md`** — agregar la feature a la tabla de features, sus permisos y su nav entry
2. **Actualizar `manifest.ts`** — agregar a `features[]`, `permissions[]`, `nav[]`
3. **Migración si necesita tablas nuevas** — nuevo archivo numerado en `migrations/`
4. **Implementar en el backend** — nuevas funciones en el service
5. **Implementar en el frontend** — nuevas páginas/componentes protegidos con `hasFeature()`
6. **No tocar el resto del módulo** — una feature nueva no debería romper las existentes

---

## Convenciones de nomenclatura

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| ID de módulo | snake_case | `tracking`, `fuel`, `orders` |
| ID de feature | snake_case | `live_map`, `route_history` |
| Tabla de módulo | `{modulo}__{entidad}` | `tracking__drivers` |
| Permiso | `{modulo}:{feature}:{accion}` | `tracking:live_map:view` |
| Evento | `{modulo}.{entidad}.{accion}` (pasado) | `tracking.shift.iniciado` |
| Ruta web | `/{modulo}/{recurso}` | `/tracking/repartidores` |
| Service | `{Nombre}Service` o `{nombre}-service.ts` | `TrackingService` |

### Acciones de permiso estándar

| Acción | Cuándo usarla |
|--------|--------------|
| `view` | Ver listados o detalles |
| `create` | Crear recursos |
| `edit` | Modificar recursos existentes |
| `delete` | Eliminar recursos |
| `manage` | CRUD completo (reemplaza los 4 anteriores) |
| `view_own` | Ver solo los recursos propios del usuario |

No inventar acciones fuera de esta lista sin documentar la excepción en el SCOPING.md.
