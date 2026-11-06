-- Vuelta atrás de 0011_fix_costos.sql: vuelve a la función original de la 0008.
-- OJO: esa versión rechaza todo costo nuevo (es el error que la 0011 corrige).
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
  IF TG_TABLE_NAME = 'evento_lineas' AND TG_OP <> 'DELETE'
     AND ev.estado IN ('confirmado', 'entregado', 'devuelto')
     AND NEW.cantidad_total > 0 AND NEW.precio_unitario IS NULL THEN
    RAISE EXCEPTION 'El evento está confirmado: cada artículo necesita precio.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
