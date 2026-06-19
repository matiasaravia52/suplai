-- Módulos disponibles en la plataforma.
-- Los módulos core siempre están activos en cada tenant.
-- Los opcionales se asignan por el super admin.

insert into public.modules (id, nombre, version, is_core) values
  ('users',         'Usuarios y Roles',       '1.0.0', true),
  ('settings',      'Configuración',           '1.0.0', true),
  ('notifications', 'Notificaciones',          '1.0.0', true),
  ('tracking',      'Rastreo de Repartidores', '1.0.0', false),
  ('fuel',          'Análisis de Combustible', '1.0.0', false),
  ('orders',        'Gestión de Pedidos',      '1.0.0', false),
  ('routes',        'Optimización de Rutas',   '1.0.0', false),
  ('portal',        'Portal para Clientes',    '1.0.0', false),
  ('stock',         'Gestión de Stock',        '1.0.0', false),
  ('analytics',     'Reportes y Analytics',    '1.0.0', false);
