# Módulo: tracking

## Identidad

- **ID:** `tracking`
- **Nombre legible:** Tracking Operativo
- **¿Es módulo core?** No — opcional, vendible por tenant
- **Versión inicial:** 1.0.0

## Problema que resuelve

Registra las visitas de repartidores y pre-vendedores a cada punto de cliente — hora de llegada, hora de salida — y el recorrido GPS completo de la jornada, para que el coordinador pueda controlar la cobertura e identificar gaps en las rutas.

## Límites del módulo (bounded context)

**¿Qué es responsabilidad de este módulo?**
- Registrar visitas (llegada y salida) a puntos de cliente registrados
- Registrar el recorrido GPS completo durante la jornada (muestreo cada 30 segundos)
- Mostrar el estado actual de cada empleado en campo
- Historial de visitas por empleado, cliente o fecha
- Exportar historial de visitas a Excel
- Detectar y alertar cuando el GPS al momento del check-in no coincide con la ubicación del cliente (tolerancia: 150 metros)
- Registrar visitas a puntos no registrados como clientes y convertirlos en clientes del sistema
- Leer qué usuarios tienen rol `repartidor` o `pre_vendedor` (desde el core `users`)

**¿Qué NO es responsabilidad de este módulo?**
- Gestionar pedidos tomados en la pre-venta (módulo `orders`)
- Gestionar entregas y su estado (módulo `orders` o `routes`)
- Crear o editar clientes más allá del alta desde un punto de visita no registrado (core del sistema)
- Optimizar rutas automáticamente (módulo `routes`, futuro)
- Calcular gasto de combustible a partir del recorrido (módulo `fuel`, futuro)
- Notificaciones en tiempo real al coordinador (el coordinador ve el estado al entrar al panel)

## Usuarios del módulo

| Rol | Qué hace en este módulo |
|-----|------------------------|
| `coordinador` | Ve el estado de todos los empleados en campo, revisa historial de visitas, identifica gaps en rutas, recibe alertas de fraude |
| `repartidor` | Registra llegada y salida en cada punto de entrega desde la app móvil |
| `pre_vendedor` | Registra llegada y salida en cada punto de pre-venta desde la app móvil |
| `tenant_admin` | Gestiona empleados de campo, configura el módulo |

> Un mismo empleado puede tener ambos roles simultáneamente o rotar entre ellos. El sistema de roles del core ya soporta esto.

## Features

| ID | Nombre legible | Descripción | Habilitada por defecto | v1 |
|----|---------------|-------------|----------------------|-----|
| `field_tracking` | Tracking de campo | Check-in/out en puntos de cliente, mapa en vivo, historial de visitas y validación de posición (fraude) | true | ✓ |
| `route_tracing` | Trazabilidad de recorrido | Registro GPS continuo del recorrido completo entre puntos (muestreo cada 30 segundos) | false | ✓ |
| `unknown_points` | Puntos no registrados | Registrar visitas a lugares que no son clientes del sistema; el punto se convierte en cliente | false | ✓ |

## Permisos

| Permiso | Feature | Quién lo tiene |
|---------|---------|---------------|
| `tracking:field_tracking:create` | `field_tracking` | `repartidor`, `pre_vendedor` |
| `tracking:field_tracking:view` | `field_tracking` | `coordinador` |
| `tracking:field_tracking:export` | `field_tracking` | `coordinador`, `tenant_admin` |
| `tracking:route_tracing:view` | `route_tracing` | `coordinador` |
| `tracking:unknown_points:create` | `unknown_points` | `repartidor`, `pre_vendedor` |
| `tracking:unknown_points:view` | `unknown_points` | `coordinador` |

## Navegación

| Label | Ruta | Permiso requerido | Feature requerida |
|-------|------|-------------------|-------------------|
| Tracking en vivo | `/tracking` | `tracking:field_tracking:view` | `field_tracking` |
| Historial de visitas | `/tracking/historial` | `tracking:field_tracking:view` | `field_tracking` |
| Alertas de posición | `/tracking/alertas` | `tracking:field_tracking:view` | `field_tracking` |

