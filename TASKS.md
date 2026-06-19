# Suplai — Tareas

## Sprint 1 — Core e infraestructura base

### Repo y proyecto
- [ ] Inicializar monorepo (Turborepo)
- [ ] Configurar Supabase proyecto
- [ ] Configurar Vercel proyecto
- [ ] Variables de entorno base

### Base de datos
- [ ] Crear schema público (tenants, modules, tenant_modules, tenant_migrations)
- [ ] Función SQL para crear schema de tenant con tablas core
- [ ] Seed inicial: módulos disponibles en `public.modules`

### Auth
- [ ] Configurar Supabase Auth
- [ ] Login multi-tenant (detecta tenant por subdominio)
- [ ] JWT con tenantId, schemaName, userId, roles
- [ ] Middleware de tenant en Next.js (subdominio → schema)
- [ ] Guards de permiso (`RequirePermission` decorator/HOC)

### Users Service
- [ ] CRUD de usuarios internos
- [ ] CRUD de usuarios externos (clientes)
- [ ] CRUD de roles
- [ ] Asignación de permisos a roles
- [ ] Asignación de roles a usuarios

### Core Services
- [ ] EventBus (in-process)
- [ ] TenantService (crear tenant + schema + seed)
- [ ] MigrationService (correr migraciones por tenant)
- [ ] ModuleRegistry (registrar y consultar módulos)
- [ ] PermissionService (hasPermission, hasFeature)
- [ ] NotificationService (crear y consultar notificaciones)

### Module SDK
- [ ] Definir tipo `ModuleManifest`
- [ ] Utilidades: `hasFeature`, `hasPermission` hooks para frontend
- [ ] Guard de backend `RequireFeature`

### Shell Web
- [ ] Layout base (sidebar, header, main)
- [ ] Navegación dinámica generada desde manifests de módulos activos
- [ ] Theming dinámico por tenant (colores, logo desde config_visual)
- [ ] Página 403 (sin permiso) y página de módulo no disponible

### Super Admin
- [ ] Login super admin
- [ ] CRUD de tenants
- [ ] Asignar/quitar módulos a tenant
- [ ] Habilitar/deshabilitar features por módulo por tenant
- [ ] Vista de tenants y su estado

---

## Sprint 2 — Módulo Tracking

- [ ] Manifest del módulo tracking
- [ ] Migraciones: tracking__drivers, tracking__shifts, tracking__locations
- [ ] Backend: endpoints CRUD repartidores
- [ ] Backend: endpoint recibir ubicación (usado por app del repartidor)
- [ ] Backend: endpoint ubicaciones activas (para el mapa)
- [ ] Frontend admin: gestión de repartidores
- [ ] Frontend admin: mapa en tiempo real (Supabase Realtime)
- [ ] Frontend admin: historial de recorridos por repartidor
- [ ] App del repartidor (PWA móvil): login, iniciar/finalizar jornada, envío de ubicación en background
- [ ] Notificación: repartidor inició/finalizó jornada

---

## Sprint 3 — Validación y primeros clientes

- [ ] Alta de tenant: López
- [ ] Alta de tenant: García
- [ ] Capacitación / onboarding con ambos distribuidores
- [ ] Recolección de feedback
- [ ] Ajustes según feedback real

---

## Backlog (futuro)

- [ ] Módulo combustible (fuel)
- [ ] Módulo pedidos (orders)
- [ ] Módulo rutas (route optimization)
- [ ] Módulo portal cliente
- [ ] App nativa iOS/Android
- [ ] Facturación automática por módulo
- [ ] Métricas de uso por tenant
- [ ] EventBus externo (Kafka/SQS)
