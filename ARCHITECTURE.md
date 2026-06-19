# Suplai — Arquitectura y Decisiones de Diseño

## Contexto del producto

Plataforma SaaS multi-tenant para distribuidores de mercadería. El operador de la plataforma (nosotros) da de alta distribuidores como tenants, les asigna módulos y les habilita features. Los módulos se construyen incrementalmente y se venden por separado.

**Tenants iniciales:** 2 distribuidores (López y García) con módulo de tracking.

## Decisiones arquitectónicas

### Multi-tenancy: schema por tenant

Cada distribuidor tiene su propio schema en PostgreSQL. Elegido sobre:
- *DB por tenant*: demasiado caro operacionalmente para el MVP.
- *Row-level isolation*: riesgoso, un bug expone datos de otro tenant.

Schema por tenant ofrece buen aislamiento con costo operacional manejable.

### Monolito modular (no microservicios desde el día 1)

El sistema arranca como un monolito con límites de módulos estrictamente definidos. Los límites permiten extraer cualquier módulo a un microservicio independiente cuando escale, sin reescritura.

Condiciones para que la extracción sea posible:
1. Módulos no se importan directamente entre sí (usan EventBus).
2. No hay joins cross-módulo en la DB.
3. Cada módulo expone una API pública (Service) para que otros lean sus datos.
4. El EventBus es reemplazable por un message broker externo.

### Auth e identidad separados desde el inicio

Supabase Auth maneja JWT y sesiones. El Users Service maneja perfiles, roles y permisos dentro de cada tenant. Los módulos nunca consultan directamente la tabla de usuarios: leen del JWT lo que necesitan.

Razón: auth es transversal a todos los módulos. Si se acopla a uno, escalar o extraer ese módulo se complica.

### Sistema de módulos declarativo

Cada módulo es autodescriptivo a través de su `manifest.ts`. El core no necesita conocer el módulo de antemano: lo descubre leyendo el manifest. Esto hace que agregar un módulo nuevo no requiera tocar el core.

### Features como JSONB en tenant_modules

Las features activas por tenant se guardan como `{ "live_map": true, "geofencing": false }` en `public.tenant_modules.features`. Elegido sobre una tabla relacional separada por ser suficientemente flexible para el MVP y fácil de consultar con operadores JSONB de PostgreSQL.

### Comunicación cross-módulo por EventBus

Los módulos se comunican emitiendo y escuchando eventos. Hoy el EventBus es in-process. La interfaz es la misma que tendría un message broker (emit/on), por lo que el reemplazo futuro no afecta a los módulos.

---

## Estructura del monorepo

```
suplai/
├── apps/           ← Aplicaciones desplegables (Next.js)
│   ├── admin/      ← Panel Suplai (super admin) — crea tenants, activa módulos
│   └── web/        ← App de cada distribuidor (multi-tenant por subdominio)
│
├── services/       ← Lógica de negocio del servidor (Node.js puro)
│   ├── core/       ← DB pool, withTenantSchema(), EventBus, ModuleRegistry
│   └── users/      ← Dominio de usuarios, roles y permisos
│
├── modules/        ← Bounded contexts de negocio (unidad de extracción futura)
│   └── tracking/   ← (Sprint 2) Seguimiento de repartos en tiempo real
│
├── packages/       ← Código compartido sin lógica de negocio
│   ├── types/      ← Interfaces TypeScript: User, Role, Tenant, JwtPayload, etc.
│   ├── auth/       ← parseJwtPayload(), guards de autenticación
│   └── module-sdk/ ← Interfaz ModuleManifest, tipos de EventBus
│
└── supabase/
    └── migrations/ ← Una migración por cambio, nunca modificar las ya aplicadas
```

### Qué va en cada capa