## Datos propios

| Tabla | Descripción |
|-------|-------------|
| `tracking__visits` | Visitas a puntos de cliente: check-in, check-out, coordenadas GPS de cada acción |
| `tracking__route_points` | Puntos GPS muestreados cada 30s durante la jornada activa |
| `tracking__employee_status` | Estado actual de cada empleado de campo: posición GPS más reciente y visita activa (si la hay) |
| `tracking__unknown_points` | Visitas a puntos no registrados como clientes, con coordenadas y descripción |
| `tracking__fraud_alerts` | Alertas generadas cuando el GPS al check-in supera los 150m del cliente |

## Datos que necesita de otros módulos

| Dato necesario | Módulo origen | Cómo se obtiene |
|----------------|---------------|-----------------|
| ID y datos del usuario interno | `users` (core) | Del JWT (`app_user_id`) — disponible en todo request |
| Lista de clientes con dirección y coordenadas | `clients` (core) | API pública del core (función `getClientById`) |

## Eventos que emite

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `tracking.visit.iniciada` | Al hacer check-in en un punto | `{ visitId, employeeId, clientId, lat, lng, tenantId }` |
| `tracking.visit.finalizada` | Al hacer check-out de un punto | `{ visitId, employeeId, clientId, duracionMinutos, tenantId }` |
| `tracking.fraud_alert.creada` | Al detectar check-in con GPS fuera de rango | `{ alertId, visitId, employeeId, clientId, distanciaMetros, tenantId }` |
| `tracking.unknown_point.registrado` | Al registrar visita a punto no registrado | `{ pointId, employeeId, lat, lng, descripcion, tenantId }` |

## Eventos que consume

| Evento | Módulo origen | Qué hace |
|--------|---------------|----------|
| `users.user.desactivado` | `users` | Cierra cualquier visita activa del empleado |

## Preguntas abiertas

_Ninguna. Todas las preguntas de diseño fueron resueltas._

## Decisiones tomadas

- **Check-in/out manual con GPS:** el empleado registra manualmente, el sistema captura coordenadas en ese momento. Justificación: evita tracking continuo innecesario y permite detectar fraude con un dato puntual.
- **Tolerancia de fraude: 150 metros.** Si el GPS al check-in supera esa distancia del cliente, se genera una alerta. No bloquea el check-in.
- **Frecuencia de muestreo en `route_tracing`: 30 segundos.** Balance entre precisión del recorrido y volumen de datos.
- **Sin alertas push al coordinador.** El mapa en vivo usa Supabase Realtime para actualizar posiciones de empleados en tiempo real, pero no dispara notificaciones ni alertas proactivas. El coordinador ve el estado activo navegando al panel. Las alertas de fraude se consultan manualmente. Push notifications se evalúan en v2.
- **Puntos no registrados se convierten en clientes.** Al registrar una visita a un punto desconocido, el sistema crea un cliente en el core. El empleado provee nombre/descripción del punto.
- **Cálculo de combustible fuera de scope.** `tracking` expone los datos de recorrido (km, puntos GPS) vía eventos y API. El módulo `fuel` (futuro) los consume para sus cálculos.
- **Features consolidadas en 3 (`field_tracking`, `route_tracing`, `unknown_points`).** Las features originales `visit_tracking`, `live_status`, `visit_history` y `fraud_detection` se fusionaron en `field_tracking` porque son codependientes: desactivar una deja las otras sin datos o sin sentido. La granularidad interna se maneja con permisos (`create`, `view`, `export`), no con feature toggles. `route_tracing` y `unknown_points` se mantienen separadas porque son opcionales e independientes del flujo base.
- **`coverage_gaps` fuera de v1.** Requiere definir qué es una "ruta esperada" para un empleado, lo que implica planificación de rutas que aún no existe.
- **`employees` removido del módulo.** Los repartidores y pre-vendedores son usuarios del core con roles asignados. `tracking` solo los lee desde `users`. Si el perfil operativo del empleado (vehículo, zona, etc.) crece, se evalúa un módulo `employees` separado cuando otro módulo también lo necesite.
