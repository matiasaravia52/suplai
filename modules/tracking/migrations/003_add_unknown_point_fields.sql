-- Módulo: tracking
-- Migración 003: agregar nombre y descripción a unknown_points

alter table %I.tracking__unknown_points
  add column if not exists nombre      text not null default '',
  add column if not exists descripcion  text;