| Necesidad | Dónde |
|---|---|
| Nuevo tipo compartido | `packages/types/src/` |
| Lógica de negocio reutilizable | `services/{dominio}/` |
| Nuevo módulo de negocio | `modules/{nombre}/` con su `manifest.ts` |
| Nueva pantalla para el distribuidor | `apps/web/app/(tenant)/` |
| Nueva pantalla del super admin | `apps/admin/app/(dashboard)/` |
| Nueva tabla del sistema (pública) | Migración en `supabase/migrations/` |
| Nueva tabla de módulo (por tenant) | Migración en `modules/{nombre}/migrations/` |
| Comunicación entre módulos | `EventBus` en `services/core` |

---

## Flujo de una request

```
lopez.localhost:3000/usuarios
       │
       ▼
proxy.ts          → detecta subdominio "lopez", busca tenant en DB (cache 60s),
                    verifica auth, inyecta x-tenant-id y x-schema-name en headers
       │
       ▼
page.tsx          → lee getTenantContext(headers()), llama a server actions
       │
       ▼
actions/          → usa services/ con el schemaName del tenant
       │
       ▼
withTenantSchema() → SET LOCAL search_path TO tenant_lopez; SELECT ...
```

---

## Flujo de autenticación

```
1. Usuario ingresa a lopez.localhost:3000/auth/login
2. Login con Supabase Auth → emite JWT
3. Hook PostgreSQL (custom_access_token) enriquece el JWT:
   { tenant_id, schema_name, app_user_id, roles }
4. proxy.ts en cada request:
   a. Refresca sesión Supabase
   b. Extrae subdominio
   c. Resuelve tenant (con cache)
   d. Si no autenticado → redirect /auth/login
   e. Inyecta headers de contexto
5. Pages y actions leen el contexto de los headers
```

---

## Estructura de la base de datos

### Schema público (plataforma global)

```sql
public.tenants (
  id UUID PRIMARY KEY,
  nombre TEXT,
  subdominio TEXT UNIQUE,
  schema_name TEXT UNIQUE,
  config_visual JSONB,  -- { logo, primaryColor, secondaryColor }
  activo BOOLEAN,
  created_at TIMESTAMPTZ
)

public.modules (
  id TEXT PRIMARY KEY,  -- 'tracking', 'fuel', etc.
  nombre TEXT,
  version TEXT,
  is_core BOOLEAN
)

public.tenant_modules (
  tenant_id UUID REFERENCES tenants,
  module_id TEXT REFERENCES modules,
  activo BOOLEAN,
  version TEXT,
  features JSONB,
  PRIMARY KEY (tenant_id, module_id)
)

public.tenant_migrations (
  tenant_id UUID REFERENCES tenants,
  module_id TEXT,
  migration TEXT,
  applied_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, module_id, migration)
)

public.user_tenant_map (
  auth_user_id UUID,  -- Supabase auth.users.id
  tenant_id UUID REFERENCES tenants,
  PRIMARY KEY (auth_user_id)
)
```

### Schema por tenant — Zona Core

```sql
{tenant}.users (
  id UUID PRIMARY KEY,
  supabase_auth_id UUID UNIQUE,
  email TEXT,
  nombre TEXT,
  tipo TEXT CHECK (tipo IN ('interno', 'externo')),
  client_id UUID REFERENCES clients(id),  -- solo para externos
  activo BOOLEAN
)

{tenant}.roles (
  id UUID PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT
)

{tenant}.role_permissions (
  role_id UUID REFERENCES roles,
  permiso TEXT,  -- formato: 'modulo:feature:accion'
  PRIMARY KEY (role_id, permiso)
)

{tenant}.user_roles (
  user_id UUID REFERENCES users,
  role_id UUID REFERENCES roles,
  PRIMARY KEY (user_id, role_id)
)

{tenant}.clients (
  id UUID PRIMARY KEY,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN
)

{tenant}.products (
  id UUID PRIMARY KEY,
  nombre TEXT,
  sku TEXT,
  unidad TEXT
)

{tenant}.notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  modulo TEXT,
  tipo TEXT,
  titulo TEXT,
  cuerpo TEXT,
  leida BOOLEAN,
  payload JSONB,
  created_at TIMESTAMPTZ
)
```

