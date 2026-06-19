# Módulo: Tracking Operativo

> Documento de discusión — previo al scoping técnico formal.

---

## Qué problema resuelve

Registra las visitas de repartidores y pre-vendedores a cada punto de cliente — hora de llegada, hora de salida — para que el coordinador pueda controlar la cobertura e identificar gaps en las rutas.

---

## Contexto de negocio

Las distribuidoras tienen empleados trabajando en la ciudad en dos roles:

- **Repartidores:** entregan pedidos ya confirmados a clientes.
- **Pre-vendedores:** visitan clientes para tomar pedidos que se entregarán después.

Algunas distribuidoras tienen solo uno de los dos roles; otras tienen ambos. Un mismo empleado puede rotar entre roles (una semana reparte, otra pre-vende).

---

## Límites del módulo

**Es responsabilidad de este módulo:**
- Registrar visitas (llegada y salida) a puntos de cliente
- Mostrar el estado actual de cada empleado en campo
- Historial de visitas por empleado y por cliente
- Identificar clientes no visitados en un recorrido
- Gestionar los empleados de campo (repartidores y pre-vendedores)
- (Feature futura) Registrar visitas a puntos no registrados como clientes

**No es responsabilidad de este módulo:**
- Gestionar pedidos tomados en la pre-venta (módulo `orders`)
- Gestionar entregas y su estado (módulo `orders` o `routes`)
- Crear o editar clientes (core del sistema)
- Optimizar rutas automáticamente (módulo `routes`, futuro)
- Tracking GPS metro a metro / trayectoria continua

---

## Roles que usan este módulo

| Rol | Qué hace |
|-----|----------|
| `coordinador` | Ve el estado de todos los empleados en campo, revisa historial de visitas, identifica gaps en rutas |
| `repartidor` | Registra llegada y salida en cada punto de entrega |
| `pre_vendedor` | Registra llegada y salida en cada punto de pre-venta |
| `tenant_admin` | Gestiona empleados de campo, configura el módulo |

> Un mismo empleado puede tener el rol `repartidor` y `pre_vendedor` simultáneamente o en distintos momentos. El sistema ya soporta esto.

---

## Cómo funciona el registro de visitas

El empleado registra manualmente desde su celular cuando llega y cuando se va de cada punto ("Llegué" / "Me voy"). En el momento de cada acción, el sistema captura automáticamente las coordenadas GPS del dispositivo.

Esto permite:
- Saber exactamente cuándo llegó y cuándo se fue.
- Comparar la posición GPS con la dirección del cliente para detectar posibles fraudes.
- Sin necesidad de tracking continuo → liviano en batería y en datos móviles.

---

## Capacidades del módulo

| # | ID | Nombre | Descripción | Nivel |
|---|----|--------|-------------|-------|
| 1 | `employees` | Gestión de empleados de campo | Alta, baja y edición de repartidores y pre-vendedores | Básico |
| 2 | `visit_tracking` | Registro de visitas | Check-in/out manual con captura de GPS en cada punto de cliente registrado | Básico |
| 3 | `live_status` | Estado en tiempo real | Ver qué empleados están activos y en qué punto están ahora | Básico |
| 4 | `visit_history` | Historial de visitas | Ver visitas pasadas por empleado, cliente o fecha | Básico |
| 5 | `route_tracing` | Trazabilidad de recorrido | Registro GPS continuo del recorrido completo (muestreo periódico), para control de combustible y optimización de rutas | Avanzado |
| 6 | `coverage_gaps` | Gaps de cobertura | Identificar clientes que no fueron visitados en un período | Avanzado |
| 7 | `fraud_detection` | Validación de posición | Alertas cuando el GPS al momento del check-in no coincide con la ubicación del cliente | Avanzado |
| 8 | `unknown_points` | Puntos no registrados | Registrar visitas a lugares que no son clientes del sistema (puntos nuevos identificados en campo) | Avanzado |

---

## Preguntas abiertas para discutir

- [ ] ¿Cuáles de las 8 capacidades van en la primera versión y cuáles quedan para después?
- [ ] ¿Qué tolerancia de distancia se considera "fraude"? (ej: si el GPS dice que está a más de 200m del cliente, ¿se alerta?)
- [ ] ¿El coordinador recibe notificaciones en tiempo real o solo ve el estado cuando entra al panel?
- [ ] ¿Los puntos no registrados eventualmente se pueden convertir en clientes del sistema, o son solo registros de visita?
- [ ] ¿Necesitamos reportes exportables (Excel/PDF) del historial de visitas?
- [ ] Para `route_tracing`: ¿con qué frecuencia muestreamos el GPS? (ej: cada 30s, cada 1 minuto). Afecta el volumen de datos.
- [ ] ¿Los datos de recorrido de `route_tracing` los consume el futuro módulo `fuel` para calcular gasto de combustible, o ese cálculo también queda en `tracking`?
