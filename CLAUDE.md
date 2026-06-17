# Suplai — Guía para Agentes de Software

> Para contexto de producto, decisiones de negocio y visión general ver `AGENT.md`.
> Para arquitectura detallada y modelo de datos ver `ARCHITECTURE.md`.
> Para tareas y estado del sprint ver `TASKS.md`.

## Stack

- **Frontend/Backend:** Next.js (App Router) en monorepo Turborepo
- **DB:** Supabase PostgreSQL con schema por tenant
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime (WebSockets para tracking)
- **Deploy:** Vercel

## Reglas de código

### TypeScript
- Strict mode siempre activado.
- No usar `any`. Usar tipos del paquete `packages/types`.
- Los tipos compartidos entre módulos van en `packages/types`, nunca en el módulo.

### Módulos
- Cada módulo nuevo vive en `modules/{nombre}/`.
- Estructura obligatoria:
  ```
  modules/{nombre}/
    manifest.ts       ← SIEMPRE primero, define todo el módulo
    frontend/         ← páginas y componentes
    backend/          ← services y route handlers
    migrations/       ← archivos SQL numerados (001_, 002_, ...)
  ```
- El `manifest.ts` debe implementar `ModuleManifest` de `packages/module-sdk`.
- Un módulo sin manifest no existe para el sistema.

### Base de datos
- Nunca hardcodear el nombre del schema. Siempre usar el schema del tenant del contexto.
- Tablas de módulos: prefijo `{modulo}__` (ej: `tracking__locations`).
- Nunca hacer JOIN entre tablas de distintos módulos.
- Migraciones: un archivo por cambio, numerados, nunca modificar uno ya aplicado.

### Comunicación entre módulos
- Nunca importar código de un módulo desde otro módulo.
- Comunicación cross-módulo únicamente por `EventBus` de `services/core`.
- Si se necesitan datos de otro módulo, usar su Service (API pública), no sus tablas.

### Permisos
- Nunca implementar chequeo de permisos dentro de un módulo.
- Usar siempre `PermissionService.hasPermission()` o el guard `RequirePermission`.
- Usar `hasFeature()` para condicionar comportamiento por feature del módulo.
- Formato de permiso: `modulo:feature:accion`.

### API Routes
- Todos los endpoints pasan por el middleware de tenant (resuelve schema desde subdominio).
- Todos los endpoints protegidos usan el guard de auth + permiso correspondiente.
- Nunca exponer datos de un tenant en un endpoint de otro tenant.

### Frontend
- La navegación del shell se genera desde los manifests, no se hardcodea.
- Usar el hook `useTenant()` para acceder a config del tenant, features activas y permisos.
- Los componentes de módulo no acceden directamente a Supabase: pasan por los services del backend.

## Comandos útiles

```bash
# Desarrollo
pnpm dev              # levanta todos los apps en paralelo

# DB
pnpm db:migrate       # corre migraciones pendientes en todos los tenants
pnpm db:seed          # seed de datos iniciales (módulos disponibles)

# Módulos
pnpm module:create    # scaffold de un módulo nuevo

# Tests
pnpm test             # todos los tests
pnpm test --filter=modules/tracking  # tests de un módulo
```

## Flujo para agregar un módulo nuevo

1. Crear carpeta `modules/{nombre}/`
2. Escribir `manifest.ts` con id, features, permissions, nav, migrations
3. Crear migraciones SQL en `migrations/`
4. Implementar el Service en `backend/`
5. Implementar las páginas en `frontend/`
6. Registrar el módulo en `services/core/ModuleRegistry`
7. Activar el módulo para el tenant en el Super Admin

El sistema descubre automáticamente nav, permisos y features desde el manifest.

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo backend, nunca exponer al cliente
NEXT_PUBLIC_APP_DOMAIN=suplai.app
```
