-- =========================================================================
-- 0011 — Corrección: no se podían guardar costos (evento_costos)
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0008.
--
-- El disparador que congela eventos cerrados leía "cantidad_total", un campo que no
-- existe en evento_costos, y rechazaba TODO costo nuevo. Solo se redefine esa función.
-- No toca datos ni tablas. Vuelta atrás: rollback/0011_fix_costos_down.sql
-- (los equipos que ya aplicaron la 0008 corregida no necesitan esta migración).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.detalle_evento_reglas()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ev RECORD;
  fila RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN fila := OLD; ELSE fila := NEW; END IF;
  SELECT estado, cerrado_en INTO ev FROM eventos WHERE id = fila.evento_id;
  IF ev.cerrado_en IS NOT NULL AND NOT public.es_admin() THEN
    RAISE EXCEPTION 'El evento está cerrado: sus precios y costos quedan congelados.';
  END IF;
  IF TG_TABLE_NAME = 'evento_lineas' AND TG_OP <> 'DELETE' THEN
    -- (anidado: evento_costos no tiene cantidad_total ni precio_unitario)
    IF ev.estado IN ('confirmado', 'entregado', 'devuelto')
       AND fila.cantidad_total > 0 AND fila.precio_unitario IS NULL THEN
      RAISE EXCEPTION 'El evento está confirmado: cada artículo necesita precio.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
