# Suplai — Instrucciones para agentes

> Arquitectura detallada, modelo de datos y principios de evolución: `ARCHITECTURE.md`
> Contexto de producto y decisiones de negocio: `AGENT.md`
> Tareas del sprint actual: `TASKS.md`

**Leer `ARCHITECTURE.md` antes de cualquier tarea que involucre agregar código nuevo.**
Las reglas de este archivo son irrompibles. Si una decisión de diseño las contradice, señalarlo antes de implementar.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend/Backend | Next.js 16 App Router (Turborepo) |
| Base de datos | Supabase PostgreSQL — schema por tenant |
| Auth | Supabase Auth + hook custom_access_token (JWT enriquecido) |
| Real-time | Supabase Realtime |
| Deploy | Vercel |
| Package manager | pnpm workspaces |

---

## Reglas irrompibles

### Organización del código

- **`packages/`** — solo tipos e interfaces compartidas, cero lógica de negocio, cero acceso a DB
- **`services/`** — lógica de negocio del servidor, solo corre en Node.js
- **`modules/`** — bounded contexts de negocio; cada módulo tiene `manifest.ts`, `frontend/`, `backend/`, `migrations/`
- **`apps/`** — interfaces de usuario; sin lógica de negocio propia, consumen services y módulos

Un módulo sin `manifest.ts` no existe para el sistema. Siempre empezar por el manifest.

### Base de datos

- Nunca hardcodear el nombre del schema. Siempre usar `withTenantSchema(schemaName, fn)`.
- Tablas de módulo llevan prefijo `{modulo}__` (ej: `tracking__locations`).
- Nunca hacer JOIN entre tablas de módulos distintos.
- Migraciones: un archivo por cambio, numerados, nunca modificar uno ya aplicado.
- Migraciones del sistema van en `supabase/migrations/`. Las de módulo en `modules/{nombre}/migrations/`.

### Comunicación entre módulos

- **Nunca** importar código de un módulo desde otro módulo.
- Comunicación cross-módulo únicamente por `EventBus` de `services/core`.
- Si un módulo necesita datos de otro dominio, consume su API pública (su Service), no sus tablas.

Esta regla garantiza que cualquier módulo pueda extraerse a microservicio sin romper el resto.

### Permisos

- Formato obligatorio: `modulo:feature:accion` (ej: `tracking:live_map:view`)
- Los permisos se declaran en el `manifest.ts` del módulo.
- El chequeo siempre usa `PermissionService.hasPermission()` o `requirePermission()`.
- Nunca comparar permisos con strings manuales fuera del PermissionService.

### TypeScript

- Strict mode siempre activado.
- No usar `any`. Usar tipos de `packages/types`.
- Los tipos compartidos entre módulos van en `packages/types`, nunca dentro del módulo.

### API y endpoints

- Todos los endpoints de `apps/web` pasan por `proxy.ts` (resuelve tenant desde subdominio).
- Todos los endpoints protegidos verifican auth + permiso.
- Nunca exponer datos de un tenant en un endpoint de otro tenant.

### Frontend

- La navegación se genera desde los manifests de módulos activos, no se hardcodea.
- Los componentes de módulo no acceden directamente a Supabase: pasan por server actions que usan los services.

---

## Flujo para módulos y features nuevas

Ver `WORKFLOW_MODULOS.md` para el proceso completo. Resumen:

1. **Fase 0 — Scoping:** copiar `modules/_template/SCOPING.md`, completarlo íntegro. No avanzar sin tenerlo aprobado.
2. **Fase 1 — Manifest:** crear `modules/{nombre}/manifest.ts` desde el template. El manifest es el contrato del módulo.
3. **Fase 2 — Migraciones:** tablas con prefijo `{nombre}__`, sin FK cross-módulo.
4. **Fase 3 — Backend:** service que solo accede a tablas propias, emite eventos al EventBus.
5. **Fase 4 — Frontend:** páginas con `hasFeature()` y `requirePermission()` en cada ruta.
6. **Fase 5 — Registro:** registrar en `module-registry.ts`, seed en migraciones, activar por tenant.

Para agregar una feature a un módulo existente: actualizar SCOPING.md → manifest.ts → migración si aplica → implementar backend y frontend.

---

## Comandos

```bash
pnpm dev                                    # levanta todos los apps
pnpm --filter=@suplai/web exec tsc --noEmit # type check de web
pnpm --filter=@suplai/admin exec tsc --noEmit
supabase db reset                           # resetea DB local y re-corre migraciones
supabase start                              # levanta Supabase local (Docker)
```

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # solo backend, nunca al cliente
NEXT_PUBLIC_APP_DOMAIN=suplai.app
```

---

## Contexto local de desarrollo

- Supabase corre local con Docker (Supabase CLI). En producción usa Supabase cloud.
- Subdominio local: `{tenant}.localhost:3000` funciona nativamente en Chrome/Firefox.
- Super admin vive en `localhost:3001` (puerto del app admin).
- Después de `supabase db reset`: recrear el super admin vía Supabase Studio o Admin API.
