-- Vuelta atrás de 0013_proteger_eventos_cerrados.sql (vuelve a permitir borrar eventos cerrados a cualquier usuario del equipo)
DROP TRIGGER IF EXISTS trg_eventos_no_borrar_cerrados ON eventos;
DROP FUNCTION IF EXISTS public.eventos_no_borrar_cerrados();
