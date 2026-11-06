-- =========================================================================
-- 0006 — Fecha de última modificación en productos
-- Para que el sitemap informe a Google cuándo cambió el catálogo (lastmod real).
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0003 (función set_updated_at).
--
-- Qué toca: agrega una columna nueva a "productos" y un trigger que la actualiza al editar.
-- Datos existentes: no se modifica ninguna columna existente; las filas actuales
-- quedan con updated_at = momento en que se corre esta migración.
-- =========================================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_productos_updated ON productos;
CREATE TRIGGER trg_productos_updated BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- VUELTA ATRÁS (si hiciera falta), correr esto:
--   DROP TRIGGER IF EXISTS trg_productos_updated ON productos;
--   ALTER TABLE productos DROP COLUMN IF EXISTS updated_at;
-- -------------------------------------------------------------------------
