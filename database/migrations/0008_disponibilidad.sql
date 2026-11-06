-- =========================================================================
-- 0008 — Disponibilidad de stock por día y confirmación segura de eventos
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0007.
-- Solo crea funciones; no toca datos. Vuelta atrás: rollback/0008_disponibilidad_down.sql
--
-- Reservan stock los eventos 'confirmado' y 'entregado', todos los días
-- de fecha_entrega a fecha_devolucion (inclusive). Los 'presupuesto' no reservan:
-- se informan aparte como "tentativo".
--
-- SOLO INFORMA: nunca impide confirmar un alquiler. Si falta stock propio, lo que
-- falta se marca como subalquilado (para calcular el costo y la ganancia real).
-- Artículos con stock vacío (NULL) = sin límite: devuelven NULL y no se controlan.
-- =========================================================================

-- Disponible de un artículo en un día (NULL = sin límite; negativo si se pasó)
CREATE OR REPLACE FUNCTION public.stock_disponible(p_item UUID, p_dia DATE, p_excluir_evento UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT i.stock_total - COALESCE((
    SELECT SUM(l.cantidad_propia)
    FROM evento_lineas l
    JOIN eventos e ON e.id = l.evento_id
    WHERE l.item_id = p_item
      AND e.estado IN ('confirmado', 'entregado')
      AND p_dia BETWEEN e.fecha_entrega AND e.fecha_devolucion
      AND (p_excluir_evento IS NULL OR e.id <> p_excluir_evento)
  ), 0)::INTEGER
  FROM items i
  WHERE i.id = p_item
$$;

-- Disponible para todo un rango = el mínimo diario dentro del rango
CREATE OR REPLACE FUNCTION public.stock_disponible_rango(p_item UUID, p_desde DATE, p_hasta DATE, p_excluir_evento UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT MIN(public.stock_disponible(p_item, d::DATE, p_excluir_evento))
  FROM generate_series(p_desde, p_hasta, INTERVAL '1 day') AS d
$$;

-- Detalle día por día para varios artículos (calendario, consulta de disponibilidad y editor de eventos)
CREATE OR REPLACE FUNCTION public.disponibilidad(
  p_items UUID[], p_desde DATE, p_hasta DATE, p_excluir_evento UUID DEFAULT NULL
)
RETURNS TABLE (item_id UUID, dia DATE, stock_total INTEGER, reservado INTEGER, tentativo INTEGER, disponible INTEGER)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    i.id,
    d::DATE,
    i.stock_total,
    COALESCE(SUM(l.cantidad_propia) FILTER (WHERE e.estado IN ('confirmado', 'entregado')), 0)::INTEGER,
    COALESCE(SUM(l.cantidad_total)  FILTER (WHERE e.estado = 'presupuesto'), 0)::INTEGER,
    (i.stock_total - COALESCE(SUM(l.cantidad_propia) FILTER (WHERE e.estado IN ('confirmado', 'entregado')), 0))::INTEGER
  FROM items i
  CROSS JOIN generate_series(p_desde, p_hasta, INTERVAL '1 day') AS d
  LEFT JOIN evento_lineas l ON l.item_id = i.id
  LEFT JOIN eventos e ON e.id = l.evento_id
    AND d::DATE BETWEEN e.fecha_entrega AND e.fecha_devolucion
    AND (p_excluir_evento IS NULL OR e.id <> p_excluir_evento)
  WHERE (p_items IS NULL OR i.id = ANY (p_items))
    AND (p_hasta - p_desde) <= 400
  GROUP BY i.id, d, i.stock_total
  ORDER BY i.id, d
$$;

-- Ajusta propias/subalquiladas de un evento según el stock libre, bajo bloqueo:
-- si dos personas confirman a la vez, la segunda ve el stock ya comprometido por la primera.
-- Respeta lo que la operadora haya subalquilado a mano (solo baja "propias" si no alcanza).
-- Devuelve los artículos que se ajustaron.
CREATE OR REPLACE FUNCTION public.reservar_stock(p_evento UUID)
RETURNS TABLE (item_id UUID, nombre TEXT, cantidad_propia INTEGER, cantidad_subalquilada INTEGER)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  ev RECORD;
  ln RECORD;
  disp INTEGER;
  nueva_propia INTEGER;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Sin permiso.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ej_reserva_stock'));
  SELECT * INTO ev FROM eventos WHERE id = p_evento;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento inexistente.';
  END IF;

  FOR ln IN
    SELECT l.id, l.item_id, l.cantidad_total, l.cantidad_propia, i.nombre
    FROM evento_lineas l JOIN items i ON i.id = l.item_id
    WHERE l.evento_id = p_evento
  LOOP
    disp := public.stock_disponible_rango(ln.item_id, ev.fecha_entrega, ev.fecha_devolucion, p_evento);
    CONTINUE WHEN disp IS NULL;  -- sin límite: no se toca
    disp := GREATEST(disp, 0);
    nueva_propia := LEAST(ln.cantidad_propia, ln.cantidad_total, disp);
    IF nueva_propia <> ln.cantidad_propia THEN
      UPDATE evento_lineas
      SET cantidad_propia = nueva_propia, cantidad_subalquilada = ln.cantidad_total - nueva_propia
      WHERE id = ln.id;
      item_id := ln.item_id;
      nombre := ln.nombre;
      cantidad_propia := nueva_propia;
      cantidad_subalquilada := ln.cantidad_total - nueva_propia;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Cambia el estado. Si pasa a reservar stock, primero ajusta las cantidades (mismo bloqueo).
CREATE OR REPLACE FUNCTION public.cambiar_estado_evento(p_evento UUID, p_estado TEXT)
RETURNS TABLE (item_id UUID, nombre TEXT, cantidad_propia INTEGER, cantidad_subalquilada INTEGER)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF p_estado IN ('confirmado', 'entregado') THEN
    RETURN QUERY SELECT * FROM public.reservar_stock(p_evento);
  END IF;
  UPDATE eventos SET estado = p_estado WHERE id = p_evento;
END;
$$;

REVOKE ALL ON FUNCTION public.stock_disponible(UUID, DATE, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.stock_disponible_rango(UUID, DATE, DATE, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.disponibilidad(UUID[], DATE, DATE, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reservar_stock(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cambiar_estado_evento(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stock_disponible(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stock_disponible_rango(UUID, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disponibilidad(UUID[], DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_evento(UUID, TEXT) TO authenticated;
