-- =========================================================================
-- 0012 — Datos del locador (para el contrato) en la tabla "configuracion"
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0008.
--
-- Solo agrega 3 columnas VACÍAS. No lleva ningún dato personal: el repositorio es público, así que
-- nombre, DNI y teléfono se cargan una vez desde el panel (los puede cambiar solo el administrador;
-- la operadora los lee). Vuelta atrás: rollback/0012_locador_en_configuracion_down.sql
-- =========================================================================
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS locador_nombre   VARCHAR(160);
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS locador_dni      VARCHAR(20);
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS locador_telefono VARCHAR(30);
