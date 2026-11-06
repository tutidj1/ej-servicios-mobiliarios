-- =========================================================================
-- 0013 — Un evento cerrado solo lo puede borrar el administrador
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0008.
--
-- Un evento "cerrado" tiene el historial congelado (precios, costos, ganancia). La base ya impedía
-- modificarlo, pero no borrarlo. Esto agrega esa protección. No toca ningún dato existente.
-- Vuelta atrás: rollback/0013_proteger_eventos_cerrados_down.sql
-- =========================================================================
CREATE OR REPLACE FUNCTION public.eventos_no_borrar_cerrados()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cerrado_en IS NOT NULL AND NOT public.es_admin() THEN
    RAISE EXCEPTION 'El evento está cerrado. Solo el administrador puede borrarlo.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_eventos_no_borrar_cerrados ON eventos;
CREATE TRIGGER trg_eventos_no_borrar_cerrados
  BEFORE DELETE ON eventos
  FOR EACH ROW EXECUTE FUNCTION public.eventos_no_borrar_cerrados();
