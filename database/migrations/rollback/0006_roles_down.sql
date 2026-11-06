-- Vuelta atrás de 0006_roles.sql
-- Restaura es_admin() como estaba en la 0003 (UUID fijo) y borra perfiles / mi_rol / es_staff.
-- Correr ANTES las vueltas atrás de 0009, 0008 y 0007 si se aplicaron (usan es_staff()).

DROP POLICY IF EXISTS "Cotizaciones lectura staff" ON cotizaciones;
DROP POLICY IF EXISTS "Cotizaciones actualizar staff" ON cotizaciones;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT auth.uid() = '42a4f12c-f891-42e4-ae35-2aa889711e4a'::uuid
$$;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;

DROP FUNCTION IF EXISTS public.es_staff();
DROP FUNCTION IF EXISTS public.mi_rol();
DROP TABLE IF EXISTS perfiles;
