# Suplai — Instrucciones para Agentes

## Qué es Suplai

SaaS multi-tenant para distribuidores (empresas que distribuyen mercadería a locales minoristas). El dueño de la plataforma da de alta distribuidores como tenants, cada uno con sus propios módulos activos y features habilitadas. Los módulos se venden individualmente.

## Reglas que siempre se deben respetar

### Arquitectura general
- Es un **monolito modular** diseñado para extraer módulos a microservicios si escalan.
- Toda la infraestructura corre en **Supabase (PostgreSQL) + Vercel (Next.js)**.
- Multi-tenancy por **schema de PostgreSQL**: cada tenant tiene su propio schema.
- Auth e identidad es responsabilidad de **Supabase Auth + Users Service**. Nunca mezclar auth con lógica de negocio.

### Módulos
- Todo feature de negocio vive en un **módulo**. Nada de lógica de negocio en el core.
- Cada módulo tiene un `manifest.ts` que declara: id, version, nombre, features, permissions, nav, mobileScreens, notifications, migrations, coreDepends.
- El core registra los módulos automáticamente leyendo sus manifests. No hay registro manual.
- Hay **módulos core** (siempre activos, no vendibles: `users`, `settings`, `notifications`) y **módulos opcionales** (vendibles, habilitables por tenant).

### Comunicación entre módulos
- Los módulos **nunca se importan directamente** entre sí.
- Toda comunicación cross-módulo es por **EventBus** (`eventBus.emit` / `eventBus.on`).
- El EventBus es in-process hoy. En el futuro se reemplaza por Kafka/SQS sin tocar los módulos.
- Si un módulo necesita datos de otro, usa la **API pública** del módulo (su Service), nunca sus tablas internas.

### Base de datos
- Schema `public`: plataforma global (`tenants`, `modules`, `tenant_modules`, `tenant_migrations`).
- Schema por tenant: zona **core** (tablas compartidas: `users`, `roles`, `role_permissions`, `user_roles`, `clients`, `products`, `notifications`) y zona **módulos** (tablas prefijadas: `tracking__locations`, `orders__orders`, etc.).
- **Nunca hacer joins entre tablas de distintos módulos.** Solo se puede joinear con tablas del core.
- Todas las queries del backend deben operar sobre el schema del tenant activo. Nunca hardcodear schema names.

### RBAC (permisos)
- Formato de permiso: `modulo:feature:accion` (ej: `tracking:live_map:view`, `orders:orders:view_own`).
- Los permisos disponibles los declara cada módulo en su manifest.
- Los roles son por tenant (cada distribuidor puede definir los suyos).
- Los módulos nunca implementan su propio chequeo de permisos: usan `PermissionService.hasPermission()`.
- El JWT incluye: `tenantId`, `schemaName`, `userId`, `roles`.

### Features por módulo
- Cada módulo declara sus features en el manifest con `defaultEnabled`.
- Las features activas por tenant se guardan en `public.tenant_modules.features` (JSONB).
- Los módulos usan `hasFeature('modulo', 'feature')` para condicionar comportamiento. Nunca hardcodean su estado.

### Usuarios
- Hay dos tipos de usuario: `interno` (empleados del distribuidor) y `externo` (clientes/locales minoristas).
- Los usuarios externos tienen `client_id` apuntando a la tabla `clients` del tenant.
- Nunca asumir que todos los usuarios de un tenant son empleados.

### Escalabilidad
- El EventBus debe poder reemplazarse por un message broker externo sin cambiar los módulos.
- Las queries pesadas (analytics, históricos) deben estar en módulos separados para poder moverlas a una read replica.
- El módulo de tracking usa Supabase Realtime para WebSockets. Si escala, puede extraerse a un servicio dedicado.

### Migraciones
- Cada módulo tiene su carpeta `migrations/` con archivos SQL numerados.
- Las migraciones se corren por tenant (no globalmente) al activar el módulo.
- `MigrationService` registra en `public.tenant_migrations` qué migraciones ya corrieron.
- Nunca modificar una migración ya aplicada. Siempre crear una nueva.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend / Shell web | Next.js (App Router) |
| Shell móvil | PWA (misma app Next.js, responsive) |
| Backend / API | Next.js API Routes + Services |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time (tracking) | Supabase Realtime |
| Hosting | Vercel |

## Estructura del repositorio

```
/
├── apps/
│   ├── web/          → Next.js (shell web + admin)
│   └── admin/        → Super Admin panel
│
├── services/
│   ├── core/         → EventBus, TenantService, MigrationService, ModuleRegistry
│   └── users/        → Users Service (perfiles, roles, permisos)
│
├── modules/
│   ├── tracking/     → manifest.ts, frontend/, backend/, migrations/
│   ├── fuel/
│   ├── orders/
│   └── ...
│
└── packages/
    ├── types/        → tipos TypeScript compartidos
    ├── auth/         → helpers JWT, guards, decorators
    └── module-sdk/   → ModuleManifest type, EventBus interface, utilidades
```

## Qué NO hacer

- No hacer joins entre tablas de distintos módulos.
- No importar código de un módulo desde otro módulo directamente.
- No hardcodear el nombre del schema del tenant.
- No agregar lógica de negocio al core. El core es infraestructura.
- No crear un módulo sin su `manifest.ts`.
- No modificar migraciones ya aplicadas.
- No deshabilitar módulos core (`users`, `settings`, `notifications`).
- No saltear el EventBus para "simplificar" comunicación cross-módulo.