### Schema por tenant — Zona Módulos (ejemplo: tracking)

```sql
{tenant}.tracking__drivers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  nombre TEXT,
  telefono TEXT,
  vehiculo TEXT,
  activo BOOLEAN
)

{tenant}.tracking__shifts (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES tracking__drivers,
  inicio TIMESTAMPTZ,
  fin TIMESTAMPTZ,
  estado TEXT  -- 'activo', 'finalizado'
)

{tenant}.tracking__locations (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES tracking__drivers,
  shift_id UUID REFERENCES tracking__shifts,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  precision FLOAT,
  recorded_at TIMESTAMPTZ
)
```

---

## Sistema de permisos (RBAC)

**Formato:** `modulo:feature:accion`

**Acciones estándar:** `view`, `create`, `edit`, `delete`, `manage`, `view_own`

**Ejemplos:**
```
tracking:live_map:view
tracking:route_history:view
tracking:geofencing:manage
orders:orders:create
orders:orders:view_own
users:internal_users:manage
users:roles:manage
portal:orders:view_own
fuel:reports:view
```

**Roles predefinidos sugeridos por tenant:**
- `tenant_admin`: acceso total al tenant
- `coordinador`: tracking + pedidos + rutas
- `repartidor`: solo su app móvil (view_own)
- `contador`: fuel + liquidaciones
- `cliente_externo`: solo portal (view_own)

Los tenants pueden crear roles custom y asignarles permisos libremente.

---

## Contrato de módulo (ModuleManifest)

```typescript
interface ModuleManifest {
  id: string
  version: string
  nombre: string
  icono: string
  isCoreModule?: boolean

  features: Array<{
    id: string
    nombre: string
    defaultEnabled: boolean
  }>

  permissions: string[]

  nav: Array<{
    label: string
    ruta: string
    permission?: string
    feature?: string
  }>

  mobileScreens: Array<{
    id: string
    component: string
    roles: string[]
  }>

  notifications: Array<{
    id: string
    label: string
  }>

  coreDepends: string[]  // tablas del core que este módulo usa

  migrations: string[]   // nombres de archivos en migrations/
}
```

---

## Módulos planificados

### Core (siempre activos)
| Módulo | Estado |
|---|---|
| users | Construido (Sprint 1) |
| settings | Por construir |
| notifications | Por construir |

### Opcionales (vendibles)
| Módulo | Estado | Prioridad |
|---|---|---|
| tracking | Por construir | Sprint 2 |
| fuel | Por construir | Sprint 3 |
| orders | Por construir | Futuro |
| routes | Por construir | Futuro |
| portal | Por construir | Futuro |
| stock | Por construir | Futuro |
| analytics | Por construir | Futuro |

---

## Infraestructura

### MVP
- **Frontend:** Vercel (free tier)
- **Backend:** Next.js API Routes en Vercel
- **DB + Auth + Realtime:** Supabase (free tier)
- **Costo estimado:** $0 hasta 2-3 tenants, ~$25/mes con más carga

### Escala (Fase 2, con ingresos)
- Backend propio en Railway o Render
- Supabase Pro
- Costo estimado: $50-100/mes

### Escala real (Fase 3, 50+ tenants)
- Considerar AWS/GCP
- Kafka para EventBus
- Read replicas para módulo analytics
- Posible separación de módulo tracking a servicio dedicado

---

## Subdominios por tenant

Cada tenant accede desde `{subdominio}.suplai.app`.
El shell detecta el subdominio, carga la config del tenant y renderiza solo sus módulos activos.

El Super Admin accede desde `admin.suplai.app`.

**Local:** `{subdominio}.localhost:3000` funciona nativamente en Chrome/Firefox.
